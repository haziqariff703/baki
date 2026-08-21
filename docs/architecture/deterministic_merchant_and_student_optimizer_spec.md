# Deterministic Merchant Resolution & Student Discount Optimizer Specification

> **Status**: Approved for implementation via OpenCode  
> **Target Modules**: `features/merchants/`, `features/student-optimizer/`, `components/shared/MerchantLogo.tsx`  
> **Key Attributes**: 100% Deterministic, Zero GPU/VRAM requirement, Sub-millisecond CPU runtime, 100% Free.

---

## 1. Overview & Objectives

This specification details the architecture for:
1. **Zero-AI Merchant Normalization & Auto-Logo Resolution**: Resolving messy bank descriptors (e.g. `SPTF*SPOTIFY SE KUL`) into clean canonical brands (`Spotify`) and fetching high-resolution logos via Google Favicon CDN.
2. **Malaysian Student Discount Optimizer**: Auto-detecting student plan eligibility (e.g. Spotify Student RM 8.50 vs RM 15.90) and calculating exact annual ringgit savings.
3. **Stealth Price Creep / Hike Detector**: Deterministically flagging any recurring billing delta ($> \text{RM 0.00}$) across statement periods.

---

## 2. Architecture & Data Structures

### 2.1 Merchant Catalog Data Structure
Located at `features/merchants/catalog.ts`:

```typescript
export interface MerchantRule {
  readonly id: string;
  readonly canonicalName: string;
  readonly domain: string;
  readonly category:
    | 'Entertainment'
    | 'Software'
    | 'Telecommunications'
    | 'Utilities'
    | 'Insurance'
    | 'Instalments'
    | 'Memberships'
    | 'Education'
    | 'Fitness'
    | 'Transport'
    | 'Other';
  readonly aliases: readonly RegExp[];
  readonly studentPlan?: {
    readonly standardMonthlySen: number; // e.g. 1590
    readonly studentMonthlySen: number;  // e.g. 850
    readonly planName: string;            // e.g. 'Spotify Premium Student'
    readonly requirement: string;         // e.g. 'Active university student verification (.edu.my / SheerID)'
    readonly dealUrl: string;             // e.g. 'https://www.spotify.com/my-en/student/'
  };
}

export const MALAYSIAN_SUBSCRIPTION_CATALOG: readonly MerchantRule[] = [
  // 1. Streaming & Music
  {
    id: 'spotify',
    canonicalName: 'Spotify',
    domain: 'spotify.com',
    category: 'Entertainment',
    aliases: [/sptf/i, /spotify/i],
    studentPlan: {
      standardMonthlySen: 1590,
      studentMonthlySen: 850,
      planName: 'Spotify Student',
      requirement: 'SheerID university student status',
      dealUrl: 'https://www.spotify.com/my-en/student/',
    },
  },
  {
    id: 'apple_music',
    canonicalName: 'Apple Music',
    domain: 'apple.com',
    category: 'Entertainment',
    aliases: [/apple\.com\/bill/i, /itunes/i, /apple\s*music/i],
    studentPlan: {
      standardMonthlySen: 1690,
      studentMonthlySen: 890,
      planName: 'Apple Music Student (includes Apple TV+)',
      requirement: 'UNiDAYS student verification',
      dealUrl: 'https://www.apple.com/my/apple-music/',
    },
  },
  {
    id: 'youtube_premium',
    canonicalName: 'YouTube Premium',
    domain: 'youtube.com',
    category: 'Entertainment',
    aliases: [/youtube.*prem/i, /googletempo/i, /google.*yt/i],
    studentPlan: {
      standardMonthlySen: 2090,
      studentMonthlySen: 1290,
      planName: 'YouTube Student Membership',
      requirement: 'SheerID student status',
      dealUrl: 'https://www.youtube.com/premium/student',
    },
  },
  {
    id: 'netflix',
    canonicalName: 'Netflix',
    domain: 'netflix.com',
    category: 'Entertainment',
    aliases: [/nflx/i, /netflix/i],
  },
  {
    id: 'disney_hotstar',
    canonicalName: 'Disney+ Hotstar',
    domain: 'hotstar.com',
    category: 'Entertainment',
    aliases: [/hotstar/i, /disney/i],
  },

  // 2. Malaysian Telcos & Broadband
  {
    id: 'unifi',
    canonicalName: 'Unifi Broadband',
    domain: 'unifi.com.my',
    category: 'Utilities',
    aliases: [/telekom\s*malaysia/i, /tm\s*bill/i, /unifi/i],
  },
  {
    id: 'maxis',
    canonicalName: 'Maxis / Hotlink',
    domain: 'maxis.com.my',
    category: 'Telecommunications',
    aliases: [/maxis/i, /hotlink/i],
  },
  {
    id: 'celcomdigi',
    canonicalName: 'CelcomDigi',
    domain: 'celcomdigi.com',
    category: 'Telecommunications',
    aliases: [/celcom/i, /digi\s*tele/i],
  },
  {
    id: 'yes_5g',
    canonicalName: 'Yes 5G (YTL)',
    domain: 'yes.my',
    category: 'Telecommunications',
    aliases: [/ytl\s*comm/i, /yes\s*5g/i],
  },

  // 3. Software & Productivity
  {
    id: 'chatgpt',
    canonicalName: 'ChatGPT Plus',
    domain: 'openai.com',
    category: 'Software',
    aliases: [/openai/i, /chatgpt/i],
  },
  {
    id: 'canva',
    canonicalName: 'Canva Pro',
    domain: 'canva.com',
    category: 'Software',
    aliases: [/canva/i],
    studentPlan: {
      standardMonthlySen: 2990,
      studentMonthlySen: 0,
      planName: 'Canva for Education / Students',
      requirement: 'Teacher invite or verified education email',
      dealUrl: 'https://www.canva.com/education/students/',
    },
  },
  {
    id: 'github_copilot',
    canonicalName: 'GitHub Copilot / Pro',
    domain: 'github.com',
    category: 'Software',
    aliases: [/github/i],
    studentPlan: {
      standardMonthlySen: 4500,
      studentMonthlySen: 0,
      planName: 'GitHub Student Developer Pack (Free Copilot & Pro)',
      requirement: 'GitHub Student Pack verification with student ID',
      dealUrl: 'https://education.github.com/pack',
    },
  },
  {
    id: 'notion',
    canonicalName: 'Notion Plus',
    domain: 'notion.so',
    category: 'Software',
    aliases: [/notion/i],
    studentPlan: {
      standardMonthlySen: 4500,
      studentMonthlySen: 0,
      planName: 'Notion for Education (Free Plus Plan)',
      requirement: 'Sign up with .edu.my student email',
      dealUrl: 'https://www.notion.so/product/notion-for-education',
    },
  },
  {
    id: 'adobe_cc',
    canonicalName: 'Adobe Creative Cloud',
    domain: 'adobe.com',
    category: 'Software',
    aliases: [/adobe/i],
    studentPlan: {
      standardMonthlySen: 26000,
      studentMonthlySen: 8500,
      planName: 'Adobe Students & Teachers 60%+ Off',
      requirement: 'Institutional student email verification',
      dealUrl: 'https://www.adobe.com/my/creativecloud/buy/students.html',
    },
  },

  // 4. Fitness & Memberships
  {
    id: 'anytime_fitness',
    canonicalName: 'Anytime Fitness',
    domain: 'anytimefitness.my',
    category: 'Fitness',
    aliases: [/anytime\s*fit/i],
  },
  {
    id: 'fitness_first',
    canonicalName: 'Fitness First',
    domain: 'fitnessfirst.com.my',
    category: 'Fitness',
    aliases: [/fitness\s*first/i],
  },
];
```

