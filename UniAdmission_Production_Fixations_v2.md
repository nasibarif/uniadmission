# UniAdmission — Production Fixation & Hardening Plan v2

**Repository:** `nasibarif/uniadmission`  
**Date:** 2026-09-10  
**Scope:** Remaining fixes required after the latest repository audit.

> This is a second-stage hardening plan. It focuses on the remaining production blockers rather than repeating the already-completed migration to the current SSLCOMMERZ architecture.

---

## 1. P0 — Payment Security & Correctness

### 1.1 Remove simulated payment success
**File:** `supabase/functions/_shared/payment/sslcommerz.ts`

- Remove production fallback checkout simulation.
- Reject missing SSLCOMMERZ credentials in production.
- Reject `SIM_VAL_*` and `SANDBOX_VALID` in production.
- If simulation is needed for development, require an explicit development-only flag such as `ALLOW_PAYMENT_SIMULATION=true`.
- Never allow simulated verification to create a subscription or entitlement.

**Done when:** Missing production credentials cause payment creation to fail closed.

### 1.2 Remove fake customer fallback data
**File:** `supabase/functions/_shared/payment/sslcommerz.ts`

Remove hard-coded fallback values such as:

- `UniAdmission Student`
- `student@uniadmission.com`
- `01700000000`
- fake Dhaka address

Use authenticated profile data. If required customer information is missing, return a controlled validation error.

### 1.3 Make payment fulfillment atomic
**Files:**
- `supabase/functions/payments/index.ts`
- `supabase/migrations/*`

Create a PostgreSQL RPC/function such as:

`fulfill_payment_transaction(...)`

It must atomically:

1. Lock the payment transaction.
2. Verify transaction/provider/amount/currency.
3. Check whether it is already fulfilled.
4. Mark payment successful.
5. Create/update the subscription.
6. Set subscription dates.
7. Update entitlement/profile state.

Browser success callbacks and IPN must both call this same fulfillment path.

**Done when:** concurrent browser/IPN requests produce exactly one successful payment and one subscription.

### 1.4 Enforce payment state transitions
Allowed transitions should be explicit, for example:

```text
initiated → pending → success
initiated → failed
initiated → cancelled
pending   → failed
pending   → cancelled
```

Never allow:

```text
success → failed
success → cancelled
```

Duplicate success should be idempotent.

### 1.5 Validate fail/cancel callbacks
Do not blindly mutate payment state from a browser-supplied `tran_id`.

For every callback:

- find local transaction;
- verify provider;
- verify transaction context;
- verify current state;
- allow only valid transitions;
- never grant entitlement from fail/cancel callbacks.

### 1.6 Use cryptographically secure transaction IDs
**File:** `supabase/functions/payments/index.ts`

Replace `Date.now() + Math.random()` with `crypto.randomUUID()` or equivalent secure randomness.

Recommended:

```text
UA_TX_<uuid>
```

### 1.7 Use catalog duration
**Files:**
- `supabase/functions/payments/index.ts`
- `supabase/functions/_shared/payment/catalog.ts`

Do not hard-code `365`.

Use:

```text
planConfig.durationDays
```

for subscription expiry.

### 1.8 Restrict payment CORS
**File:** `supabase/functions/payments/index.ts`

Replace wildcard:

```text
Access-Control-Allow-Origin: *
```

with explicit production origins. Allow localhost only in development.

### 1.9 Fail closed for unknown payment providers
**File:** `supabase/functions/_shared/payment/factory.ts`

Do not silently fall back to SSLCOMMERZ if `PAYMENT_GATEWAY` is unknown.

Return an explicit configuration error.

### 1.10 Accept only `planId`
**File:** `supabase/functions/payments/index.ts`

Simplify payment input to:

```json
{ "planId": "application" }
```

Do not accept multiple aliases such as `tier`, `plan`, and `planId`.

The server must determine:

- price;
- currency;
- duration;
- features.

Never trust client-supplied price.

---

## 2. P0 — Payment Database Hardening

### 2.1 Reconcile `payment_transactions`
Create one canonical schema containing at least:

```text
id
user_id
merchant_transaction_id
provider
provider_transaction_id
plan_id
amount
currency
status
gateway_session_id
gateway_response
failure_reason
created_at
updated_at
paid_at
metadata
```

