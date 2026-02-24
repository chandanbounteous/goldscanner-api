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
    finalCost: number;
  } {
    // 1. Get gold rate per karat per gram
    const goldRateAsPerKaratPerTola = this.getGoldRateAsPerKarat(goldRate24KPerTola, articleKarat);
    const goldRateAsPerKaratPerGram = Math.round((goldRateAsPerKaratPerTola / this.ONE_TOLA_IN_GMS) * 100) / 100;

    // 2. Calculate pre-tax article cost (excluding add_on_cost)
    const preTaxArticleCost = Math.round(
      ((goldRateAsPerKaratPerGram * (articleNetWeight + wastage)) + makingCharge - discount) * 100
    ) / 100;

    // 3. Calculate luxury tax (on pre_tax_cost only)
    const luxuryTaxAmount = this.calcLuxuryTax(preTaxArticleCost);

    // 4. Calculate post-tax cost (pre_tax + luxury_tax)
    const postTaxArticleCost = Math.round((preTaxArticleCost + luxuryTaxAmount) * 100) / 100;

    // 5. Calculate final cost (post_tax + add_on_cost)
    const finalCost = Math.round((postTaxArticleCost + addOnCost) * 100) / 100;

    return {
      preTaxArticleCost,
      luxuryTaxAmount,
      postTaxArticleCost,
      finalCost
    };
  }

  /**
   * Calculate total basket cost
   * @param totalArticlesCost - Total cost of all articles
   * @param oldGoldItemsCost - Cost of old gold items
   * @param extraDiscount - Extra discount amount
   * @param totalAddOnCost - Total add-on cost of all articles
   * @returns Object containing pre-tax amount, tax amount, post-tax total, and total basket amount
   */
  static calcTotalBasketCost(
    totalArticlesCost: number,
    oldGoldItemsCost: number,
    extraDiscount: number,
    totalAddOnCost: number
  ): {
    preTaxBasketAmount: number;
    taxedBasketAmount: number;
    postTaxBasketAmount: number;
    totalBasketAmount: number;
  } {
    // 1. Calculate pre-tax basket amount
    const preTaxBasketAmount = Math.round((totalArticlesCost - (oldGoldItemsCost + extraDiscount)) * 100) / 100;

    // 2. Calculate tax on basket amount
    const taxedBasketAmount = this.calcLuxuryTax(preTaxBasketAmount);

    // 3. Calculate post-tax basket amount
    const postTaxBasketAmount = Math.round((preTaxBasketAmount + taxedBasketAmount) * 100) / 100;

    // 4. Calculate total basket amount (post_tax + total_add_on_cost)
    const totalBasketAmount = Math.round((postTaxBasketAmount + totalAddOnCost) * 100) / 100;

    return {
      preTaxBasketAmount,
      taxedBasketAmount,
      postTaxBasketAmount,
      totalBasketAmount
    };
  }

  /**
   * Calculate article-specific invoice calculations
   * @param billedGoldRate24KPerTola - Gold rate used for billing (24K per tola)
   * @param karat - Article karat
   * @param netWeight - Net weight of the article in grams
   * @param wastage - Wastage in grams
   * @param stoneWeight - Stone weight in grams
   * @returns Object containing article invoice calculations
   */
  static calcArticleInvoiceCalculations(
    billedGoldRate24KPerTola: number,
    karat: number,
    netWeight: number,
    wastage: number,
    stoneWeight: number
  ): {
    ratePerGram: number;
    totalWeightWithWastage: number;
    totalAmountForWeightWithWastage: number;
    totalWeightWithWastageAndStoneWeight: number;
    totalAmountForWeightWithWastageAndStoneWeight: number;
  } {
    // Get gold rate per gram for the specific karat
    const goldRateAsPerKaratPerTola = this.getGoldRateAsPerKarat(billedGoldRate24KPerTola, karat);
    const ratePerGram = Math.round((goldRateAsPerKaratPerTola / this.ONE_TOLA_IN_GMS) * 100) / 100;

    // Calculate total weight with wastage
    const totalWeightWithWastage = Math.round((netWeight + wastage) * 100) / 100;

    // Calculate amount for weight with wastage
    const totalAmountForWeightWithWastage = Math.round((totalWeightWithWastage * ratePerGram) * 100) / 100;

    // Calculate total weight including stone weight
    const totalWeightWithWastageAndStoneWeight = Math.round((totalWeightWithWastage + stoneWeight) * 100) / 100;

    // Calculate amount for weight with wastage and stone weight
    const totalAmountForWeightWithWastageAndStoneWeight = Math.round((totalWeightWithWastageAndStoneWeight * ratePerGram) * 100) / 100;

    return {
      ratePerGram,
      totalWeightWithWastage,
      totalAmountForWeightWithWastage,
      totalWeightWithWastageAndStoneWeight,
      totalAmountForWeightWithWastageAndStoneWeight
    };
  }

  /**
   * Calculate consolidated invoice calculations
   * @param articles - Array of article invoice calculations
   * @param totalDiscount - Total discount from all articles
   * @param extraDiscount - Extra discount on basket
   * @returns Object containing consolidated invoice calculations
   */
  static calcConsolidatedInvoiceCalculations(
    articles: Array<{ totalAmountForWeightWithWastageAndStoneWeight: number }>,
    totalDiscount: number,
    extraDiscount: number
  ): {
    consolidatedTotalAmountForAllArticles: number;
    discount: number;
    taxableAmount: number;
    luxuryTax: number;
    netAmount: number;
  } {
    // Sum total of all totalAmountForWeightWithWastageAndStoneWeight
    const consolidatedTotalAmountForAllArticles = Math.round(
      articles.reduce((sum, article) => sum + article.totalAmountForWeightWithWastageAndStoneWeight, 0) * 100
    ) / 100;

    // Total discount (article discounts + extra discount)
    const discount = Math.round((totalDiscount + extraDiscount) * 100) / 100;

    // Taxable amount (total - discount)
    const taxableAmount = Math.round((consolidatedTotalAmountForAllArticles - discount) * 100) / 100;

    // Calculate luxury tax
    const luxuryTax = this.calcLuxuryTax(taxableAmount);

    // Net amount (taxable + luxury tax)
    const netAmount = Math.round((taxableAmount + luxuryTax) * 100) / 100;

    return {
      consolidatedTotalAmountForAllArticles,
      discount,
      taxableAmount,
      luxuryTax,
      netAmount
    };
  }
}