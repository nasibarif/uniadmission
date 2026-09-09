**UniAdmission — Complete Problem & Solution Roadmap**

*Step-by-step production upgrade plan based on the uploaded project source*

This document converts the source-code audit into an implementation roadmap. Each item is written as a concrete step: Problem → Why it matters → Proper solution → Implementation steps → Acceptance criteria. The goal is to evolve the current React/Vite prototype into a secure, trustworthy, data-driven admission SaaS without throwing away the existing frontend.

**Important audit note:** The project was statically inspected from the uploaded ZIP. A full production build was attempted previously but dependency installation/build timed out in the execution environment, so runtime/build success should be verified locally after the changes.

# **0\. Recommended Implementation Order**

| Priority | What to do |
| :---- | :---- |
| P0 — Security | Authentication, password handling, Gemini API key, document storage, subscription enforcement |
| P0 — Trust | Remove misleading guarantees/verification claims; distinguish match score from admission probability |
| P1 — Data | Move universities/scholarships/countries/program requirements into a real database with sources |
| P1 — Intelligence | Rebuild matching, country scoring, scholarship eligibility and application requirements |
| P1 — Workflow | Real application checklists, deadline intelligence, readiness score, persistent roadmap |
| P1 — Admin | Admin dashboard \+ data verification/freshness workflow |
| P2 — UX | Routing, dashboard command center, explainable recommendations, onboarding polish |
| P2 — AI | Backend AI gateway, contextual counselor, SOP/CV generation with validation and usage limits |
| P3 — Growth | Payments, school/B2B, human review, visa/pre-departure, analytics and integrations |

# **A. Security & Authentication**

## **Step 1 — Replace localStorage authentication**

**Problem:** src/services/authService.ts implements accounts, sessions and user data with localStorage. Passwords are stored in a field called passwordHash but are compared directly with the entered password.

**Why this is a problem:** Anyone with browser access can inspect/modify account data, passwords and sessions. Client-side state cannot be trusted for a commercial SaaS.

**Proper solution:** Move authentication to a real backend/auth provider. Recommended for this project: Supabase Auth \+ PostgreSQL \+ Row Level Security. Keep only a secure session/token mechanism on the client.

**How to solve it — step by step**

1. Create a Supabase project and enable email/password authentication.  
2. Create a profiles/users table linked to auth.users.  
3. Migrate profile, applications, documents metadata and preferences into user-scoped tables.  
4. Delete passwordHash from frontend data models and local storage.  
5. Replace AuthService.signIn/signUp/signOut with server-backed authentication calls.  
6. Use protected routes/components so unauthenticated users cannot access app data.  
7. Add email verification and password reset.  
8. After migration, remove the localStorage users database completely.

**Done when:** Passwords never appear in frontend state/storage; changing one user's data cannot affect another user's data; refresh keeps a secure authenticated session.

## **Step 2 — Remove the client-side Gemini API key**

**Problem:** src/services/geminiService.ts reads/writes the Gemini key in localStorage and calls the Google Gemini endpoint directly from the browser.

**Why this is a problem:** A commercial app should never expose its provider secret through browser code or ask normal customers to supply an API key. Users can also inspect/replace the key and potentially abuse the service.

**Proper solution:** Create a server-side AI gateway/Edge Function. Store the Gemini secret only in server environment variables.

**How to solve it — step by step**

9. Create an /api/ai or Supabase Edge Function layer.  
10. Move Gemini calls from the browser service into that backend function.  
11. Store GEMINI\_API\_KEY only as a server secret.  
12. Remove ApiKeyModal from the normal customer UX.  
13. Add per-user AI usage limits based on subscription tier.  
14. Log request count, model, latency, token usage and errors without storing unnecessary sensitive content.  
15. Return safe, structured errors to the frontend.

**Done when:** No Gemini secret exists in the shipped JavaScript bundle, localStorage or browser network configuration.

## **Step 3 — Protect subscription/tier access**

**Problem:** PricingModal.tsx changes userTier directly when a plan button is clicked. The tier is therefore UI/client state rather than a verified purchase entitlement.

**Why this is a problem:** A user could potentially unlock paid features without paying. This also makes refunds, expiry and plan changes impossible to manage correctly.

**Proper solution:** Use a real payment/subscription provider plus server-side entitlements.

**How to solve it — step by step**

16. Create products/prices for Free, Explorer, Application and Complete.  
17. Create a checkout flow.  
18. Receive payment-provider webhooks on the backend.  
19. Store subscription ID, customer ID, plan, status, start/end dates and renewal state.  
20. Calculate entitlements server-side.  
21. Make frontend buttons call checkout rather than directly setting tier.  
22. On every paid API/action, validate the user's entitlement on the server.  
23. Handle cancellation, failed payment, refund and expiry states.