Add constraints and indexes for:

- unique merchant transaction ID;
- provider transaction ID;
- valid status values;
- valid currency;
- positive paid amount;
- user ID;
- status.

### 2.2 Fix stale subscription provider default
**File:** `supabase/migrations/20260909_subscriptions_and_entitlements.sql`

Remove the stale:

```text
payment_provider DEFAULT 'bkash'
```

Use a provider-neutral field or an explicit provider constraint.

### 2.3 Reconcile subscription column names
Audit all uses of:

```text
starts_at
expires_at
provider
payment_provider
subscription_id
payment_transaction_id
current_period_start
current_period_end
```

Choose one canonical schema and make migrations/functions/frontend agree with it.

### 2.4 Prevent duplicate active subscriptions
Enforce:

```text
one active/trialing subscription per user
```

unless multiple simultaneous subscriptions are intentionally supported.

### 2.5 Add required indexes
At minimum:

```text
subscriptions(user_id)
subscriptions(status)
subscriptions(current_period_end)

payment_transactions(user_id)
payment_transactions(merchant_transaction_id)
payment_transactions(provider_transaction_id)
payment_transactions(status)
```

---

## 3. P0 — AI Gateway & Quota Security

**File:** `supabase/functions/ai-gateway/index.ts`

### 3.1 Make quota consumption atomic
Current `SELECT → check → UPDATE/INSERT` logic can race.

Create an atomic PostgreSQL RPC such as:

```text
consume_ai_quota(user_id, limit, request_count)
```

It must lock the usage record, check the limit, increment usage, and return remaining quota.

### 3.2 Fail closed on usage persistence failure
If usage accounting fails, do not continue serving unlimited AI requests.

Return a controlled error such as:

```text
AI_QUOTA_SERVICE_UNAVAILABLE
```

### 3.3 Define anonymous AI policy
Recommended:

- require authentication for paid AI;
- if anonymous AI remains enabled, give it a tiny separate quota;
- rate-limit anonymous usage independently;
- never let anonymous usage consume paid quota.

### 3.4 Keep in-memory burst limiting secondary
The current in-memory limiter can remain for abuse protection, but PostgreSQL must remain the authoritative source for paid usage.

### 3.5 Add idempotency for expensive AI operations
For document generation or other costly actions, support an idempotency key to prevent double quota consumption from retries/double clicks.

---

## 4. P0 — Entitlement Security

### 4.1 Server is the only authority
The browser must never be authoritative for:

- tier;
- subscription status;
- premium entitlement;
- AI quota.

### 4.2 Protect every paid feature server-side
Server checks are required for:

- premium university results;
- scholarship details;
- premium AI;
- SOP generation;
- document generation;
- advanced country recommendations;
- premium reports;
- paid exports.

### 4.3 Centralize entitlement rules
Use one server-side definition for:

```text
FREE
EXPLORER
APPLICATION
COMPLETE
SCHOOL
```

and their feature flags.

---

## 5. P0 — Storage / Document Vault

**File:** `src/context/AppContext.tsx`

### 5.1 Never report upload success when upload failed
Current behavior can retain/create local document state after a storage failure.

Required flow:

```text
upload to Supabase Storage
→ verify success
→ create DB document record
→ return success
```

If upload fails:

```text
throw error
```

and do not create a successful document record.

### 5.2 Storage must be source of truth
IndexedDB/local cache can support UI/offline caching, but it must not represent a permanent successful upload if Supabase Storage failed.

### 5.3 Verify Storage RLS
Ensure:

```text
User A cannot read User B's files.
User A cannot overwrite User B's files.
User A cannot delete User B's files.
```

### 5.4 Validate uploads
Add:

- maximum file size;
- allowed MIME types;
- extension validation;
- filename normalization;
- user-isolated storage paths;
- malware scanning strategy for production.

Do not trust only client MIME values.

---

## 6. P0 — Authentication, RLS & Admin Security

### 6.1 Audit every RLS policy
Test:

```text
Student A cannot read Student B.
Student A cannot update Student B.
Student A cannot delete Student B.
Student cannot modify subscriptions.
Student cannot modify payments.
Student cannot access admin data.
```

### 6.2 Protect admin operations
Do not trust a frontend-only `isAdmin` flag.

Use trusted server-side roles/claims or a protected role table with RLS.

