# Testing Agent Rules (`tests/`)

## Domain Directives

1. **Synthetic Fixtures Only**:
   * Automated tests must use 100% synthetic test data fixtures (`tests/fixtures/`).
   * Never commit real bank statements, actual account numbers, live tokens, or identifiable personal financial records.

2. **Test Suite Coverage**:
   * Unit tests: Score math, boundary scores (34/35/54/55/74/75), sen currency conversion, calendar-aware renewal dates, Zod schemas.
   * Integration tests: RLS policies with dual-user fixtures, file upload parsing, AI fallback handling.
   * End-to-end tests: Full workflows (registration, subscription creation, file upload, score view, export, account deletion).