**Done when:** Changing React state or localStorage never unlocks paid functionality.

## **Step 4 — Validate imported dossier data**

**Problem:** AppContext.importDossierJson parses JSON and can replace profile/application/document/roadmap state without robust schema validation.

**Why this is a problem:** Malformed or manipulated imports can corrupt application state. Authentication identity must never be controlled by imported data.

**Proper solution:** Validate imported data with a schema library such as Zod and import only allowed user-owned fields.

**How to solve it — step by step**

24. Define an explicit Dossier schema.  
25. Validate version and required fields.  
26. Strip unknown fields.  
27. Never import or overwrite authenticated user ID/session.  
28. Show a preview/diff before replacing existing data.  
29. Create a backup/export before destructive replacement.  
30. Reject invalid data with a user-friendly error.

**Done when:** Invalid JSON or structurally invalid data is rejected safely and cannot change the authenticated identity.

## **Step 5 — Add security headers and input protection**

**Problem:** The current project is primarily a frontend prototype and does not show a production security boundary.

**Why this is a problem:** Once real accounts, documents and AI are added, XSS, unsafe file handling, leaked metadata and weak headers become important risks.

**Proper solution:** Add server-side validation, secure headers, file restrictions and least-privilege database policies.

**How to solve it — step by step**

31. Add Content Security Policy appropriate for the final app.  
32. Enable HTTPS only in production.  
33. Validate and sanitize all server inputs.  
34. Use database Row Level Security for every user-owned table.  
35. Restrict file MIME types, size and extension server-side.  
36. Rate-limit auth, AI and upload endpoints.  
37. Do not expose internal errors or secrets to clients.

**Done when:** Security tests cannot access another user's records, upload executable files, or invoke unlimited AI requests.

# **B. Document Vault & File Handling**

## **Step 6 — Store the actual uploaded document**

**Problem:** DocumentVault reads the selected file's name/size but stores document metadata only. The Download action creates a text file containing metadata instead of the original document.

**Why this is a problem:** The UI promises a secure document vault, but the user's actual PDF/DOCX/image is not stored. This is a major product-trust issue.

**Proper solution:** Use private object storage such as Supabase Storage or S3-compatible storage and store only metadata plus a storage path in the database.

**How to solve it — step by step**

38. Create a private documents bucket.  
39. Upload the actual File object to storage.  
40. Generate a unique path such as userId/documentId/version/fileName.  
41. Store document metadata: owner, type, size, MIME, storage path, upload time, status and version.  
42. Generate signed URLs for preview/download instead of public URLs.  
43. Implement real download and preview.  
44. Add replace/version support.

**Done when:** Uploading a PDF and clicking Download returns the original PDF, not a generated text file.

## **Step 7 — Fix false document verification**

**Problem:** The document UI can display Verified and even says 'Verified by Admissions Officer', while upload is not an admissions-officer verification process.

**Why this is a problem:** This can mislead students into thinking an official authority has validated their document.

**Proper solution:** Use precise statuses: Uploaded, Processing, AI Checked, Needs Review, Verified by UniAdmission, Rejected.

**How to solve it — step by step**

45. Change initial upload status to Uploaded or Processing.  
46. Only mark Verified after a real verification workflow.  
47. Separate automated checks from human verification.  
48. Show who/what verified the document and when.  
49. Remove 'Admissions Officer' language unless a real officer performed the verification.

**Done when:** Every verification label corresponds to a defined verification event and actor.

## **Step 8 — Build document requirements per application**

**Problem:** The vault readiness audit uses broad assumptions such as two LORs and a bank solvency certificate for all students.

**Why this is a problem:** Requirements differ by country, university, program and application route. A generic mandatory checklist can be wrong.

**Proper solution:** Generate document requirements from the specific program/application requirement dataset.

**How to solve it — step by step**

50. Create application\_requirements records linked to program/application.  
51. Mark each requirement as required, conditional or optional.  
52. Support different document variants and accepted formats.  
53. Calculate missing documents per application rather than globally.  
54. Display the source and last-verified date for each requirement.

**Done when:** A student's Purdue CS checklist can differ from their U of T or German application checklist based on verified requirements.

## **Step 9 — Add document privacy controls**

**Problem:** Documents may include transcripts, passports, financial records and recommendation letters.

**Why this is a problem:** These are sensitive records and need stronger access control than ordinary profile text.

**Proper solution:** Use private storage, per-user authorization and explicit sharing controls.

**How to solve it — step by step**

