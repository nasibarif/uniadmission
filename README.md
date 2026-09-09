# UniAdmission: Global University Admissions & Scholarship Intelligence Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.0-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20RLS-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Zod](https://img.shields.io/badge/Validation-Zod%20v4-3E67B1?logo=zod&logoColor=white)](https://zod.dev/)

**UniAdmission** is an enterprise-grade admissions intelligence and scholarship matching platform designed for international students seeking undergraduate and graduate degrees worldwide (USA, Canada, UK, Germany, Australia, Europe, and Asia).

---

## 🚀 Core Features & Architectural Capabilities

### 1. Admission Command Center (`/#/dashboard`)
- **Today's Highest Impact Action**: Algorithmic assessment of open applications, missing blockers, and pending Vault documents to highlight the candidate's single highest-impact priority.
- **Overall Application Readiness Meter**: Quantifiable readiness index ($0\text{--}100\%$) combining verified checklist items ($70\%$) and document fulfillment ($30\%$).
- **Deadlines Urgency Radar**: Real-time milestone tracker categorizing applications into Urgent ($\le$ 14d), Approaching (15–45d), and Upcoming (45+d).
- **Portfolio Distribution**: Dynamic breakdown across Reach, Target, and Likely institutions.

### 2. High-Precision Matching Engine (`/#/universities`)
- **Constraint-Weighted Admissions Matching (`2026.2-constraint-weighted`)**: Multi-dimensional scoring evaluating GPA requirements, standardized test baselines, financial budget thresholds, and curriculum compatibility.
- **Verified Institutional Data**: Official registrar portals, QS/THE world rankings, net attendance cost estimations, and verified admission statistics.
- **7-Dimension Country Fit Analysis (`/#/countries`)**: Quantifies candidate fit across Tuition/Living Affordability, Work Rights, Visa Stringency, Language Requirements, Permanent Residency Pathways, Academic Rigor, and Safety.

### 3. Scholarship Eligibility Engine (`/#/scholarships`)
- **Granular Criteria Evaluation**: Automatic screening against nationality quotas, degree levels, minimum GPA cutoffs, standardized tests, and field-of-study rules.
- **Audit Modal & Verification Badges**: Inspect transparent rule evaluations and source documentation.

### 4. Application Command Center & Requirements Checklists (`/#/applications`)
- **Program-Specific Routing**: Supports Common App, UCAS, uni-assist VPD, APS certification (Germany), and direct portals.
- **Prerequisite Blocker Tracking**: Flags hard course/curriculum prerequisites with actionable alerts.
- **Real-Time Countdown Timers**: Tracks application lead times (SOP drafting, LOR requests, financial solvency docs).

### 5. Secure Document Vault (`/#/vault`)
- **AES-GCM 256-bit Encryption**: End-to-end client-side document encryption with user-isolated cryptographic keys.
- **AI Document Pre-Check**: Automated validation verifying file readability, document type match, and issuing authority verification.
- **Multi-Level Privacy & Expiring Links**: Granular access control (`Private`, `Verified Institutional Staff`, `Public Link with PIN`) and tamper-evident audit logging.

### 6. Grounded AI Tools & Counseling (`/#/counselor`, `/#/sop`, `/#/cv`)
- **Data-Grounded AI Counselor**: 24/7 strategic admissions advising strictly grounded in verified database facts. Distinguishes verified catalog facts from strategic recommendations.
- **Zod Schema Validation**: Guarantees structured AI outputs for SOP sections, essay critiques, and STAR CV bullets.
- **Prompt Injection Defense**: Untrusted user inputs are isolated within `<untrusted_student_input>` delimiters to prevent jailbreaks.
- **SOP Version History & Snapshot Restore**: Tracks word counts and draft revisions with one-click restoration.
- **STAR-Method CV Builder**: ATS-optimized bullet points quantifying context, task, leadership actions, and measurable outcomes.

### 7. Data Quality & Admissions Admin Console (`/#/admin`)
- **Catalog Management**: In-app management for universities, programs, and scholarships.
- **Verification Queue**: Surfaces records pending annual audit or exceeding the 180-day recertification threshold.
- **Immutable Audit Trail**: Persistent logging of all catalog modifications, actor identities, timestamps, and auditor notes.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend Framework** | React 19, TypeScript 5.7 |
| **Routing** | React Router (`HashRouter` for deep linking & state sync) |
| **Styling & UI** | Tailwind CSS 3.4, Lucide React Icons |
| **Validation** | Zod v4 Schema Validation |
| **Authentication & Database** | Supabase Auth, PostgreSQL with Row Level Security (RLS) |
| **AI Integration** | Google Gemini 2.5 Flash via Server-Side AI Gateway |
| **Build & Tooling** | Vite 6.0, Oxlint |