### 6.3 Separate roles
Recommended:

```text
student
school_admin
reviewer
content_editor
support
super_admin
```

---

## 7. P0 — University & Scholarship Data Integrity

This is a core product-quality requirement for UniAdmission.

### 7.1 Use structured verified data
Create/standardize entities such as:

```text
universities
campuses
countries
programs
program_requirements
admission_requirements
language_requirements
tuition_fees
scholarships
scholarship_requirements
application_deadlines
application_links
source_records
```

### 7.2 Store source information
Important facts should include:

```text
source_url
source_title
source_type
last_verified_at
verification_status
```

### 7.3 Add verification statuses
Use:

```text
confirmed
single-official-confirmed
conflicting
needs-verification
inference
expired
```

### 7.4 Do not let AI invent requirements
For missing facts, return:

```text
Requirement not verified. Check the official university page.
```

Never fabricate:

- deadlines;
- tuition;
- GPA requirements;
- scholarship amounts;
- test scores;
- fees;
- document requirements;
- acceptance probabilities.

### 7.5 Add data freshness
Every important record should have:

```text
last_verified_at
next_review_at
```

---

## 8. P1 — Matching Engine

### 8.1 Replace simplistic fixed scoring
Use dimensions such as:

```text
Academic Fit
Program Fit
Requirement Fit
Budget Fit
Scholarship Fit
Country Fit
Language/Test Fit
Application Feasibility
Deadline Feasibility
```

### 8.2 Explain every recommendation
Every university result should explain:

```text
Why it matches
Potential gaps
Required actions
Estimated cost
Scholarship opportunities
Deadline
Source
Confidence
```

### 8.3 Separate eligibility from competitiveness
Clearly distinguish:

```text
Eligible
Competitive
```

Eligibility does not mean admission is likely.

### 8.4 Avoid unsupported probability claims
Do not show exact admission probabilities unless supported by a properly validated and calibrated model.

Prefer:

```text
Strong fit
Good fit
Possible fit
Low fit
Insufficient data
```

---

## 9. P0 — Assessment Claims

Audit assessment and onboarding copy for unsupported claims such as:

```text
100% accurate
95%+ global universities
100% debt-free
Germany is practically free
```

Replace with evidence-based language:

```text
Based on the information provided...
Potentially suitable...
Estimated...
Requires verification...
```

Never promise admission or scholarship outcomes.

---

## 10. P1 — Application Workflow

### 10.1 Make roadmap dynamic
Generate tasks from:

```text
student profile
university
program
deadline
requirements
scholarship
country
application system
```

### 10.2 Add application states

```text
researching
shortlisted
requirements_reviewed
documents_pending
documents_ready
application_started
application_submitted
fee_paid
awaiting_decision
accepted
rejected
withdrawn
```

### 10.3 Add deadline intelligence
Calculate:

```text
days remaining
overdue
urgent
upcoming
future
```

### 10.4 Add task dependencies
Example:

```text
University selected
→ Requirement verification
→ Document preparation
→ SOP
→ Application form
→ Fee
→ Submission
```

---

## 11. P1 — AI Safety & Reliability

### 11.1 Use structured AI outputs
Validate model output against schemas such as:

```json
{
  "recommendations": [],
  "reasons": [],
  "missing_information": [],
  "warnings": [],
  "sources": []
}
```

### 11.2 Ground important answers in official sources
Preferred order:

1. official university source;
2. official department/program source;
3. official scholarship source;
4. official application portal.

### 11.3 Treat external content as untrusted
Scraped university content must never be allowed to:

- override system instructions;
- request secrets;
- execute tools;
- expose private student data.

---

## 12. P1 — API Security

Validate all Edge Function inputs for:

- payment requests;
- AI requests;
- profile updates;
- document metadata;
- application updates;
- admin operations.

Also add:

- request size limits;
- rate limits;
- consistent error codes;
- no stack traces/secrets in client responses.

Recommended error format:

```json
{
  "error": {
    "code": "PAYMENT_CONFIG_ERROR",
    "message": "Payment service is temporarily unavailable."
  }
}
```

---

## 13. P0 — Secrets & Environments

### 13.1 Audit secrets
Search source and Git history for:

```text
API keys
payment passwords
service-role keys
Gemini keys
Supabase secrets
```

