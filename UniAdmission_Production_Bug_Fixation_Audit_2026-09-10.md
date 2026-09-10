# UniAdmission — Production Bug, Security & Fixation Audit

**Repository:** `nasibarif/uniadmission`  
**Branch:** `main`  
**Review date:** 2026-09-10  
**Latest reviewed commit:** `f05797b`

## Executive Summary

The latest fixes are a substantial improvement, but the repository is **not ready for real-money production yet**. The remaining issues below include payment-fulfillment safety, authorization, AI quota correctness, document privacy, and production reliability.

### Release blockers

1. Payment fulfillment still has a direct-DB fallback when the atomic RPC fails.
2. Subscription duration is still supplied as an RPC argument instead of being authoritative in the database.
3. The privileged payment fulfillment RPC is executable by `authenticated`.
4. Payment callback URLs are derived from `url.origin` instead of a fixed trusted callback base URL.
5. AI quota SQL has an off-by-one bug at the exact limit.
6. AI Gateway still has a non-atomic quota fallback.
7. AI quota RPC is executable by `authenticated`.
8. AI usage is counted/resynchronized again after the quota reservation, risking accounting drift.
9. Admin route has no visible server-authoritative role guard in `App.tsx`.
10. School/B2B route also needs server-authoritative membership checks.
11. Vault downloads can use stale IndexedDB before current cloud authorization.
12. Vault deletion swallows cloud deletion failures.
13. Share-link tokens use `Math.random()` and are not backed by a persistent revocation model.
14. Payment state transitions need database-level enforcement.
15. Production documentation/claims still overstate readiness.

---

# Priority Legend

| Priority | Meaning |
|---|---|
| P0 | Must fix before real money / sensitive production data |
| P1 | Must fix before public launch |
| P2 | Important hardening / reliability |
| P3 | Later optimization |

---

# P0-01 — Remove Payment Direct-DB Fallback

## Error

`supabase/functions/payments/index.ts` → `fulfillPayment()` correctly calls:

`fulfill_payment_transaction`

but if the RPC fails it falls back to direct database writes.

The fallback manually updates the transaction, expires subscriptions, inserts a subscription, and updates the profile tier.

## Why it is dangerous

The RPC was introduced to provide atomic row locking and idempotent fulfillment. The fallback defeats that protection and can create partial fulfillment or race conditions between browser callback and IPN.

## Fix

**Fail closed. Never fulfill payments outside the RPC.**

## Step-by-step

1. Open `supabase/functions/payments/index.ts`.
2. Locate `fulfillPayment()`.
3. Delete the entire direct-DB fallback.
4. If the RPC returns an error, throw `PAYMENT_FULFILLMENT_UNAVAILABLE`.
5. Return a retry/reconciliation response instead of granting access.
6. Add a reconciliation job for failed fulfillment.
7. Test duplicate callbacks and concurrent IPN/browser callbacks.

### Acceptance

If the RPC is unavailable, **no subscription or profile tier is changed**.

---

# P0-02 — Remove Caller-Controlled Subscription Duration

## Error

`20260910_payment_and_quota_hardening_v2.sql` defines:

```sql
p_duration_days INTEGER DEFAULT 365
```

and calculates expiry from it.

The Edge Function passes `durationDays` to the RPC.

## Why

Duration should be determined by the authoritative plan catalog, not by a caller/application argument.

## Fix

Create an authoritative database table such as:

```text
subscription_plans
```

with:

- id
- name
- amount_bdt
- currency
- duration_days
- active
- created_at
- updated_at

## Step-by-step

1. Add a new migration.
2. Create `subscription_plans`.
3. Seed every paid plan.
4. Make payment creation read the plan from the authoritative source.
5. Make `fulfill_payment_transaction()` read `duration_days` by `v_tx.plan_id`.
6. Remove `p_duration_days` from the RPC signature.
7. Stop passing duration from TypeScript.
8. Add tests proving arbitrary duration values cannot be supplied.

### Acceptance

There is no caller-controlled duration parameter in payment fulfillment.

---

# P0-03 — Revoke Authenticated Access to Payment Fulfillment RPC

## Error

