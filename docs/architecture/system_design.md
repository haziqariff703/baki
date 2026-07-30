# System Architecture & Database Design

This document details the high-level architecture, module breakdown, trust boundaries, schema design, authentication lifecycle, and API contracts for Baki.

---

## 1. Architecture Principles
* **Web First & Mobile Responsive**: Tailored for students/adults accessing via desktop or phone.
* **Least Privilege**: Application/users access only the minimal necessary database fields and rows.
* **Server-side Validation**: All inputs and business rules are validated on the server.
* **RLS (Row Level Security)**: Enforced as the final security ownership boundary in Supabase.
* **Deterministic Financial Logic**: Calculations must happen in pure, testable application code.
* **AI as an Optional Adapter**: Ollama integrates via a decoupled adapter. The application must remain fully functional if Ollama is offline.
* **Environment Separation**: Distinct development, staging, and production environments.
* **Versioned Rules & Migrations**: Schema updates and business rules are tracked using migrations.

---

## 2. High-Level Architecture & Modules

### 2.1 Component Diagram
```
User Browser
   │ (HTTPS)
   ▼
Vercel / Next.js
   ├── Server Components and Route Handlers
   ├── Validation and Business Rules
   └── Optional local Ollama adapter (development only)
   │
   ▼
Supabase (PostgreSQL + RLS, Auth, Storage)
```

### 2.2 System Modules
* **Identity and Profile**: Handles authentication state, locale preferences, and profile configurations.
* **Subscription Manager**: Standard CRUD for manual inputs, billing cycles, categories, and statuses.
* **Dashboard**: Computes monthly and annual commitments and tracks upcoming renewals.
* **Scoring Engine**: Evaluates the 5-criteria matrix deterministically.
* **Recommendation Engine**: Applies the decision-tree safeguards to output the final recommendation.
* **Notification Centre**: Manages in-app reminders and records notification state.
* **Privacy Centre**: Facilitates user data exports and account deletions.
* **AI Adapter**: Decoupled module to call Ollama local inference.
* **Audit Service**: Tracks safety, security, and consent-relevant events without storing actual financial/personal content in logs.

### 2.3 Trust Boundaries

| Boundary | Control Mechanism |
| :--- | :--- |
| **Browser to Application** | HTTPS, secure cookies, origin checks, and validated request bodies. |
| **Application to Supabase** | Scoped client/server credentials and PostgreSQL RLS. |
| **User Row Ownership** | Enforced at database level via `auth.uid()` checks. |
| **Application to Optional AI** | Minimised structured facts only; strict JSON schema validation; timeout & fallback logic. |
| **Development to Production** | Separate databases, API keys, OAuth client credentials, and environment configurations. |

---

## 3. Data & Schema Design

### 3.1 Environment Separation

| Environment | Database | Data Policy |
| :--- | :--- | :--- |
| **Local Development** | Local Supabase | Synthetic seed data only. |
| **Automated Tests** | Disposable local/test database | Synthetic fixtures reset between runs. |
| **Preview/Staging** | Separate hosted Supabase project | Synthetic or pseudonymous records only. |
| **Production** | Dedicated hosted Supabase project | Real user-entered records with production access controls. |

> [!WARNING]
> **Production Boundary**: Vercel preview deployments must *never* connect to the production database. Local and production credentials must remain completely separate and secure.

### 3.2 Core Data Dictionary

* **`profiles`**
  * *Important Fields*: `id` (references `auth.users.id`), `locale`, `timezone`, `created_at`, `updated_at`
  * *Purpose*: User preferences.
* **`subscriptions`**
  * *Important Fields*: `id`, `user_id`, `provider_name`, `amount_sen` (positive integer), `billing_cycle`, `renewal_date` (date-only), `category`, `status`
  * *Purpose*: User-owned recurring commitments.
* **`score_results`**
  * *Important Fields*: `id`, `subscription_id`, `ratings` (JSONB), `weights_version`, `score`, `base_classification`, `rule_version`, `final_outcome`
  * *Purpose*: Versioned transparent evaluation records.
