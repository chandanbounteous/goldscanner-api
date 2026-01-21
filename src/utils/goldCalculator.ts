import { GoldRates } from '../types/gold';

export class GoldCalculator {
  /**
   * Calculate gold rates for different karats based on pure gold rate
   * @param pureGoldRate - Rate of pure gold (24 karat) per tola
   * @returns Object containing rates for different karats
   */
  static calculateGoldRates(pureGoldRate: number): GoldRates {
    return {
      24: pureGoldRate,           // Pure gold (100%)
      22: pureGoldRate * 0.92,    // 22 karat (92%)
      18: pureGoldRate * 0.75,    // 18 karat (75%)
      14: pureGoldRate * 0.583,   // 14 karat (58.3%)
    };
  }

  /**
   * Round rates to two decimal places
   */
  static roundGoldRates(rates: GoldRates): GoldRates {
    return {
      24: Math.round(rates[24] * 100) / 100,
      22: Math.round(rates[22] * 100) / 100,
      18: Math.round(rates[18] * 100) / 100,
      14: Math.round(rates[14] * 100) / 100,
    };
  }
}