55. Apply RLS to document metadata.  
56. Use signed URLs with short expiry.  
57. Add delete and revoke access actions.  
58. Keep audit logs for upload/download/share/delete events.  
59. Do not expose document URLs in public HTML or analytics.

**Done when:** A document cannot be opened by guessing its URL or another user's document ID.

# **C. University, Program & Scholarship Data**

## **Step 10 — Move static university data into a database**

**Problem:** Universities are stored in src/data/universitiesData.ts and matching happens against static frontend data.

**Why this is a problem:** A global admissions product needs frequently updated data without redeploying the frontend.

**Proper solution:** Create normalized database tables and an admin-managed data layer.

**How to solve it — step by step**

60. Create countries, universities, campuses, programs and requirements tables.  
61. Move tuition, rankings, acceptance information and application links into the database.  
62. Add program-level requirements rather than relying only on university-level data.  
63. Expose read-only API queries to the frontend.  
64. Keep a small local seed dataset only for development/demo mode.

**Done when:** An admin can change a deadline or requirement without editing TypeScript and redeploying the app.

## **Step 11 — Add source attribution and verification dates**

**Problem:** Admission data currently has limited provenance and several claims are presented as facts.

**Why this is a problem:** Requirements and deadlines change. Without sources, students cannot judge whether a result is trustworthy.

**Proper solution:** Every critical data point should have source URL, source type, verification date and verification status.

**How to solve it — step by step**

65. Add source records or source fields to requirements/deadlines/scholarships.  
66. Prefer official university/government sources.  
67. Store lastVerifiedAt and nextReviewAt.  
68. Display 'Official source' and 'Verified X days ago' in the UI.  
69. Create an admin verification queue for stale data.

**Done when:** Every deadline/requirement shown to a student has a traceable source and verification date.

## **Step 12 — Add program-level data**

**Problem:** The prototype mostly matches universities, while actual admission decisions depend heavily on the exact program.

**Why this is a problem:** CS, engineering, business, medicine and arts can have different prerequisites, tests, essays and deadlines at the same institution.

**Proper solution:** Model University → Program → Intake → Requirements → Application Route.

**How to solve it — step by step**

70. Add program ID to every application and university match.  
71. Store degree level, major, campus and intake separately.  
72. Store prerequisites such as math/physics/portfolio requirements.  
73. Store application route: Common App, direct portal, UCAS, Uni-Assist, etc.  
74. Match against the program rather than only the institution.

**Done when:** The same university can produce different matches/checklists for different programs.

## **Step 13 — Rebuild scholarship data and eligibility**

**Problem:** Static scholarship matching can show a scholarship without a rigorous eligibility decision.

**Why this is a problem:** Scholarship eligibility often depends on nationality, school nomination, grades, program, deadline, financial need and separate application steps.

**Proper solution:** Create structured scholarship eligibility rules and an explainable eligibility engine.

**How to solve it — step by step**

75. Store nationality/citizenship requirements.  
76. Store degree/program restrictions.  
77. Store minimum academic thresholds.  
78. Store nomination requirements.  
79. Store separate scholarship deadlines.  
80. Store coverage, renewal rules and application method.  
81. Return Eligible / Potentially Eligible / Not Eligible / Needs Verification.

**Done when:** Each scholarship result explains exactly which criteria passed, failed or require verification.

# **D. Matching & Assessment Intelligence**

## **Step 14 — Separate match score from admission probability**

**Problem:** The current matching logic produces a matchScore while other logic uses acceptance-rate/GPA heuristics to suggest admission probability.

**Why this is a problem:** A similarity score is not an admission probability. Presenting the latter as a precise percentage can mislead students.

**Proper solution:** Use separate concepts: Profile Match Score, Admission Positioning and Scholarship Fit.

**How to solve it — step by step**

82. Rename the 0–100 score to Profile Match or Fit Score.  
83. Use qualitative positioning: Likely, Target, Reach, High Reach.  
84. Only use statistical probability if supported by a validated model and representative historical data.  
85. Explain the factors behind every score.  
86. Add a disclaimer that no admission outcome is guaranteed.

**Done when:** No UI suggests that an 87/100 fit score means an 87% chance of admission.

## **Step 15 — Replace hard-coded matching weights**

**Problem:** matchingEngine.ts uses fixed score increments and starts from a base match score.

**Why this is a problem:** This can create convincing-looking but weak recommendations and may reward the wrong factors.

**Proper solution:** Create a weighted, constraint-aware scoring model based on verified program requirements and user priorities.

**How to solve it — step by step**