* **`notification_preferences`**
  * *Important Fields*: `user_id`, `remind_7d`, `remind_1d`, `remind_day`
  * *Purpose*: User reminder switches.
* **`notifications`**
  * *Important Fields*: `id`, `user_id`, `subscription_id`, `type`, `scheduled_for`, `status`, `unique_key`
  * *Purpose*: Generated in-app reminders.
* **`consent_records`**
  * *Important Fields*: `id`, `user_id`, `purpose`, `notice_version`, `granted_at`, `withdrawn_at`
  * *Purpose*: Versioned optional processing consent.
* **`audit_events`**
  * *Important Fields*: `id`, `actor_id`, `event_type`, `created_at`, `metadata_minimised`
  * *Purpose*: Security events (logs exclude financial/sensitive inputs).
* **`deletion_jobs`**
  * *Important Fields*: `id`, `user_id`, `status`, `requested_at`, `completed_at`
  * *Purpose*: Verified account deletion tracker.

### 3.3 Data Type Rules
1. Store money as an integer representing **sen** (cents).
2. Store timestamps in **UTC**.
3. Use date-only values (YYYY-MM-DD) for subscription renewal dates.
4. Use database constraints/enums for controlled fields (e.g. status, category, cycle).
5. Add indexes on `user_id`, `renewal_date`, `status`, and notification `unique_key`.
6. Use cascading deletes only where they match the verified account-deletion purging logic.

### 3.4 Row Level Security (RLS)
RLS must be enabled on every user-owned table. Policies must cover SELECT, INSERT, UPDATE, and DELETE. Ownership must be evaluated using `auth.uid()` and not only application query filters.

*Example Subscriptions Policy:*
```sql
alter table public.subscriptions enable row level security;

create policy "Users read own subscriptions"
on public.subscriptions for select
using ((select auth.uid()) = user_id);

create policy "Users insert own subscriptions"
on public.subscriptions for insert
with check ((select auth.uid()) = user_id);
```

---

## 4. Authentication & Identity
* **Supported Methods**: Email/password, Google OAuth (authentication only).
* **Requirements**: Email verification, password reset, secure logout, and session expiry handling.
* **OAuth Safeguards**:
  * Use separate Google OAuth credentials for localhost, staging, and production.
  * Request only the minimum required authentication scopes.
  * Do **not** request Gmail scopes during normal sign-in. Treating future Gmail receipt extraction as a separate opt-in consent purpose is required.

---

## 5. API & Validation Contracts

### 5.1 Route Inventory

| Method | Route | Purpose |
| :--- | :--- | :--- |
| **POST** | `/api/subscriptions` | Create a subscription record. |
| **GET** | `/api/subscriptions` | List the authenticated user's subscriptions. |
| **GET** | `/api/subscriptions/:id` | Read one owned subscription. |
| **PATCH** | `/api/subscriptions/:id` | Update one owned subscription. |
| **DELETE** | `/api/subscriptions/:id` | Delete or archive one owned subscription. |
| **POST** | `/api/subscriptions/:id/evaluate` | Create a deterministic score and recommendation. |
| **GET** | `/api/notifications` | List user notifications. |
| **PATCH** | `/api/preferences` | Update language and reminder settings. |
| **POST** | `/api/account/export` | Generate personal data export. |
| **DELETE** | `/api/account` | Start verified account deletion. |

### 5.2 Validation Rules
* Validate all request bodies, route parameters, and query parameters on the server side.
* Reject unknown enum values and negative or excessively large monetary amounts.
* Derive `user_id` strictly from the authenticated session, never client input.
* Return generic, client-safe error messages while logging redacted diagnostics server-side.

### 5.3 Error Contract Example
```json
{
  "error": {
    "code": "SUBSCRIPTION_VALIDATION_FAILED",
    "message": "Unable to save the subscription.",
    "fieldErrors": {
      "amount": "Enter a valid amount."
    }
  }
}
```
