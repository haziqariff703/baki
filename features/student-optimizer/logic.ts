import { resolveMerchant } from '@/features/merchants';
import type { SubscriptionSchema } from '@/lib/validation';
import type { StudentSavingsOpportunity, StudentSavingsSummary } from './types';

/**
 * Detects student plan savings opportunities from user subscriptions.
 * 100% deterministic, integer sen money calculation (§8.1 / §8.2).
 */
export function detectStudentSavings(
  subscriptions: readonly SubscriptionSchema[],
  isStudentUser: boolean = true,
): StudentSavingsSummary {
  if (!isStudentUser || subscriptions.length === 0) {
    return {
      opportunities: [],
      totalMonthlySavingsSen: 0,
      totalAnnualSavingsSen: 0,
      count: 0,
    };
  }

  const opportunities: StudentSavingsOpportunity[] = [];

  for (const sub of subscriptions) {
    const resolved = resolveMerchant(sub.merchantName);
    const plan = resolved.matchedRule?.studentPlan;

    if (plan && sub.amountSen > plan.studentMonthlySen) {
      const monthlySavingsSen = sub.amountSen - plan.studentMonthlySen;
      opportunities.push({
        subscriptionId: sub.id,
        merchantName: resolved.canonicalName,
        domain: resolved.domain,
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

  const totalMonthlySavingsSen = opportunities.reduce(
    (sum, o) => sum + o.monthlySavingsSen,
    0,
  );
  const totalAnnualSavingsSen = totalMonthlySavingsSen * 12;

  return {
    opportunities,
    totalMonthlySavingsSen,
    totalAnnualSavingsSen,
    count: opportunities.length,
  };
}
