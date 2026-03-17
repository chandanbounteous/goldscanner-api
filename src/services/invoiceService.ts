import { PrismaClient } from '@prisma/client';
import { GoldCalculator } from '../utils/goldCalculator';

const prisma = new PrismaClient();

export interface InvoiceSnapshot {
  basketInfo: {
    basketNumber: number;
    billingDate: string;
    billingDateNepali: any;
    billedGoldRate24KPerTola: number;
    isGoldRateFixed: boolean;
    fixedGoldRate24KPerTola?: number;
    fixedGoldRateNepaliDate?: any;
    oldGoldItemCost: number;
    extraDiscount: number;
  };
  customerInfo: {
    id: string;
    firstName: string;
    lastName?: string;
    phone?: number;
    email?: string;
  };
  articles: Array<{
    id: string;
    articleCode: string;
    serialNumber: number;
    netWeight: number;
    grossWeight: number;
    stoneWeight: number;
    karat: number;
    addOnCost: number;
    wastage: number;
    makingCharge: number;
    discount: number;
    issueDate: string;
    issueDateNepali: any;
    carigar?: {
      codeName: string;
      phone?: string;
    };
    articleInvoiceCalculations: {
      ratePerGram: number;
      totalWeightWithWastage: number;
      totalAmountForWeightWithWastage: number;
      totalWeightWithWastageAndStoneWeight: number;
      totalAmountForWeightWithWastageStoneCostAndMakingCharge: number;
    };
  }>;
  calculations: {
    subtotal: {
      totalNetWeight: number;
      totalGrossWeight: number;
      goldValueAtRate: number;
      totalMakingCharge: number;
      totalAddOnCost: number;
      subtotalBeforeDiscount: number;
    };
    adjustments: {
      totalDiscount: number;
      oldGoldItemCost: number;
      extraDiscount: number;
      totalAdjustments: number;
    };
    consolidatedInvoiceCalculations: {
      consolidatedTotalAmountForAllArticles: number;
      oldGoldItemCost:number;
      discount: number;
      taxableAmount: number;
      luxuryTax: number;
      netAmount: number;
    };
  };
  metadata: {
    createdBy: string;
    invoiceVersion: string;
    currency: string;
    rateUnit: string;
  };
}

export class InvoiceService {
  /**
   * Generate the next invoice number starting from GL-0001
   * @returns The next available invoice number
   */
  static async getNextInvoiceNumber(): Promise<string> {
    // Get the highest invoice number
    const lastInvoice = await prisma.customerInvoice.findFirst({
      orderBy: {
        invoiceNumber: 'desc'
      },
      select: {
        invoiceNumber: true
      }
    });

    if (!lastInvoice) {
      return 'GL-0001';
    }

    // Extract number from GL-XXXX format
    const lastNumber = parseInt(lastInvoice.invoiceNumber.split('-')[1] || '0');
    const nextNumber = lastNumber + 1;
    
    // Format with leading zeros (4 digits)
    return `GL-${nextNumber.toString().padStart(4, '0')}`;
  }

  /**
   * Check if an invoice already exists for a basket
   * @param basketId - Basket ID
   * @returns True if invoice exists, false otherwise
   */
  static async invoiceExistsForBasket(basketId: string): Promise<boolean> {
    const existingInvoice = await prisma.customerInvoice.findUnique({
      where: { basketId }
    });
    
    return existingInvoice !== null;
  }