The migration grants:

```sql
GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction(...)
TO authenticated;
```

The function is `SECURITY DEFINER` and can grant subscriptions.

## Fix

Only `service_role` should execute it.

## Step-by-step

Create a new migration:

```sql
REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(
  TEXT, TEXT, TEXT, TEXT, JSONB
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.fulfill_payment_transaction(
  TEXT, TEXT, TEXT, TEXT, JSONB
) FROM anon;

GRANT EXECUTE ON FUNCTION public.fulfill_payment_transaction(
  TEXT, TEXT, TEXT, TEXT, JSONB
) TO service_role;
```

Use the final function signature after removing duration.

### Acceptance

A normal authenticated client cannot call the fulfillment RPC.

---

# P0-04 — Use a Fixed Trusted Payment Callback URL

## Error

Payment creation currently constructs callbacks using:

```ts
`${url.origin}/payments/callback/...`
```

## Why

The Edge Function request origin is not a reliable production configuration source.

## Fix

Add:

```env
PAYMENT_CALLBACK_BASE_URL=https://your-trusted-payment-endpoint
```

## Step-by-step

1. Add `PAYMENT_CALLBACK_BASE_URL`.
2. Validate it exists in production.
3. Remove the `url.origin` fallback.
4. Build success/fail/cancel/IPN URLs from this variable.
5. Keep development and production values separate.
6. Test through proxy/CDN and direct Edge Function URLs.

---

# P0-05 — Fix AI Quota Off-by-One Bug

## Error

`20260910_ai_usage_daily_and_atomic_quota.sql` uses:

```sql
IF v_new_count <= p_limit THEN
  v_allowed := true;
```

If count is already equal to the limit, the update does not increment but `v_new_count <= p_limit` remains true.

Example: limit 5, current count 5 → request 6 can be allowed.

## Fix

Make the increment itself conditional and detect whether a row was updated.

Recommended pattern:

```sql
UPDATE public.ai_usage_daily
SET
  request_count = request_count + 1,
  input_tokens = input_tokens + p_prompt_tokens,
  output_tokens = output_tokens + p_output_tokens,
  last_request_at = NOW()
WHERE user_id = p_user_id
  AND usage_date = p_usage_date
  AND request_count < p_limit
RETURNING request_count INTO v_new_count;
```

If no row is returned, return:

```json
{
  "allowed": false,
  "count": 5,
  "remaining": 0,
  "limit": 5
}
```

## Acceptance

For limit 5:

`1,2,3,4,5 = allowed`  
`6 = rejected`

Also test concurrent requests.

---

# P0-06 — Remove Non-Atomic AI Quota Fallback

## Error

`ai-gateway/index.ts` contains a fallback that performs a normal SELECT when the quota RPC is unavailable.

## Why

Concurrent requests can read the same count and bypass the quota.

## Fix

Production must fail closed.

## Step-by-step

1. Remove the SELECT-only quota fallback.
2. If the RPC fails in production, return HTTP 503.
3. Return stable code:
   `AI_QUOTA_SERVICE_UNAVAILABLE`.
4. Allow a memory fallback only for explicitly local development.
5. Add a test with concurrent requests.

---

# P0-07 — Revoke Authenticated Access to AI Quota RPC

## Error

The migration grants `check_and_increment_ai_quota()` to `authenticated`.

## Fix

Only `service_role` should execute the privileged quota function.

```sql
REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(
  UUID, DATE, INTEGER, INTEGER, INTEGER
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.check_and_increment_ai_quota(
  UUID, DATE, INTEGER, INTEGER, INTEGER
) FROM anon;

GRANT EXECUTE ON FUNCTION public.check_and_increment_ai_quota(
  UUID, DATE, INTEGER, INTEGER, INTEGER
) TO service_role;
```

---

# P0-08 — Separate Quota Reservation From Token Accounting

## Error

The quota RPC increments request count before Gemini, but after Gemini the gateway also writes `request_count` back into `ai_usage_daily`.

This creates two accounting paths.

## Fix

Use:

### Before AI request

Atomic:

- reserve one request
- increment request_count

### After AI request

Only update:

