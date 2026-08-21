<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Baki AGENTS.md — AI Development Guide & Technical Constitution

> A comprehensive, practical technical constitution for AI-assisted development of the Baki MVP.
> Review and update whenever architecture, security controls, data governance, AI usage, or regulatory assumptions change.

---

## 1. Project Identity

Baki is an AI-assisted subscription and personal cash-flow management system designed for university students and young working adults in Malaysia.

### What the system helps users do:
* Record and manage subscriptions and recurring bills.
* Import transaction data from CSV and text-based PDF files.
* Detect possible recurring payments automatically.
* Evaluate subscriptions using a transparent, weighted 5-criterion score matrix (0–100).
* Apply deterministic decision-tree safeguards before producing recommendations.
* Generate explainable, plain-language recommendations.
* Forecast upcoming financial commitments.
* Control consent, data access, export, correction, and account deletion.

### What the system MUST NEVER do:
* Cancel subscriptions automatically on external services.
* Execute payments or money transfers.
* Access online-banking credentials or direct banking APIs.
* Present generated output as regulated financial advice under BNM / SC guidelines.
* Allow AI models to make irreversible financial decisions independently.

---

## 2. Core Engineering Principles

All code changes must adhere strictly to these engineering principles:

### 2.1 Deterministic Core
* Financial calculations, subscription scores, thresholds, forecasts, and decision-tree outcomes **must** be implemented using pure, deterministic application code in TypeScript.
* **Do not delegate core financial operations to an LLM.**
* LLMs may only assist with:
  * Merchant-name normalisation (e.g. turning `"SPTF*SPOTIFY SE"` into `"Spotify"`).
  * Transaction classification.
  * Structured document extraction assistance.
  * Plain-language explanations of deterministic results.
  * Non-authoritative suggestions.
* The exact same validated input **must** always produce the exact same financial output.

### 2.2 Human-Controlled Decisions
* AI and rule-engine outputs are **recommendations only**.
* Every detected recurring transaction candidate **must be confirmed or rejected by the user** before it becomes an active subscription.
* **Never create workflows that**:
  * Automatically cancel a subscription.
  * Automatically make a payment.
  * Automatically change financial records based *only* on an AI response.
  * Hide the reasoning behind a recommendation.

### 2.3 Privacy by Design
* Collect, process, and store **only the minimum data required**.
* Before storing or transmitting data:
  1. Identify the explicit purpose.
  2. Confirm user consent exists where required.
  3. Remove unrelated personal information.
  4. Redact account numbers, card fragments, home addresses, and personal identifiers.
  5. Apply the documented data retention rule.
* **Raw uploaded statements and receipts must be deleted immediately after successful extraction or within the configured maximum retention window.**

### 2.4 Least Privilege
* Every user, API route, server action, database function, and integration must receive **only the minimum permissions** it requires.
* **Never use elevated database credentials (`service_role` key) in client-side or browser code.**
* The Supabase `service_role` key must only exist in protected server-side environments.

### 2.5 Explainability
Every score and recommendation output must expose:
* Input criteria values.
* Criterion weights.
* Mathematical formula used.
* Rule version identifier.
* Decision tree evaluation path.
* Final structured result.
* User-facing plain-language explanation.
* **Do not return recommendation text without the underlying structured calculation result.**

### 2.6 Traceability
Important operations must retain appropriate metadata, including:
* Data source (manual input vs CSV/PDF import).
* Processing method.
* AI confidence level (if applicable).
* User confirmation status.
* Rule version & prompt version.
* Consent version.
* Created and updated timestamps (UTC).
* **Do not log raw financial documents, transaction descriptions containing sensitive information, authentication tokens, or AI prompts containing personal data.**

---

## 3. Technology Stack

