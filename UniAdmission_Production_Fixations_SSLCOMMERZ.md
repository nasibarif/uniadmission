# UniAdmission — Production Fixations & SSLCOMMERZ Migration

## Purpose

This document is the implementation specification for fixing the current UniAdmission repository and migrating its payment system from the existing Stripe-based implementation to a secure, gateway-neutral architecture with SSLCOMMERZ as the first provider.

## P0 — Payment Provider

The current repository still has Stripe-based payment logic in `supabase/functions/payments/index.ts`, while `.env.example` has started moving toward SSLCOMMERZ.

### Required

- Remove Stripe from the active payment flow.
- Do not replace it with direct bKash integration.
- Use SSLCOMMERZ first.
- Keep the architecture provider-neutral so AamarPay or shurjoPay can be added later.

Target:

```text
Frontend -> Authenticated Payment API -> Payment Service -> Gateway Adapter -> SSLCOMMERZ -> Server-side Verification -> Payment Transaction -> Subscription -> Entitlements
```

## 1. Gateway Abstraction

Create:

```text
supabase/functions/_shared/payment/
  types.ts
  gateway.ts
  factory.ts
  sslcommerz.ts
```

Use an interface such as:

```ts
interface PaymentGateway {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
  queryPayment(input: QueryPaymentInput): Promise<QueryPaymentResult>;
}
```

The frontend must never depend on provider-specific details.

## 2. Server-side Plan Catalog

The browser must send only:

```json
{"planId":"explorer"}
```

The server must determine the authenticated user, plan, amount, currency, product name, and access duration.

Never trust browser-supplied tier, amount, currency, userId, or payment status.

Use BDT for the Bangladesh gateway flow and keep prices in one server-side catalog.

## 3. Payment Transactions