87. Define hard constraints first: degree, intake, prerequisites, citizenship restrictions, language requirement, etc.  
88. Calculate component scores: academic, program, English, tests, budget, scholarship, country preference and deadline.  
89. Normalize each component.  
90. Use configurable weights rather than hard-coded scattered constants.  
91. Store scoring-version metadata so results are reproducible.  
92. Test the model with known student profiles.

**Done when:** Two students with materially different constraints receive appropriately different recommendations, and every score is explainable.

## **Step 16 — Remove 'Safe' as a guarantee**

**Problem:** The prototype uses Safe/Target/Reach labels and some rules based on acceptance rates.

**Why this is a problem:** No school should be treated as guaranteed, especially for international applicants and selective programs.

**Proper solution:** Use Likely/Target/Reach/High Reach with explicit uncertainty.

**How to solve it — step by step**

93. Replace Safe labels in UI/data.  
94. Base positioning on verified program requirements and student profile.  
95. Show 'Why' and 'Risk factors'.  
96. Add a no-guarantee notice near the classification.

**Done when:** Users cannot interpret a recommendation as an admission guarantee.

## **Step 17 — Improve country recommendation logic**

**Problem:** Country scores currently rely heavily on hard-coded country-level scores.

**Why this is a problem:** A country can be a great fit for one student and poor for another due to budget, language, major, scholarship and post-study goals.

**Proper solution:** Compute country fit from student-specific dimensions.

**How to solve it — step by step**

97. Score academic fit.  
98. Score budget/total cost fit.  
99. Score scholarship availability.  
100. Score program availability.  
101. Score language fit.  
102. Score application complexity.  
103. Score student preferences.  
104. Score post-study/work goals only where reliable data exists.  
105. Show component breakdown and uncertainty.

**Done when:** Country recommendations change meaningfully when the student's budget, major or preferences change.

## **Step 18 — Improve assessment claims**

**Problem:** ProfileWizard currently promises '100% accurate' university/scholarship matches, and assessment logic contains broad claims.

**Why this is a problem:** Absolute accuracy claims are inappropriate for an evolving admissions dataset and AI-assisted product.

**Proper solution:** Use language such as 'personalized', 'evidence-based', 'based on published requirements' and 'estimated'.

**How to solve it — step by step**

106. Search the codebase for '100% accurate', 'guarantee', 'zero tuition', '100% tuition' and similar claims.  
107. Replace with precise conditional wording.  
108. Show source links where factual claims are made.  
109. Add a global disclaimer: admissions and scholarship outcomes are not guaranteed.

**Done when:** Marketing and UI language never promises admission, scholarship, visa or debt-free graduation.

# **E. Application Workflow**

## **Step 19 — Generate application checklists from verified requirements**

**Problem:** ApplicationTracker creates generic checklist items when a university is added.

**Why this is a problem:** Generic checklists can be incomplete or incorrect for a specific program.

**Proper solution:** Build checklist generation from program/application requirements.

**How to solve it — step by step**

110. When user adds a program, fetch its verified requirements.  
111. Generate checklist categories: account, academics, tests, essays, recommendations, financial, submission.  
112. Mark conditional requirements appropriately.  
113. Attach source to each checklist item.  
114. Recalculate checklist if the program/intake changes.

**Done when:** Every checklist item can be traced to a specific verified requirement.

## **Step 20 — Persist roadmap milestones**

**Problem:** Roadmap state is not handled as robustly as profile/application/document data.

**Why this is a problem:** A student's progress must survive refresh, device changes and login sessions.

**Proper solution:** Store roadmap milestones per user in the backend.

**How to solve it — step by step**

115. Create roadmap\_templates and user\_roadmap\_items tables.  
116. Persist completed status and completion timestamps.  
117. Store milestone source/application association.  
118. Sync state after login and refresh.  
119. Support roadmap versioning when the admission cycle changes.

**Done when:** A completed roadmap task remains completed after refresh and login from another device.

## **Step 21 — Add deadline intelligence**

**Problem:** Deadlines are shown mostly as dates rather than an intelligent planning system.

**Why this is a problem:** Students need urgency, preparation lead time and task dependencies.

**Proper solution:** Turn deadlines into actionable countdowns and task schedules.

**How to solve it — step by step**

120. Store exact deadline date/time/timezone and deadline type.  
121. Calculate days remaining server/client consistently.  
122. Create urgency bands.  
123. Create preparation milestones before the deadline.  
124. Notify users about upcoming and overdue tasks.  
125. Distinguish university deadline from scholarship deadline.

**Done when:** The dashboard can tell the student what must be done this week, not just what date an application closes.

## **Step 22 — Add Application Readiness Score**

**Problem:** There is progress tracking but no unified readiness model tied to real requirements.

**Why this is a problem:** Students need to know what is blocking an application.

