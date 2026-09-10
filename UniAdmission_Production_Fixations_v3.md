# UniAdmission — Production Errors & Step-by-Step Fixation Plan v3

**Repository:** `nasibarif/uniadmission`  
**Latest reviewed commit:** `f05797b` — `fix: production fixations v2 for payments, ai quota, storage and workflows`  
**Purpose:** Remaining production errors found after the v2 fixes, with exact step-by-step implementation instructions.

> **Important:** Several v2 fixes exist in the repository but are not fully wired into the runtime path yet. This document focuses on finishing those fixes rather than repeating the old checklist.

---

# Priority Legend

- **P0 — Critical:** Must be fixed before real customer payments / production launch.
- **P1 — High:** Should be fixed before public launch or immediately after P0.
- **P2 — Medium:** Reliability, maintainability, and scale improvements.
- **P3 — Later:** Product and operations improvements.

---

# 1. ERROR — Atomic Payment Fulfillment RPC Exists but Is Not Actually Used

## Problem

`fulfill_payment_transaction(...)` was added to perform atomic payment fulfillment with row locking, but the payment Edge Function still contains manual fulfillment logic in success/IPN paths.

There are effectively two fulfillment systems:

1. The new atomic RPC.
2. The old manual `payment_transactions → subscription → profile` flow.

## Fix

Make the database RPC the **only** code path that converts a verified payment into an entitlement.

## Step-by-step

1. Open `supabase/functions/payments/index.ts`.
2. Find the success callback.
3. Remove manual payment/subscription/profile mutations.
4. Verify the gateway server-to-server.
5. Call `fulfill_payment_transaction()` with the merchant transaction ID and verified gateway identifiers.
6. Check the RPC result and fail safely if it fails.
7. Repeat the same RPC call from the verified IPN path.
8. Keep the RPC idempotent so repeated success/IPN callbacks are safe.

Recommended shape:

```ts
const { data, error } = await supabaseAdmin.rpc(
  'fulfill_payment_transaction',
  {
    p_merchant_transaction_id: merchantTransactionId,
    p_provider_validation_id: verified.validationId,
    p_provider_transaction_id: verified.transactionId,
    p_payment_method: verified.paymentMethod,
    p_gateway_response: verified.rawResponse,
  }
);
```

Do **not** pass subscription duration from the browser.

### Acceptance test

Send the same successful callback twice.

Expected:

- one payment transaction
- one active subscription
- no duplicate entitlement
- correct profile tier

---

# 2. ERROR — Authenticated Users Can Execute the Fulfillment RPC

## Problem

The fulfillment RPC currently has execution granted to `authenticated` as well as `service_role`.

## Fix

Only `service_role` should execute this privileged function.

## Step-by-step

1. Create a new migration.
2. Revoke execution from `authenticated`.
3. Keep execution for `service_role`.
4. Ensure the Edge Function uses the service-role client.
5. Test direct authenticated-client invocation.

Example:

```sql
REVOKE EXECUTE
ON FUNCTION public.fulfill_payment_transaction(...)
FROM authenticated;

GRANT EXECUTE
ON FUNCTION public.fulfill_payment_transaction(...)
TO service_role;
```

Use the exact deployed function signature.

### Acceptance test

A normal logged-in browser client must receive permission denied when attempting the RPC directly.

---

# 3. ERROR — Payment Duration Is Still Caller-Controlled

## Problem

The fulfillment RPC accepts `p_duration_days`. A caller should never control subscription duration.

## Fix

Derive duration from an authoritative server-side plan table.

## Step-by-step

1. Create `subscription_plans` if it does not already exist.
2. Store `plan_id`, `amount_bdt`, `currency`, `duration_days`, and `active`.
3. Populate Free, Explorer, Application, Complete, and School.
4. Associate each payment transaction with its plan.
5. Change the fulfillment RPC to load duration from the database.
6. Remove `p_duration_days` from the client-facing RPC contract.
7. Re-run payment tests.

The browser may request `Application`; it must never choose `3990 BDT` or `365 days`.

---

# 4. ERROR — Fake Customer Fallback Data Still Exists

## Problem

Payment code still contains fallback customer values such as fake email/phone and default Dhaka values.

## Fix

Require real authenticated profile data.

## Step-by-step