- input_tokens
- output_tokens
- last_request_at

Never overwrite request_count after reservation.

---

# P0-09 — Protect Admin Route With Server-Authoritative Roles

## Error

`src/App.tsx` renders:

```tsx
case 'admin':
  return <AdminDashboard />;
```

The visible guard only checks whether `currentUser` exists.

## Risk

Any authenticated student can navigate to:

```text
/#/admin
```

and render the AdminDashboard.

## Fix

Create a server-authoritative role model.

Example:

```text
user_roles
  user_id
  role
  active
  created_at
```

Roles may include:

- admin
- data_editor
- support
- school_admin

## Step-by-step

1. Create role table.
2. Add RLS.
3. Create server-side role check.
4. Load role only after verification.
5. Protect `/admin`.
6. Protect every admin API/mutation.
7. Do not rely on hiding navigation.
8. Test student → admin and direct API access.

---

# P0-10 — Protect School/B2B Route

## Error

`App.tsx` renders:

```tsx
case 'school':
  return <SchoolCounselorPortal />;
```

without a visible organization membership/role check.

## Fix

Create:

```text
schools
school_memberships
```

with roles such as:

- counselor
- school_admin

## Step-by-step

1. Create school/organization tables.
2. Create membership table.
3. Add RLS.
4. Verify membership server-side.
5. Protect `/school`.
6. Protect all school APIs.
7. Add cross-school tests.

---

# P1-01 — Make Cloud Storage Authorization Authoritative

## Error

`src/services/storageService.ts` checks IndexedDB before requesting a signed cloud URL.

## Risk

A deleted/revoked cloud document may still exist in the browser cache and remain downloadable.

## Fix

Use:

```text
Cloud authorization → cloud file → local cache
```

not:

```text
local cache → cloud
```

## Step-by-step

1. Verify current document ownership/access.
2. Request a short-lived signed URL.
3. Download/preview the cloud file.
4. Use IndexedDB only as a cache.
5. If cloud authorization fails, do not expose cached data.

---

# P1-02 — Do Not Swallow Cloud Deletion Errors

## Error

`deleteDocumentFile()` catches Supabase deletion errors and only logs a warning.

## Risk

UI can report success while sensitive cloud data remains.

## Fix

Cloud deletion must fail the operation.

Recommended:

```ts
const { error } = await supabase.storage
  .from(BUCKET_NAME)
  .remove([storagePath]);

if (error) {
  throw new Error("Cloud document deletion failed");
}

await deleteFileFromIndexedDB(storagePath);
```

Only remove local cache after cloud deletion succeeds.

---

# P1-03 — Replace `Math.random()` Share Tokens

## Error

`createExpiringShareLink()` uses:

```ts
Math.random().toString(36)
```

## Fix

Use:

```ts
crypto.randomUUID()
```

or `crypto.getRandomValues()`.

For a real sharing system, store only a hash of the token.

---

# P1-04 — Implement Persistent, Revocable Share Links

## Error

The current share-link implementation generates a signed URL but does not provide a complete persistent revocation/audit model.

## Required table

```text
document_share_links
  id
  document_id
  owner_user_id
  token_hash
  expires_at
  revoked_at
  access_count
  created_at
```

## Step-by-step

1. Generate cryptographic token.
2. Hash token before storage.
3. Store owner/document/expiry.
4. Validate token server-side.
5. Check expiry.
6. Check revoked_at.
7. Log access.
8. Support explicit revoke.

---

# P1-05 — Make Subscription the Authoritative Entitlement Source

## Risk

Payment fulfillment updates `profiles.tier`, while AI authorization reads active subscriptions.

These values can drift.

## Fix

Authorization should use:

```text
active subscription → plan → entitlements
```

`profiles.tier` should be a cache/display field only, or removed from authorization logic.

---

# P1-06 — Subscription Lookup Errors Must Fail Closed

## Error

The AI Gateway defaults to Free when no active subscription is found.

That is fine when the DB query succeeds with no row, but a DB failure must not be silently interpreted as Free.

## Correct behavior

```text
DB success + no subscription → Free
DB success + subscription → plan
DB error → 503
```