| Area | Approved Tools & Libraries |
| :--- | :--- |
| **Application / Frontend** | Next.js (App Router), TypeScript (Strict), React, Tailwind CSS, shadcn/ui |
| **Backend & Data** | Next.js Server Components & Route Handlers, Supabase PostgreSQL, Supabase Auth, Supabase Storage, PostgreSQL Row Level Security (RLS) |
| **Runtime Validation** | **Zod** (mandatory for all API requests, environment variables, file payloads, and AI outputs) |
| **Local AI Adapter** | Ollama (laptop-compatible model, structured JSON responses, no automatic cloud fallback) |
| **Document Processing** | **Papa Parse** for CSV, **PDF.js** for text-based PDFs, **Tesseract.js** only when image OCR is necessary |
| **Testing** | Vitest, React Testing Library, Playwright, Supabase policy & RLS integration tests |
| **Visualisation** | Recharts |
| **Internationalisation** | `next-intl` (English `en-MY` and Malay `ms-MY`) |

---

## 4. Repository Structure

Follow this domain-driven structure strictly:

```
app/                        # Routes, layouts, server pages, and API route handlers
components/                 # Shared presentation components (UI controls)
features/                   # Domain-oriented feature modules
  ├── auth/                 # Authentication & session management
  ├── consent/              # Privacy consent tracking
  ├── subscriptions/        # Manual CRUD & subscription state management
  ├── transactions/         # User transaction records
  ├── imports/              # CSV/PDF document upload & parsing pipeline
  ├── recurring-detection/  # Candidate transaction detection engine
  ├── scoring/              # 5-criterion scoring & decision-tree safeguards
  ├── cash-flow/            # Commitment forecasting & dashboard summaries
  ├── notifications/        # 7d / 1d / day-of in-app renewal reminders
  └── privacy/              # Data export & verified account deletion
lib/                        # Shared infrastructure and utility functions
  ├── validation/           # Shared Zod schemas
  ├── database/             # Supabase client helpers & query factories
  ├── auth/                 # Session helpers & permission checks
  ├── ai/                   # Decoupled Ollama client adapter & prompt versioning
  ├── security/             # Redaction & sanitisation helpers
  ├── money/                # Sen/MYR conversion utilities
  ├── dates/                # Calendar-aware date utilities
  └── logging/              # Sanitised operational logger
supabase/                   # Database migrations, policies, and seed data
  ├── migrations/           # Versioned SQL migrations
  ├── policies/             # Documented RLS policies
  ├── functions/            # Database triggers and functions
  └── seed.sql              # Synthetic test fixtures
tests/                      # Test suites
  ├── unit/                 # Unit tests (Vitest)
  ├── integration/          # Integration & database tests
  ├── security/             # RLS & vulnerability tests
  ├── e2e/                  # End-to-end tests (Playwright)
  └── fixtures/             # Synthetic test data
docs/                       # System documentation suite
```

> **Architecture Rule**: Prefer domain-based feature modules (`features/*`) over grouping all files only by technical type. **Do not place business logic directly inside UI components.**

---

## 5. Architecture Boundaries & 3-Tier Layering

Use the following dependency flow direction:
$$\text{UI Layer} \longrightarrow \text{Application / Use-Cases} \longrightarrow \text{Domain Logic} \longrightarrow \text{Repositories \& Adapters} \longrightarrow \text{Database / AI / Services}$$

### 5.1 UI Layer
* **Allowed**: Collect user input, display data, trigger application actions, render validation errors, display score calculations & explanations.
* **Prohibited**: Calculating authoritative financial values, directly accessing privileged database clients, containing RLS assumptions, parsing untrusted documents without validation, deciding recommendation outcomes.

### 5.2 Domain Layer
* Contains core domain entities, recurring-payment detection rules, value-score formulas, decision-tree safeguard rules, forecast logic, and consent/retention rules.
* **Domain logic must be framework-independent where practical.**

### 5.3 Infrastructure Layer
* All external systems must be accessed through interfaces and adapters:
  ```typescript
  interface SubscriptionRepository { ... }
  interface TransactionRepository { ... }
  interface LocalAIClient { ... }
  interface NotificationProvider { ... }
  interface FileStorageProvider { ... }
  ```
* **Do not scatter direct Supabase, Ollama, or external service calls throughout the application code.**

