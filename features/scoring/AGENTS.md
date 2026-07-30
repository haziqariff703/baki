# Scoring Feature Agent Rules (`features/scoring/`)

## Domain Directives

1. **Strict Determinism**:
   * All value score calculations and decision-tree safeguards **must** be pure TypeScript functions.
   * LLMs or AI responses are strictly prohibited from calculating or modifying scores.

2. **Required Boundary Tests**:
   * Unit tests must cover boundary scores: 34 (Very Low), 35 (Low), 54 (Low), 55 (Moderate), 74 (Moderate), 75 (High).
   * Test safeguard rules (Essential & Affordable, Essential & Unaffordable, High score with no usage).

3. **Criteria Weights & Rule Versioning**:
   * All criteria weights (Usage 25%, Necessity 25%, Affordability 20%, Uniqueness 15%, Satisfaction 15%) must be read from versioned rules constants (`subscriptionScoreRuleV1`), never hardcoded.
