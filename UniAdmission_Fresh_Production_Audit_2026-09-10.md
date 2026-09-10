# UniAdmission — Fresh Production Bug / Security / Fixation Audit

**Repository:** `nasibarif/uniadmission`  
**Branch:** `main`  
**Review date:** 2026-09-10  
**Latest commit observed:** `f05797b`

## Executive Summary

This is a fresh review of the current repository, not a copy of the previous audit.

Several earlier fixes are now present, including atomic AI quota infrastructure, cloud-first document authorization, cryptographic share tokens, and stronger entitlement checks. However, the current `main` branch contains a **critical payment regression**.

The current payment Edge Function is implementing a bKash/manual-TrxID flow while the README and frontend service still describe an SSLCOMMERZ/gateway-abstraction flow. More importantly, `/verify-payment` accepts a user-supplied TrxID, checks only its format, then marks the transaction completed and grants a subscription. There is no server-to-server provider verification before entitlement is granted.

**Do not use the current payment implementation for real-money production.**

---

# Priority Legend

| Priority | Meaning |
|---|---|
| P0 | Production blocker — fix before real payments |
| P1 | Must fix before public launch |
| P2 | Important hardening / reliability |
| P3 | Later improvement |

---

# P0-01 — Payment Verification Can Grant Paid Access Without Provider Verification

## Error

The current payment function exposes `/verify-payment` and accepts:

```ts
const { paymentId, trxId, customerAccount } = body;
```

It validates the TrxID format and then directly updates the transaction to `completed`, creates a subscription, and updates the profile tier.

There is no server-side bKash/payment-provider verification in this path.

## Why this is critical

A user who knows or fabricates a valid-looking TrxID can potentially obtain paid access without actually paying.

## Fix

Replace the flow with:

```text
Authenticated user
    ↓
Server creates payment
    ↓
Official gateway processes payment
    ↓
Gateway callback/IPN
    ↓
Server-to-server provider verification
    ↓
Verify merchant reference
Verify amount
Verify currency
Verify provider status
    ↓
Atomic fulfillment RPC
    ↓
Subscription
    ↓
Entitlements
```

Never grant a subscription merely because a client submitted a TrxID.

## Step-by-step

1. Disable the current `/verify-payment` entitlement-granting logic.
2. Select the actual production gateway.
3. Implement the official provider API.
4. Create a server-generated merchant transaction ID.
5. Store it in `payment_transactions`.
6. Receive the provider callback/IPN.
7. Query/verify the transaction server-to-server.
8. Verify exact amount.
9. Verify exact currency.
10. Verify provider transaction ID.
11. Verify merchant transaction ID.
12. Verify successful provider status.
13. Only then call `fulfill_payment_transaction()`.
14. Test with fake, reused, and wrong-user TrxIDs.

### Acceptance

A fabricated TrxID cannot create a subscription.

---

# P0-02 — Old Payment Trigger Creates a Second Fulfillment Path

## Error

The migration `20260909_production_fixation_bkash_and_hardening.sql` creates `handle_completed_bkash_payment()`.

When `payment_transactions.status` becomes `completed`, the trigger creates:

- subscription
- profile tier
- entitlements

The newer migration also contains `fulfill_payment_transaction()`.

Therefore the database currently has two competing payment fulfillment mechanisms.

## Fix

Use exactly one authoritative path:

```text
Verified gateway payment
→ atomic fulfillment RPC
```

Delete/disable the old `handle_completed_bkash_payment` trigger and function after migrating any required data.

## Acceptance

There is exactly one code path capable of granting a paid subscription.

---

# P0-03 — Old Trigger Uses Hard-Coded 30-Day Expiry

## Error

The old trigger uses:

```sql
NOW() + INTERVAL '30 days'
```

This conflicts with the product plans that are advertised as 365-day plans.

## Fix

Delete the trigger and calculate duration from the authoritative plan catalog.

Required architecture:

```text
transaction.plan_id
→ subscription_plans.duration_days
→ expires_at
```

Never hard-code 30/365 days in multiple places.

---

# P0-04 — Atomic Fulfillment Still Accepts Caller-Supplied Duration

## Error

`fulfill_payment_transaction()` still accepts:

```sql
p_duration_days INTEGER DEFAULT 365
```

and uses it to calculate expiry.

## Fix

Remove `p_duration_days` entirely.

The function must load the duration from the authoritative database plan.

## Step-by-step

