# Product Requirements, Scope & Verification

This document specifies the target audience, product scope, functional and non-functional requirements, use cases, and testing strategies for Baki.

---

## 1. Product Definition & MVP

### 1.1 Problem Statement
Subscriptions are often spread across streaming services, software tools, telecommunications, education platforms, fitness memberships and other recurring commitments. Users may underestimate the combined cost, forget renewal dates, or retain subscriptions that no longer provide sufficient value. Existing trackers often show spending but do not explain how a recommendation was reached.

### 1.2 Target User Personas
* **University Students**:
  * *Needs*: Control limited budgets, avoid forgotten renewals, evaluate study and entertainment subscriptions.
  * *Typical Context*: Mobile and laptop use; variable income; high price sensitivity.
* **Young Working Adults**:
  * *Needs*: Track multiple subscriptions, understand monthly commitments, and reduce unnecessary costs.
  * *Typical Context*: Steady income but growing number of digital and lifestyle subscriptions.

---

## 2. Version 0.1 Scope

| Included | Postponed / Future |
| :--- | :--- |
| Email/password registration and sign-in | CSV and PDF transaction imports |
| Google OAuth authentication | OCR and receipt-image processing |
| English and Malay interface | Automatic recurring-payment detection |
| Manual subscription CRUD | Gmail receipt extraction |
| Dashboard and commitment summaries | Advanced cash-flow forecasting |
| Five-criterion value score | Cloud AI integration |
| Decision-tree safeguards | Automatic payment or cancellation |
| Three renewal reminder timings | Administrator and privacy-administrator roles |
| Basic profile, export, and account-deletion controls | Bank or PayNet integrations |

### 2.1 Success Criteria
1. A user can register, sign in, and access only their own data.
2. A user can create, update, archive, and delete subscriptions.
3. The dashboard correctly calculates monthly and annualised commitments.
4. The scoring engine produces repeatable results for known inputs.
5. The recommendation page shows the complete calculation and rule path.
6. Reminder records are generated exactly once for the three configured timings.
7. The application is usable in English and Malay.
8. Core RLS, accessibility, and end-to-end tests pass before release.

---

## 3. Software Requirements Specification

### 3.1 Functional Requirements (FR)
* **FR-01**: The system shall register users with email and password.
* **FR-02**: The system shall support Google OAuth authentication.
* **FR-03**: The system shall verify user sessions before access to protected pages.
* **FR-04**: The user shall create, read, update, archive, and delete their own subscription records.
* **FR-05**: The system shall support the agreed subscription categories and an "Other" category.
* **FR-06**: The system shall calculate monthly and annualised commitments from billing-cycle data.
* **FR-07**: The user shall rate usage, necessity, affordability, uniqueness, and satisfaction from 1 to 5.
* **FR-08**: The system shall calculate the weighted value score using deterministic code.
* **FR-09**: The system shall apply decision-tree safeguards after the base score classification.
* **FR-10**: The system shall show ratings, weights, contributions, thresholds, rule path, and final recommendation.
* **FR-11**: The system shall generate reminders seven days before, one day before, and on the renewal date.
* **FR-12**: The user shall enable or disable each reminder timing.
* **FR-13**: The system shall support English and Malay.
* **FR-14**: The system shall store the user language preference.
* **FR-15**: The user shall export their personal data in a machine-readable format.
* **FR-16**: The user shall request account deletion through a verified workflow.
* **FR-17**: The system shall record security- and consent-relevant audit events without storing financial content in logs.
* **FR-18**: The system shall never execute subscription cancellation or payment.
* **FR-19**: An optional AI service may generate a plain-language explanation from the authoritative result.
* **FR-20**: The deterministic result shall remain available when AI is unavailable or invalid.

### 3.2 Non-Functional Requirements (NFR)
* **NFR-01 (Security)**: All production traffic shall use HTTPS and all user-owned tables shall enforce RLS.
* **NFR-02 (Privacy)**: Only necessary fields shall be stored with documented retention and deletion controls.
* **NFR-03 (Performance)**: Primary dashboard content should load within three seconds under normal prototype conditions.
* **NFR-04 (Availability)**: Core scoring and subscription features shall continue without AI.
* **NFR-05 (Explainability)**: Every recommendation shall show the contributing calculation and rules.
* **NFR-06 (Accessibility)**: Core workflows shall support keyboard navigation, labels, focus indicators, and readable contrast.
* **NFR-07 (Internationalisation)**: Missing Malay translations shall fall back to English without breaking the interface.
* **NFR-08 (Maintainability)**: Business rules, translations, prompts, and integrations shall be modular and versioned.
* **NFR-09 (Portability)**: Users shall be able to export their data in JSON or CSV.
* **NFR-10 (Testability)**: Known scoring examples and RLS policies shall have automated tests.

---

## 4. Core Use Cases

| ID | Use Case | Actor | Outcome |
| :--- | :--- | :--- | :--- |
| **UC-01** | Register or sign in | User | Authenticated session |
| **UC-02** | Add subscription manually | User | Validated subscription record |
| **UC-03** | Review dashboard | User | Commitment totals and upcoming renewals |
| **UC-04** | Evaluate subscription | User + System | Score, rule path, and recommendation |
| **UC-05** | Review reminders | User | Upcoming renewal awareness |
| **UC-06** | Change language | User | English or Malay interface |
| **UC-07** | Export data | User | Machine-readable copy |
| **UC-08** | Delete account | User | Verified purge workflow |

---

## 5. Verification Plan & Test Strategy

### 5.1 Test Coverage
* **Unit Tests**: Scoring, thresholds, billing-cycle conversions, reminder dates, and validation.
* **Integration Tests**: Authentication, database access, RLS, profile creation, and notification persistence.
* **End-to-End Tests**: Registration, subscription creation, evaluation, reminders, export, and deletion.
* **Security Tests**: IDOR, privilege escalation, XSS inputs, CSRF-sensitive actions, and secret leakage.
* **Privacy Tests**: Data minimisation, export, deletion, log redaction, and consent handling.
* **Accessibility Tests**: Keyboard navigation, labels, focus, contrast, and screen-reader basics.
* **Internationalisation Tests**: English/Malay switching, missing-key fallback, date and currency formatting.
* **AI Quality Tests**: Schema validity, factual consistency, language correctness, and fallback behaviour.
* **Performance Tests**: Dashboard load and common operations under prototype usage.

### 5.2 Acceptance Tests (AT)

| ID | Scenario | Expected Result |
| :--- | :--- | :--- |
| **AT-01** | Register with valid email/password | Verified account and protected session. |
| **AT-02** | Sign in with Google OAuth | Authenticated account with minimal profile data. |
| **AT-03** | User A requests User B record | RLS blocks access. |
| **AT-04** | Create monthly subscription | Record saved with correct ownership and next renewal. |
| **AT-05** | Calculate known score | Output matches independently calculated result. |
| **AT-06** | High score with inconsistent no-usage input | System flags inconsistency for review. |
| **AT-07** | Renewal enters 7-day window | One 7-day reminder is generated. |
| **AT-08** | Change renewal date | Pending reminder schedule is recalculated. |
| **AT-09** | Switch to Malay | Core interface and validation messages display in Malay. |
| **AT-10** | AI unavailable | Deterministic explanation remains available. |
| **AT-11** | Export account data | Complete machine-readable export is produced. |
| **AT-12** | Delete account | Personal records enter and complete verified purge workflow. |
