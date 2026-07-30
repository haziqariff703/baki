# Security, Privacy & AI Guidelines

This document details the security protocols, threat model, privacy principles, data governance boundaries, and AI runtime integration rules for Baki.

---

## 1. Security Protocols & Threat Model

### 1.1 Security Baseline
* **Transport**: HTTPS/TLS enforced globally. Redirect HTTP to HTTPS. Enable HSTS after domain validation.
* **Authentication**: Supabase Auth (email/password with verification, Google OAuth, secure reset/session timeout controls).
* **Authorisation**: Database RLS on every user-owned table combined with explicit server-side ownership checks.
* **Input**: Strict server-side schemas, validation, encoding, and safe error handling.
* **Browser**: Deploy a secure Content Security Policy (CSP), `X-Content-Type-Options: nosniff`, Referrer Policy, Permissions Policy, and frame protection.
* **Secrets**: Managed via environment variables. Absolutely no API keys, service roles, or credentials in browser bundles or git.
* **Abuse Protection**: Configure rate limits for sign-in, account recovery, writes, exports, and AI explanation routes.
* **Logging**: Ensure logs never contain passwords, session tokens, cookies, full request bodies, or financial figures.
* **Dependencies**: Mandatory lockfile checks, type checks, and security scans during builds.
* **Backups**: Encrypted backups with restricted access controls. Restoration tests must use synthetic data.

### 1.2 Threat Model Matrix

| Threat | Example Scenario | Primary Control |
| :--- | :--- | :--- |
| **Cross-user access** | User A tries to view or edit User B's subscription. | PostgreSQL Row Level Security (RLS) and IDOR route tests. |
| **Session theft** | Session token is intercepted or copied. | Secure-only/HttpOnly cookies, HTTPS enforcement, and session invalidation. |
| **XSS** | Malicious script injected via the provider name field. | Framework escaping (React/Next.js default), input sanitisation, and a strict CSP. |
| **CSRF** | User is tricked into sending a deletion request. | SameSite cookie attributes, origin validation, and non-GET state changes. |
| **Secret exposure** | Supabase service key or database credentials leaked. | Server-only environments, CI secrets, and build-time env verification. |
| **Brute force** | Attacker makes rapid sign-in attempts. | Provider-level and application-level rate limits. |
| **Logging leak** | Financial values or user details leaked via console logs. | Redacted logs and structured logging policies. |
| **AI hallucination** | AI suggests an incorrect recommendation or price. | Strict AI optionality. Show deterministic calculations first and foremost. |
| **Dependency compromise** | A library update contains malicious code. | Dependency pinning (package-lock.json) and automated vulnerability scanning. |
| **Preview leakage** | Staging / Preview app connects to production database. | Separate staging and production environments and secrets. |

### 1.3 Rate-Limit Baseline
* **Failed sign-ins**: 5-10 attempts per 15 minutes per account/IP.
* **Password resets**: 3 per hour per account/IP.
* **Subscription writes (CUD)**: 30 per minute per authenticated user.
* **Account export/deletion**: Extremely low frequency, requiring re-authentication where practical.
* **Future AI explanations**: 5 per minute per user.

---

## 2. Privacy & Data Governance

### 2.1 Data Minimisation
Version 0.1 stores only account identity, user preferences, manually entered subscription info, scoring parameters, and generated reminders.
* **No bank credentials** or aggregations are accessed.
* **No credit card numbers**, identity cards, or physical document uploads are stored.

### 2.2 Processing Purposes

| Purpose | Data Elements | User Control |
| :--- | :--- | :--- |
| **Authentication** | Email, OAuth provider ID, basic profile data | Register, sign in, sign out, delete account |
| **Subscription management** | Provider, amount, cycle, renewal date, category, status | Create, edit, archive, delete |
| **Evaluation** | Five rating parameters and calculated score | Review details and trigger re-evaluation |
| **Reminders** | Renewal dates and user alert preferences | Enable or disable specific timings |
| **AI explanation** | Minimised score metadata (no personal identifier) | Opt-out / Disable. Deterministic text fallback |

### 2.3 Retention Baseline
* **Profile & Subscriptions**: Retained until user requests account deletion, closure, or long inactivity.
* **Score Results**: Kept until the subscription is deleted; rule versions are retained for historical analysis.
* **Notifications**: Purged shortly after delivery or upon account deletion.
* **Consent Records**: Retained as necessary to demonstrate compliance with PDPA guidelines.
* **Operational Logs**: Retained for a short period; financial numbers and personal identifiers are completely excluded.

### 2.4 User Deletion Workflow
Account deletion requests trigger a verified workflow that permanently purges profiles, subscriptions, scores, notifications, and preferences. Deletion logs contain only confirmation evidence (e.g. timestamp of completion) without retaining any of the deleted financial content.

---

## 3. AI Design & Safety Boundary

### 3.1 AI Runtime and Model
* **Runtime**: Local Ollama is the planned engine for development evaluation.
* **Model**: A small, replaceable open-source model (e.g. Gemma, Qwen, or Llama) running locally.
* **Crucial Constraint**: A Vercel-hosted web application cannot assume Ollama is running on the client machine. Thus, version 0.1 must run fully without AI. Any future cloud AI provider requires a separate privacy, cost, and cross-border data transfer review under PDPA.

### 3.2 AI Responsibilities

```
[Deterministic Calculations & Checks]
                  │
                  ▼
   [Minimise fields to facts only]
                  │
                  ▼
     [Send facts to AI Adapter]
                  │
                  ▼
   [Validate AI Output JSON Schema]
                  │
                  ▼
  [Check language & factual consistency]
                  │
                  ├── (Success) ──► Display as Optional Explanation
                  └── (Error/Timeout) ──► Fall back to bilingual deterministic template
```

* **Permitted**:
  * Translate deterministic facts into a friendly plain-language summary in English or Malay.
  * Suggest future merchant classifications after separate client validation.
* **Prohibited**:
  * Calculating the authoritative score.
  * Modifying criteria weights or thresholds.
  * Overriding decision-tree rules.
  * Initiating payments, cancellations, or account changes.
  * Accessing arbitrary user records outside the active evaluation session.
  * Outputting text that does not pass schema validation.
