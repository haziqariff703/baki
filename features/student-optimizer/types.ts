import type { MoneyInSen } from '@/lib/money';

export interface StudentSavingsOpportunity {
  readonly subscriptionId: string;
  readonly merchantName: string;
  readonly domain?: string;
  readonly planName: string;
  readonly currentMonthlySen: MoneyInSen;
  readonly studentMonthlySen: MoneyInSen;
  readonly monthlySavingsSen: MoneyInSen;
  readonly annualSavingsSen: MoneyInSen;
  readonly dealUrl: string;
  readonly requirement: string;
}

export interface StudentSavingsSummary {
  readonly opportunities: readonly StudentSavingsOpportunity[];
  readonly totalMonthlySavingsSen: MoneyInSen;
  readonly totalAnnualSavingsSen: MoneyInSen;
  readonly count: number;
}