1. Open `supabase/functions/payments/index.ts`.
2. Remove fake fallbacks such as `student@uniadmission.com` and `01700000000`.
3. Load the user's profile using the authenticated user ID.
4. Validate required customer fields.
5. If required data is missing, return `CUSTOMER_PROFILE_INCOMPLETE`.
6. Inspect `supabase/functions/_shared/payment/sslcommerz.ts` and remove fake defaults there too.
7. Only then create the gateway session.

### Acceptance test

A user with missing required payment profile data cannot start a payment.

---

# 5. ERROR — Payment Transaction ID Uses Weak Randomness

## Problem

Custom `Date.now() + Math.random()` transaction IDs are inappropriate for security-sensitive identifiers.

## Fix

Use cryptographically secure UUIDs.

## Step-by-step

1. Replace custom ID generation with `crypto.randomUUID()`.
2. Optionally prefix it with `UA-`.
3. Make the merchant transaction ID unique in PostgreSQL.
4. Use the same ID throughout payment creation, callback, IPN, verification, and fulfillment.

Example:

```ts
const merchantTransactionId = `UA-${crypto.randomUUID()}`;
```

---

# 6. ERROR — Payment CORS Is Too Permissive

## Problem

Payment endpoints must not use wildcard CORS.

## Fix

Allow only trusted application origins.

## Step-by-step

1. Add `APP_ALLOWED_ORIGINS` as an environment variable.
2. Store only approved production domains.
3. Read the incoming `Origin` header.
4. Compare it against the allowlist.
5. Return the exact allowed origin when matched.
6. Reject unknown origins.
7. Never reflect an arbitrary origin.

Example environment value:

