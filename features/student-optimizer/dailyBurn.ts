/**
 * Deterministic Daily Burn Rate & Teh Tarik Equivalent Calculator.
 *
 * Provides relatable everyday Malaysian framing for subscription commitments.
 * Integer-sen arithmetic (§8.1).
 */
import type { DailyBurnMetric } from './types';

/** Average price of 1 Teh Tarik + Roti Canai snack in sen (RM 3.50). */
const TEH_TARIK_UNIT_SEN = 350;

/**
 * Calculates daily commitment and relatable food equivalent from a monthly total in sen.
 */
export function calculateDailyBurn(monthlyTotalSen: number): DailyBurnMetric {
  if (monthlyTotalSen <= 0) {
    return {
      dailyBurnSen: 0,
      dailyBurnMyr: '0.00',
      tehTarikEquiv: 0,
      monthlyTotalSen: 0,
      monthlyTotalMyr: '0.00',
    };
  }

  // 30-day standard month conversion
  const dailyBurnSen = Math.round(monthlyTotalSen / 30);
  const dailyBurnMyr = (dailyBurnSen / 100).toFixed(2);
  const monthlyTotalMyr = (monthlyTotalSen / 100).toFixed(2);

  // Exact 1-decimal Teh Tarik index
  const rawEquiv = dailyBurnSen / TEH_TARIK_UNIT_SEN;
  const tehTarikEquiv = Math.round(rawEquiv * 10) / 10;

  return {
    dailyBurnSen,
    dailyBurnMyr,
    tehTarikEquiv,
    monthlyTotalSen,
    monthlyTotalMyr,
  };
}
