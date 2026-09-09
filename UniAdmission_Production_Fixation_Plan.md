# UniAdmission — Production Fixation & Hardening Plan

## Payment decision

**UniAdmission will use bKash for payments for now. Stripe is NOT part of the current implementation scope.**

Do not add Stripe SDKs, Stripe checkout, Stripe webhooks, Stripe secrets, or Stripe-specific payment logic at this stage.

The generic subscription/entitlement architecture should remain provider-agnostic so another payment provider can be added later without rewriting the application.

---

# P0 — Critical Security & Authorization

## 1. Server-controlled subscription tier
- Remove tier from authorization decisions based on localStorage, React state, URL parameters, request bodies, or editable user metadata.
- Use `profiles → subscriptions → entitlements` as the authoritative chain.
- Frontend tier is presentation state only.
- Paid features must be authorized server-side.

**Done when:** changing localStorage, frontend state, URL `tier`, or request `tier` cannot unlock paid features.

## 2. Remove URL-based tier granting
- Never grant an entitlement from `?tier=...`.
- Payment success should only trigger an entitlement refresh.
- The server/database must confirm the entitlement.

## 3. Server-derived identity
Every protected backend function must derive identity from the Supabase JWT:
`Authorization → auth.getUser() → authenticated user ID`
Do not trust client-supplied `userId` or `email`.

## 4. Audit RLS
Test that a user cannot read/write another user's:
- profile
- applications
- documents
- subscriptions
- entitlements
- AI usage

---

# P0 — bKash Payments

## 5. Remove Stripe from current scope
- Remove/disable Stripe imports, checkout, webhook code, secrets, UI and environment variables.
- Do not create Stripe database assumptions.
- If old Stripe code remains temporarily, it must be unreachable in production and clearly marked deprecated.

## 6. Implement bKash payment architecture

Recommended flow:

`Student selects plan`
→ `Backend creates payment/order`
→ `bKash payment`
→ `bKash callback/verification`
→ `Backend verifies transaction`
→ `payment_transactions`
→ `subscriptions`
→ `entitlements`
→ `Frontend refreshes entitlement`

Never grant access merely because the browser reports success.

The exact implementation depends on the bKash merchant/API product and credentials being used.

## 7. Create `payment_transactions`

Recommended fields:
- `id`
- `user_id`
- `provider`
- `provider_payment_id`
- `provider_transaction_id`
- `plan_id`
- `amount`
- `currency`
- `status`
- `created_at`
- `verified_at`
- `metadata`
- `failure_reason`

Statuses:
`initiated`, `pending`, `completed`, `failed`, `cancelled`, `refunded`, `verification_failed`

## 8. Payment idempotency
- Prevent duplicate subscription grants when the same bKash payment/callback is processed more than once.
- Add unique constraints around provider + provider transaction/payment ID.
- Make callbacks safe to retry.

## 9. Never trust client price
Client sends only `plan_id`.
Backend determines the current price.
Never accept a client-supplied amount as authoritative.

## 10. bKash admin workflow
Support:
- pending
- verified
- failed
- duplicate
- incorrect amount
- refund
- manual review
- customer support escalation

---

# P0 — AI Gateway

## 11. Remove client-controlled AI tier
The AI gateway must calculate:
`JWT → user → entitlement → quota → AI`

A request such as `{ "tier": "Complete" }` must not increase quota.

## 12. Persistent AI usage
Replace in-memory rate-limit Maps with database-backed usage.

Recommended `ai_usage`:
- `id`
- `user_id`
- `date`
- `request_count`
- `input_tokens`
- `output_tokens`
- `estimated_cost`
- `last_request_at`

## 13. AI budget controls
Configure:
- requests/minute
- requests/day
- tokens/day
- maximum input size
- maximum output tokens
- monthly AI budget

## 14. Validate AI outputs
Use Zod schemas for every structured AI response. Reject invalid output instead of trusting raw model JSON.

## 15. Ground AI in verified data
AI must use verified UniAdmission records for:
- requirements
- deadlines
- scholarships
- tuition/cost
- application routes
- official links

If data is missing/stale, say so. Never invent admissions facts.

## 16. Prompt-injection protection
Treat profile text and uploaded-document text as untrusted input. Use strict system instructions, structured context, output schemas and size limits.

---

# P0 — Document Vault

## 17. Cloud storage is source of truth
IndexedDB is a cache/offline aid, not authoritative storage.

Correct:
`upload → Supabase success → DB record → success UI`

If Supabase upload fails:
`upload failed → failure UI → no successful cloud-upload status`

## 18. Remove fake fallback downloads
If the original binary is unavailable, show:
`Original document unavailable`
Do not generate metadata and present it as the original document.

## 19. Document versioning
Use:
`documents → document_versions`