```text
APP_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

---

# 7. ERROR — AI Gateway Has a Non-Atomic Quota Fallback

## Problem

The AI gateway uses the quota RPC but can fall back to a non-atomic table read/update path after an RPC error. This can reintroduce race conditions.

## Fix

Production must fail closed when the quota service is unavailable.

## Step-by-step

1. Open `supabase/functions/ai-gateway/index.ts`.
2. Find `check_and_increment_ai_quota`.
3. If the RPC errors in production, return HTTP 503.
4. Do not perform a non-atomic fallback in production.
5. If a development fallback is retained, isolate it behind a development-only condition.

Expected production response:

```text
503 AI_QUOTA_SERVICE_UNAVAILABLE
```

---

# 8. ERROR — Verify the AI Quota RPC Actually Exists in the Database

## Problem

The Edge Function can call `check_and_increment_ai_quota`, but the deployed database must actually contain that function.

## Fix

Verify repository migration and deployed database state.

## Step-by-step

1. Search migrations for `check_and_increment_ai_quota`.
2. Confirm the SQL function exists.
3. Confirm check + increment happen atomically.
4. Apply the migration to the target Supabase project.
5. Run concurrent quota tests.

### Acceptance test

If only five requests remain, send 20 concurrent requests. No more than five should consume quota.

---

# 9. ERROR — Payment Callback URL Uses Request Origin

## Problem

Building payment callback URLs from `url.origin` can allow an unexpected host/proxy origin to influence where the gateway redirects.

## Fix

Use a trusted configured callback base URL.

## Step-by-step

1. Add `PAYMENT_CALLBACK_BASE_URL`.
2. Set it to the real production frontend URL.
3. Build success/fail/cancel URLs from it.
4. Use a fixed trusted backend URL for IPN.
5. Do not use an arbitrary incoming host to construct payment callbacks.

---

# 10. ERROR — Payment State Transitions Are Still Duplicated

## Problem

Success/fail/cancel callbacks can still directly mutate payment state even though a state machine exists.

## Fix

Centralize transition rules.

Allowed examples:

```text
initiated → processing → success
initiated → failed
initiated → cancelled
processing → failed
```

A `success` payment must never become `failed` or `cancelled`.

## Step-by-step

1. Create protected DB transitions or RPCs.
2. Allow fail/cancel only from `initiated`, `pending`, or `processing`.
3. Never overwrite `success` or `completed`.
4. Test callback races.

---

# 11. ERROR — Subscription Schema Has Duplicate Concepts

## Problem

The schema contains overlapping concepts such as `provider` vs `payment_provider`, and `starts_at/expires_at` vs `current_period_start/current_period_end`.

## Fix

Choose one canonical representation.

Recommended canonical fields:

```text
payment_provider
plan_id
status
current_period_start
current_period_end
payment_transaction_id
provider_transaction_id
provider_validation_id
```

## Step-by-step

1. Search all references in `src` and `supabase`.
2. Choose canonical fields.
3. Update TypeScript types.
4. Update SQL.
5. Update payment fulfillment.
6. Update admin UI.
7. Migrate/remove duplicate fields.

---

# 12. ERROR — Admin Subscription View Uses Payment Transactions as Source

## Problem

The current Admin subscription UI derives subscription metrics from successful transactions. A successful transaction is not necessarily the current active subscription.

## Fix

Use `subscriptions` as the authoritative source.

## Step-by-step

1. Create an admin-only subscriptions query/RPC.
2. Return user, plan, status, provider, period, payment transaction, and entitlement information.
3. Use `subscriptions` for active-subscription metrics.
4. Keep payment transactions as a separate financial/audit view.

Admin should conceptually have:

```text
Payments
Subscriptions
Entitlements
```

---

# 13. ERROR — IndexedDB Can Be Mistaken for Persistent Upload Success

## Problem

IndexedDB is a local cache. Supabase Storage is the persistent source of truth. If persistent upload fails, the service must not report success.

## Fix

Treat Supabase Storage as authoritative and IndexedDB as cache only.

## Step-by-step

1. Upload to Supabase Storage.
2. Confirm success.
3. Then update local cache.
4. On persistent upload failure, remove the cache entry and throw.
5. AppContext displays the failure.
6. Never return a successful persistent document object after a failed storage upload.

---

# 14. ERROR — Storage Size Limit Is Inconsistent

## Problem

The v2 commit claims a 20MB limit while the storage migration may still contain a 10MB bucket limit.

## Fix

Choose one limit and align every layer. If 20MB is the intended product limit, use 20MB everywhere.

## Step-by-step

1. Search frontend validation.
2. Search storage service.
3. Search Supabase bucket configuration.
4. Search migrations for `10MB`, `10485760`, `20MB`, `20971520`.
5. Align all layers.
6. Test below-limit, exact-limit, and over-limit files.

---

# 15. ERROR — AI Quota Consumption Policy Is Not Explicit

## Problem

Quota may be consumed before Gemini returns. If Gemini fails, the user may still lose one request.

## Fix

Choose and document a policy.

Recommended initial policy: **attempt-based quota**.

That means every accepted AI request consumes quota, even if the provider later fails.

This is simpler and reduces abuse. If success-only quota is later required, implement reservation/finalization instead of simply moving the increment after the model call.

---

# 16. ERROR — Payment Plan Configuration Exists in Multiple Places

## Problem

Prices and durations can drift between frontend, TypeScript, Edge Functions, SQL, and documentation.

## Fix

Create one authoritative server-side plan catalog.

## Step-by-step

1. Create `subscription_plans`.
2. Store price, currency, duration, active status, and plan ID.
3. Payment creation reads from it.
4. Payment fulfillment reads from it.
5. Frontend displays it but does not define the payable amount.

---

# 17. ERROR — Gateway Amount/Currency Must Match the Local Payment Record

## Problem

A valid gateway transaction is not sufficient. It must match the exact local payment that was created.

## Fix

Verify all of:

```text
merchant transaction ID
amount
currency
gateway status
```

## Step-by-step

1. Load the local payment transaction.
2. Read expected amount/currency/transaction ID.
3. Validate SSLCOMMERZ server-to-server.
4. Compare gateway amount to local amount.
5. Compare gateway currency to local currency.
6. Compare gateway transaction ID to local transaction.
7. On mismatch, set `verification_failed` and grant no entitlement.

---

# 18. ERROR — IPN Must Never Trust Browser Data

## Problem

The IPN endpoint is a payment authority boundary.

## Fix

IPN must use only verified gateway data.

Correct flow:

```text
SSLCOMMERZ IPN
    ↓
Backend receives IPN
    ↓
Server-to-server validation
    ↓
Find local transaction
    ↓
Compare amount/currency/transaction ID
    ↓
