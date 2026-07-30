# Business Rules, Scoring & Decision Logic

This document details the deterministic business rules, scoring algorithm, decision-tree safeguards, reminder logic, and bilingual terminology baseline for Baki.

---

## 1. Subscription Fields & Rules

| Field | Rule / Validation |
| :--- | :--- |
| **Provider name** | Required; trimmed; maximum 100 characters. |
| **Amount** | Required; positive integer **sen** (represented in cents); displayed to user as MYR (Ringgit). |
| **Billing cycle** | Weekly, monthly, yearly, or custom. |
| **Renewal date** | Required date-only value (YYYY-MM-DD) for active subscriptions. |
| **Category** | One of the approved categories or "Other". |
| **Status** | Active, paused, cancelled, or archived. |
| **User ownership** | Derived from the authenticated user; never trusted directly from client input. |

### 1.1 Category List (Appendix A)
* Entertainment
* Software
* Telecommunications
* Utilities
* Insurance
* Instalments
* Memberships
* Education
* Fitness
* Other

---

## 2. Value Score Calculation

Baki calculates an explainable value score between **0 and 100** based on five criteria. All five ratings (from 1 to 5) are required before a final score is generated. Ratings of 2 and 4 represent intermediate positions between the anchors.

### 2.1 Criteria Matrix

| Criterion | Weight | Rating 1 (Low) | Rating 3 (Medium) | Rating 5 (High) |
| :--- | :--- | :--- | :--- | :--- |
| **Usage frequency** | 25% | Never or almost never | Used monthly | Used daily or nearly daily |
| **Necessity** | 25% | Non-essential | Moderately useful | Essential |
| **Affordability** | 20% | Causes financial strain | Manageable | Very affordable |
| **Uniqueness** | 15% | Many suitable alternatives | Some alternatives | No suitable alternative |
| **Satisfaction** | 15% | Very dissatisfied | Neutral | Very satisfied |

### 2.2 Mathematical Formula
\[\text{Value Score} = \sum \left( \frac{\text{Criterion Rating}}{5} \times \text{Weight Percentage} \right) \times 100\]

*Resulting Range: 0 to 100.*

### 2.3 Base Classifications

| Score Range | Base Classification | Base Recommendation |
| :--- | :--- | :--- |
| **75 - 100** | High value | Keep |
| **55 - 74** | Moderate value | Review |
| **35 - 54** | Low value | Downgrade or pause |
| **0 - 34** | Very low value | Consider cancelling |

---

## 3. Decision-Tree Safeguards

To prevent naive recommendations (e.g. recommending cancellation of a critical but expensive service), Baki runs a deterministic decision tree after base classification.

### 3.1 Safeguard Steps
1. Calculate the weighted score.
2. Assign the base classification.
3. Check whether the subscription is **essential** (Necessity Rating $\ge 4$).
4. Check **affordability** (Affordability Rating).
5. Check **recent usage** (Usage Frequency Rating).
6. Apply the versioned safeguard rules.
7. Produce the final recommendation.
8. Display the full calculation, checks, and rule version to the user.

> [!IMPORTANT]
> **Authority Rule**: The deterministic score and decision tree are authoritative. AI-generated explanations are strictly supplementary and must never override the calculations or final recommendation.

### 3.2 Initial Safeguard Rules

| Condition | Adjustment |
| :--- | :--- |
| **Essential and affordable** | Do not recommend cancellation; keep or review instead. |
| **Essential but unaffordable** | Recommend reviewing a cheaper plan or alternative, not abrupt cancellation. |
| **Non-essential, not recently used and low score** | Strengthen recommendation toward pause or cancellation consideration. |
| **Moderate score but affordability rating is 1 or 2** | Recommend review or downgrade. |
| **High score but no recent usage** | Flag inconsistency and ask the user to verify the ratings. |
| **Any inconsistent or incomplete input** | Do not issue a final recommendation. |

---

## 4. Reminder Rules
* Generate reminders at **7 days before**, **1 day before**, and **on the renewal date**.
* Each reminder timing is independently configurable.
* A reminder is created **at most once** per subscription, renewal date, and timing type.
* Changing the renewal date invalidates or recalculates pending reminders.
* Paused, cancelled, and archived subscriptions do not generate new reminders.
* Version 0.1 prioritises **in-app reminders**; email/external delivery is postponed.

---

## 5. Internationalisation (i18n) Strategy

Baki supports **English (en)** and **Malay (ms)** from the start to prevent hardcoded interface text and facilitate local testing.

### 5.1 Rules
* Use `next-intl` (or an equivalent maintained Next.js i18n library).
* Store translations in separate files:
  * `messages/en.json`
  * `messages/ms.json`
* Fall back to English when a Malay key is missing.
* Format currency as **MYR** and format dates according to the active locale.
* Store the authenticated user's language preference in their profile; use cookies for unauthenticated visitors.

### 5.2 Terminology Baseline

| English | Malay |
| :--- | :--- |
| Subscription | Langganan |
| Renewal date | Tarikh pembaharuan |
| Monthly commitment | Komitmen bulanan |
| Available balance | Baki tersedia |
| Value score | Skor nilai |
| Recommendation | Cadangan |
| Keep | Kekalkan |
| Review | Semak semula |
| Pause | Jeda |
| Cancel | Batalkan |