### 13.2 Keep payment credentials server-side
Never expose:

```text
SSLCOMMERZ_STORE_PASSWORD
```

to Vite/browser code.

### 13.3 Separate environments
Maintain:

```text
development
staging
production
```

with separate credentials/data and trusted origins.

---

## 14. P1 — Frontend State

### 14.1 Reduce authoritative local state
Do not treat:

```text
localStorage
IndexedDB
URL query parameters
```

as authoritative for payment/subscription state.

### 14.2 Refresh entitlement after payment
After gateway return:

1. authenticate;
2. fetch server entitlement;
3. display server-confirmed state;
4. never infer premium access solely from the URL.

---

## 15. P1 — Payment UX

Implement:

- clear failed-payment state;
- pending-payment state;
- retry flow;
- server-confirmed success;
- polling/refresh while verification is pending.

Never unlock premium features merely because the browser returned from the gateway.

---

## 16. P1 — Admin Console

Add secure views for:

### Payments
- transaction ID;
- user;
- plan;
- amount;
- provider;
- status;
- created/paid time;
- failure reason.

### Subscriptions
- active;
- expired;
- cancelled;
- past_due.

### Audit logs
Track:

```text
actor
action
target
before
after
timestamp
```

Audit logs should not be user-editable.

---

## 17. P1 — Observability

Add structured logging for:

```text
request ID
user ID where appropriate
function
operation
status
latency
error code
```

Never log:

- passwords;
- access tokens;
- payment secrets;
- full document contents;
- unnecessary personal data.

Monitor:

- payment verification failures;
- duplicate fulfillment attempts;
- gateway errors;
- AI provider errors;
- quota failures;
- latency;
- usage/cost.

---

## 18. P0 — Testing

### Payment tests

```text
[ ] valid payment
[ ] invalid plan
[ ] amount mismatch
[ ] currency mismatch
[ ] missing credentials
[ ] simulation blocked in production
[ ] gateway timeout
[ ] verification failure
[ ] duplicate IPN
[ ] duplicate callback
[ ] concurrent fulfillment
[ ] success → failed rejected
[ ] success → cancelled rejected
[ ] unknown provider rejected
```

### AI tests

```text
[ ] free quota
[ ] paid quota
[ ] quota boundary
[ ] concurrent requests
[ ] usage DB failure
[ ] provider failure
[ ] anonymous policy
[ ] prompt injection
[ ] oversized request
```

### Storage tests

```text
[ ] upload success
[ ] upload failure
[ ] DB insert failure
[ ] retry
[ ] version replacement
[ ] unauthorized access
[ ] cross-user access
```

### RLS tests

```text
[ ] cross-user SELECT blocked
[ ] cross-user UPDATE blocked
[ ] cross-user DELETE blocked
[ ] student subscription mutation blocked
[ ] student payment mutation blocked
[ ] student admin-data access blocked
```

---

## 19. P0 — CI/CD

Every pull request should run:

```text
npm ci
npm run typecheck
npm run lint
npm run build
tests
```

Add missing scripts where necessary.

Also validate:

- Supabase migrations;
- RLS;
- Edge Functions;
- migration ordering;
- schema consistency.

Recommended deployment flow:

```text
PR
→ CI
→ Preview
→ Staging
→ Payment sandbox
→ Security tests
→ Production
```

Do not claim build/tests pass until they are actually executed successfully.

---

## 20. P1 — Privacy & Legal

Add:

- Privacy Policy;
- Terms of Service;
- account/data deletion flow;
- retention policy.

Clearly state that UniAdmission:

- does not guarantee admission;
- does not guarantee scholarships;
- does not guarantee visa approval;
- does not replace official university instructions;
- provides guidance and decision support.

---

## 21. P1 — Product Trust

For important facts show:

```text
Source
Last verified
Verification status
Confidence
```

Clearly distinguish:

```text
Official requirement
AI recommendation
Estimated cost
Student-provided information
Needs verification
```

---

## 22. P2 — Codebase Cleanup

Search the repository for stale implementation references:

```text
stripe
STRIPE_
stripeService
payment_intent
checkout.session
bkash
BKASH
```

Remove obsolete active code/configuration if those providers are no longer part of the intended architecture.

Also standardize terminology:

```text
planId        = purchased product
subscription  = billing/access record
entitlement   = feature access
```