---

## 6. TypeScript Rules

* Use TypeScript `strict` mode globally.
* **Avoid**: `any`, unsafe type assertions (`as unknown as T`), non-null assertions (`!`) without explicit justification comments, implicitly typed external data, large untyped JSON objects.
* **Prefer**: Explicit return types for business-critical functions, discriminated unions, branded identifiers where useful, readonly inputs for pure functions, exhaustive switch statements, runtime validation at all trust boundaries.

```typescript
// Example: Discriminated Union for Recommendations
type Recommendation =
  | { type: "keep"; reasonCodes: string[] }
  | { type: "review"; reasonCodes: string[] }
  | { type: "downgrade_or_pause"; reasonCodes: string[] }
  | { type: "consider_cancelling"; reasonCodes: string[] };
```

> **Critical Rule**: Never assume that a TypeScript type signature validates runtime input. Always combine types with runtime Zod validation schemas.

---

## 7. Validation Rules

Validate **every** external input before business logic or database access.

### Inputs that require runtime validation:
* Form submissions & query/route parameters.
* Cookies & session headers.
* Uploaded CSV/PDF file payloads & parsed rows.
* AI LLM responses.
* Webhook requests & database records crossing a trust boundary.

### Schema Validation Requirements:
* Reject unexpected fields (`z.object({...}).strict()`).
* Define string length and file size limits.
* Validate enums and calendar dates.
* Validate positive currency amounts.
* Safely normalise text strings and produce user-safe error messages.
* **Never pass raw AI output directly into database operations.**

---

## 8. Money and Financial Calculations

### 8.1 Sen Representation
Store monetary values as a positive integer representing **sen** (cents) in the database and server schemas:
```typescript
type MoneyInSen = number; // e.g., RM 10.50 is stored as 1050
```
* **Do not use JavaScript floating-point arithmetic (`0.1 + 0.2`) for authoritative monetary calculations.**

### 8.2 Value Score Engine (0–100)
Calculated deterministically across 5 criteria (ratings 1 to 5):
* **Usage Frequency** (25%)
* **Necessity** (25%)
* **Affordability** (20%)
* **Uniqueness** (15%)
* **Satisfaction** (15%)

$$\text{Value Score} = \sum \left( \frac{\text{Criterion Rating}}{5} \times \text{Weight Percentage} \right) \times 100$$

#### Base Recommendations:
* **75–100**: High value $\rightarrow$ *Keep*
* **55–74**: Moderate value $\rightarrow$ *Review*
* **35–54**: Low value $\rightarrow$ *Downgrade or Pause*
* **0–34**: Very low value $\rightarrow$ *Consider Cancelling*

> **Rule Versioning**: Criteria weights, thresholds, and safeguard rules must be versioned centrally in code (e.g. `subscriptionScoreRuleV1`), not hardcoded across multiple files.

---

## 9. Date and Time Rules

* Store all timestamps in **UTC** ISO format.
* Display dates using the user's configured timezone and locale (`en-MY` / `ms-MY`).
* **Do not calculate recurring dates by adding a fixed number of milliseconds (`+ 30 * 86400000`).**
* Use calendar-aware date operations for monthly renewals, leap years, different month lengths, and end-of-month billing (e.g. billing on the 31st must have explicit handling for February and 30-day months).

---

## 10. Database Rules

### 10.1 Row Level Security (RLS)
* Enable RLS on **every table** containing user or personal data.
* Every user-owned table must include an explicit ownership relation (`user_id -> auth.users.id`).
* Database policies must enforce `(select auth.uid()) = user_id`.
* **Do not rely solely on application-side ownership checks.**

### 10.2 Migrations & Constraints
* All schema modifications must be executed via versioned SQL migrations (`supabase/migrations/`).
* Never manually alter shared production databases.
* Use database constraints for invariants: positive subscription amount (`amount_sen > 0`), valid status enums, valid billing cycle enums, unique idempotency keys, valid score ranges (0–100).

