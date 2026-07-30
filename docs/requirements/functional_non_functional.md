# Product Requirements, Scope & Verification

This document specifies the target audience, product scope, functional and non-functional requirements, use cases, and testing strategies for Baki under **Option A MVP Baseline** (including CSV/PDF imports, transaction extraction, and recurring payment detection).

---

## 1. Product Definition & MVP

### 1.1 Problem Statement
Subscriptions are often spread across streaming services, software tools, telecommunications, education platforms, fitness memberships, and other recurring commitments. Users may underestimate combined costs, forget renewal dates, or retain subscriptions that no longer provide sufficient value. Existing trackers show spending without explaining how recommendations were reached or require invasive online banking logins.

### 1.2 Target User Personas
* **University Students**:
  * *Needs*: Control limited budgets, avoid forgotten renewals, evaluate study/entertainment subscriptions.
  * *Context*: Mobile and laptop use; variable income; high price sensitivity.
* **Young Working Adults**:
  * *Needs*: Track multiple subscriptions, understand monthly commitments, reduce unnecessary costs.
  * *Context*: Steady income but growing number of digital and lifestyle subscriptions.

---

## 2. MVP Scope (Option A Baseline)

| Included in MVP (Version 0.1) | Postponed / Future Roadmap |
| :--- | :--- |
| Email/password registration and sign-in | Bank / PayNet direct API integrations |
| Google OAuth authentication | Direct online banking credential access |
| English and Malay interface | Automatic subscription cancellation execution |
| Manual subscription CRUD | Automatic payment execution |
| **CSV & PDF transaction imports** (Papa Parse, PDF.js, Tesseract.js) | Gmail inbox receipt auto-scraping |
| **Recurring-payment candidate detection engine** | Advanced cash-flow multi-year forecasting |
| Dashboard and commitment summaries | Administrator and privacy-administrator roles |
| Five-criterion value score (0–100) | Cloud AI integration (Mandatory cloud LLM dependency) |
| Decision-tree safeguards | |
| Three renewal reminder timings (7d, 1d, same day) | |
| Basic profile, export, and account-deletion controls | |
| Optional local AI (Ollama) adapter for merchant normalisation | |

### 2.1 Success Criteria
1. A user can register, sign in, and access only their own data.
2. A user can create, update, archive, and delete subscriptions manually or via CSV/PDF transaction imports.
3. Every detected recurring transaction candidate requires explicit user confirmation before activation.
4. The dashboard correctly calculates monthly and annualised commitments.
5. The scoring engine produces repeatable results for known inputs.
6. The recommendation page shows the complete calculation and rule path.
7. Reminder records are generated exactly once for the three configured timings.
8. The application is usable in English and Malay.
9. Core RLS, accessibility, security, and end-to-end tests pass before release.

---

## 3. Software Requirements Specification

### 3.1 Functional Requirements (FR)
* **FR-01**: The system shall register users with email and password.
* **FR-02**: The system shall support Google OAuth authentication.
* **FR-03**: The system shall verify user sessions before access to protected pages.
* **FR-04**: The user shall create, read, update, archive, and delete their own subscription records.
* **FR-05**: The system shall support uploading CSV and text-based PDF statement files for transaction extraction.
* **FR-06**: The system shall detect recurring payment candidates and require user confirmation before saving.
* **FR-07**: The system shall calculate monthly and annualised commitments from billing-cycle data.
* **FR-08**: The user shall rate usage, necessity, affordability, uniqueness, and satisfaction from 1 to 5.
* **FR-09**: The system shall calculate the weighted value score using deterministic code (0–100 range).
* **FR-10**: The system shall apply decision-tree safeguards after the base score classification.
* **FR-11**: The system shall show ratings, weights, contributions, thresholds, rule path, and final recommendation.
* **FR-12**: The system shall generate reminders seven days before, one day before, and on the renewal date.
* **FR-13**: The user shall enable or disable each reminder timing.
* **FR-14**: The system shall support English and Malay.
* **FR-15**: The system shall store user language preferences.
* **FR-16**: The user shall export their personal data in a machine-readable format (JSON/CSV).
* **FR-17**: The user shall request account deletion through a verified purge workflow.
* **FR-18**: The system shall record security- and consent-relevant audit events without storing financial content in logs.
* **FR-19**: The system shall never execute subscription cancellation or payment.
* **FR-20**: An optional local AI service (Ollama) may assist with merchant name normalisation and plain-language explanations.
* **FR-21**: The deterministic result shall remain available when AI is unavailable or invalid.

### 3.2 Non-Functional Requirements (NFR)
* **NFR-01 (Security)**: All production traffic shall use HTTPS, and all user-owned tables shall enforce PostgreSQL Row Level Security (RLS).
* **NFR-02 (Privacy)**: Only necessary fields shall be stored with documented retention and deletion controls. Raw uploaded files must be purged after extraction.
* **NFR-03 (Performance)**: Primary dashboard content should load within three seconds under normal prototype conditions.
* **NFR-04 (Availability)**: Core scoring and subscription features shall continue without AI.
* **NFR-05 (Explainability)**: Every recommendation shall show the contributing calculation and rules.
* **NFR-06 (Accessibility)**: Core workflows shall support keyboard navigation, labels, focus indicators, and readable contrast.
* **NFR-07 (Internationalisation)**: Missing Malay translations shall fall back to English without breaking the interface.
* **NFR-08 (Maintainability)**: Business rules, translations, prompts, and integrations shall be modular and versioned.
* **NFR-09 (Portability)**: Users shall be able to export their data in JSON or CSV.
* **NFR-10 (Testability)**: Known scoring examples, file upload parsers, and RLS policies shall have automated tests.

---

## 4. Core Use Cases

| ID | Use Case | Actor | Outcome |
| :--- | :--- | :--- | :--- |
| **UC-01** | Register or sign in | User | Authenticated session |
| **UC-02** | Add subscription manually | User | Validated subscription record |
| **UC-03** | Upload CSV/PDF statement | User | Extracted transactions list |
| **UC-04** | Confirm recurring candidate | User | Candidate converted to active subscription |
| **UC-05** | Review dashboard | User | Commitment totals and upcoming renewals |
| **UC-06** | Evaluate subscription | User + System | Score, rule path, and recommendation |
| **UC-07** | Review reminders | User | Upcoming renewal awareness |
| **UC-08** | Change language | User | English or Malay interface |
| **UC-09** | Export data | User | Machine-readable copy |
| **UC-10** | Delete account | User | Verified purge workflow |
