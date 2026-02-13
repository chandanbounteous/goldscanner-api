import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class BasketService {
  /**
   * Generate the next basket number starting from 1000
   * @returns The next available basket number
   */
  static async getNextBasketNumber(): Promise<number> {
    // Get the highest basket number
    const lastBasket = await prisma.customerBasket.findFirst({
      orderBy: {
        basketNumber: 'desc'
      },
      select: {
        basketNumber: true
      }
    });

    // If no baskets exist, start from 1000
    if (!lastBasket) {
      return 1000;
    }

    // Return next number
    return lastBasket.basketNumber + 1;
  }

  /**
   * Create a new customer basket with auto-generated basket number
   * @param customerId - Customer ID
   * @param basketData - Additional basket data
   * @returns Created basket
   */
  static async createBasket(
    customerId: string,
    basketData: {
      isGoldRateFixed?: boolean;
      fixedGoldRate24KPerTola?: number;
      fixedGoldRateNepaliDate?: any;
      oldGoldItemCost?: number;
      extraDiscount?: number;
    } = {}
  ) {
    const basketNumber = await this.getNextBasketNumber();

    return await prisma.customerBasket.create({
      data: {
        basketNumber,
        customerId,
        ...basketData
      },
      include: {
        customer: true,
        articles: {
          include: {
            article: true
          }
        }
      }
    });
  }

  /**
   * Add article to basket
   * @param basketId - Basket ID
   * @param articleId - Article ID  
   * @param articleDetails - Article details for the basket
   * @returns Created basket article detail
   */
  static async addArticleToBasket(
    basketId: string,
    articleId: string,
    articleDetails: {
      netWeight: number;
      grossWeight: number;
      addOnCost?: number;
      wastage?: number;
      makingCharge: number;
      discount?: number;
    }
  ) {
    return await prisma.customerBasketArticles.create({
      data: {
        basketId,
        articleId,
        netWeight: articleDetails.netWeight,
        grossWeight: articleDetails.grossWeight,
        addOnCost: articleDetails.addOnCost || 0,
        wastage: articleDetails.wastage || 0,
        makingCharge: articleDetails.makingCharge,
        discount: articleDetails.discount || 0
      },
      include: {
        article: {
          include: {
            carigar: true
          }
        },
        basket: {
          include: {
            customer: true
          }
        }
      }
    });
  }

  /**
   * Get basket with all details
   * @param basketId - Basket ID
   * @returns Basket with customer and articles
   */
  static async getBasketDetails(basketId: string) {
    return await prisma.customerBasket.findUnique({
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
  }

  /**
   * Update basket billing information
   * @param basketId - Basket ID
   * @param billedGoldRate24KPerTola - Gold rate used for billing
   * @param isBilled - Whether the basket is billed
   * @param billingDate - Billing date
   * @param billingDateNepali - Billing date in Nepali calendar
   * @returns Updated basket
   */
  static async updateBasketBilling(
    basketId: string,
    billedGoldRate24KPerTola?: number,
    isBilled: boolean = false,
    billingDate?: Date,
    billingDateNepali?: any
  ) {
    const updateData: any = {
      isBilled,
      billingDate,
      billingDateNepali
    };

    if (billedGoldRate24KPerTola !== undefined) {
      updateData.billedGoldRate24KPerTola = billedGoldRate24KPerTola;
    }

    return await prisma.customerBasket.update({
      where: { id: basketId },
      data: updateData,
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
  }

  /**
   * Discard a customer basket
   * @param basketId - Basket ID
   * @param discardedDate - Date when basket is discarded
   * @param discardedDateNepali - Discarded date in Nepali calendar
   * @returns Updated basket
   */
  static async discardBasket(
    basketId: string,
    discardedDate: Date = new Date(),
    discardedDateNepali?: any
  ) {
    return await prisma.customerBasket.update({
      where: { id: basketId },
      data: {
        isDiscarded: true,
        discardedDate,
        discardedDateNepali
      },
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
  }

  /**
   * Restore a discarded basket
   * @param basketId - Basket ID
   * @returns Updated basket
   */
  static async restoreBasket(basketId: string) {
    return await prisma.customerBasket.update({
      where: { id: basketId },
      data: {
        isDiscarded: false,
        discardedDate: null,
        discardedDateNepali: null as any
      },
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
  }

  /**
   * Get active baskets (not discarded)
   * @param customerId - Optional customer ID filter
   * @returns Active baskets
   */
  static async getActiveBaskets(customerId?: string) {
    return await prisma.customerBasket.findMany({
      where: {
        isDiscarded: false,
        ...(customerId && { customerId })
      },
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
  }

  /**
   * Get discarded baskets
   * @param customerId - Optional customer ID filter
   * @returns Discarded baskets
   */
  static async getDiscardedBaskets(customerId?: string) {
    return await prisma.customerBasket.findMany({
      where: {
        isDiscarded: true,
        ...(customerId && { customerId })
      },
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
      },
      orderBy: {
        discardedDate: 'desc'
      }
    });
  }
}