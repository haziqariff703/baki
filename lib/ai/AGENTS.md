# AI Adapter Agent Rules (`lib/ai/`)

## Domain Directives

1. **Decoupled Adapter Pattern**:
   * All calls to Ollama or local LLMs must pass through the `LocalAIClient` interface.
   * Do not scatter direct HTTP calls to Ollama throughout UI components or route handlers.

2. **Zod Output Validation**:
   * Require JSON responses from LLMs. Validate all returned fields against strict Zod schemas.
   * If validation fails or times out, immediately return a safe, translated fallback template.

3. **Data Redaction**:
   * Redact account numbers, card fragments, home addresses, and personal identifiers before passing text to the AI adapter.