1. Create `subscription_plans`.
2. Store `duration_days` there.
3. Seed Free, Explorer, Application, Complete, School.
4. Make the fulfillment RPC read the plan.
5. Remove `p_duration_days`.
6. Update all callers.
7. Add a test proving arbitrary duration cannot be supplied.

---

# P0-05 — `my-entitlement` Defaults to Explorer

## Error

The current payment Edge Function effectively uses:

```ts
const activePlan = sub?.plan_id || "Explorer";
```

A user with no subscription can therefore receive Explorer as the reported entitlement.

## Fix

Use:

```ts
const activePlan = sub?.plan_id || "Free";
```

And distinguish:

```text
DB success + no subscription → Free
DB error → 503
active subscription → actual plan
```

Never default to a paid plan.

## Acceptance

- New user → Free
- No subscription → Free
- Expired subscription → Free
- DB entitlement error → 503

---

# P0-06 — Payment DB Insert Failure Still Returns Success

## Error

The payment function logs a database insertion error but continues and can return `success: true`.

## Fix

Fail immediately:

```ts
if (dbError) {
  return new Response(
    JSON.stringify({
      success: false,
      error: {
        code: "PAYMENT_TRANSACTION_CREATE_FAILED",
        message: "Unable to initialize payment transaction."
      }
    }),
    { status: 500, headers: ... }
  );
}
```

No checkout/payment session should be returned unless the local transaction exists.

---

# P0-07 — School Plan Is Inconsistent Across Layers

## Error

Frontend pricing includes:

```text
School = 19990
```

but the older payment migration's `plan_id` CHECK constraint only permits:

```text
Free
Explorer
Application
Complete
```

School is missing.

## Fix

Create one authoritative:

```text
subscription_plans
```

table.

Every layer must consume the same catalog.

Required fields:

```text
id
name
amount_bdt
currency
duration_days
active
```

Optional:

```text
features
ai_daily_limit
organization_required
```

---

# P0-08 — Payment IDs Still Use `Math.random()`

## Error

The current payment function generates IDs using:

```ts
Math.random().toString(36)
```

## Fix

Use:

```ts
crypto.randomUUID()
```

Example:

```ts
const merchantTransactionId = `UA_${crypto.randomUUID()}`;
```

Payment identifiers must never rely on predictable pseudo-randomness.

---

# P0-09 — Hard-Coded Merchant Account Information

## Error

The current payment response contains a hard-coded merchant account number.

## Fix

Do not hard-code real merchant configuration in source code.

Store required server configuration in protected environment variables/secrets.

Only return information that the browser actually needs.

---

# P0-10 — Payment Callback Uses Request-Origin Fallback

## Error

The bKash callback currently falls back to:

```ts
`${url.origin}/api/bkash/callback`
```

## Fix

Production must require a fixed environment variable:

```env
BKASH_CALLBACK_URL=https://your-domain.example/...
```

No request-origin fallback in production.

---

# P0-11 — Payment State Machine Is Not Fully Enforced

A status CHECK constraint only validates status values; it does not enforce legal transitions.

## Fix

Enforce transitions such as:

```text
initiated → pending
pending → processing
processing → success
processing → failed
pending → failed
pending → cancelled
pending → expired
success → refunded
```

Reject:

```text
success → pending
success → failed
success → cancelled
failed → success
```

unless a controlled reconciliation/refund workflow explicitly permits it.

---

# P1-01 — Frontend Payment Endpoint Does Not Match Edge Function

## Error

`PaymentService.createPaymentSession()` calls:

```text
/functions/v1/payments/create
```

while the current Edge Function handles:

```text
/create-payment
/create-checkout-session
/
```

not `/create`.

## Fix

Choose one canonical API contract.

Recommended:

```text
POST /create
GET  /status
POST /webhook
GET  /entitlements
```

Update frontend and backend together.

---

# P1-02 — README Payment Architecture Does Not Match Current Code

The README describes SSLCOMMERZ server-to-server validation and a gateway abstraction, while the current Edge Function implements bKash/manual TrxID verification.

## Fix

After selecting the final gateway, update:

- README
- environment variables
- API documentation
- frontend payment service
- Edge Function
- migrations
- tests

All must describe the same architecture.

---

# P1-03 — Local Storage Payment Fallback Must Not Exist in Production

`PaymentService.getTransactions()` falls back to localStorage if the database query fails.

This can show stale/fabricated payment history.

## Fix

Production:

```text
DB success → show server records
DB error → show error
```

Local fallback only under an explicit development/demo flag.