---

## 3. Merchant Normalization Matcher

Located at `features/merchants/matcher.ts`:

```typescript
import { MALAYSIAN_SUBSCRIPTION_CATALOG, type MerchantRule } from './catalog';

export interface ResolvedMerchant {
  readonly canonicalName: string;
  readonly domain?: string;
  readonly category: string;
  readonly matchedRule?: MerchantRule;
  readonly isKnownMerchant: boolean;
}

const NOISE_WORDS = [
  /\bSDN\s+BHD\b/gi,
  /\bBHD\b/gi,
  /\bBERHAD\b/gi,
  /\bLTD\b/gi,
  /\bCORP\b/gi,
  /\bINC\b/gi,
  /\bPAYMENT\b/gi,
  /\bAUTOPAY\b/gi,
  /\bDIRECT\s+DEBIT\b/gi,
  /\bRECURRING\b/gi,
  /\bKUALA\s+LUMPUR\b/gi,
  /\bPETALING\s+JAYA\b/gi,
  /\bMY\b/g,
  /\bSE\b/g,
  /[*#]/g,
];

export function cleanDescriptor(raw: string): string {
  let cleaned = raw;
  for (const regex of NOISE_WORDS) {
    cleaned = cleaned.replace(regex, ' ');
  }
  return cleaned.replace(/\s+/g, ' ').trim();
}

export function resolveMerchant(rawDescriptor: string): ResolvedMerchant {
  const cleaned = cleanDescriptor(rawDescriptor);

  for (const rule of MALAYSIAN_SUBSCRIPTION_CATALOG) {
    for (const pattern of rule.aliases) {
      if (pattern.test(rawDescriptor) || pattern.test(cleaned)) {
        return {
          canonicalName: rule.canonicalName,
          domain: rule.domain,
          category: rule.category,
          matchedRule: rule,
          isKnownMerchant: true,
        };
      }
    }
  }

  return {
    canonicalName: cleaned.length > 0 ? cleaned : rawDescriptor,
    category: 'Other',
    isKnownMerchant: false,
  };
}
```