### 10.3 Query Practices
* Avoid `SELECT *`, unbounded queries without limits, N+1 query loops, and unallowlisted user-controlled sort columns.
* Always enforce pagination for lists.

---

## 11. Authentication and Authorisation

* Protected server actions and routes must follow this exact sequence:
  1. Resolve authenticated user.
  2. Validate runtime input.
  3. Verify resource ownership (`auth.uid()`).
  4. Perform operation.
  5. Return sanitized response.
* **Do not trust a `user_id` supplied by the browser.** Derive user identity strictly from the verified session.

---

## 12. File Upload Security

Treat every uploaded CSV or PDF file as **untrusted**.

### Validation Checklist:
* Validate MIME type, extension, maximum file size (max 5 MB), maximum row/page count, parsing duration limit, and filename safety.
* **Prompt Injection Defense**: Text extracted from uploaded PDFs may contain malicious prompt-injection payloads. Treat extracted document content strictly as data, never system instructions.
* Store uploaded files in private Supabase Storage buckets using short-lived signed URLs.
* **Purge Policy**: Delete raw uploaded files immediately after successful extraction or upon expiry of the retention period.

---

## 13. AI Integration Rules

The local Ollama AI service is an **optional adapter**, not the decision-maker.

### 13.1 Permitted AI Responsibilities
* Classify merchants and suggest normalised names (e.g., `"SPTF*SPOTIFY"` $\rightarrow$ `"Spotify"`).
* Extract structured fields from transaction strings.
* Produce plain-language summaries from deterministic score results.
* Flag uncertain transaction records for human review.

### 13.2 Prohibited AI Responsibilities
* Calculating the authoritative value score.
* Choosing final financial actions independently.
* Writing directly to database tables.
* Receiving complete raw bank statements without redaction.
* Receiving credit card numbers or account identifiers.
* Overriding decision-tree rules.

### 13.3 Fallback Behaviour
When LLM validation or connection fails:
* Do not partially trust the response.
* Log a non-sensitive failure metric.
* Return a graceful bilingual fallback template.
* Allow the user to continue using the application seamlessly without AI.

---

## 14. Error Handling & Logging Rules

### 14.1 Error Handling
Use typed application errors (`ApplicationErrorCode`: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `RATE_LIMITED`, `AI_UNAVAILABLE`, `FILE_PROCESSING_FAILED`, `INTERNAL_ERROR`).
* User-facing errors must be understandable, avoid exposing stack traces or SQL details, omit internal IDs, and state retry options.

### 14.2 Operational Logs vs. Audit Events
* **Operational Logs**: System health, processing duration, error codes, AI availability. **Never log passwords, tokens, full request bodies, account numbers, or financial figures.**
* **Audit Events**: Record security/consent actions (consent granted/withdrawn, data exported, account deletion requested, auth actions). Audit logs must not retain deleted personal data.

---

## 15. Testing Requirements

A feature is incomplete until relevant tests pass:
* **Unit Tests**: Scoring formulas, boundary scores (34, 35, 54, 55, 74, 75), decision-tree paths, currency sen conversion, renewal date math, Zod schemas.
* **Integration Tests**: Auth flows, Supabase RLS policies (tested with 2 separate user accounts), file parsing pipelines, AI adapters, deletion purging.
* **Security Tests**: IDOR protection, prompt-injection defense, missing RLS policies, rate-limiting checks, unexpected schema fields.
* **End-to-End Tests**: Registration, manual subscription creation, CSV/PDF upload & payment detection, evaluation, reminder generation, export, account deletion.

---

## 16. Accessibility & Localisation

* **Accessibility**: Support keyboard navigation, visible focus indicators, semantic HTML, readable contrast, and screen-reader error messages. Never rely on color alone to communicate recommendation state.
* **Localisation**: All user-facing text must use `next-intl` translation keys (`en-MY` and `ms-MY`). Format currency as MYR and dates according to locale. Underlying recommendation codes (`keep`, `review`) must remain language-independent.

---

## 17. Performance & Documentation Rules