---

# P1-04 — Admin Payment Mutation Has a Local Fallback

`adminUpdateTransaction()` can update localStorage when Supabase fails.

## Fix

Admin mutations must always be server-authoritative.

No localStorage fallback for payment administration.

---

# P1-05 — Admin Subscription Query Needs Server-Side Authorization

`getAllSubscriptions()` is implemented in the frontend client and queries the subscriptions table directly.

## Fix

Create an admin Edge Function or protected RPC.

Server flow:

```text
JWT
→ user
→ server-side role registry
→ permission check
→ query
```

RLS should also enforce tenant/admin boundaries.

---

# P1-06 — UI Admin Role Check Is Not a Security Boundary

`App.tsx` checks `currentUser.role` / `currentUser.roles`.

That is acceptable for UI rendering but insufficient for backend authorization.

## Fix

Every admin mutation/API must independently verify server-side role membership.

---

# P1-07 — School Access Uses Subscription Tier as a Role

The UI currently allows School access when:

```ts
currentUser.tier === "School"
```

A paid subscription is not the same as organization membership.

## Fix

Create:

```text
schools
school_memberships
```

with roles such as:

```text
school_admin
counselor
```

Require active membership for B2B operations.

---

# P1-08 — Remove Client Tier Persistence as an Authority

`AppContext` persists:

```ts
account: { tier: userTier }
```

The tier should not be treated as user-owned application data.

## Fix

Use:

```text
subscriptions
→ entitlements
→ UI
```

Only.

Client tier is a cache/display value.

---

# P1-09 — AI Quota Is Now Atomic, But Anonymous Rate Limiting Is Not Distributed

The persistent authenticated quota implementation is substantially improved.

However, anonymous requests still use an in-memory tracker.

This does not coordinate across Edge Function instances.

## Fix

Use a persistent/distributed anonymous rate limit.

Do not rely only on:

```text
Map<IP, count>
```

for production abuse prevention.

---

# P1-10 — AI CORS Is Still Wildcard

The AI gateway uses:

```http
Access-Control-Allow-Origin: *
```

## Fix

Use an allowlist:

```text
https://uniadmission.com
https://www.uniadmission.com
```

and development origins only outside production.

---

# P1-11 — AI Quota Reservation Policy Needs to Be Explicit

The gateway reserves the AI request before Gemini completes.

If Gemini fails, the request can still count.

## Fix

Choose and document one policy.

### Policy A

Every attempt counts.

### Policy B

Only successful generations count.

If Policy B:

```text
reserve
→ Gemini
→ success = commit
→ failure = release
```

Do not accidentally implement a hybrid.

---

# P1-12 — Storage Share-Link Registry Failure Is Swallowed

`createExpiringShareLink()` catches errors when registering the persistent share link and continues.

## Risk

A signed URL can be returned even when the revocation/audit record was not created.

## Fix

If persistent sharing is required:

```text
signed URL created
+
share record created
=
success
```

Otherwise return an error.

---

# P1-13 — Generated Share Token Is Not the Actual Authorization Token

The service generates:

```ts
share_${crypto.randomUUID()}
```

and hashes it, but the actual URL returned is a Supabase signed URL.

The generated token does not authorize that URL.

## Fix

Choose one design.

### Recommended

Use application URLs:

```text
/share/<token>
```

Then server:

1. hashes token
2. finds share record
3. checks expiry
4. checks revoked_at
5. checks owner/document
6. generates a short-lived Supabase signed URL

This makes revocation meaningful.

---

# P1-14 — Client File Validation Must Be Repeated Server-Side

The frontend now has strong validation:

- extension
- MIME
- magic bytes
- size

But browser checks can be bypassed.

## Fix

Perform trusted validation server-side/in storage infrastructure as well.

Use:

```text
client validation
+
server validation
+
storage policy
```

---

# P1-15 — Verify the Actual Storage Bucket Limit

Frontend currently allows:

```text
20 MB
```

Verify that the Supabase Storage bucket also allows the same limit.

Otherwise users may be able to select a valid 20MB file that the backend rejects.

---

# P1-16 — `upsert: true` Can Overwrite a Version

Current storage upload uses:

```ts
upsert: true
```

with a path containing filename/version.

## Fix

Use immutable object IDs:

```text
userId/documentId/version/randomObjectId
```

Store the display filename separately.

---

# P1-17 — Storage Path Contains Filename

Current path:

```text
userId/docId/v1/fileName
```

