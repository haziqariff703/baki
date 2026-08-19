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
 * Deterministically detects if a recurring charge increased compared to historical billing (§2.1).
 */
export function detectPriceCreep(
  currentCharge: { amountSen: MoneyInSen; date: string },
  previousCharge: { amountSen: MoneyInSen; date: string },
  merchantName: string,
): PriceCreepEvent | null {
  if (currentCharge.amountSen > previousCharge.amountSen && previousCharge.amountSen > 0) {
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
