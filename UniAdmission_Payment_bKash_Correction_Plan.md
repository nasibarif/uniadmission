# UniAdmission — Payment & Entitlement Correction Plan

## Objective

Replace the current Stripe/sandbox-oriented payment implementation with a production-ready **bKash payment flow**, while making subscription entitlements fully server-controlled.

> **Important:** Do not enable paid-plan production access until payment verification and entitlement security are implemented and tested.

---

## 1. Remove Stripe Completely

Update:

- `supabase/functions/payments/index.ts`
- `src/services/subscriptionService.ts`
- `README.md`
- `.env.example`
- `vite.config.ts`
- Any frontend component containing Stripe/payment references

Remove:

- `STRIPE_SECRET_KEY`
- Stripe checkout sessions
- Stripe price IDs
- Stripe USD product pricing
- `stripe-signature`
- Stripe event handling
- Stripe API calls
- Stripe sandbox/mock checkout
- Stripe-specific documentation

### Acceptance criteria

Searching the repository for `stripe`, `STRIPE_`, and Stripe event names should return no active payment implementation.

---

## 2. Production Payment Architecture

Use:

```text
Student
   ↓
UniAdmission Frontend
   ↓
Authenticated Backend / Supabase Edge Function
   ↓
Create bKash Payment
   ↓
bKash Checkout
   ↓
Student Completes Payment
   ↓
Server Verifies Payment
   ↓
payment_transactions
   ↓
subscriptions
   ↓
entitlements
   ↓
Paid Features Unlocked
```

The browser must never grant a paid subscription.

---

## 3. Create `payment_transactions`

Create a dedicated table with fields such as:

```text
id
user_id
subscription_id
provider
plan
amount
currency
invoice_id
provider_payment_id
provider_transaction_id
status
payment_url
created_at
updated_at
verified_at
```

Recommended statuses:

```text
created
pending
completed
failed
cancelled
refunded
```

Add indexes for `user_id`, provider payment ID, provider transaction ID, and status.

Add uniqueness constraints where appropriate to prevent duplicate transaction processing.

---

## 4. Never Trust Client-Supplied Tier, Price, or User ID

The backend must derive:

```text
user_id  ← authenticated Supabase JWT
email    ← authenticated user/profile
plan     ← server-side allowlist
price    ← server-side configuration
currency ← server-side configuration
```

The client may request:

```json
{
  "plan": "Application"
}
```

but cannot determine the price or entitlement.

---

## 5. Server-Side Plan Configuration

Create one authoritative plan configuration.

Example:

```ts
const PLANS = {
  Explorer: {
    amount: 0,
    currency: "BDT"
  },
  Application: {
    amount: /* approved BDT price */,
    currency: "BDT"
  },
  Complete: {
    amount: /* approved BDT price */,
    currency: "BDT"
  }
};
```

Reject unknown plans and never accept an arbitrary client-supplied amount.

---

## 6. Implement bKash Create Payment

Create a secure server-side endpoint/Edge Function, for example:

```text
POST /functions/v1/create-payment
```

Flow:

1. Validate Supabase JWT.
2. Extract authenticated user ID.
3. Validate requested plan.
4. Load server-side price.
5. Create unique invoice/order ID.
6. Create the bKash payment.
7. Save a `payment_transactions` row with `pending`.
8. Return only the information needed for checkout.

Never expose bKash private credentials to the browser.

---

## 7. Implement bKash Payment Verification

Create a server-side verification endpoint/function:

```text
POST /functions/v1/verify-payment
```

The server must:

1. Authenticate the user.
2. Receive the provider payment reference.
3. Verify the payment directly with bKash.
4. Confirm the expected amount and currency.
5. Confirm the expected plan/transaction.
6. Mark the transaction `completed`.
7. Create/update the subscription.
8. Create/update the entitlement.
9. Record `verified_at`.
10. Return the resulting entitlement.

Do **not** grant access merely because the browser returns with:

```text
?checkout_success=true
```

---

## 8. Remove Client-Side Entitlement Granting