Store:
- storage path
- filename
- MIME type
- size
- checksum/hash
- uploaded_at
- status

Statuses:
`uploaded`, `processing`, `verified`, `rejected`, `deleted`

## 20. Document security
- private bucket
- RLS
- per-user paths
- short-lived signed URLs
- file type/size validation
- malware scanning strategy
- secure deletion
- audit logs

---

# P0 — Admissions Intelligence Integrity

## 21. Remove unsupported claims
Remove claims such as:
- universal/near-universal admission claims
- guaranteed scholarships
- guaranteed debt-free pathways
- automatic scholarship guarantees
- admission guarantees
- broad country tuition claims without source evidence

Use evidence-based wording.

## 22. Replace fake university counts
Do not calculate university counts from arbitrary percentages.

Calculate real results from:
`student profile → eligible programs → matching programs → classification`

The displayed count must come from actual indexed records.

## 23. Keep Fit Score separate from admission probability
Use:
`Profile Fit Score: 87/100`

Recommended positioning:
- Likely
- Target
- Reach
- High Reach

Do not present a heuristic score as a percentage chance of admission.

## 24. Separate scoring dimensions
Calculate:
- Academic Fit
- Program Fit
- English Fit
- Test Fit
- Budget Fit
- Country Fit
- Requirement Fit
- Scholarship Fit

Then produce an explainable overall Profile Match Score.

---

# P1 — University & Program Database

## 25. Build the admissions catalog

Hierarchy:
`Country → University → Campus → Program → Degree → Intake → Application Route → Requirements → Deadlines → Scholarships`

## 26. Program-level requirements
Store:
- minimum GPA
- prerequisite subjects
- English requirements
- SAT/ACT policy
- portfolio
- interview
- program-specific tests
- document requirements
- application route

## 27. Program-level deadlines
Store:
- intake
- deadline
- deadline type
- application route
- scholarship deadline
- timezone
- source
- verification date

## 28. Source verification
Important records need:
- `source_url`
- `source_type`
- `verification_status`
- `last_verified_at`
- `next_review_at`
- `verified_by`

Workflow:
`Draft → Review → Verified → Stale → Archived`

---

# P1 — Scholarship Intelligence

## 29. Real scholarship records
Store:
- provider
- university/country
- degree level
- eligible countries
- programs
- minimum academics
- English requirements
- financial need criteria
- award amount
- tuition coverage
- living allowance
- duration
- deadline
- application route
- official source
- verification status

## 30. Real scholarship matching
Replace generic estimated scholarship amounts with actual scholarship records.

Output:
- Eligible
- Potentially Eligible
- Not Eligible
- Unknown / Needs Verification

## 31. Separate eligibility from competitiveness
A student can be eligible but not highly competitive.
Show these as separate concepts.

---

# P1 — Application Workflow

## 32. Application references actual program
Every application should reference:
- university
- program
- intake
- application route
- deadline
- requirements

## 33. Dynamic application checklist
Generate checklist from the selected program/intake/application route.
Do not use one universal checklist for every application.

## 34. Application statuses
Use:
- Researching
- Shortlisted
- Preparing
- Ready to Apply
- Submitted
- Under Review
- Interview
- Offer
- Waitlisted
- Rejected
- Withdrawn

---

# P1 — Dynamic Roadmap

## 35. Replace hard-coded roadmap dates
Generate roadmap from:
- profile
- selected universities
- programs
- intakes
- deadlines
- documents
- tests
- scholarship deadlines
- application status

The roadmap should update automatically when applications or deadlines change.

---

# P1 — Country Recommendation Engine

## 36. Evidence-based country scoring
Use:
- academic fit
- program availability
- budget
- scholarships
- language
- English requirements
- application complexity
- student preferences
- verified costs
- verified post-study/work information where applicable

Show component breakdowns instead of arbitrary static percentages.

---

# P1 — Admin & Data Operations

## 37. Admin console
Admins need to manage:
- universities
- campuses
- programs
- requirements
- intakes
- deadlines
- scholarships
- sources
- verification status
- users
- subscriptions
- bKash payments
- AI usage
- audit logs

## 38. Verification queue
Create workflows for:
`Draft → Review → Verified → Stale → Archived`

## 39. Audit logging
Create `audit_logs` with:
- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `metadata`
- `created_at`

Track important:
- subscription changes
- payment verification
- entitlement changes
- document events
- admin edits
- university/scholarship changes

---

# P1 — Testing

## 40. Unit tests
Cover:
- matching
- eligibility
- scholarship matching
- country scoring
- application readiness
- entitlement rules
- payment state transitions

## 41. Security tests
Test:
- changing user ID
- changing tier
- manipulating URL
- replaying bKash callback
- accessing another user's document
- modifying another user's application
- fake AI tier
- exceeding AI quota