**Proper solution:** Calculate readiness from required checklist items and document status.

**How to solve it — step by step**

126. Count required items only.  
127. Weight high-risk blockers more heavily.  
128. Separate completed, missing, pending and needs-review.  
129. Show per-application readiness.  
130. Provide one recommended next action.

**Done when:** Every application has a transparent readiness score and a clear next action.

## **Step 23 — Make applications program-specific**

**Problem:** ApplicationItem can contain university and major, but the data flow is not yet centered on a program/intake entity.

**Why this is a problem:** Deadlines and requirements vary by program and intake.

**Proper solution:** Create application records that reference a program, intake and application route.

**How to solve it — step by step**

131. Add programId and intakeId.  
132. Add applicationRoute.  
133. Add exact deadline fields.  
134. Link checklist to requirement IDs.  
135. Link scholarships to application.

**Done when:** Changing from one intake/program to another changes the correct deadline and checklist.

# **F. Dashboard & UX**

## **Step 24 — Make 'My Admission Plan' the product center**

**Problem:** The app has many separate modules, which can make it feel like a collection of tools.

**Why this is a problem:** The product's strongest value is coordinating the whole admission journey.

**Proper solution:** Reframe the dashboard as a personalized admission command center.

**How to solve it — step by step**

136. Show application portfolio: Likely/Target/Reach.  
137. Show readiness and missing documents.  
138. Show upcoming deadlines.  
139. Show scholarship opportunities.  
140. Show today's highest-impact action.  
141. Show recent AI recommendations.  
142. Link every card to an actionable workflow.

**Done when:** A student can open the dashboard and immediately understand what to do next.

## **Step 25 — Add proper URL routing**

**Problem:** App.tsx switches views through activeTab state rather than durable routes.

**Why this is a problem:** Refresh/back-button/deep-link behavior is weaker and navigation is harder to scale.

**Proper solution:** Use React Router with protected app routes.

**How to solve it — step by step**

143. Add routes for dashboard, profile, assessment, universities, scholarships, countries, applications, vault, SOP, CV, roadmap and counselor.  
144. Add authenticated route guards.  
145. Support 404/not-found state.  
146. Preserve route on refresh.  
147. Use route-level lazy loading for heavier AI tools.

**Done when:** Each major section has a stable URL and browser navigation works correctly.

## **Step 26 — Improve onboarding**

**Problem:** The profile wizard is extensive and asks for many fields before the product proves value.

**Why this is a problem:** Students can abandon long forms before seeing useful results.

**Proper solution:** Use progressive onboarding: minimum profile → first assessment → enrich profile for better matches.

**How to solve it — step by step**

148. Collect only essential identity, academics, major, countries and budget first.  
149. Generate a first result quickly.  
150. Then prompt for English/tests/activities/documents.  
151. Show profile completeness percentage.  
152. Explain why each additional field improves matching.

**Done when:** A new user can reach a useful first result quickly without completing every optional field.

## **Step 27 — Improve responsive/mobile behavior**

**Problem:** The application is desktop-oriented and uses a persistent sidebar/main workspace.

**Why this is a problem:** Students may use phones for deadlines and document tasks.

**Proper solution:** Create a mobile-first navigation and test every major workflow at small widths.

**How to solve it — step by step**

153. Add mobile bottom nav or collapsible sidebar.  
154. Check tables/cards for horizontal overflow.  
155. Ensure modals fit small screens.  
156. Make file upload and preview mobile-friendly.  
157. Test touch target sizes and keyboard navigation.

**Done when:** All primary workflows are usable on phone widths without broken layouts.

## **Step 28 — Add accessibility baseline**

**Problem:** The UI is visually polished but needs systematic accessibility checks.

**Why this is a problem:** Students with accessibility needs should be able to complete the workflow.

**Proper solution:** Target WCAG 2.2 AA basics.

**How to solve it — step by step**

158. Add labels and accessible names to controls.  
159. Ensure focus states are visible.  
160. Ensure modal focus trapping and Escape handling.  
161. Use semantic headings.  
162. Check color contrast.  
163. Add keyboard support to navigation and forms.  
164. Test with a screen reader and automated accessibility scanner.

**Done when:** Core workflows can be completed using keyboard navigation and accessible labels.

# **G. AI Tools**

## **Step 29 — Make the AI counselor data-grounded**

**Problem:** Gemini receives profile and a small selection of matched universities/scholarships, but the model is also instructed to provide exact deadlines/requirements.

**Why this is a problem:** LLMs can invent facts when the required data is not supplied.

**Proper solution:** Use retrieval/structured data first; use AI for explanation, planning and drafting rather than inventing requirements.