Use a stable code such as:

`AI_ENTITLEMENT_SERVICE_UNAVAILABLE`

---

# P1-07 — Add Payment Reconciliation

Production payment systems must recover from:

- gateway timeout
- Edge Function timeout
- database outage
- browser closing
- delayed IPN
- lost redirect

Create a scheduled reconciliation process.

For stale `initiated/pending/processing` transactions:

1. Query gateway.
2. Verify amount.
3. Verify currency.
4. Verify merchant transaction ID.
5. Call the atomic fulfillment RPC.
6. Record reconciliation result.
7. Alert on mismatches.

---

# P1-08 — Enforce Payment State Transitions in the Database

A CHECK constraint only limits status values. It does not prevent invalid transitions.

Recommended states:

```text
initiated → pending
pending → processing
processing → success
pending → failed
processing → failed
pending → cancelled
pending → expired
success → refunded
```

Reject transitions such as:

```text
success → failed
success → cancelled
success → pending
```

Implement a trigger or controlled stored procedure.

---

# P1-09 — Redact Gateway Responses

The system stores `gateway_response` / raw provider responses.

Do not persist unnecessary:

- payment PII
- card/payment-sensitive data
- secrets
- raw provider payloads

Store only safe identifiers, status, amount, currency, payment method and diagnostic codes.

---

# P1-10 — Add Server-Side File Signature Validation

Client MIME type and extension can be spoofed.

The storage bucket MIME restrictions are useful but should not be the only protection for sensitive documents.

Add:

- magic-byte validation
- normalized MIME
- executable rejection
- safe object names
- filename sanitization

---

# P1-11 — Prefer Internal Storage Object IDs

Instead of:

```text
userId/docId/version/fileName
```

prefer:

```text
userId/docId/version/randomObjectId
```

Keep the display filename in the database.

This reduces metadata leakage and filename/path issues.

---

# P1-12 — Test RLS With Real Cross-User Scenarios

Create:

```text
student_A
student_B
```

Verify:

- A cannot read B profile
- A cannot read B documents
- A cannot update B application
- A cannot read B AI usage
- A cannot modify B subscription
- A cannot execute privileged RPCs
- A cannot access B private share links

---

# P2-01 — Anonymous AI Quota Is Instance-Local

Anonymous quota uses an in-memory Map.

It is not shared between Edge Function instances or restarts.

For production, use a persistent/distributed rate-limit mechanism.

Keep memory tracking only as a local optimization.

---

# P2-02 — Burst Rate Limiting Is Instance-Local

The same issue applies to the in-memory burst tracker.

Use distributed or database-backed rate limiting for production.

---

# P2-03 — Add Token-Based AI Limits

Character limits are useful but do not equal model token limits.

Enforce:

- request body byte limit
- character limit
- token budget
- output token budget
- reasonable nesting/depth

---

# P2-04 — Verify Data Provenance

The product claims verified university/program/scholarship data.

Every important fact should have:

```text
source_url
source_name
source_type
verified_at
verification_status
verified_by
expires_at
confidence
```

AI should only call a fact “verified” if the underlying database record is verified.

---

# P2-05 — Avoid Unvalidated Admission Probabilities

Do not present deterministic heuristic scores as real admission probabilities unless the model is statistically validated and calibrated.

Prefer:

```text
Strong Match
Good Match
Possible Match
Low Match
```

If probability ranges are later introduced, show methodology, confidence and last-updated date.

---

# P2-06 — Consider BrowserRouter for SEO

The application currently uses `HashRouter`.

If public SEO pages are important, move to `BrowserRouter` and configure hosting rewrites.

This is not a payment/security blocker.

---

# P2-07 — Remove “Enterprise-Grade” Until Independently Verified

The README currently calls the platform “enterprise-grade”.

Given the remaining P0/P1 findings, use a more accurate phrase until a real production security review is completed, such as:

> production-focused admissions intelligence platform

---

# P2-08 — Separate Development and Production Environment Documentation

Document separately:

### Development

- sandbox gateway
- localhost callback
- development environment
- optional simulation

### Production

- production gateway
- production callback
- simulation disabled
- service-role secrets
- monitoring
- alerts