Remove any logic equivalent to:

```ts
setUserTier(tierParam);
```

based on URL parameters or client state.

Never grant paid access from:

- URL parameters
- localStorage
- sessionStorage
- React state
- client-supplied tier
- frontend purchase buttons

The backend/database entitlement is authoritative.

---

## 9. Fix `subscriptionService.ts`

The frontend must not rely on a backend that trusts:

```ts
fetchUserSubscription(userId)
```

with an arbitrary user ID.

Instead, the backend should identify the user from the authenticated Supabase JWT:

```text
authenticated_user_id = JWT.sub
```

Use a secure endpoint such as:

```text
GET /functions/v1/my-entitlement
```

The backend determines the current user.

---

## 10. Server-Controlled Entitlements

Use an `entitlements` table such as:

```text
id
user_id
plan
status
starts_at
expires_at
source
subscription_id
created_at
updated_at
```

Statuses:

```text
active
expired
cancelled
suspended
```

The frontend can read the entitlement but cannot modify it.

---

## 11. Supabase RLS

Users should only be able to read their own:

- subscriptions
- payment transactions
- entitlements
- applications
- documents
- profile data

Users must not be able to directly update:

- subscription tier
- payment status
- entitlement status
- payment verification fields
- provider transaction IDs

Sensitive writes must happen through trusted server-side functions.

---

## 12. Payment Idempotency

Payment verification must be idempotent.

Example:

```text
Request #1 → completed
Request #2 → already processed → no duplicate subscription
```

Use a unique provider transaction/payment reference.

Never create multiple paid subscriptions from the same successful payment.

---

## 13. Payment Failure Handling

Support:

```text
Pending
Success
Failed
Cancelled
Expired
```

If payment fails:

- do not grant paid entitlement
- preserve the transaction record
- show a clear error
- allow the student to retry

---

## 14. Fix AI Entitlement Security

Update:

```text
supabase/functions/ai-gateway/index.ts
```

Do not trust:

```json
{
  "tier": "Complete"
}
```

sent by the frontend.

The AI gateway must:

1. Validate JWT.
2. Identify user from JWT.
3. Load current entitlement.
4. Determine actual plan.
5. Apply correct AI quota.
6. Record AI usage server-side.

---

## 15. Replace In-Memory Production Rate Limits

Do not rely on:

```ts
new Map()
```

for production quotas.

Create persistent `ai_usage` records:

```text
id
user_id
action
model
input_tokens
output_tokens
request_count
created_at
```

Enforce quotas server-side.

---

## 16. Environment Variables

Use server-only bKash configuration, for example:

```env
BKASH_BASE_URL=
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_CALLBACK_URL=
```

Never expose private bKash credentials through:

```text
VITE_*
frontend source code
localStorage
sessionStorage
React state
public files
```

---

## 17. Frontend Checkout Flow

Implement:

```text
Click Upgrade
    ↓
Select Plan
    ↓
POST create-payment
    ↓
Backend creates bKash payment
    ↓
Receive bKash checkout URL
    ↓
Redirect to bKash
    ↓
Student pays
    ↓
Return to UniAdmission
    ↓
Frontend requests verification
    ↓
Backend verifies with bKash
    ↓
Backend updates entitlement
    ↓
Frontend refreshes entitlement
    ↓
Paid features become available
```

The frontend must never directly activate a tier.

---

## 18. Security Checklist

Before production:

- [ ] bKash credentials exist only on the server.
- [ ] Supabase JWT is required.
- [ ] User identity comes from JWT.
- [ ] Plan comes from a server-side allowlist.
- [ ] Price comes from server-side configuration.
- [ ] Currency is server-controlled.
- [ ] Payment reference is verified with bKash.
- [ ] Duplicate processing is prevented.
- [ ] Entitlement is created only after successful verification.
- [ ] RLS prevents entitlement manipulation.
- [ ] URL parameters cannot grant paid access.
- [ ] Sandbox payment code is disabled in production.

---