---

## 📦 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18.0 or newer
- [npm](https://www.npmjs.com/) v9.0 or newer

### Installation
```bash
# Clone the repository
git clone https://github.com/nasibarif/uniadmission.git
cd uniadmission

# Install dependencies
npm install
```

### Environment Configuration
Create a `.env` file in the project root (see `.env.example`):
```env
# Supabase Configuration (Frontend)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Server-Side AI Gateway (Never expose via VITE_*)
GEMINI_API_KEY=your-gemini-api-key

# Server-Side Payment Gateway (SSLCOMMERZ / Edge Functions Only)
PAYMENT_GATEWAY=sslcommerz
SSLCOMMERZ_STORE_ID=your-sslcommerz-store-id
SSLCOMMERZ_STORE_PASSWORD=your-sslcommerz-store-password
SSLCOMMERZ_BASE_URL=https://sandbox.sslcommerz.com
APP_BASE_URL=http://localhost:5173
PAYMENT_SUCCESS_URL=http://localhost:5173/payments/callback/sslcommerz/success
PAYMENT_FAIL_URL=http://localhost:5173/payments/callback/sslcommerz/fail
PAYMENT_CANCEL_URL=http://localhost:5173/payments/callback/sslcommerz/cancel
PAYMENT_IPN_URL=http://localhost:5173/payments/webhook/sslcommerz
```

### Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### Verification & Testing
```bash
# Run automated test suite
npm test

# Type check and build production bundles
npm run build

# Run linter
npm run lint
```

---

## 💳 Payment Architecture & Security Model

UniAdmission implements a **secure, gateway-agnostic payment architecture** featuring **SSLCOMMERZ** as the primary provider (with pluggable support for `aamarpay` and `shurjopay`):

### 1. Gateway Abstraction (`supabase/functions/_shared/payment/`)
- Unified `IPaymentGateway` interface exposing `createPayment()`, `verifyPayment()`, and `queryPayment()`.
- Factory `getPaymentGateway()` selects the configured gateway (`PAYMENT_GATEWAY=sslcommerz`).

### 2. Server-Authoritative Plan Pricing (BDT)
- The frontend sends only `{ planId: "Application" }`. The server dictates prices, durations, and currency:
  - **Free:** ৳0
  - **Explorer:** ৳1,490 (365 days)
  - **Application:** ৳3,990 (365 days)
  - **Complete:** ৳7,990 (365 days)
  - **School:** ৳19,990 (365 days)
- Client-supplied amounts and currencies are strictly rejected.

### 3. Server-to-Server Order Validation & Idempotency
- Browser redirects are never treated as proof of payment.
- When the gateway reports a transaction, the server calls the SSLCOMMERZ Order Validation API (`validationserverAPI.php`) verifying:
  - `status === 'VALID' || status === 'VALIDATED'`
  - `tran_id === merchant_transaction_id`
  - Exact amount match against local database records
  - Currency match (`BDT`)
- Subscriptions are activated only after successful server validation.
- Database unique constraints and status checks prevent duplicate fulfillment across IPN and browser callbacks.

### 4. Zero Client Trust Entitlements
- User identity is extracted strictly from authenticated Supabase JWT session headers (`auth.getUser()`).
- Feature access and AI Gateway quotas are derived directly from active subscriptions in PostgreSQL (`public.subscriptions`), ignoring `user_metadata.tier` and client payload manipulation.

---

## 🔒 Security & Compliance

- **No Client-Side Gateway Secrets**: SSLCOMMERZ store credentials and service role keys remain exclusively on the server.
- **Row Level Security (RLS)**: PostgreSQL policies enforce strict tenant isolation (`auth.uid() = user_id`) on `payment_transactions` and `subscriptions`.
- **Client-Side Encryption**: Sensitive personal documents in the Document Vault are encrypted using `crypto.subtle` AES-GCM-256 before cloud storage.
- **Content Security Policy**: Hardened headers in `vercel.json` and `vite.config.ts` restrict outbound connections and frame ancestry.
- **Prompt Injection Delimiters**: Strict delimiter tagging and defensive system prompts sanitize user text before LLM inference.

---

## 📄 License
This project is licensed under the MIT License.