Atomic fulfillment RPC
```

The browser never grants entitlement.

---

# 19. ERROR — Sandbox/Production Gateway Configuration Can Drift

## Problem

Sandbox configuration can accidentally remain in production.

## Fix

Separate environment configuration explicitly.

## Step-by-step

1. Use an explicit payment environment.
2. Configure sandbox credentials only in development/staging.
3. Configure production credentials only in production.
4. Configure production callback URLs.
5. Perform a real gateway verification smoke test before launch.

---

# 20. ERROR — Payment Simulation Must Never Work in Production

## Problem

Simulation is acceptable for development, but it must be impossible in production.

## Fix

Require both a development environment and explicit simulation flag.

Production must reject simulation even if someone accidentally sets:

```text
ALLOW_PAYMENT_SIMULATION=true
```

---

# 21. ERROR — Unknown Payment Gateway Must Fail Closed

## Problem

An unsupported `PAYMENT_GATEWAY` value must not silently fall back to another provider.

## Fix

Only instantiate implemented adapters.

Currently the intended production provider is SSLCOMMERZ.

Unknown provider → configuration error.

Do not silently fall back to Stripe, bKash, aamarPay, or shurjoPay.

---

# 22. ERROR — Payment Success Page Must Not Grant Access

## Problem

Anyone can manually open a success URL.

## Fix

The success page is display-only. It must query backend payment status.

## Step-by-step

1. User returns to success page.
2. Frontend requests payment status.
3. Backend authenticates the user.
4. Backend loads the actual transaction state.
5. Backend returns the real status.
6. Entitlement comes only from the authoritative subscription.

---

# 23. ERROR — Client-Supplied Tier Must Never Determine Entitlement

## Problem

The client can say it selected `Complete`, but the client must never be able to grant itself Complete access.

## Fix

Server derives entitlement from the verified active subscription.

Frontend selection is only a request.

---

# 24. ERROR — Paid AI Actions Must Be Server-Gated

## Problem

Hiding SOP/CV/Critique buttons is not authorization.

## Fix

The AI gateway must independently enforce paid actions.

## Step-by-step

1. Client requests an action.
2. Gateway loads authoritative entitlement.
3. Gateway checks plan.
4. If unauthorized, return `403 FEATURE_NOT_ENTITLED`.
5. Only then call Gemini.

---

# 25. ERROR — Student Input Must Remain Untrusted AI Data

## Problem

Student-entered fields can contain malicious instructions.

## Fix

Keep student data isolated from system instructions.

Use a structure like:

```text
SYSTEM INSTRUCTIONS

UNTRUSTED STUDENT DATA
<student input>

