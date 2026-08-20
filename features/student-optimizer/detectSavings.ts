import type { Subscription } from '@/features/subscriptions';
import type { SubscriptionSchema } from '@/lib/validation';
import type { StudentSavingsOpportunity, StudentSavingsResult } from './types';

interface DiscountRule {
  readonly pattern: RegExp;
  readonly merchantName: string;
  readonly studentAmountSen: number;
  readonly dealUrl: string;
  readonly description: string;
  readonly verificationMethod: 'unidays' | 'sheerid' | 'student_email' | 'none';
}

const DISCOUNT_RULES: readonly DiscountRule[] = [
  {
    pattern: /spotify/i,
    merchantName: 'Spotify',
    studentAmountSen: 850, // RM 8.50
    dealUrl: 'https://www.spotify.com/my-en/student/',
    description: 'Spotify Premium Student plan (RM 8.50/mo) via SheerID verification.',
    verificationMethod: 'sheerid',
  },
  {
    pattern: /apple\s*music/i,
    merchantName: 'Apple Music',
    studentAmountSen: 890, // RM 8.90
    dealUrl: 'https://www.apple.com/my/apple-music/',
    description: 'Apple Music Student plan (RM 8.90/mo) with free Apple TV+ via UNiDAYS.',
    verificationMethod: 'unidays',
  },
  {
    pattern: /canva/i,
    merchantName: 'Canva Pro',
    studentAmountSen: 0, // Free for students
    dealUrl: 'https://www.canva.com/education/',
    description: 'Canva for Education is 100% free with your university student email or GitHub Student Developer Pack.',
    verificationMethod: 'student_email',
  },
  {
    pattern: /microsoft\s*365|office\s*365/i,
    merchantName: 'Microsoft 365',
    studentAmountSen: 0, // Free via university
    dealUrl: 'https://www.microsoft.com/en-my/education/products/office',
    description: 'Microsoft 365 Education is free for university students in Malaysia with @student.edu.my.',
    verificationMethod: 'student_email',
  },
  {
    pattern: /figma/i,
    merchantName: 'Figma',
    studentAmountSen: 0, // Free for students
    dealUrl: 'https://www.figma.com/education/',
    description: 'Figma Professional is 100% free for students and educators.',
    verificationMethod: 'student_email',
  },
  {
    pattern: /celcom|digi|celcomdigi/i,
    merchantName: 'CelcomDigi',
    studentAmountSen: 4000, // RM 40.00 Pakej Belia
    dealUrl: 'https://celcomdigi.com/',
    description: 'CelcomDigi Pakej Belia 5G student discount saves RM 20.00/mo.',
    verificationMethod: 'none',
  },
  {
    pattern: /duolingo/i,
    merchantName: 'Duolingo Super',
    studentAmountSen: 1445, // RM 14.45 (Student/Family slot equivalent)
    dealUrl: 'https://www.duolingo.com/',
    description: 'Duolingo Super Student / Family slot plan saves 50%.',
    verificationMethod: 'none',
  },
  {
    pattern: /youtube/i,
    merchantName: 'YouTube Premium',
    studentAmountSen: 1090, // RM 10.90
    dealUrl: 'https://www.youtube.com/premium/student',
    description: 'YouTube Premium Student plan (RM 10.90/mo) via SheerID verification.',
    verificationMethod: 'sheerid',
  },
  {
    pattern: /adobe/i,
    merchantName: 'Adobe Creative Cloud',
    studentAmountSen: 9000, // RM 90.00
    dealUrl: 'https://www.adobe.com/sea/creativecloud/buy/students.html',
    description: 'Adobe Creative Cloud Student Edition saves 63% (RM 90.00/mo).',
    verificationMethod: 'student_email',
  },
];

type AnySub = Subscription | SubscriptionSchema;

function getMerchantName(sub: AnySub): string {
  if ('merchant_name' in sub && typeof sub.merchant_name === 'string') {
    return sub.merchant_name;
  }
  if ('merchantName' in sub && typeof sub.merchantName === 'string') {
    return sub.merchantName;
  }
  return '';
}

function getAmountSen(sub: AnySub): number {
  if ('amount_sen' in sub && typeof sub.amount_sen === 'number') {
    return sub.amount_sen;
  }
  if ('amountSen' in sub && typeof sub.amountSen === 'number') {
    return sub.amountSen;
  }
  return 0;
}

function getSubId(sub: AnySub): string {
  if ('id' in sub && typeof sub.id === 'string') {
    return sub.id;
  }
  return 'sub-unknown';
}

function isSubActive(sub: AnySub): boolean {
  if ('status' in sub && typeof sub.status === 'string') {
    return sub.status === 'active';
  }
  return true;
}

/**
 * Audits subscriptions against verified Malaysian student discounts.
 * When isStudent is false, returns empty results.
 */
export function detectStudentSavings(
  subscriptions: readonly AnySub[],
  isStudent: boolean = true,
): StudentSavingsResult {
  if (!isStudent || !Array.isArray(subscriptions) || subscriptions.length === 0) {
    return {
      count: 0,
      totalMonthlySavingsSen: 0,
      totalAnnualSavingsSen: 0,
      opportunities: [],
    };
  }

  const opportunities: StudentSavingsOpportunity[] = [];
  let totalMonthlySavingsSen = 0;

  for (const sub of subscriptions) {
    if (!isSubActive(sub)) continue;

    const name = getMerchantName(sub);
    const amountSen = getAmountSen(sub);
    const id = getSubId(sub);

    const rule = DISCOUNT_RULES.find((r) => r.pattern.test(name));
    if (!rule) continue;

    if (amountSen > rule.studentAmountSen) {
      const monthlySavingsSen = amountSen - rule.studentAmountSen;
      const annualSavingsSen = monthlySavingsSen * 12;

      totalMonthlySavingsSen += monthlySavingsSen;

      opportunities.push({
        subscriptionId: id,
        merchantName: rule.merchantName,
        planName: `${rule.merchantName} Student`,
        currentAmountSen: amountSen,
        studentAmountSen: rule.studentAmountSen,
        currentMonthlySen: amountSen,
        studentMonthlySen: rule.studentAmountSen,
        monthlySavingsSen,
        annualSavingsSen,
        dealUrl: rule.dealUrl,
        description: rule.description,
        requirement:
          rule.verificationMethod === 'sheerid'
            ? 'SheerID student verification'
            : rule.verificationMethod === 'unidays'
              ? 'UNiDAYS student portal'
              : rule.verificationMethod === 'student_email'
                ? 'University .edu.my student email'
                : 'Youth / student package',
        verificationMethod: rule.verificationMethod,
      });
    }
  }

  return {
    count: opportunities.length,
    totalMonthlySavingsSen,
    totalAnnualSavingsSen: totalMonthlySavingsSen * 12,
    opportunities,
  };
}