**How to solve it — step by step**

165. Fetch verified university/program/scholarship facts from the database.  
166. Pass only relevant verified facts to the model.  
167. Tell the model not to invent missing facts.  
168. Require source references in factual responses.  
169. If data is missing/stale, make the AI say it needs verification.  
170. Separate 'database facts' from 'AI advice' in the UI.

**Done when:** The counselor never fabricates a deadline or requirement when the database does not contain verified data.

## **Step 30 — Add AI output validation**

**Problem:** SOP generation asks Gemini for strict JSON, but production systems must assume malformed output can occur.

**Why this is a problem:** Malformed JSON or inappropriate generated content can break the UI or create poor documents.

**Proper solution:** Validate model outputs before rendering.

**How to solve it — step by step**

171. Define JSON schemas for SOP sections, CV bullets and critiques.  
172. Parse safely and reject invalid outputs.  
173. Retry once with a correction prompt when appropriate.  
174. Display a recoverable error rather than crashing.  
175. Keep generated drafts editable and user-owned.

**Done when:** A malformed AI response cannot crash the application.

## **Step 31 — Protect against prompt injection**

**Problem:** User profile fields and imported text can become part of AI prompts.

**Why this is a problem:** A malicious document/profile field could attempt to override system instructions or manipulate the model.

**Proper solution:** Treat all user/document text as untrusted data.

**How to solve it — step by step**

176. Delimit user-provided content clearly.  
177. Keep system instructions separate.  
178. Do not allow profile text to become system instructions.  
179. For document extraction, label extracted text as untrusted source content.  
180. Limit tools/actions the model can invoke.

**Done when:** User-controlled text cannot change the AI's security rules or grant itself access to protected actions.

## **Step 32 — Add AI usage and cost controls**

**Problem:** AI tools are presented as tier features but there is no visible server-side quota system.

**Why this is a problem:** Uncontrolled usage can create unexpected API costs.

**Proper solution:** Implement per-user quotas and usage accounting.

**How to solve it — step by step**

181. Record AI request count and estimated token usage.  
182. Set monthly/one-time limits by plan.  
183. Warn users before limits.  
184. Rate-limit bursts.  
185. Allow admins to change quotas.

**Done when:** AI cost is predictable and a user cannot generate unlimited requests by manipulating the client.

# **H. Payments & Business Logic**

## **Step 33 — Replace 'Switch Plan' with checkout**

**Problem:** Pricing buttons currently change the tier locally and trigger confetti.

**Why this is a problem:** This creates a demo purchase experience rather than a real transaction.

**Proper solution:** Implement real checkout and entitlement activation.

**How to solve it — step by step**

186. Create payment provider products.  
187. Build checkout session creation on backend.  
188. Redirect to hosted checkout.  
189. Process webhook.  
190. Activate entitlement only after verified payment.  
191. Show receipt/order/subscription state.

**Done when:** A plan changes only after a verified payment event.

## **Step 34 — Clarify one-time vs recurring pricing**

**Problem:** The plans mix '$79 one-time', '$149 one-time', '$199 one-time' and a school cohort offer.

**Why this is a problem:** AI usage, database maintenance and ongoing updates have recurring costs. One-time pricing needs clear limits.

**Proper solution:** Define exactly what the customer buys and for how long.

**How to solve it — step by step**

192. Decide whether plans are one-time, per admission cycle, monthly or annual.  
193. Define included AI usage.  
194. Define included admission cycle/intake.  
195. Define what happens when a student changes intake.  
196. Show refund/support terms.

**Done when:** A customer can understand exactly what their payment unlocks and for how long.

# **I. Admin, Operations & Data Quality**

## **Step 35 — Build an Admin Dashboard**

**Problem:** There is no operational interface for maintaining universities, programs, scholarships and deadlines.

**Why this is a problem:** A data-driven admission SaaS needs continuous content maintenance.

**Proper solution:** Create a protected admin application.

**How to solve it — step by step**

197. Create admin roles/permissions.  
198. Add university/program CRUD.  
199. Add scholarship CRUD.  
200. Add requirement/deadline management.  
201. Add source and verification fields.  
202. Add stale-data queue.  
203. Add user/subscription overview.  
204. Add audit logs.

**Done when:** An authorized admin can update admission data without changing source code.

## **Step 36 — Create a verification workflow**

**Problem:** The system does not have a formal process for confirming whether data is current.

**Why this is a problem:** Outdated requirements are one of the highest-risk failure modes for an admission platform.

**Proper solution:** Use Draft → Review → Verified → Stale/Archived states.

**How to solve it — step by step**