TASK
```

Never let student data override system/security rules.

---

# 26. ERROR — AI Must Not Invent University Requirements

## Problem

AI-generated deadlines, GPA requirements, scholarship rules, and fees can become harmful if they are not verified.

## Fix

Separate verified institutional data from generated guidance.

## Step-by-step

1. Store verified university requirements in structured records.
2. Store official source URLs.
3. Store verification timestamps.
4. Give verified data to AI.
5. Tell AI not to invent missing information.
6. If unavailable, say it is not verified and direct the student to the official source.

---

# 27. ERROR — University and Scholarship Data Needs Verification Metadata

## Problem

Admission data changes frequently.

## Fix

Important institutional records should support:

```text
source_url
source_type
verified_at
verified_by
data_status
```

Suggested status values:

```text
verified
needs_review
expired
unverified
```

---

# 28. ERROR — Matching Probabilities Must Not Be Presented as Facts

## Problem

Hard-coded admission/scholarship percentages can mislead students.

## Fix

Use explainable match bands instead:

```text
Strong Match
Good Match
Possible Match
Needs Improvement
```

Explain:

- why it matches
- why it does not match
- what could improve the profile

Never promise admission or scholarship success.

---

# 29. ERROR — “Safe University” Can Sound Like a Guarantee

## Problem

No university should be presented as guaranteed admission.

## Fix

Prefer:

```text
Reach
Target
Likely-fit
```

or:

```text
High competitiveness
Moderate competitiveness
Lower competitiveness
```

Always make clear that admission is not guaranteed.

---

# 30. ERROR — Country Recommendations Need Explainability

## Problem

A country score without reasoning is not useful enough for a high-stakes recommendation.

## Fix

Explain dimensions such as:

```text
Academic fit
Budget fit
Scholarship availability
Visa practicality
Program availability
Language
Post-study options
Application complexity
```

Show both benefits and drawbacks.

---

# 31. ERROR — Application Workflow Is Too Generic

## Problem

Generic tasks like `Prepare SOP → Apply` do not reflect the actual university/program.

## Fix

Generate tasks from:

```text
student + university + program + country
```

Each application should track:

```text
University
Program
Deadline
Application portal
Application fee
Required documents
English requirement
Scholarship deadline
SOP requirement
Recommendation requirements
Status
```

---

# 32. ERROR — Deadline Data Must Be Source-Backed

## Problem

A deadline engine is only useful when dates are trustworthy.

## Fix

Store:

```text
deadline
deadline_type
source_url
verified_at
```

Possible types:

```text
Application
Scholarship
Housing
Document
Deposit
Visa
```

---

# 33. ERROR — Document Vault Must Enforce Ownership

## Problem

Every file must be isolated by authenticated user.

## Fix

Use an ownership path such as:

```text
user_id/document_id/file
```

and enforce RLS:

```text
auth.uid() = user_id
```

Test cross-user access explicitly.

---

# 34. ERROR — MIME Rules Must Match Storage Rules

## Problem

Frontend, storage service, and bucket configuration can disagree about allowed types.

## Fix

Use one allowlist across all layers.

Initial types may include:

```text
PDF
DOCX
DOC
JPEG
PNG
TXT
```

Do not rely only on filename extension.

---

# 35. ERROR — File Extension Alone Is Not Security

## Problem

A file named `document.pdf` can contain something else.

## Fix

For stronger production security, add server-side content signature/MIME inspection.

At minimum:

- validate declared MIME
- validate extension
- validate size
- reject executable/script extensions
- keep bucket private
- use signed URLs

---

# 36. ERROR — Signed Document URLs Must Be Short-Lived

## Problem

Private student documents should not become permanent public URLs.

## Fix

Use short-lived signed URLs, for example 5–15 minutes, generated when needed.

---

# 37. ERROR — SECURITY DEFINER Functions Need Strict Privileges

## Problem

`SECURITY DEFINER` functions execute with elevated privileges.

## Fix

Audit every such function.

Each should have a hardened `search_path`, minimal privileges, and only the necessary `EXECUTE` grants.

Search:

```bash
grep -R "SECURITY DEFINER" supabase/migrations
```

Review each function individually.

---

# 38. ERROR — RLS Must Be Tested, Not Just Written

## Problem

SQL policies existing in migrations does not prove isolation works.

## Fix

Use two test users.

User A must be able to read/write only User A's permitted records.

User A must not be able to read/update/delete User B's:

- profile
- payment
- subscription
- documents
- application data

Also test admin boundaries.

---

# 39. ERROR — Payment Concurrency Needs Integration Tests

## Problem

Unit tests alone cannot prove callback correctness.

## Fix

Create integration tests for:

1. success callback twice
2. IPN twice
3. success + IPN simultaneously
4. success + cancel simultaneously
5. success + fail simultaneously
6. two successful payments for one user

Expected:

- no duplicate active subscriptions
- deterministic final state
- verified success cannot be downgraded by fail/cancel

---

# 40. ERROR — Renewal and Upgrade Semantics Need Definition

## Problem

The current fulfillment behavior can expire an existing active subscription and create a new one. That may be correct, but renewal/upgrade behavior must be intentional.

## Fix

Choose and document:

- renewal extension
- plan replacement
- upgrade behavior
- downgrade behavior
- cancellation behavior

For the first production release, keep the behavior simple and explicitly tested.

---

# 41. ERROR — Build/Test Claims Need Independent Verification

## Problem

A commit message saying build/tests passed is not enough for release verification.

## Fix

Run independently:

```bash
npm ci
npm run lint
npm test
npm run build
```

Also run the required TypeScript build command if separate.

Record:

```text
commit SHA
Node version
npm version
test count
lint result
build result
date
```

---

# 42. ERROR — Supabase Migrations Need a Clean-Database Test

## Problem

A migration chain can work on an old database while failing on a clean database.

## Fix

Test all migrations from zero.

## Step-by-step

1. Create a temporary Supabase/Postgres environment.
2. Apply every migration in order.
3. Verify tables, indexes, constraints, RLS, functions, grants, and storage policies.
4. Run the test suite.
5. Run payment/AI/storage smoke tests.

---

# 43. ERROR — Production Environment Variables Need Validation

## Problem

Incorrect environment variables can break or weaken a production deployment even when code is correct.

## Required categories

### Supabase

```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

### AI

```text
GEMINI_API_KEY
```

### Payment

