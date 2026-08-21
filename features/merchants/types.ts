/**
 * Merchant Catalog and Normalization Types (§2.1 / §8.1).
 * Pure deterministic types for merchant resolution and student discount plans.
 */

export type MerchantCategory =
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

export interface StudentPlanInfo {
  /** Standard monthly amount in sen (e.g. 1590 = RM 15.90) */
  readonly standardMonthlySen: number;
  /** Discounted student monthly amount in sen (e.g. 850 = RM 8.50) */
  readonly studentMonthlySen: number;
  /** Plan display name */
  readonly planName: string;
  /** Verification requirement description */
  readonly requirement: string;
  /** Link to student discount application page */
  readonly dealUrl: string;
}

export interface MerchantRule {
  readonly id: string;
  readonly canonicalName: string;
  readonly domain: string;
  readonly category: MerchantCategory;
  readonly aliases: readonly (RegExp | string)[];
  readonly studentPlan?: StudentPlanInfo;
}

export interface ResolvedMerchant {
  readonly canonicalName: string;
  readonly domain?: string;
  readonly category: MerchantCategory;
  readonly matchedRule?: MerchantRule;
  readonly isKnownMerchant: boolean;
}