  /**
   * Create invoice snapshot from basket data
   * @param basketData - Complete basket data with customer and articles
   * @param createdByUsername - Username of the user creating the invoice
   * @returns Invoice snapshot object
   */
  static createInvoiceSnapshot(basketData: any, createdByUsername: string): InvoiceSnapshot {
    const articles = basketData.articles.map((basketArticle: any) => {
      const article = basketArticle.article;
      
      // Calculate article invoice calculations
      const articleInvoiceCalculations = GoldCalculator.calcArticleInvoiceCalculations(
        basketData.billedGoldRate24KPerTola,
        article.karat,
        basketArticle.netWeight,
        basketArticle.wastage,
        article.stoneWeight,
        basketArticle.makingCharge,
        basketArticle.addOnCost
      );

      return {
        id: article.id,
        articleCode: article.articleCode,
        serialNumber: article.serialNumber,
        netWeight: basketArticle.netWeight,
        grossWeight: basketArticle.grossWeight,
        stoneWeight: article.stoneWeight,
        karat: article.karat,
        addOnCost: basketArticle.addOnCost,
        wastage: basketArticle.wastage,
        makingCharge: basketArticle.makingCharge,
        discount: basketArticle.discount,
        issueDate: article.issueDate.toISOString(),
        issueDateNepali: article.issueDateNepali,
        carigar: article.carigar ? {
          codeName: article.carigar.codeName,
          phone: article.carigar.phone
        } : undefined,
        articleInvoiceCalculations
      };
    });

    // Calculate subtotal
    const totalNetWeight = articles.reduce((sum: number, article: any) => sum + article.netWeight, 0);
    const totalGrossWeight = articles.reduce((sum: number, article: any) => sum + article.grossWeight, 0);
    const totalMakingCharge = articles.reduce((sum: number, article: any) => sum + article.makingCharge, 0);
    const totalAddOnCost = articles.reduce((sum: number, article: any) => sum + article.addOnCost, 0);
    const totalDiscount = articles.reduce((sum: number, article: any) => sum + article.discount, 0);

    // Calculate subtotal before discount (sum of all article amounts)
    const subtotalBeforeDiscount = articles.reduce((sum: number, article: any) => 
      sum + article.articleInvoiceCalculations.totalAmountForWeightWithWastageStoneCostAndMakingCharge, 0
    );

    // Calculate consolidated invoice calculations
    const consolidatedCalculations = GoldCalculator.calcConsolidatedInvoiceCalculations(
      subtotalBeforeDiscount,
      totalDiscount,
      basketData.extraDiscount,
      basketData.oldGoldItemCost
    );

    return {
      basketInfo: {
        basketNumber: basketData.basketNumber,
        billingDate: basketData.billingDate.toISOString(),
        billingDateNepali: basketData.billingDateNepali,
        billedGoldRate24KPerTola: basketData.billedGoldRate24KPerTola,
        isGoldRateFixed: basketData.isGoldRateFixed,
        fixedGoldRate24KPerTola: basketData.fixedGoldRate24KPerTola,
        fixedGoldRateNepaliDate: basketData.fixedGoldRateNepaliDate,
        oldGoldItemCost: basketData.oldGoldItemCost,
        extraDiscount: basketData.extraDiscount
      },
      customerInfo: {
        id: basketData.customer.id,
        firstName: basketData.customer.firstName,
        lastName: basketData.customer.lastName,
        phone: basketData.customer.phone,
        email: basketData.customer.email
      },
      articles,
      calculations: {
        subtotal: {
          totalNetWeight: Math.round(totalNetWeight * 100) / 100,
          totalGrossWeight: Math.round(totalGrossWeight * 100) / 100,
          goldValueAtRate: Math.round(subtotalBeforeDiscount * 100) / 100,
          totalMakingCharge: Math.round(totalMakingCharge * 100) / 100,
          totalAddOnCost: Math.round(totalAddOnCost * 100) / 100,
          subtotalBeforeDiscount: Math.round(subtotalBeforeDiscount * 100) / 100
        },
        adjustments: {
          totalDiscount: Math.round(totalDiscount * 100) / 100,
          oldGoldItemCost: basketData.oldGoldItemCost,
          extraDiscount: basketData.extraDiscount,
          totalAdjustments: Math.round((totalDiscount + basketData.oldGoldItemCost + basketData.extraDiscount) * 100) / 100
        },
        consolidatedInvoiceCalculations: consolidatedCalculations
      },
      metadata: {
        createdBy: createdByUsername,
        invoiceVersion: '1.0',
        currency: 'NPR',
        rateUnit: 'per tola'
      }
    };
  }

  /**
   * Create a new invoice for a billed basket
   * @param basketId - Basket ID
   * @param createdByUsername - Username of the user creating the invoice
   * @returns Created invoice
   */
  static async createInvoice(basketId: string, createdByUsername: string) {
    // Check if invoice already exists
    const invoiceExists = await this.invoiceExistsForBasket(basketId);
    if (invoiceExists) {
      throw new Error('Invoice already exists for this basket');
    }

    // Get complete basket data
    const basketData = await prisma.customerBasket.findUnique({
      where: { id: basketId },
      include: {
        customer: true,
        articles: {
          include: {
            article: {
              include: {
                carigar: true
              }
            }
          }
        }
      }
    });

    if (!basketData) {
      throw new Error('Basket not found');
    }

    if (!basketData.isBilled) {
      throw new Error('Cannot create invoice for non-billed basket');
    }

    // Generate invoice number
    const invoiceNumber = await this.getNextInvoiceNumber();

    // Create invoice snapshot
    const invoiceSnapshot = this.createInvoiceSnapshot(basketData, createdByUsername);

    // Create invoice record
    return await prisma.customerInvoice.create({
      data: {
        basketId,
        invoiceNumber,
        invoiceSnapshot: invoiceSnapshot as any
      },
      include: {
        basket: {
          include: {
            customer: true
          }
        }
      }
    });
  }

  /**
   * Get invoice by basket ID
   * @param basketId - Basket ID
   * @returns Invoice or null if not found
   */
  static async getInvoiceByBasketId(basketId: string) {
    return await prisma.customerInvoice.findUnique({
      where: { basketId },
      include: {
        basket: {
          include: {
            customer: true
          }
        }
      }
    });
  }

  /**
   * Get invoice by invoice number
   * @param invoiceNumber - Invoice number
   * @returns Invoice or null if not found
   */
  static async getInvoiceByNumber(invoiceNumber: string) {
    return await prisma.customerInvoice.findUnique({
      where: { invoiceNumber },
      include: {
        basket: {
          include: {
            customer: true
          }
        }
      }
    });
  }
}