Use:

```text
userId/docId/v1/randomObjectId
```

and keep:

```text
original_filename
```

in metadata/database.

---

# P1-18 — Verify the Claimed AES-GCM Encryption

The README claims:

```text
AES-GCM-256 end-to-end client-side document encryption
```

But `storageService.ts` itself stores a Blob in IndexedDB and uploads the provided File.

## Required verification

Confirm that encryption happens:

```text
before upload
```

and that the cloud receives ciphertext, not plaintext.

Also verify:

- key generation
- key storage
- recovery
- IV uniqueness
- authentication tag
- cross-device behavior
- key loss behavior

If these are not implemented, remove or weaken the README claim.

---

# P1-19 — Application Data Is Too Client-State Driven

`AppContext` treats the browser state as the main application model for:

- profile
- applications
- vault metadata
- roadmap
- tier

## Fix

Move authoritative records into PostgreSQL with RLS.

Browser should be:

```text
UI state/cache
```

not:

```text
business data authority
```

---

# P2-01 — Demo Login Must Be Disabled in Production

The application still contains `loginAsDemo()`.

Make sure the actual demo authentication path is impossible when:

```env
ENVIRONMENT=production
```

Do not only hide the button.

---

# P2-02 — Development Fallbacks Need Explicit Production Gates

Production startup should fail if critical configuration is missing.

Validate:

```text
ENVIRONMENT
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GEMINI_API_KEY
PAYMENT_GATEWAY
PAYMENT_CALLBACK_URL
provider credentials
```

Do not silently fall back to local/demo behavior.

---

# P2-03 — Payment Reconciliation Job

Create a scheduled job for transactions stuck in:

```text
initiated
pending
processing
```

for too long.

Flow:

```text
find stale transaction
→ query provider
→ verify
→ atomic fulfillment
→ record result
```

This protects against:

- callback failure
- browser closure
- gateway delay
- Edge Function timeout
- network interruption

---

# P2-04 — Payment Concurrency Testing

Simulate:

```text
IPN
+
browser callback
+
retry
+
reconciliation
```

simultaneously.

Expected:

```text
1 successful transaction
1 subscription
1 entitlement set
```

---

# P2-05 — Add Payment Failure Matrix Tests

Test:

| Scenario | Expected |
|---|---|
| Invalid plan | 400 |
| DB insert failure | 500 |
| Gateway timeout | pending/retryable |
| Gateway failed | failed |
| Wrong amount | verification_failed |
| Wrong currency | verification_failed |
| Wrong merchant reference | verification_failed |
| Duplicate callback | idempotent |
| Already fulfilled | no duplicate |
| Fulfillment RPC failure | no entitlement |

---

# P2-06 — Add AI Failure Matrix Tests

Test:

| Scenario | Expected |
|---|---|
| Missing Gemini key | 503 |
| Quota DB failure in production | 503 |
| Exact quota limit | 429 |
| Concurrent quota requests | never exceed limit |
| Gemini 429 | documented quota policy |
| Gemini 500 | documented quota policy |
| Invalid model | 400 |
| Invalid action | 400 |
| Huge prompt | 413 |
| Paid action on Free | 403 |
| Anonymous SOP | 401 |

---

# P2-07 — Add RLS Isolation Tests

Create:

```text
student_A
student_B
school_A
school_B
admin_A
```

Verify:

- A cannot read B profile
- A cannot read B applications
- A cannot read B documents
- A cannot read B payment records
- School A cannot read School B data
- Student cannot execute admin operations

---

# P2-08 — Plan Catalog Must Be the Single Source of Truth

Remove duplicated definitions such as:

```ts
PLAN_PRICING_BDT
PLANS
tierWeights
PAID_TIERS
features
```

Use:

```text
subscription_plans
subscription_plan_features
```

and derive client-safe values from the server.

---

# P2-09 — Do Not Hard-Code Application Deadlines

The roadmap currently contains examples such as:

- Purdue EA
- U of T Early Review
- KAIST
- Lester B. Pearson
- Uni-Assist
- Studielink

These can become stale.

Store:

```text
deadline
source_url
verified_at
academic_cycle
deadline_type
```

and show verification dates.

---

# P2-10 — Personalized Roadmap Must Be Data-Driven

Do not show hard-coded university/country milestones as a student's personalized roadmap unless derived from:

```text
student profile
+
selected universities
+
program
+
country
+
intake
+
verified deadlines
```

---

# P2-11 — Admission "Probability" Needs Calibration

