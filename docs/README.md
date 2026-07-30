# Baki - System Documentation

Welcome to the documentation suite for **Baki**, an AI-Assisted Subscription and Personal Cash-Flow Management System. This directory is designed to guide developers and AI systems implementing and maintaining the codebase.

## System Overview
Baki is a web-first personal financial helper targetting university students and young working adults. It helps users track subscription commitments, score their value, and receive deterministic reminders.

- **Primary Stack**: Next.js (TypeScript), Tailwind CSS, shadcn/ui, Supabase (PostgreSQL + RLS), and Vercel.
- **AI Integration**: Optional local Ollama assistant for explanations; never authoritative over financial calculations.
- **Core Currencies**: Malaysian Ringgit (MYR).
- **Languages**: English and Malay (Bilingual design).

## Documentation Directory Structure

The documentation is organized as follows:
- [Requirements & Scope](file:///c:/Users/Muhammad Haziq/baki/docs/requirements/functional_non_functional.md): Functional/Non-functional requirements, target personas, and scope constraints.
- [Business Rules & Logic](file:///c:/Users/Muhammad Haziq/baki/docs/requirements/business_rules.md): Value scoring engine, decision tree, reminders, and i18n terminology.
- [System Architecture](file:///c:/Users/Muhammad Haziq/baki/docs/architecture/system_design.md): Architecture principles, high-level design, database schemas (RLS), and API endpoints.
- [Security, Privacy & AI Guidelines](file:///c:/Users/Muhammad Haziq/baki/docs/security/threat_model_privacy.md): Threat modeling, data retention, and strict AI safety boundaries.
- [Architecture Decision Records (ADRs)](file:///c:/Users/Muhammad Haziq/baki/docs/adr/decisions.md): Historic records of design choices (ADR-001 through ADR-012).
- [AGENTS.md](file:///c:/Users/Muhammad Haziq/baki/AGENTS.md): The root entry point of rules for AI coding assistants.
