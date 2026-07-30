# Architecture Decision Records (ADRs)

This document records the architectural design choices made for the Baki subscription management system.

---

## ADR-001: Use Next.js and TypeScript
* **Status**: Approved
* **Context**: The system must be web-first, performant, and easily deployable.
* **Decision**: Adopt Next.js (App Router) with strict TypeScript.
* **Rationale**: Strong fit for web-first deployment, server rendering, route handling, type-safe boundaries, and native Vercel integrations.

---

## ADR-002: Use Vercel for Version 0.1
* **Status**: Approved
* **Context**: Need a hosting provider that supports Next.js features with minimal infrastructure overhead.
* **Decision**: Deploy the frontend application to Vercel.
* **Rationale**: Provides the lowest-complexity and most compatible deployment path for Next.js preview deployments and production.

---

## ADR-003: Use Supabase
* **Status**: Approved
* **Context**: The application requires relational data storage, user authentication, and access control policies.
* **Decision**: Use Supabase as the backend service provider.
* **Rationale**: Out-of-the-box support for PostgreSQL, Supabase Auth, and Row Level Security (RLS) is highly suitable for a lean development model.

---

## ADR-004: Use Local Supabase for Development
* **Status**: Approved
* **Context**: Mixing development records with live production data poses security and privacy risks.
* **Decision**: Initialize and run local Supabase containers (`npx supabase start`) for development and automated testing.
* **Rationale**: Prevents accidental pollution or leaks of production user data during development iterations.

---

## ADR-005: Use Separate Hosted Production Supabase
* **Status**: Approved
* **Context**: Production database requires absolute isolation and strict controls.
* **Decision**: Create a distinct, isolated production project in hosted Supabase.
* **Rationale**: Establishes a clear security, access, and environment boundary between staging and actual user data.

---

## ADR-006: Use Deterministic Scoring as Authoritative
* **Status**: Approved
* **Context**: Financial assessments must be clear, audit-proof, and consistent.
* **Decision**: Run the scoring calculations in standard application code, rather than delegating calculations to AI.
* **Rationale**: Ensures complete repeatability, transparency, inspectability, and ease of unit testing.

---

## ADR-007: Apply Decision-Tree Safeguards After Scoring
* **Status**: Approved
* **Context**: Naive value scoring can suggest deleting critical but expensive services (e.g. medical insurance).
* **Decision**: Implement a post-scoring decision-tree ruleset that overrides or adjusts recommendations based on necessity and affordability.
* **Rationale**: Resolves edge cases logically, protecting users from harmful or unsafe recommendations.

---

## ADR-008: Make AI Optional
* **Status**: Approved
* **Context**: The user's browser, environment, or hosting target cannot guarantee Ollama availability.
* **Decision**: Design the system to operate fully and gracefully fall back to deterministic text templates when the local Ollama adapter is offline.
* **Rationale**: Ensures the system is highly available and functional under normal hosted conditions.

---

## ADR-009: Support English and Malay from the Start
* **Status**: Approved
* **Context**: The target users reside in Malaysia. Need validation and UI terms in local language without code duplication.
* **Decision**: Integrate localization utilities (`next-intl`) and maintain translation bundles for English (`en`) and Malay (`ms`).
* **Rationale**: Avoids hardcoding UI text, supporting immediate multilingual usability testing.

---

## ADR-010: Support Normal Users Only in Version 0.1
* **Status**: Approved
* **Context**: Administrative roles increase authorization complexity and security footprint.
* **Decision**: Defer administrator and privacy-officer roles, supporting only standard registered users.
* **Rationale**: Reduces code complexity, keeps the authentication footprint thin, and focuses testing scope on user actions.

---

## ADR-011: Use In-App Reminders First
* **Status**: Approved
* **Context**: Configuring email or SMS delivery requires third-party service setup, raising operational complexity.
* **Decision**: Deliver notifications strictly as in-app reminders in the database for Version 0.1.
* **Rationale**: Validates the scheduling and date calculation logic before investing in external email delivery infrastructure.

---

## ADR-012: Postpone Imports and Integrations
* **Status**: Approved
* **Context**: Banking APIs, CSV parsing, OCR engines, and email receipt scraping introduce high privacy and security risks.
* **Decision**: Defer OCR, receipt parsing, and transaction imports to later versions.
* **Rationale**: Lowers the privacy risk profile and keeps Version 0.1 scope highly achievable as a manual entry MVP.