```text
PAYMENT_GATEWAY
SSLCOMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD
SSLCOMMERZ_BASE_URL
PAYMENT_CALLBACK_BASE_URL
APP_ALLOWED_ORIGINS
```

### Security

```text
ENVIRONMENT=production
ALLOW_PAYMENT_SIMULATION=false
```

Never commit secrets.

---

# 44. ERROR — README Claims Should Match Actual Validation

## Problem

Strong claims such as `enterprise-grade` should not be made only because security features were implemented.

## Fix

Use defensible wording until independent security testing, monitoring, backups, disaster recovery, and operational controls are validated.

---

# 45. ERROR — Payment and AI Observability Needs Improvement

## Problem

Production failures need to be diagnosed without logging sensitive information.

## Fix

Use structured logs.

### Payment logs

```text
request ID
transaction ID
internal user ID
plan ID
gateway
verification result
RPC result
timestamp
```

Do not log card details, secrets, passwords, or document contents.

### AI logs

```text
request ID
internal user ID
action
model
quota result
latency
success/failure
```

Avoid unnecessary student PII.

---

# 46. ERROR — Backup/Recovery Has Not Been Proven Until Restore Is Tested

## Problem

The platform stores valuable student, document, application, subscription, and payment information.

## Fix

Define:

```text
backup frequency
retention
RPO
RTO
```

Perform a real restore test in a controlled environment.

---

# 47. ERROR — No Final Production Smoke-Test Gate

Before launch, run the following checklist.

## Authentication

- [ ] Register
- [ ] Login
- [ ] Logout
- [ ] Password recovery
- [ ] Session expiration
- [ ] Unauthorized route protection

## Student Profile

- [ ] Create profile
- [ ] Edit profile
- [ ] Refresh browser
- [ ] Data persists
- [ ] Cross-user isolation

## AI

- [ ] Free quota
- [ ] Paid quota
- [ ] Anonymous quota
- [ ] SOP authorization
- [ ] CV authorization
- [ ] Critique authorization
- [ ] quota exhaustion
- [ ] database quota outage

## Payments

- [ ] Explorer payment
- [ ] Application payment
- [ ] Complete payment
- [ ] Gateway redirect
- [ ] Successful payment
- [ ] Failed payment
- [ ] Cancelled payment
- [ ] IPN
- [ ] repeated IPN
- [ ] repeated success callback
- [ ] wrong amount
- [ ] wrong currency
- [ ] wrong transaction ID
- [ ] payment replay attempt

## Subscription

- [ ] Active subscription
- [ ] Expired subscription
- [ ] Cancelled subscription
- [ ] Upgrade
- [ ] Renewal
- [ ] Entitlement synchronization

## Document Vault

- [ ] PDF upload
- [ ] DOCX upload
- [ ] image upload
- [ ] unsupported file rejected
- [ ] oversized file rejected
- [ ] signed URL
- [ ] delete
- [ ] replace
- [ ] cross-user ownership test

## Admin

- [ ] Admin authentication
- [ ] Non-admin blocked
- [ ] Payment view
- [ ] Subscription view
- [ ] Verification queue
- [ ] Audit logs

---

# 48. RECOMMENDED IMPLEMENTATION ORDER

Do not fix these randomly. Follow this order.

## Phase 1 — Payment Security

1. Wire `fulfill_payment_transaction()` into success callback.
2. Wire the same RPC into IPN.
3. Remove old manual fulfillment code.
4. Revoke `authenticated` RPC execution.
5. Remove `p_duration_days` from the client/RPC contract.
6. Create authoritative subscription plan table.
7. Remove fake customer fallbacks.
8. Use `crypto.randomUUID()`.
9. Implement strict CORS.
10. Use trusted callback URL configuration.

## Phase 2 — Payment State & Verification

11. Centralize fail/cancel state transitions.
12. Verify transaction ID.
13. Verify amount.
14. Verify currency.
15. Verify gateway status.
16. Test duplicate callbacks.
17. Test concurrent callbacks.
18. Test payment replay.

## Phase 3 — AI Security

19. Verify quota RPC exists in production migration.
20. Remove production non-atomic quota fallback.
21. Test concurrent quota consumption.
22. Document quota consumption policy.
23. Verify server-side entitlement enforcement.
24. Verify anonymous limits.
25. Test prompt-injection boundaries.

## Phase 4 — Storage Security

