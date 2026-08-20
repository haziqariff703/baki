/**
 * Types for the Student Subscription Optimizer.
 *
 * All money values are strictly positive integers in sen (§8.1).
 */
export interface StudentPreset {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly defaultBillingDay: number;
  readonly studentPriceSen: number;
  readonly standardPriceSen: number;
  readonly monthlySavingsSen: number;
  readonly discountPercentage: number;
  readonly tag: string; // e.g.  50% OFF, Save RM7.40
  readonly perkDescription: string;
  readonly verificationMethod: 'unidays' | 'sheerid' | 'student_email' | 'none';
  readonly defaultScoreBreakdown: {
    readonly usage: number;
    readonly necessity: number;
    readonly affordability: number;
    readonly uniqueness: number;
    readonly satisfaction: number;
  };
}

export interface StudentSavingsOpportunity {
  readonly subscriptionId: string;
  readonly merchantName: string;
  readonly planName?: string;
  readonly currentAmountSen: number;
  readonly studentAmountSen: number;
  readonly currentMonthlySen?: number;
  readonly studentMonthlySen?: number;
  readonly monthlySavingsSen: number;
  readonly annualSavingsSen: number;
  readonly dealUrl: string;
  readonly description: string;
  readonly requirement?: string;
  readonly verificationMethod?: 'unidays' | 'sheerid' | 'student_email' | 'none' | string;
}

export interface StudentSavingsResult {
  readonly count: number;
  readonly totalMonthlySavingsSen: number;
  readonly totalAnnualSavingsSen: number;
  readonly opportunities: readonly StudentSavingsOpportunity[];
}

export type StudentSavingsSummary = StudentSavingsResult;

export interface DailyBurnMetric {
  readonly dailyBurnSen: number;
  readonly dailyBurnMyr: string;
  readonly tehTarikEquiv: number;
  readonly monthlyTotalSen: number;
  readonly monthlyTotalMyr: string;
}