Create a provider-neutral `payment_transactions` table:

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
plan_id TEXT NOT NULL
provider TEXT NOT NULL
merchant_transaction_id TEXT NOT NULL UNIQUE
provider_session_id TEXT
provider_transaction_id TEXT
provider_validation_id TEXT
amount NUMERIC(12,2) NOT NULL
currency TEXT NOT NULL
status TEXT NOT NULL
payment_method TEXT
gateway_response JSONB
failure_reason TEXT
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
verified_at TIMESTAMPTZ
```

Statuses:

```text
pending
initiated
processing
success
failed
cancelled
expired
refunded
```

Add useful indexes and unique constraints.

## 4. Subscriptions

Make `subscriptions` provider-neutral.

Recommended fields:

```sql
id UUID PRIMARY KEY
user_id UUID NOT NULL
plan_id TEXT NOT NULL
status TEXT NOT NULL
payment_transaction_id UUID
provider TEXT
starts_at TIMESTAMPTZ
expires_at TIMESTAMPTZ
created_at TIMESTAMPTZ DEFAULT now()
updated_at TIMESTAMPTZ DEFAULT now()
```

Do not make the active architecture depend on Stripe-specific fields such as `stripe_customer_id`, `stripe_subscription_id`, or `amount_usd`.

## 5. SSLCOMMERZ Flow

Implement:

```text
1. User selects plan
2. Frontend sends planId
3. Backend authenticates JWT
4. Backend derives user
5. Backend resolves server-side plan
6. Backend creates pending payment
7. Backend creates unique transaction ID
8. Backend initiates SSLCOMMERZ
9. User is redirected to hosted checkout
10. SSLCOMMERZ sends callback/IPN
11. Backend verifies payment server-to-server
12. Backend verifies amount/currency/transaction
13. Backend marks payment success
14. Backend activates subscription
15. Frontend refreshes entitlement
```

Never activate premium access simply because the browser reached a success URL.

SSLCOMMERZ public integration examples document V4 hosted/easyCheckout flows and server-side validation using validation IDs and returned transaction data. citeturn0search0turn0search2

## 6. Callback/IPN Endpoints

Implement equivalents of:

```text
POST /payments/callback/sslcommerz/success
POST /payments/callback/sslcommerz/fail
POST /payments/callback/sslcommerz/cancel
POST /payments/webhook/sslcommerz
```

Callbacks must locate the local transaction, perform server-side gateway verification, compare amount/currency/transaction identity, update idempotently, and never trust client-supplied tier or price.

## 7. Idempotency

Repeated IPNs/callbacks must not create multiple subscriptions.

Use database uniqueness and transactional logic. Duplicate success notifications must produce only one effective subscription activation.

## 8. Entitlement Security

Stop trusting:

```ts
payload.tier
user.user_metadata?.tier
```

as authoritative paid entitlement.

Required:

```text
JWT -> user ID -> subscriptions -> active subscription -> plan_id -> server-side entitlement
```

The frontend must not be able to upgrade itself.

## 9. AI Gateway

Current in-memory quota tracking should not be the production source of truth.

Replace client-controlled tier logic with server-side entitlement lookup.

Create persistent daily usage, e.g.:

```sql
ai_usage_daily (
  user_id UUID,
  usage_date DATE,
  request_count INTEGER,
  PRIMARY KEY (user_id, usage_date)
)
```

Use atomic increments to prevent concurrent quota bypass.

Keep plan limits configurable, for example:

```text
Free 5/day
Explorer 25/day
Application 100/day
Complete 250/day
School 1000/day
```

## 10. Frontend SubscriptionService

Replace Stripe-oriented logic.

Frontend flow:

```text
select plan -> authenticated POST /payments/create -> receive gatewayUrl -> redirect to SSLCOMMERZ
```

Request:

```json
{"planId":"explorer"}
```

Do not send tier, userId, email, or amount from the browser as authoritative payment fields.

## 11. AppContext

Remove any local mechanism that grants premium access.

Do not call a local `setUserTier()` after a purchase action. Do not trust `?tier=Complete` or other browser-controlled URL parameters.

The server must verify payment and update subscription state first.

## 12. Payment Result UI

Create explicit states:

```text
Processing
Success
Failed
Cancelled
Needs verification
```

A success redirect should refresh entitlements, not grant access.

## 13. Subscription Lifecycle

Define:

```text
pending
active
expired
cancelled
refunded
```

Store `starts_at` and `expires_at`. Access must depend on current server-side subscription state.

## 14. RLS

Keep Supabase RLS enabled. Users may read only their own subscriptions, payment transactions, AI usage, documents, profile, and applications.

Normal users must not directly insert/update/delete subscriptions, payment status, payment amount, plan, or entitlement state.

## 15. Environment

Use:

```env
PAYMENT_GATEWAY=sslcommerz
SSLCOMMERZ_STORE_ID=
SSLCOMMERZ_STORE_PASSWORD=
SSLCOMMERZ_BASE_URL=https://sandbox.sslcommerz.com
APP_BASE_URL=
PAYMENT_SUCCESS_URL=
PAYMENT_FAIL_URL=
PAYMENT_CANCEL_URL=
PAYMENT_IPN_URL=
```

Production secrets must remain server-side. Remove stale Stripe variables from active configuration.

## 16. Remove Stripe

Search the entire repository for:

```text
Stripe
stripe
STRIPE_SECRET_KEY
stripe_customer
stripe_subscription
createCheckoutSession
checkout.session.completed
payment_intent.succeeded
```

Remove or migrate active occurrences and update documentation/dependencies.

## 17. Remove Mock Upgrade

Remove production behavior such as `mock_checkout=true`. A development simulator must never grant production entitlements.

## 18. README

Update the README to describe SSLCOMMERZ, gateway abstraction, server-side verification, and server-authoritative entitlements. Remove stale Stripe payment documentation.

Do not claim enterprise-grade, 100% secure, production ready, high precision, or verified data unless the implementation supports those claims.

## 19. Security Hardening

Verify that Supabase Auth is authoritative, localStorage is not authentication truth, client tier is never authoritative, URL tier parameters cannot grant access, API keys are never exposed, private documents remain private, failed production uploads are not reported as successful, and AI prompts remain protected against injection.

## 20. API

Recommended endpoints:

```text
POST /payments/create
GET  /payments/:id
POST /payments/callback/sslcommerz/success
POST /payments/callback/sslcommerz/fail
POST /payments/callback/sslcommerz/cancel
POST /payments/webhook/sslcommerz
GET  /entitlements
```

Create request:

```json
{"planId":"explorer"}
```

Response:

```json
{
  "success": true,
  "paymentId": "...",
  "gatewayUrl": "https://..."
}
```

## 21. Payment State Machine

```text
pending -> initiated -> processing -> success
                       -> failed
                       -> cancelled
                       -> expired
