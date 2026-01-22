import { GoldRates } from '../types/gold';

export class GoldCalculator {
  /**
   * Calculate gold rates for different karats based on pure gold rate
   * @param pureGoldRate - Rate of pure gold (24 karat) per tola
   * @returns Object containing rates for different karats
   */
  static calculateGoldRates(pureGoldRate: number): GoldRates {
    return {
      24: pureGoldRate,                                      // Pure gold (100%)
      22: Math.round(pureGoldRate * 0.92 * 100) / 100,      // 22 karat (92%)
      18: Math.round(pureGoldRate * 0.75 * 100) / 100,      // 18 karat (75%)
      14: Math.round(pureGoldRate * 0.583 * 100) / 100,     // 14 karat (58.3%)
    };
  }
}