205. Create verification tasks for new/changed records.  
206. Require a source URL.  
207. Record reviewer and timestamp.  
208. Set review cadence based on data type.  
209. Flag records approaching expiry.  
210. Hide or label stale information clearly.

**Done when:** Admins can see which university/program records need review today.

## **Step 37 — Add audit logging**

**Problem:** Production actions such as document deletion, plan changes and requirement edits need traceability.

**Why this is a problem:** Audit logs help security, support and data-quality investigations.

**Proper solution:** Create immutable-ish event logs for sensitive actions.

**How to solve it — step by step**

211. Log actor, action, entity, timestamp and metadata.  
212. Never log passwords or secrets.  
213. Log admin changes and document access.  
214. Provide admin search/filtering.

**Done when:** Support can determine who changed a requirement or deleted a document and when.

# **J. Code Quality, Testing & Deployment**

## **Step 38 — Run a reliable CI build**

**Problem:** The project build was attempted but timed out in the audit environment; therefore build success was not independently verified.

**Why this is a problem:** A SaaS should have repeatable build/type/lint/test checks before deployment.

**Proper solution:** Add CI checks for install, type-check, lint, build and tests.

**How to solve it — step by step**

215. Run npm ci.  
216. Run TypeScript build/type-check.  
217. Run oxlint.  
218. Run production Vite build.  
219. Add unit tests for matching/assessment logic.  
220. Add component tests for critical workflows.  
221. Add end-to-end tests for signup → profile → match → application.

**Done when:** Every pull request gets a deterministic green/failed CI result.

## **Step 39 — Test the matching engine with fixtures**

**Problem:** Admission scoring is business-critical but there is no evidence of a test suite around it.

**Why this is a problem:** A small code change could silently change thousands of recommendations.

**Proper solution:** Create deterministic test profiles and expected scoring behavior.

**How to solve it — step by step**

222. Create fixtures for high/medium/low academic profiles.  
223. Test budget constraints.  
224. Test English thresholds.  
225. Test country restrictions.  
226. Test scholarship eligibility.  
227. Test missing-data cases.  
228. Snapshot/compare score explanations.

**Done when:** Changes to scoring fail tests when they unintentionally alter established behavior.

## **Step 40 — Add error/loading/empty states**

**Problem:** AI, database and uploads introduce network failures that the prototype does not need to handle extensively yet.

**Why this is a problem:** Production users will experience slow networks, failed uploads and unavailable AI.

**Proper solution:** Design explicit loading, retry, empty and error states for every async operation.

**How to solve it — step by step**

229. Add skeletons for database pages.  
230. Add retry buttons for failed API calls.  
231. Show upload progress.  
232. Handle expired sessions.  
233. Handle AI timeout and quota errors.  
234. Never silently fail.

**Done when:** Every network-backed action has a visible success, loading and failure state.

## **Step 41 — Prepare production environment configuration**

**Problem:** The project currently has client-side configuration assumptions suited to a local prototype.

**Why this is a problem:** Production needs separate development/staging/production configuration.

**Proper solution:** Use environment variables and deployment-specific settings.

**How to solve it — step by step**

235. Create .env.example without secrets.  
236. Use VITE\_ variables only for non-secret public config.  
237. Keep server secrets out of Vite client variables.  
238. Create staging environment.  
239. Set production domain and HTTPS.  
240. Add error monitoring and basic analytics.

**Done when:** No secret is committed to Git and staging can be tested without affecting production.

# **K. Product Upgrades After Core Fixes**

## **Step 42 — Explain every recommendation**

**Problem:** The app has whyMatch-style data, but the explanation layer can be much richer.

**Why this is a problem:** Students need to understand why a university was recommended and what could improve the fit.

**Proper solution:** Add an explainable recommendation panel.

**How to solve it — step by step**

241. Show Academic Fit, Program Fit, Budget Fit, Scholarship Fit, English Fit and Deadline Fit.  
242. Show strengths.  
243. Show risk factors.  
244. Show missing requirements.  
245. Show what would improve the score.

**Done when:** A student can understand the recommendation without asking the AI counselor.

## **Step 43 — Add a best-next-action engine**

**Problem:** The app contains many tools but does not yet fully prioritize what the student should do next.

**Why this is a problem:** The product becomes much more valuable when it behaves like an admission project manager.

**Proper solution:** Calculate the highest-impact next task using deadline, importance, dependencies and readiness.

**How to solve it — step by step**

246. Create action records.  
247. Score urgency and impact.  
248. Respect application dependencies.  
249. Show one primary next action on dashboard.  
250. Allow snooze/complete.

**Done when:** The dashboard always provides a useful next action when work remains.

## **Step 44 — Add multi-country strategy**