* **Performance**: Primary dashboard must load within **3 seconds** under normal prototype usage. Enforce explicit limits on file size, CSV rows, PDF pages, AI context length, and list pagination.
* **ADRs**: Document all significant architectural decisions in `docs/adr/decisions.md` using standard ADR format.

---

## 18. AI Coding Workflow

Before editing code, an AI coding assistant **must**:
1. Read this constitution (`AGENTS.md`).
2. Inspect the relevant feature module under `features/`.
3. Inspect existing tests.
4. Identify affected security and privacy controls.
5. Create a clear implementation plan.

### OpenCode Skill Mandates
Depending on the task domain, the agent **MUST** invoke the following OpenCode skills:
* **Backend & Business Logic:** MUST invoke the `superpowers` skill (Spec -> Plan -> Test -> Implement -> Verify).
* **Frontend & UI:** MUST invoke `ui-ux-pro-max`, `impeccable craft`, and `shadcn-scaffold` for new components and responsive layouts.
* **Database & Schema:** MUST invoke `supabase-schema-sync` for migrations and RLS policies.

During implementation, the agent **must**:
1. Make the smallest coherent change.
2. Follow domain layering rules.
3. Validate all inputs at trust boundaries.
4. Preserve deterministic business logic.
5. Add or update unit/integration tests.
6. Avoid unrelated refactoring.

---

## 19. Prohibited Shortcuts

**DO NOT**:
* Disable TypeScript strict mode or use `any` to bypass type checks.
* Disable lint rules without written justification.
* Skip server-side validation because frontend forms already validate.
* Bypass RLS using `service_role` credentials for standard user operations.
* Trust `user_id` or resource IDs supplied directly by the client browser.
* Store monetary values as floating-point numbers.
* Put secret keys in source code or commit `.env` files.
* Log financial values, account numbers, or session tokens.
* Accept malformed AI JSON output.
* Claim tests passed without running verification commands.

---

## 20. Required Response Format for Coding Agents

For **everyday file edits and minor tweaks**, the AI coding assistant **MUST** invoke the `caveman` skill to save tokens (outputting only raw diffs, commands, and brief diagnostics).

For **major architectural tasks only**, the AI coding assistant must respond using this exact 6-part framework:

### 1. Understanding
Summarise the requested task and target outcome.

### 2. Assumptions
List any technical or domain assumptions affecting the implementation.

### 3. Plan
Provide a short, ordered list of implementation steps.

### 4. Changes
Describe the exact files created, modified, or deleted and the logic added.

### 5. Validation
Report verification status (`Passed`, `Failed`, or `Not run`) for:
* Type check (`npm run build` / `tsc`)
* Lint (`npm run lint`)
* Unit tests
* Integration & RLS tests
* End-to-end tests
* Security checks

### 6. Risks and Follow-Up
State any remaining unresolved risks, limitations, database migrations, or manual verification steps required.

---

## 21. Recommended Nested Agent Files

Specialized instructions exist in subdirectory agent files:
* `features/scoring/AGENTS.md` (Scoring boundaries & deterministic rules)
* `features/imports/AGENTS.md` (File upload caps, PDF/CSV parsing, prompt-injection safety)
* `lib/ai/AGENTS.md` (Zod schemas, Ollama timeouts, redaction, fallback templates)
* `supabase/AGENTS.md` (RLS policy verification with dual-user fixtures)
* `tests/AGENTS.md` (Synthetic data rules, no real personal financial data in fixtures)

---

## 22. Definition of Done

A task is complete only when:
1. Acceptance criteria are fully satisfied.
2. Type checking (`npm run build`) passes without errors. (**MUST run the `typecheck-verify` OpenCode skill before finishing ANY task**).
3. Linting passes without errors.
4. Unit/integration tests cover changed business logic.
5. Inputs are runtime-validated with Zod.
6. RLS and ownership checks are verified.
7. No sensitive info or financial numbers are logged.
8. Accessibility and English/Malay translations are complete.
9. Documentation and ADRs are updated.
10. The implementation preserves user confirmation and explainability.