Avoid mixing `tier`, `package`, `membership`, and `plan` for the same concept.

---

## 23. Recommended Implementation Order

### Phase 1 — Payment safety

```text
1. Remove simulated production payment
2. Remove fake customer data
3. Secure transaction IDs
4. Fail closed on unknown provider
5. Restrict CORS
6. Use catalog duration
7. Enforce payment state transitions
```

### Phase 2 — Database correctness

```text
8. Reconcile payment_transactions
9. Reconcile subscriptions
10. Fix provider field
11. Add constraints/indexes
12. Build atomic payment fulfillment RPC
13. Connect payment Edge Function to RPC
```

### Phase 3 — AI security

```text
14. Build atomic quota RPC
15. Update AI gateway
16. Fail closed on usage persistence failure
17. Decide anonymous AI policy
```

### Phase 4 — Storage

```text
18. Fix AppContext upload failure behavior
19. Verify Storage RLS
20. Add file validation
```

### Phase 5 — Product intelligence

```text
21. Structured university data
22. Structured scholarship data
23. Source verification
24. Data freshness
25. Explainable matching
```

### Phase 6 — Workflow

```text
26. Dynamic application roadmap
27. Application state machine
28. Deadline engine
29. Document readiness
```

### Phase 7 — Launch

```text
30. Payment tests
31. AI quota tests
32. RLS tests
33. Storage tests
34. CI
35. Staging
36. Sandbox payment tests
37. Production smoke tests
```

---

## 24. Definition of Done

UniAdmission should **not** be considered production-ready until every P0 item is complete.

Final gate:

```text
Security        = PASS
Authentication  = PASS
RLS             = PASS
Payments        = PASS
AI quota        = PASS
Storage         = PASS
Database        = PASS
Build           = PASS
Tests           = PASS
Monitoring      = PASS
Privacy         = PASS
Official data   = VERIFIED
```

### Core principle

> **The browser is never trusted for money, entitlement, quota, admission facts, or permanent document state.**

Authoritative sources should be:

```text
Authentication  → Supabase Auth
Payments        → Gateway + server verification
Subscriptions   → PostgreSQL
Entitlements    → Server/database
AI quota        → PostgreSQL atomic operation
Documents       → Supabase Storage + database
University data → Verified structured data + official sources
AI              → Grounded recommendation layer
```

---

## 25. Highest-Priority Files

### Payment

```text
supabase/functions/payments/index.ts
supabase/functions/_shared/payment/sslcommerz.ts
supabase/functions/_shared/payment/factory.ts
supabase/functions/_shared/payment/catalog.ts
```

### Database

```text
supabase/migrations/20260909_subscriptions_and_entitlements.sql
supabase/migrations/*
```

### AI

```text
supabase/functions/ai-gateway/index.ts
supabase/migrations/*   # atomic quota RPC
```

### Frontend

```text
src/context/AppContext.tsx
src/services/subscriptionService.ts
src/services/paymentService.ts
```

### Documentation

```text
README.md
```

---

## Final Priority Table

| Priority | Area | Fix |
|---|---|---|
| P0 | Fake payment simulation | Remove/gate development-only |
| P0 | Fake customer data | Remove |
| P0 | Payment fulfillment | Make atomic |
| P0 | Payment state | Enforce state machine |
| P0 | Transaction IDs | Use secure UUID |
| P0 | Payment CORS | Restrict |
| P0 | Provider fallback | Fail closed |
| P0 | Plan duration | Use catalog |
| P0 | Payment DB | Reconcile |
| P0 | Subscription provider | Fix stale default |
| P0 | AI quota | Atomic RPC |
| P0 | AI usage errors | Fail closed |
| P0 | Storage failure | Do not report success |
| P0 | RLS | Full audit |
| P0 | Admin auth | Full audit |
| P0 | AI claims | Remove unsupported claims |
| P1 | University data | Structured + verified |
| P1 | Scholarship data | Structured + verified |
| P1 | Matching | Explainable |
| P1 | Application workflow | Dynamic |
| P1 | Deadline engine | Implement |
| P1 | Observability | Implement |
| P1 | Testing | Comprehensive |
| P1 | Privacy/legal | Publish |
| P2 | Cleanup | Remove stale code |
| P2 | Performance | Optimize |
| P3 | Growth | Later |