---

# P2-09 — Add Request IDs

Every payment/AI request should have a request ID.

Use it in:

- logs
- error responses
- payment metadata
- AI telemetry
- support/debugging.

---

# P2-10 — Add Structured Error Codes

Use stable codes such as:

```text
AUTH_REQUIRED
INVALID_PLAN
PAYMENT_GATEWAY_UNAVAILABLE
PAYMENT_VERIFICATION_FAILED
PAYMENT_FULFILLMENT_FAILED
PAYMENT_FULFILLMENT_UNAVAILABLE
AI_QUOTA_EXCEEDED
AI_QUOTA_SERVICE_UNAVAILABLE
AI_ENTITLEMENT_SERVICE_UNAVAILABLE
DOCUMENT_NOT_FOUND
DOCUMENT_ACCESS_DENIED
DOCUMENT_DELETE_FAILED
ADMIN_ACCESS_REQUIRED
SCHOOL_ACCESS_REQUIRED
```

---

# P2-11 — Add Production Observability

Alert on:

### Payment

- gateway errors
- verification failures
- fulfillment RPC failures
- reconciliation backlog
- duplicate callbacks

### AI

- quota RPC failures
- Gemini errors
- token spikes
- 429 spikes
- latency spikes

### Storage

- upload failures
- deletion failures
- signed URL failures
- unusual access patterns

---

# P2-12 — Add Data Retention Policy

Define retention/deletion behavior for:

- academic profiles
- documents
- SOP drafts
- CV data
- financial information
- AI prompts/results
- telemetry
- payment records
- audit logs
- backups

Update the Privacy Policy accordingly.

---

# P2-13 — Do Not Log Student PII in AI Telemetry

Prefer:

```text
request_id
hashed_user_id
action
model
latency
token counts
status
```

Avoid raw:

- prompts
- SOP text
- CV text
- passport data
- phone numbers
- addresses
- uploaded document content.

---

# P0 — Production Payment Smoke Tests

Before accepting real money:

## Test 1 — Free

Expected:

- Free tier
- no active paid subscription
- paid AI unavailable

## Test 2 — Explorer

Expected:

- transaction created
- gateway checkout works
- gateway verification succeeds
- atomic fulfillment succeeds
- one active subscription
- correct expiry
- correct entitlement

## Test 3 — Duplicate callback

Expected:

- no second subscription
- no tier corruption

## Test 4 — Failed payment

Expected:

- failed transaction
- no subscription
- no paid entitlement

## Test 5 — Cancelled payment

Expected:

- cancelled transaction
- no paid entitlement

## Test 6 — RPC outage

Expected:

- no entitlement
- transaction remains reconcilable
- no direct-DB fallback

---

# P0 — Database Verification Before Launch

## Check active subscription uniqueness

```sql
SELECT user_id, COUNT(*)
FROM subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Expected: **0 rows**

## Successful payment without subscription

```sql
SELECT pt.id, pt.user_id, pt.plan_id
FROM payment_transactions pt
LEFT JOIN subscriptions s
  ON s.payment_transaction_id = pt.id
WHERE pt.status IN ('success', 'completed')
  AND s.id IS NULL;
```

Investigate every row.

## Active subscription without successful payment

```sql
SELECT s.id, s.user_id, s.plan_id
FROM subscriptions s
LEFT JOIN payment_transactions pt
  ON pt.id = s.payment_transaction_id
WHERE s.status = 'active'
  AND (
    pt.id IS NULL
    OR pt.status NOT IN ('success', 'completed')
  );