## 19. Testing Requirements

### Authentication

- [ ] Unauthenticated payment request is rejected.
- [ ] Authenticated user can create payment.

### Authorization

- [ ] User A cannot access User B's subscription.
- [ ] User A cannot modify User B's entitlement.
- [ ] User cannot submit a fake paid tier.

### Payment

- [ ] Valid bKash payment becomes completed.
- [ ] Invalid payment remains failed/pending.
- [ ] Wrong amount is rejected.
- [ ] Wrong transaction reference is rejected.
- [ ] Duplicate verification does not create duplicate entitlement.

### Checkout

- [ ] Unknown plan is rejected.
- [ ] Client-supplied price is ignored.
- [ ] Client-supplied user ID is ignored.

### Entitlements

- [ ] Successful payment unlocks the correct plan.
- [ ] Failed payment does not unlock paid features.
- [ ] Expired subscription loses premium access.

### AI

- [ ] Client cannot upgrade its own AI tier.
- [ ] Quota is based on server entitlement.
- [ ] Quota persists across server instances.

---

## 20. End-to-End Test

Test the complete flow:

```text
Sign up
  ↓
Complete profile
  ↓
Receive free assessment
  ↓
View university matches
  ↓
Select paid plan
  ↓
Create bKash payment
  ↓
Complete payment
  ↓
Verify payment
  ↓
Subscription created
  ↓
Entitlement activated
  ↓
Paid feature unlocked
  ↓
AI quota applied correctly
```

Also attempt:

```text
Manipulate URL tier
Manipulate request tier
Manipulate userId
Manipulate price
Replay payment verification
Directly update subscription through Supabase
```

Every bypass attempt must fail safely.

---

## 21. Production Acceptance Criteria

The correction is complete only when:

- [ ] Stripe completely removed.
- [ ] bKash payment creation implemented.
- [ ] bKash payment verification implemented.
- [ ] Payment transactions persisted.
- [ ] Server-side plan pricing implemented.
- [ ] Server-side user identity implemented.
- [ ] Entitlements persisted.
- [ ] Client-side tier granting removed.
- [ ] RLS prevents entitlement manipulation.
- [ ] Duplicate payments are idempotent.
- [ ] Failed payments never unlock premium features.
- [ ] AI gateway derives tier from server entitlement.
- [ ] AI usage is persisted.
- [ ] Production sandbox handlers removed/disabled.
- [ ] README/environment configuration updated.
- [ ] Unit tests pass.
- [ ] E2E payment flow passes.
- [ ] Security bypass tests pass.

---

## Recommended Implementation Order

### Phase 1 — Remove Stripe

1. Remove Stripe payment function.
2. Remove Stripe environment variables.
3. Remove Stripe frontend references.
4. Remove Stripe documentation.

### Phase 2 — Payment Database

5. Create `payment_transactions`.
6. Standardize `subscriptions`.
7. Standardize `entitlements`.
8. Add RLS and indexes.

### Phase 3 — bKash

9. Implement server-side bKash authentication.
10. Implement create-payment.
11. Implement payment verification.
12. Add idempotency.
13. Add failure/cancellation handling.

### Phase 4 — Entitlement Security

14. Remove URL-based tier activation.
15. Remove client-controlled tier.
16. Derive user identity from JWT.
17. Derive plan/price server-side.
18. Secure subscription queries.
19. Secure entitlement writes.

### Phase 5 — AI Security

20. Derive AI tier from entitlement.
21. Add persistent AI usage tracking.
22. Add quota enforcement.
23. Remove production in-memory-only quota logic.

### Phase 6 — Testing

24. Unit tests.
25. Security tests.
26. Payment verification tests.
27. E2E checkout tests.
28. Production deployment test.

---

## Final Rule

**Never trust the browser for money, identity, permissions, or entitlements.**

```text
Frontend = request
Backend = authority
Database = source of truth
bKash = payment authority
Entitlement = access authority
```

Only after this architecture is working and tested should paid UniAdmission plans be enabled for real users.