**Problem:** The concept supports alternative country recommendations, but the workflow can be made more strategic.

**Why this is a problem:** Students benefit from a balanced portfolio across cost, admission difficulty and scholarship potential.

**Proper solution:** Generate a portfolio such as 2–3 reach, 4–6 target, 2–3 likely across suitable countries.

**How to solve it — step by step**

251. Set portfolio goals.  
252. Avoid over-concentration in one country.  
253. Optimize for budget and deadlines.  
254. Explain trade-offs.  
255. Let the student accept/edit the proposed portfolio.

**Done when:** The platform can turn recommendations into an actionable application portfolio.

## **Step 45 — Add school/B2B architecture later**

**Problem:** Pricing includes a school plan, but a real cohort-management product requires separate permissions and data models.

**Why this is a problem:** Schools need counselor roles, student rosters, cohort analytics and controlled document access.

**Proper solution:** Design B2B as a separate organization layer.

**How to solve it — step by step**

256. Create organizations and memberships.  
257. Add counselor/student roles.  
258. Add cohort entities.  
259. Implement organization-level permissions.  
260. Add aggregate analytics without exposing unnecessary student data.  
261. Keep student ownership and consent explicit.

**Done when:** A school counselor can manage a cohort without becoming the owner of each student's personal account.

# **Final Target Architecture**

The recommended end-state is not a rewrite. Keep the current React/Vite frontend and replace the prototype data/security layers underneath it.

* Frontend: React \+ TypeScript \+ Vite \+ Tailwind  
* Routing: React Router with protected routes  
* Auth: Supabase Auth or equivalent  
* Database: PostgreSQL with Row Level Security  
* Storage: Private object storage for student documents  
* Backend: Supabase Edge Functions or Node API  
* AI: Server-side Gemini gateway with quotas and structured outputs  
* Payments: Stripe or another supported payment provider \+ webhooks  
* Data: Universities → Programs → Requirements → Deadlines → Scholarships → Sources  
* Operations: Admin dashboard \+ verification queue \+ audit logs  
* Analytics: product events, application progress and AI usage without unnecessary sensitive data

# **Suggested Database Core**

* users / profiles  
* organizations / memberships (for future schools)  
* countries  
* universities  
* programs  
* intakes  
* program\_requirements  
* application\_routes  
* deadlines  
* scholarships  
* scholarship\_requirements  
* sources  
* student\_profiles  
* applications  
* application\_checklist\_items  
* documents  
* document\_versions  
* roadmap\_items  
* ai\_usage  
* subscriptions  
* entitlements  
* audit\_logs

# **Launch Checklist**

☐ Real authentication works and passwords are never stored in frontend code.

☐ No Gemini API secret is shipped to the browser.

☐ Paid entitlements are verified server-side.

☐ Original uploaded files are securely stored and downloadable.

☐ No document is falsely labeled as officially verified.

☐ Every important university/program/scholarship fact has a source and verification date.

☐ Admission positioning does not claim guaranteed admission.

☐ Scholarship eligibility is rule-based and explainable.

☐ Application checklists are generated from program-specific requirements.

☐ Deadlines have exact dates/timezones and urgency handling.

☐ Roadmap, applications and documents persist across sessions/devices.

☐ Admin can update and verify data without code changes.

☐ Matching engine has automated tests.

☐ Production build, lint, type-check and end-to-end flows pass in CI.

☐ Error, loading, empty and retry states exist for all network-backed features.

☐ Privacy, terms, refund and AI/admission disclaimers are visible before purchase.

# **Recommended Build Sequence**

262. Phase 1: Backend foundation — database, auth, storage and API gateway.  
263. Phase 2: Security migration — remove local auth/Gemini key/local document assumptions.  
264. Phase 3: Data migration — universities, programs, scholarships, requirements, deadlines and sources.  
265. Phase 4: Matching v2 — constraints, scoring, positioning and explanations.  
266. Phase 5: Application engine — program-specific checklists, readiness and deadline intelligence.  
267. Phase 6: Admin dashboard — data management, verification and audit logs.  
268. Phase 7: Payments — checkout, webhooks and entitlement enforcement.  
269. Phase 8: UX — routing, onboarding, command-center dashboard and mobile/accessibility polish.  
270. Phase 9: AI — grounded counselor, validated SOP/CV generation and usage controls.  
271. Phase 10: Testing and launch — CI/CD, security testing, monitoring, analytics and production QA.

**Bottom line:** Do not rebuild the frontend from zero. Preserve the current component structure and turn the prototype into a real SaaS by replacing the localStorage/mock architecture with secure backend services, verified admissions data, explainable matching and a real application workflow.