```

Do not allow arbitrary frontend state transitions.

## 22. Verification

For successful payment, verify server-side provider status, transaction ID, validation ID, amount, currency, expected local transaction, expected plan, expected user, and final gateway status.

Only then activate the subscription.

## 23. Admission Data Quality

Do not let AI invent university requirements. Use structured university data, official source URL, last verified timestamp, and AI explanation.

Clearly distinguish official requirement, AI estimate, and user-specific assessment. Never promise admission or scholarships.

## 24. Testing

Test valid/invalid plans, unauthenticated requests, manipulated amount/tier/user ID, success/failure/cancellation, duplicate IPNs/callbacks, mismatched amount/currency, invalid transaction IDs, expiry, already fulfilled payments, all subscription tiers/states, persistent AI usage, concurrent requests, client tier manipulation, and expired subscriptions.

## 25. Sandbox E2E

Run:

```text
Create test account
 -> Select Explorer
 -> Create payment
 -> SSLCOMMERZ sandbox
 -> Complete payment
 -> Callback/IPN
 -> Server validation
 -> payment_transactions
 -> subscriptions
 -> entitlements
 -> AI quota
 -> browser refresh
```

Also test duplicate callbacks, IPN without browser callback, browser callback without IPN, wrong amount, cancellation, and failure.

## 26. Build and Verification

Run the repository's real scripts, for example:

```bash
npm install
npm run build
npm run lint
npm run typecheck
```

Do not claim success unless the commands actually pass.

## 27. Final Search

Before declaring completion, search for:

```text
Stripe
stripe
STRIPE_SECRET_KEY
mock_checkout
amountUsd
stripe_customer_id
stripe_subscription_id
payload.tier
user_metadata?.tier
dailyUsageTracker
setUserTier
?tier=
```

Every remaining occurrence must be intentional and documented.

## 28. Acceptance Criteria

- [ ] Stripe removed from active payment flow.
- [ ] No direct bKash integration.
- [ ] SSLCOMMERZ is active provider.
- [ ] Gateway abstraction exists.
- [ ] Frontend sends only `planId`.
- [ ] User identity comes from authenticated JWT.
- [ ] Prices and currency are server-side.
- [ ] `payment_transactions` exists.
- [ ] Server-side SSLCOMMERZ verification exists.
- [ ] Amount, currency, and transaction identity are verified.
- [ ] Callbacks/IPN are idempotent.
- [ ] Subscription activation is idempotent.
- [ ] Users cannot directly mutate subscriptions.
- [ ] Tier is not trusted from metadata or request payload.
- [ ] AI quota uses server-side entitlement.
- [ ] AI usage is persistent.
- [ ] Mock checkout cannot grant production access.
- [ ] Stripe environment variables are removed.
- [ ] README is updated.
- [ ] Build passes.
- [ ] Lint passes.
- [ ] Typecheck passes.
- [ ] Sandbox payment flow passes.
- [ ] No critical payment/security bypass remains.

## 29. Implementation Order

```text
1. Database migration
2. Payment gateway abstraction
3. SSLCOMMERZ adapter
4. Payment create/callback/IPN
5. Subscription + entitlement service
6. AI gateway security/quota
7. Frontend SubscriptionService
8. AppContext/payment UI
9. README/environment cleanup
10. Tests + sandbox E2E
11. Build/lint/typecheck/security audit
```

## 30. Developer Rules

1. Inspect existing code before modifying it.
2. Do not create duplicate services unnecessarily.
3. Reuse existing Supabase/Auth architecture where appropriate.
4. Never trust frontend tier, amount, currency, user ID, or payment status.
5. Never expose payment secrets to the browser.
6. Never grant premium access from URL parameters or localStorage.
7. Never use mock payment in production.
8. Never report fake payment success.
9. Never report failed production document uploads as successful.
10. Preserve working features unless security changes require modification.
11. Keep migrations safe and backward-aware where practical.
12. Add clear error handling and safe structured logging.
13. Keep payment code isolated from UI/business logic.
14. Keep provider-specific assumptions inside the adapter.
15. Do not claim implementation or testing that was not actually completed.

## Final Principle

> **The browser requests access. The server decides access. The payment gateway confirms payment. The database records the truth.**

Target architecture:

```text
Frontend
 -> Payment API
 -> Payment Gateway Abstraction
 -> SSLCOMMERZ
 -> Server-side Verification
 -> payment_transactions
 -> subscriptions
 -> entitlements
 -> Premium Features / AI Gateway
```
