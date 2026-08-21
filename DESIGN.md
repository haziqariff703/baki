# Baki Design System

> Single source of truth for the Baki MVP's visual language. All UI work must reference
> these tokens instead of hardcoding colors, type sizes, spacing, or radii. If a change is
> needed, update this file and the corresponding `@theme` variables in `app/globals.css`
> together.

## 1. Principles

1. **No AI slop** — no purple-on-dark gradients, no border-glow clichés, no icon-stuffed
   bento boxes, no novelty scramble animations, no un-tracked massive headings.
2. **Restrained accent** — warm amber is the single brand accent, used sparingly for focus,
   active state, and the recommendation highlight only. Never sprayed across the UI.
3. **Deterministic, legible first** — type exists to be read, not animated. Contrast meets
   WCAG AA for all text.
4. **One radius, one border language** — consistent surface/border treatment everywhere.

---

## 2. Color Palette

| Token | Hex | HSL | Usage |
| :--- | :--- | :--- | :--- |
| `--surface-0` | `#0a0a0a` | `0 0% 4%` | Page background, deepest surface |
| `--surface-1` | `#0f0f0f` | `0 0% 6%` | Card surface |
| `--surface-2` | `#141414` | `0 0% 8%` | Inputs, nested panels |
| `--surface-3` | `#1a1a1a` | `0 0% 10%` | Hover/focus fill, raised surface |
| `--border-1` | `#222222` | `0 0% 13%` | Subtle card borders |
| `--border-2` | `#333333` | `0 0% 20%` | Input/control borders |
| `--border-3` | `#555555` | `0 0% 33%` | Focus / active border |
| `--text-primary` | `#ededed` | `0 0% 93%` | Headings, primary text |
| `--text-secondary` | `#a1a1aa` | `240 5% 65%` | Body text, subtitles |
| `--text-muted` | `#8a8a8a` | `0 0% 54%` | Captions, labels (AA-safe on surface-0) |
| `--text-faint` | `#6b6b6b` | `0 0% 42%` | Non-essential metadata (AA-safe on surface-0) |
| `--accent` | `#f59e0b` | `38 92% 50%` | Primary amber accent |
| `--accent-hover` | `#fbbf24` | `42 96% 56%` | Amber hover |
| `--accent-subtle` | `#422006` | `27 90% 14%` | Amber-tinted surface (pills, badges) |
| `--accent-border` | `#78350f` | `27 78% 26%` | Amber-tinted border |

### Semantic status colors
Preserve the deterministic recommendation color coding, tinted to sit on the dark surface:

| State | Text | Surface | Border |
| :--- | :--- | :--- | :--- |
| `emerald` (Keep) | `#4ade80` | `#0f1f14` | `#166534` |
| `blue` (Review) | `#60a5fa` | `#0f172a` | `#1e3a8a` |
| `amber` (Pause) | `#fbbf24` | `#422006` | `#78350f` |
| `rose` (Cancel) | `#f43f5e` | `#4c0519` | `#881337` |

---

## 3. Typography

Default family: **Instrument Sans**, self-hosted via `next/font` and wired to `--font-sans`.
Numeric family: **IBM Plex Mono** (weights 400/500), wired to `--font-mono` — used for all
financial figures, scores, dates, and rule/version metadata. Never render money in a
proportional face.

| Role | Size | Weight | Tracking | Line-height |
| :--- | :--- | :--- | :--- | :--- |
| Hero title | `text-3xl` → `md:text-5xl` | `600` (semibold) | `-0.02em` | `1.1` |
| Section title | `text-xl` | `600` | `-0.01em` | `1.25` |
| Card title | `text-base` | `600` | `0` | `1.4` |
| Body | `text-sm` | `400` | `0` | `1.6` |
| Label / caption | `text-xs` | `500` | `0` | `1.5` |
| Numeric display | context size (e.g. hero score `text-5xl`) | `font-mono` `500` | `0` | matches context |

**Rules**
- Financial figures, dates, scores, and rule/version identifiers always use `font-mono`
  (e.g. hero score: `text-5xl font-mono font-medium`). Never render money in a proportional face.
- Metadata stamps (e.g. `rule v1`, compliance badges) render as `font-mono text-xs uppercase
  tracking-wider`.
- Never use `text-[11px]`; minimum readable body is `text-sm`, minimum caption is `text-xs`.
- Avoid `font-extrabold`; use `font-semibold` for emphasis (sans) or `font-medium` (mono).
- Keep tight tracking only on the hero (`-0.02em`); do not over-track headings.

---

## 4. Spacing Scale

`4px` base. Prefer these steps (Tailwind default is fine, but stay consistent):

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64` → `p-1 · p-2 · p-3 · p-4 · p-6 · p-8 · p-12 · p-16`

- Section vertical rhythm: `space-y-8` mobile, `space-y-10` desktop.
- Card padding: `p-6` (mobile) → `p-8` (desktop).

---

## 5. Radius

Single consistent radius token: `--radius: 12px` (`rounded-xl`).

- Cards / panels: `rounded-xl`
- Inputs / buttons / pills: `rounded-xl`
- **Do not mix** `rounded-2xl` and `rounded-xl` within the same component region.

---

## 6. Component Notes

- **Tabs / active state**: quiet treatment — `border-3` border + `surface-2`→`surface-3`
  background shift. No glare, no animated shine, no glow.
- **Feature cards**: plain icon + title + body. No icon-in-box (`w-10 h-10 rounded-xl bg-...`).
- **Focus**: `accent` outline/ring, visible for keyboard navigation.
- **Accent usage**: focus rings, active tab, recommendation highlight. Nothing else by default.
- **The Ledger Rule** (signature device): computed numbers are presented like a typeset bank
  statement. Data rows share one anatomy — label on the left (`text-secondary`), a hairline
  rule, and the value right-aligned in `font-mono` (`text-primary`). Score breakdowns,
  subscription lists, forecast rows, and candidate reviews all use this row. Exactly **one**
  amber annotation per view: the single most important figure (value score, next-30-day total)
  gets a left tick (`border-l-2 border-accent pl-3`). Rule/version identifiers sit beside
  computed output as small mono stamps (`font-mono text-xs uppercase tracking-wider`, e.g.
  `rule v1 · deterministic`) — explainability is part of the visual identity, not a footnote.
  Numbers are typeset and settled: no count-up, scramble, or shine animations.