## 42. E2E test
Critical flow:
`Signup → Profile → Assessment → Match → Scholarship → Application → Document → AI → bKash → Verification → Entitlement → Paid Feature`

---

# P1 — Production Environment

## 43. Environments
Maintain:
- local
- staging
- production

## 44. Secrets
Never commit:
- Supabase service-role key
- bKash credentials
- Gemini API key
- database passwords
- private encryption keys

Create `.env.example` with placeholders only.

## 45. Production API architecture
Recommended:
`React/Vercel → Supabase Auth → Supabase Edge Functions → PostgreSQL/Storage → Gemini/bKash`

Development Vite API mocks must be separated from production functions and must never become the production authorization path.

---

# P2 — Routing & UX

## 46. Clean application routes
Use:
- `/app/dashboard`
- `/app/profile`
- `/app/assessment`
- `/app/universities`
- `/app/scholarships`
- `/app/countries`
- `/app/applications`
- `/app/documents`
- `/app/sop`
- `/app/cv`
- `/app/roadmap`
- `/app/counselor`

Later public SEO pages:
- `/universities/...`
- `/programs/...`
- `/scholarships/...`
- `/countries/...`

---

# P2 — Document AI

## 47. Rename current feature honestly
If current checks only validate file properties/basic quality, call it:
`Document Integrity Pre-Check`

Do not claim authenticity or issuing-authority verification without actually performing those checks.

## 48. Future document pipeline
`Upload → Malware Scan → OCR/Text Extraction → Classification → Field Extraction → Requirement Comparison → AI Quality Check → Human Review when needed`

---

# P2 — Analytics & Monitoring

## 49. Product analytics
Track:
- signup conversion
- profile completion
- assessment completion
- shortlist creation
- applications
- document uploads
- paid conversion

## 50. AI analytics
Track:
- requests/user
- tokens
- estimated cost
- errors
- latency

## 51. Payment analytics
Track:
- attempts
- successful payments
- failures
- pending payments
- refunds
- verification failures

## 52. Data monitoring
Track:
- stale records
- broken official URLs
- verification queue
- outdated scholarships

---

# P2 — Notifications

## 53. Add notifications for
- application deadlines
- scholarship deadlines
- missing documents
- test deadlines
- roadmap tasks
- payment status
- offers
- stale applications

---

# P2 — AI Counselor Guardrails

## 54. Rules
The AI counselor must:
1. Explain recommendations.
2. Identify the underlying verified source.
3. Distinguish facts from estimates.
4. State uncertainty.
5. Never promise admission.
6. Never promise scholarships.
7. Never invent deadlines.
8. Never invent application links.
9. Recommend official-source verification when appropriate.
10. Escalate ambiguous/high-risk cases to human review where available.

---

# P2 — Product Packaging

## Free
- profile assessment
- country fit
- broad real university count
- limited matches
- basic scholarship compatibility
- basic application readiness
- limited AI counseling

## Explorer / Discovery
- full university matching
- full scholarship discovery
- requirements
- costs
- deadlines
- official links
- deeper country comparison

## Application
- SOP assistance
- personal statement
- CV
- scholarship essays
- application checklist
- document readiness
- application roadmap

## Complete
- everything above
- expanded country recommendations
- advanced AI counselor
- advanced application strategy
- additional support features

---

# P3 — Future B2B

Later:
`School Admin → Student Cohorts → Counselor Dashboard → Progress → Application Analytics`

Do not block consumer launch on B2B.

---

# Recommended Database Architecture

Core tables:

```text
profiles
student_profiles
countries
universities
campuses
programs
intakes
program_requirements
application_routes
deadlines
scholarships
scholarship_requirements
sources
applications
application_checklist_items
documents
document_versions
roadmap_items
ai_usage
subscriptions
entitlements
payment_transactions
audit_logs
```

**Business-critical facts must live in PostgreSQL, not localStorage.**

---

# Recommended Entitlement Model

## subscriptions

```text
id
user_id
plan_id
provider
status
started_at
expires_at
provider_customer_id
provider_subscription_id
```

## entitlements

```text
id
user_id
feature
enabled
source_subscription_id
expires_at
```

This allows feature-level authorization later.

---

# Recommended bKash Model

Keep provider-specific payment data in `payment_transactions`.

Generic flow:

`payment_transactions → subscriptions → entitlements`

The subscription system should not depend on bKash-specific fields except through the payment adapter.

This allows a future payment provider to be added without redesigning the entitlement system.

---

# Production Launch Checklist

## Security
- [ ] RLS audited
- [ ] Server-derived identity
- [ ] Server-derived tier
- [ ] URL tier manipulation removed
- [ ] Client tier removed from authorization
- [ ] Storage access tested
- [ ] AI gateway secured
- [ ] Persistent AI quotas
- [ ] Secrets removed from Git
- [ ] Security headers configured
- [ ] Audit logs active