---

## 4. Brand Logo Component

Located at `components/shared/MerchantLogo.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MerchantLogoProps {
  readonly name: string;
  readonly domain?: string;
  readonly className?: string;
  readonly size?: number;
}

export function MerchantLogo({ name, domain, className, size = 32 }: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);

  const monogram = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  if (domain && !failed) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}`}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          'rounded-lg border border-border-1 bg-surface-1 object-contain p-1 shrink-0',
          className,
        )}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={cn(
        'rounded-lg bg-surface-3 border border-border-2 flex items-center justify-center font-mono font-medium text-text-primary shrink-0',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.35)) }}
      aria-label={name}
    >
      {monogram || name.slice(0, 2).toUpperCase()}
    </div>
  );
}
```

---

## 5. Student Plan Savings Calculation Engine

Located at `features/student-optimizer/logic.ts`:

```typescript
import { resolveMerchant } from '@/features/merchants/matcher';
import type { SubscriptionSchema } from '@/lib/validation';

export interface StudentSavingsOpportunity {
  readonly subscriptionId: string;
  readonly merchantName: string;
  readonly planName: string;
  readonly currentMonthlySen: number;
  readonly studentMonthlySen: number;
  readonly monthlySavingsSen: number;
  readonly annualSavingsSen: number;
  readonly dealUrl: string;
  readonly requirement: string;
}

export function detectStudentSavings(
  subscriptions: readonly SubscriptionSchema[],
  isStudentUser: boolean = true,
): readonly StudentSavingsOpportunity[] {
  if (!isStudentUser) return [];

  const opportunities: StudentSavingsOpportunity[] = [];

  for (const sub of subscriptions) {
    const resolved = resolveMerchant(sub.merchantName);
    const plan = resolved.matchedRule?.studentPlan;

    if (plan && sub.amountSen > plan.studentMonthlySen) {
      const monthlySavingsSen = sub.amountSen - plan.studentMonthlySen;
      opportunities.push({
        subscriptionId: sub.id,
        merchantName: resolved.canonicalName,
        planName: plan.planName,
        currentMonthlySen: sub.amountSen,
        studentMonthlySen: plan.studentMonthlySen,
        monthlySavingsSen,
        annualSavingsSen: monthlySavingsSen * 12,
        dealUrl: plan.dealUrl,
        requirement: plan.requirement,
      });
    }
  }

  return opportunities;
}
```

---

## 6. Price Creep / Stealth Hike Detector

Located at `features/recurring-detection/priceCreep.ts`:

```typescript
import type { MoneyInSen } from '@/lib/money';

export interface PriceCreepEvent {
  readonly merchantName: string;
  readonly previousAmountSen: MoneyInSen;
  readonly currentAmountSen: MoneyInSen;
  readonly deltaSen: MoneyInSen;
  readonly percentageIncrease: number;
  readonly detectedDate: string;
}

/**
 * Deterministically detects if a recurring charge increased compared to historical billing.
 */
export function detectPriceCreep(
  currentCharge: { amountSen: MoneyInSen; date: string },
  previousCharge: { amountSen: MoneyInSen; date: string },
  merchantName: string,
): PriceCreepEvent | null {
  if (currentCharge.amountSen > previousCharge.amountSen) {
    const deltaSen = currentCharge.amountSen - previousCharge.amountSen;
    const percentageIncrease = Math.round(
      (deltaSen / previousCharge.amountSen) * 100,
    );
    return {
      merchantName,
      previousAmountSen: previousCharge.amountSen,
      currentAmountSen: currentCharge.amountSen,
      deltaSen,
      percentageIncrease,
      detectedDate: currentCharge.date,
    };
  }
  return null;
}
```

---

## 7. OpenCode Implementation Checklist

When ready to implement in OpenCode:
1. `features/merchants/catalog.ts` — Create the 100+ entry Malaysian catalog.
2. `features/merchants/matcher.ts` — Implement noise removal and zero-latency matcher.
3. `components/shared/MerchantLogo.tsx` — Build the universal logo & fallback monogram component.
4. `features/student-optimizer/` — Add student savings engine and badges to `/dashboard` & `/subscriptions`.
5. `features/recurring-detection/priceCreep.ts` — Wire price creep warnings into `/review` and `/dashboard`.
6. Add unit test coverage in `tests/unit/merchants.test.ts` and `tests/unit/studentOptimizer.test.ts`.