26. Make Supabase Storage the source of truth.
27. Fix upload error propagation.
28. Clean IndexedDB on failed persistent upload.
29. Align 20MB limit across all layers.
30. Verify MIME/extension restrictions.
31. Verify signed URL expiration.
32. Run cross-user document access tests.

## Phase 5 — Database/RLS

33. Audit every SECURITY DEFINER function.
34. Audit every GRANT EXECUTE.
35. Test RLS with two users.
36. Test admin permissions.
37. Run migrations on a clean database.
38. Test indexes/constraints.

## Phase 6 — Subscription/Admin

39. Make `subscriptions` the authoritative admin source.
40. Separate payments from subscriptions.
41. Remove duplicate subscription fields.
42. Define renewal/upgrade semantics.
43. Test entitlement synchronization.

## Phase 7 — Data Trust

44. Add university source URLs.
45. Add verification dates.
46. Add scholarship source URLs.
47. Remove unsupported probability claims.
48. Improve explainable matching.
49. Add country recommendation explanations.
50. Make application deadlines source-backed.

## Phase 8 — Final Production Validation

51. Run lint.
52. Run unit tests.
53. Run production build.
54. Run clean Supabase migration test.
55. Run payment sandbox tests.
56. Run production-like payment smoke test.
57. Run RLS security tests.
58. Run storage ownership tests.
59. Run AI quota concurrency tests.
60. Run complete launch checklist.

---

# 49. FINAL DEFINITION OF DONE

UniAdmission should **not** be considered production-ready until all P0 items are complete.

## P0 checklist

- [ ] Payment fulfillment uses one atomic RPC
- [ ] Success and IPN are idempotent
- [ ] Authenticated users cannot execute fulfillment RPC
- [ ] Subscription duration is server-controlled
- [ ] Customer data has no fake fallbacks
- [ ] Transaction IDs use cryptographic randomness
- [ ] Payment CORS is restricted
- [ ] Callback URLs are trusted/configured
- [ ] Payment state machine cannot be bypassed
- [ ] Amount is verified
- [ ] Currency is verified
- [ ] Transaction identity is verified
- [ ] AI quota fails closed in production
- [ ] AI quota RPC exists and is deployed
- [ ] Paid AI actions are server-authorized
- [ ] Storage failures cannot appear as successful uploads
- [ ] RLS is tested
- [ ] Production secrets are configured correctly
- [ ] Simulation is impossible in production

---

# 50. FINAL TARGET ARCHITECTURE

```text
                    ┌─────────────────────┐
                    │      Student        │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   React Frontend    │
                    │  UI / Dashboard     │
                    └──────────┬──────────┘
                               │
                    Never trust client
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
             ▼                                   ▼
   ┌─────────────────────┐            ┌─────────────────────┐
   │ Supabase Edge APIs  │            │ Supabase Auth       │
   │ Payments / AI       │            │                     │
   └──────────┬──────────┘            └─────────────────────┘
              │
       Server-side checks
              │
      ┌───────┴────────┐
      │                │
      ▼                ▼
┌──────────────┐  ┌───────────────┐
│ SSLCOMMERZ   │  │ Gemini        │
│ Verification │  │ AI Gateway    │
└──────┬───────┘  └──────┬────────┘
       │                 │
       └────────┬────────┘
                ▼
       ┌─────────────────────┐
       │ PostgreSQL          │
       │                     │
       │ Profiles            │
       │ Payments            │
       │ Subscriptions      │
       │ Entitlements        │
       │ AI Quota            │
       │ Applications        │
       │ Universities        │
       │ Scholarships        │
       └──────────┬──────────┘
                  │
                  ▼
       ┌─────────────────────┐
       │ Supabase Storage    │
       │ Private Documents   │
       └─────────────────────┘
```

## Core security principle

```text
Frontend = presentation
Edge Functions = authorization + verification
PostgreSQL = source of truth
SSLCOMMERZ = payment verification
Gemini = AI generation
Storage = persistent document source
IndexedDB = cache only
```

---

# Launch Rule

**Do not launch paid production access until all P0 payment, entitlement, AI quota, storage, RLS, and verification items above pass their tests.**

The most important immediate fix is:

```text
SSLCOMMERZ verified payment
        ↓
ONE atomic PostgreSQL fulfillment RPC
        ↓
subscription
        ↓
entitlement
        ↓
application features
```

There must be **no second manual payment-fulfillment path**.