Prefer:

```text
Strong Match
Good Match
Possible Match
Low Match
```

unless admission probability has a validated statistical model.

Do not present heuristic scores as scientifically calibrated probabilities.

---

# P2-12 — AI Model Allowlist Needs Maintenance

The gateway currently allows multiple Gemini model names.

Verify each model is:

- currently supported
- deployed
- approved
- priced appropriately
- covered by tests

Remove obsolete model identifiers.

---

# P2-13 — Prompt Injection Defense Must Not Be the Only Security Boundary

The `<untrusted_student_input>` approach is useful, but user content must never control:

- database permissions
- tool permissions
- payment state
- entitlement state
- server configuration
- privileged actions

---

# P2-14 — Production Observability

Add alerts for:

### Payment

- verification failures
- pending transactions
- fulfillment failures
- duplicate callbacks
- amount mismatches
- provider errors

### AI

- quota failures
- upstream errors
- latency
- token spikes
- cost spikes

### Storage

- upload failures
- signed URL failures
- delete failures
- abnormal share activity

---

# P2-15 — Do Not Store Unnecessary Payment PII

Review:

```text
customer_account
gateway_response
metadata
```

Store only information necessary for:

- reconciliation
- accounting
- support
- compliance

---

# P2-16 — Security-Definer Function Audit

For every:

```sql
SECURITY DEFINER
```

function verify:

- fixed search_path
- strict input validation
- correct execution grants
- no dynamic SQL injection
- no user privilege escalation

Remove obsolete payment security-definer functions after consolidating fulfillment.

---

# 63. Required Implementation Order

## Phase 1 — STOP PAYMENT RISK

1. Disable current manual `/verify-payment`.
2. Remove automatic subscription granting from client-supplied TrxID.
3. Disable the old bKash completion trigger.
4. Change entitlement default from Explorer to Free.
5. Make payment DB insertion fail closed.
6. Choose the final production gateway.

## Phase 2 — ONE PAYMENT ARCHITECTURE

7. Create authoritative `subscription_plans`.
8. Remove duplicated plan definitions.
9. Generate secure merchant transaction IDs.
10. Initiate payment through provider.
11. Receive callback/IPN.
12. Verify provider server-to-server.
13. Verify amount.
14. Verify currency.
15. Verify merchant reference.
16. Verify provider status.
17. Call only atomic fulfillment RPC.
18. Remove duration argument.
19. Enforce state transitions.
20. Add reconciliation.

## Phase 3 — FRONTEND/BACKEND CONTRACT

21. Standardize payment endpoints.
22. Remove obsolete endpoint names.
23. Remove production localStorage fallbacks.
24. Make admin payment operations server-authoritative.

## Phase 4 — ENTITLEMENTS / AUTHORIZATION

25. Make subscriptions authoritative.
26. Make plan features data-driven.
27. Implement admin roles server-side.
28. Implement school memberships server-side.
29. Add cross-user and cross-school RLS tests.

## Phase 5 — AI

30. Keep atomic quota.
31. Fix distributed anonymous limiting.
32. Restrict CORS.
33. Define quota-on-failure behavior.
34. Maintain model allowlist.
35. Test concurrent requests.

## Phase 6 — VAULT

36. Verify real encryption.
37. Make share-link registry atomic.
38. Make share token the actual application authorization token.
39. Add server-side file validation.
40. Use immutable object IDs.
41. Verify storage bucket limits.

## Phase 7 — PRODUCTION

42. Add monitoring.
43. Add alerts.
44. Add payment reconciliation.
45. Test backups/restores.
46. Run security regression tests.
47. Update README.
48. Remove unsupported security claims.
49. Run real staging payment tests.
50. Only then enable production payments.

---

# 64. Database Verification Queries

## Active subscription without successful payment

```sql
SELECT
  s.id,
  s.user_id,
  s.plan_id,
  s.payment_transaction_id
FROM public.subscriptions s
LEFT JOIN public.payment_transactions p
  ON p.id = s.payment_transaction_id
WHERE s.status = 'active'
  AND (
    p.id IS NULL
    OR p.status NOT IN ('success', 'completed')
  );
```

Expected: **0 rows**.

## Successful payment without subscription

```sql
SELECT
  p.id,
  p.user_id,
  p.plan_id,
  p.status
FROM public.payment_transactions p
LEFT JOIN public.subscriptions s
  ON s.payment_transaction_id = p.id
WHERE p.status IN ('success', 'completed')
  AND s.id IS NULL;
```

