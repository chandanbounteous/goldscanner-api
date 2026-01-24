import { GoldRates } from '../types/gold';

export class GoldCalculator {
  // Constants
  static readonly ONE_TOLA_IN_GMS = 11.664;
  static readonly LUXURY_TAX_RATE = 0.02;

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

  /**
   * Get gold rate as per karat
   * @param goldRate24Karat - Gold rate for 24 karat (pure gold)
   * @param karat - Karat value (14, 18, 22, 24)
   * @returns Gold rate adjusted for the specified karat, rounded to 2 decimal places
   */
  static getGoldRateAsPerKarat(goldRate24Karat: number, karat: number): number {
    let rate: number;
    
    switch (karat) {
      case 24:
        rate = goldRate24Karat;
        break;
      case 22:
        rate = goldRate24Karat * 0.92;
        break;
      case 18:
        rate = goldRate24Karat * 0.75;
        break;
      case 14:
        rate = goldRate24Karat * 0.583;
        break;
      default:
        throw new Error(`Unsupported karat value: ${karat}`);
    }
    
    return Math.round(rate * 100) / 100;
  }

  /**
   * Calculate luxury tax
   * @param totalAmount - Total amount to calculate tax on
   * @returns Luxury tax amount rounded to 2 decimal places
   */
  static calcLuxuryTax(totalAmount: number): number {
    return Math.round(totalAmount * this.LUXURY_TAX_RATE * 100) / 100;
  }

  /**
   * Calculate article cost with all components
   * @param goldRate24KPerTola - Gold rate for 24K per tola
   * @param articleKarat - Karat of the article
   * @param articleNetWeight - Net weight of the article in grams
   * @param addOnCost - Additional cost
   * @param wastage - Wastage in grams
   * @param makingCharge - Making charge
   * @param discount - Discount amount
   * @returns Object containing pre-tax cost, luxury tax, and post-tax cost
   */
  static calcArticleCost(
    goldRate24KPerTola: number,
    articleKarat: number,
    articleNetWeight: number,
    addOnCost: number,
    wastage: number,
    makingCharge: number,
    discount: number
  ): {
    preTaxArticleCost: number;
    luxuryTaxAmount: number;
    postTaxArticleCost: number;
  } {
    // 1. Get gold rate per karat per gram
    const goldRateAsPerKaratPerTola = this.getGoldRateAsPerKarat(goldRate24KPerTola, articleKarat);
    const goldRateAsPerKaratPerGram = Math.round((goldRateAsPerKaratPerTola / this.ONE_TOLA_IN_GMS) * 100) / 100;

    // 2. Calculate pre-tax article cost
    const preTaxArticleCost = Math.round(
      ((goldRateAsPerKaratPerGram * (articleNetWeight + wastage)) + addOnCost + makingCharge - discount) * 100
    ) / 100;

    // 3. Calculate luxury tax
    const luxuryTaxAmount = this.calcLuxuryTax(preTaxArticleCost);

    // 4. Calculate post-tax cost
    const postTaxArticleCost = Math.round((preTaxArticleCost + luxuryTaxAmount) * 100) / 100;

    return {
      preTaxArticleCost,
      luxuryTaxAmount,
      postTaxArticleCost
    };
  }

  /**
   * Calculate total basket cost
   * @param totalArticlesCost - Total cost of all articles
   * @param oldGoldItemsCost - Cost of old gold items
   * @param extraDiscount - Extra discount amount
   * @returns Object containing pre-tax amount, tax amount, and post-tax total
   */
  static calcTotalBasketCost(
    totalArticlesCost: number,
    oldGoldItemsCost: number,
    extraDiscount: number
  ): {
    preTaxBasketAmount: number;
    taxedBasketAmount: number;
    postTaxBasketAmount: number;
  } {
    // 1. Calculate pre-tax basket amount
    const preTaxBasketAmount = Math.round((totalArticlesCost - (oldGoldItemsCost + extraDiscount)) * 100) / 100;

    // 2. Calculate tax on basket amount
    const taxedBasketAmount = this.calcLuxuryTax(preTaxBasketAmount);

    // 3. Calculate post-tax basket amount
    const postTaxBasketAmount = Math.round((preTaxBasketAmount + taxedBasketAmount) * 100) / 100;

    return {
      preTaxBasketAmount,
      taxedBasketAmount,
      postTaxBasketAmount
    };
  }
}