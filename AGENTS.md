<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Baki - AI Coding Assistant Guidelines

When modifying, extending, or refactoring the Baki codebase, you **must** strictly adhere to the following rules derived from the system documentation.

## Core Directives

1. **Deterministic Calculations Only**:
   * All financial calculations, scoring (0-100 range), and recommendation safeguards **must** be implemented in pure, deterministic, and unit-testable TypeScript/JavaScript functions.
   * AI (Ollama or similar) is strictly optional and secondary. Never allow AI responses or LLM hallucinations to calculate, override, or dictate score/classification results.
   
2. **Currency and Money Representation**:
   * Store money as a positive integer representing **sen** (Malaysian cents) in the database and server schemas.
   * Format and display money as **MYR** (Ringgit) on the client side based on the current locale. Never store raw float/double values for money.

3. **Row Level Security (RLS)**:
   * Every user-owned table in Supabase **must** have RLS enabled.
   * All queries and data policies must validate ownership using `auth.uid()`. Do not rely solely on application route checks.

4. **Bilingual Support (en & ms)**:
   * Do not hardcode strings in UI components. Use the active translation dictionary (`messages/en.json` and `messages/ms.json`).
   * Fallback to English (`en`) if a translation key is missing in Malay (`ms`).

5. **Auditing & Logs**:
   * Never log sensitive variables, API keys, tokens, session cookies, full HTTP request bodies, or actual financial values.
   * Record security/consent events cleanly using the audit service with minimised metadata.

## Directory Reference
Refer to the full system documentation for detailed specifications:
- [Requirements & Scope](file:///c:/Users/Muhammad Haziq/baki/docs/requirements/functional_non_functional.md)
- [Scoring & Business Rules](file:///c:/Users/Muhammad Haziq/baki/docs/requirements/business_rules.md)
- [System Architecture & DB Design](file:///c:/Users/Muhammad Haziq/baki/docs/architecture/system_design.md)
- [Security, Privacy & AI Boundaries](file:///c:/Users/Muhammad Haziq/baki/docs/security/threat_model_privacy.md)
- [Architecture Decision Records (ADRs)](file:///c:/Users/Muhammad Haziq/baki/docs/adr/decisions.md)