Investigate every result.

## Multiple active subscriptions

```sql
SELECT
  user_id,
  COUNT(*) AS active_count
FROM public.subscriptions
WHERE status = 'active'
GROUP BY user_id
HAVING COUNT(*) > 1;
```

Expected: **0 rows**.

## Expired but active

```sql
SELECT
  id,
  user_id,
  plan_id,
  expires_at,
  current_period_end
FROM public.subscriptions
WHERE status = 'active'
  AND expires_at IS NOT NULL
  AND expires_at <= NOW();
```

Expected: **0 rows**.

## Privileged function grants

```sql
SELECT routine_name, grantee
FROM information_schema.routine_privileges
WHERE routine_name IN (
  'fulfill_payment_transaction',
  'check_and_increment_ai_quota'
);
```

Expected privileged execution: `service_role`.

---

# 65. Mandatory Payment Security Tests

## Fake TrxID

Submit a random valid-looking TrxID.

Expected:

```text
verification_failed
NO subscription
NO entitlement
```

## Another user's TrxID

User A pays.

User B submits A's TrxID.

Expected:

```text
Rejected
NO User B subscription
```

## Wrong amount

Expected:

```text
Rejected
```

## Duplicate callback

Expected:

```text
Exactly one subscription
```

## Fulfillment RPC failure

Expected:

```text
No entitlement
Transaction remains reconcilable
```

---

# 66. Mandatory AI Quota Test

For a limit of 5:

```text
Request 1 → allowed
Request 2 → allowed
Request 3 → allowed
Request 4 → allowed
Request 5 → allowed
Request 6 → rejected
```

Repeat concurrently.

Expected: the database never permits more than five successful reservations.

---

# 67. Final Definition of Done

## Payment

- [ ] One production gateway architecture
- [ ] No client-provided payment proof
- [ ] Server-to-server verification
- [ ] Exact amount verification
- [ ] Exact currency verification
- [ ] Merchant reference verification
- [ ] Atomic fulfillment
- [ ] Old payment trigger removed
- [ ] Duration authoritative in DB
- [ ] No hard-coded merchant account
- [ ] No Math.random payment IDs
- [ ] DB insert failures fail closed
- [ ] No-subscription entitlement = Free
- [ ] One active subscription
- [ ] State transitions enforced
- [ ] Reconciliation exists
- [ ] Duplicate callbacks safe

## AI

- [ ] Atomic quota
- [ ] Exact quota boundary
- [ ] Production fail-closed
- [ ] Subscription authoritative
- [ ] CORS allowlist
- [ ] Distributed anonymous limiting
- [ ] Defined upstream-failure policy
- [ ] Model allowlist maintained
- [ ] No PII in telemetry

## Vault

- [ ] Cloud authorization authoritative
- [ ] Cloud deletion authoritative
- [ ] Share token actually controls access
- [ ] Revocation works
- [ ] Server-side file validation
- [ ] Immutable object IDs
- [ ] Bucket size verified
- [ ] Encryption implementation verified

## Authorization

- [ ] Server-side admin roles
- [ ] Server-side school membership
- [ ] RLS tests
- [ ] Cross-user isolation
- [ ] Cross-school isolation
- [ ] Client tier/role never used as security boundary

## Operations

- [ ] Production configuration validation
- [ ] Request IDs
- [ ] Structured logs
- [ ] Payment alerts
- [ ] AI alerts
- [ ] Storage alerts
- [ ] Payment reconciliation
- [ ] Backup/restore test
- [ ] Security regression suite
- [ ] README matches deployed architecture

---

# 68. Final Verdict

## Current status: **NOT READY FOR REAL-MONEY PRODUCTION**

The most serious problem is the current payment verification path.

The dangerous architecture is currently close to:

```text
User
 ↓
submit paymentId + TrxID
 ↓
TrxID format looks valid
 ↓
mark payment completed
 ↓
create subscription
 ↓
grant entitlements
```

It must become:

```text
User
 ↓
server creates payment
 ↓
official payment provider
 ↓
provider callback/IPN
 ↓
server-to-server verification
 ↓
amount + currency + merchant reference verified
 ↓
atomic fulfillment RPC
 ↓
subscription
 ↓
entitlements
```

Do not connect the production payment account until this is implemented and independently tested.

The AI quota and document-storage work is substantially better than earlier versions, but the payment architecture needs to be consolidated and secured before UniAdmission can safely accept customer money.