```

Expected: **0 rows**

## Verify privileged function grants

```sql
SELECT routine_name, grantee
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'fulfill_payment_transaction',
  'check_and_increment_ai_quota'
);
```

Expected privileged functions: **service_role only**.

---

# Required Implementation Order

## Phase 1 — Payment

1. Remove direct fulfillment fallback.
2. Remove duration RPC parameter.
3. Create authoritative subscription plan table.
4. Revoke authenticated payment RPC execution.
5. Fix callback base URL.
6. Enforce payment state transitions.
7. Add reconciliation.
8. Add payment regression tests.

## Phase 2 — AI

9. Fix quota off-by-one.
10. Remove non-atomic quota fallback.
11. Revoke authenticated quota RPC.
12. Separate quota reservation from token accounting.
13. Make subscription lookup fail closed.
14. Replace anonymous memory quota with persistent/distributed control.
15. Add concurrency tests.

## Phase 3 — Vault

16. Make cloud authorization authoritative.
17. Stop local-cache-first downloads.
18. Fail on cloud deletion errors.
19. Replace `Math.random()`.
20. Implement persistent share links.
21. Add revoke/expiry/access logging.
22. Add server-side file validation.

## Phase 4 — Authorization

23. Implement admin roles.
24. Protect `/admin`.
25. Protect admin APIs.
26. Implement school memberships.
27. Protect `/school`.
28. Add cross-user/cross-school tests.

## Phase 5 — Production Operations

29. Add request IDs.
30. Add structured logging.
31. Add alerts.
32. Add reconciliation monitoring.
33. Test backup/restore.
34. Separate production/development documentation.
35. Remove overstated production claims until verified.

---

# Definition of Done

## Payment

- [ ] No direct DB fallback
- [ ] Only service role can fulfill payments
- [ ] Duration is authoritative
- [ ] Price is authoritative
- [ ] Currency is authoritative
- [ ] Gateway amount verified
- [ ] Gateway currency verified
- [ ] Duplicate callbacks idempotent
- [ ] IPN and browser callback safe
- [ ] Reconciliation exists
- [ ] Callback URL is configured, not request-derived
- [ ] Failed fulfillment grants no entitlement

## AI

- [ ] Quota off-by-one fixed
- [ ] Quota atomic
- [ ] No production non-atomic fallback
- [ ] Only service role executes quota RPC
- [ ] Subscription is authoritative
- [ ] Subscription lookup fails closed on DB errors
- [ ] Anonymous quota is persistent/distributed
- [ ] Token accounting cannot overwrite request count
- [ ] PII excluded from logs

## Vault

- [ ] Cloud authorization authoritative
- [ ] Deleted cloud files cannot be served from cache
- [ ] Cloud deletion errors surface
- [ ] Share links are persistent/revocable
- [ ] Share tokens are cryptographically random
- [ ] Server-side file validation exists
- [ ] Cross-user tests pass
- [ ] 20MB limits are consistent

## Authorization

- [ ] Admin roles exist in DB
- [ ] Admin UI protected
- [ ] Admin APIs protected
- [ ] School membership exists
- [ ] School APIs protected
- [ ] Cross-user/cross-school tests pass

## Operations

- [ ] Production environment validation
- [ ] Request IDs
- [ ] Structured logging
- [ ] Payment alerts
- [ ] AI alerts
- [ ] Storage alerts
- [ ] Backup/restore test
- [ ] Production smoke tests
- [ ] Security regression suite

---

# Final Conclusion

The latest commit is a strong step forward, but several **real production blockers remain**.

The most critical problem is:

> The project has an atomic payment fulfillment RPC, but the Edge Function still falls back to direct database fulfillment when that RPC fails.

That must be removed before real payments.

The next critical problem is:

> The AI quota mechanism is intended to be atomic, but its SQL currently contains an off-by-one bug and the gateway still has non-atomic fallback logic.

Finally:

> Admin/School authorization and Vault cache authorization need to become server-authoritative.

Once all P0/P1 items are implemented, rerun the complete regression suite and production smoke tests before launch.

---

## Immediate files to modify

```text
supabase/functions/payments/index.ts
supabase/functions/ai-gateway/index.ts
supabase/migrations/20260910_payment_and_quota_hardening_v2.sql
supabase/migrations/20260910_ai_usage_daily_and_atomic_quota.sql
src/services/storageService.ts
src/App.tsx
src/components/admin/AdminDashboard.tsx
src/components/b2b/SchoolCounselorPortal.tsx
README.md
```

**Audit basis:** current public GitHub `main` branch and current source/migration contents reviewed on 2026-09-10. This audit focuses on issues that remain after the latest fixation commit rather than repeating already-fixed issues.