## bKash
- [ ] bKash merchant/API setup completed
- [ ] Backend payment creation
- [ ] Trusted payment verification
- [ ] Callback verification where applicable
- [ ] Duplicate transaction protection
- [ ] Server-side pricing
- [ ] Payment state machine
- [ ] Refund/manual review process
- [ ] Entitlement only after verified payment

## Admissions Data
- [ ] Universities verified
- [ ] Programs verified
- [ ] Requirements verified
- [ ] Deadlines verified
- [ ] Scholarships verified
- [ ] Official URLs verified
- [ ] Source metadata present
- [ ] Review dates configured
- [ ] Stale-data workflow active

## AI
- [ ] Output schemas
- [ ] Prompt-injection protections
- [ ] Verified-data grounding
- [ ] Usage tracking
- [ ] Cost tracking
- [ ] Rate limits
- [ ] Error handling
- [ ] No admission guarantees

## Documents
- [ ] Cloud storage is authoritative
- [ ] Private bucket
- [ ] Signed URLs
- [ ] Versioning
- [ ] File validation
- [ ] Malware-scanning strategy
- [ ] Secure deletion
- [ ] Audit trail
- [ ] No fake fallback downloads

## Testing
- [ ] Unit tests
- [ ] RLS tests
- [ ] Entitlement security tests
- [ ] bKash payment tests
- [ ] AI quota tests
- [ ] Document access tests
- [ ] E2E signup flow
- [ ] E2E paid flow
- [ ] Production build
- [ ] Production smoke test

---

# Implementation Order

## Phase 1 — Security
1. Remove client-controlled entitlements.
2. Remove URL tier granting.
3. Server-derive identity.
4. Audit RLS.
5. Secure AI gateway.
6. Persistent AI usage.
7. Fix document failure handling.

## Phase 2 — bKash
8. Create payment transaction model.
9. Implement bKash payment creation.
10. Implement trusted verification.
11. Implement idempotency.
12. Create subscription after verified payment.
13. Create entitlement after subscription.
14. Build payment admin tools.

## Phase 3 — Admissions Data
15. Normalize university/program database.
16. Add program requirements.
17. Add intake/deadline records.
18. Add scholarship requirements.
19. Add source verification.
20. Replace fake counts.
21. Replace arbitrary scholarship estimates.

## Phase 4 — Application Intelligence
22. Program-specific checklist.
23. Dynamic roadmap.
24. Application readiness.
25. Country recommendation engine.
26. Explainable match scoring.

## Phase 5 — AI
27. Ground AI in verified database.
28. Add schemas.
29. Add prompt-injection protection.
30. Add AI cost tracking.
31. Improve SOP/CV/essay workflows.

## Phase 6 — QA & Launch
32. Security testing.
33. RLS testing.
34. bKash testing.
35. E2E testing.
36. Staging deployment.
37. Production monitoring.
38. Final launch audit.

---

# Definition of Production Ready

UniAdmission is production-ready only when:

### Security
A student cannot access another student's profile, applications, documents, subscription or AI quota.

### Entitlements
Paid features cannot be unlocked through localStorage, URL manipulation, modified frontend code, or request payload manipulation.

### Payments
A subscription is created only after the backend verifies the bKash payment.

### Admissions
Critical admission facts have source and verification metadata.

### AI
AI cannot invent critical admissions information and cannot bypass quotas.

### Documents
A document is considered uploaded only after successful authoritative cloud storage.

### Data
University/scholarship counts and matches come from actual indexed records.

### Operations
Admins can maintain universities, programs, scholarships, requirements, deadlines, sources, users, subscriptions, bKash payments and verification status.

---

# Target Architecture

```text
                    UNIADMISSION
                         │
              ┌──────────┴──────────┐
              │                     │
          React App             Supabase Auth
              │                     │
              └──────────┬──────────┘
                         │
                Supabase Edge Functions
                         │
        ┌────────────────┼─────────────────┐
        │                │                 │
     AI Gateway       bKash Payments    Application API
        │                │                 │
     Gemini        Payment Verification  PostgreSQL
                                          │
                 ┌────────────────────────┼───────────────┐
                 │                        │               │
             Admissions               Scholarships    Applications
             Universities             Requirements    Documents
             Programs                  Deadlines       Roadmap
             Requirements              Sources         Audit Logs
                 │
                 └────────────── Matching Engine ──────────┘
```

## Core architectural rules

**Frontend = interface.**

**Backend/database = authority.**

**Verified sources = admissions truth.**

**bKash verification = payment truth.**

**AI = reasoning layer, not source of truth.**

**Supabase Storage = document source of truth.**
