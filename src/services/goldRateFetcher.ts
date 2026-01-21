import axios from 'axios';
import { JSDOM } from 'jsdom';
import { redisClient } from '../index';
import { RateAtDate, RateAtDateWithCache } from '../types/gold';
import { NepaliDateHelper, NepaliDateObject } from '../utils/nepaliDateHelper';
import { GoldCalculator } from '../utils/goldCalculator';
import { logger } from '../utils/logger';

export class GoldRateFetcher {
  private static readonly WEBSITE_URL = 'https://fenegosida.org/';
  private static readonly CACHE_TTL = 86400; // 24 hours in seconds

  /**
   * Get current gold rate, either from cache or by fetching from website
   */
  static async getCurrentGoldRate(): Promise<RateAtDateWithCache | null> {
    try {
      const currentNepaliDate = NepaliDateHelper.getTodayNepaliDate();
      const cacheKey = NepaliDateHelper.generateCacheKey(currentNepaliDate);

      // Try to get from Redis cache first
      const cachedRate = await this.getCachedRate(cacheKey);
      
      if (cachedRate && NepaliDateHelper.datesAreEqual(cachedRate.date, currentNepaliDate)) {
        logger.info('Gold rate retrieved from cache');
        return {
          rate: cachedRate.rate,
          date: cachedRate.date,
          fromCache: true
        };
      }

      // If not in cache or date doesn't match, fetch from website
      logger.info('Fetching gold rate from website');
      const fetchedRate = await this.fetchAndCacheGoldRate();
      
      if (fetchedRate) {
        return {
          rate: fetchedRate.rate,
          date: fetchedRate.date,
          fromCache: false
        };
      }
      
      return null;
    } catch (error) {
      logger.error('Error getting current gold rate:', error);
      return null;
    }
  }

  /**
   * Get cached rate from Redis
   */
  private static async getCachedRate(cacheKey: string): Promise<RateAtDate | null> {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as RateAtDate;
      }
      return null;
    } catch (error) {
      logger.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Fetch gold rate from website and cache it
   */
  private static async fetchAndCacheGoldRate(): Promise<RateAtDate | null> {
    try {
      const html = await this.fetchHtml(this.WEBSITE_URL);
      if (!html) {
        logger.error('Failed to fetch HTML from website');
        return null;
      }

      const rateAtDate = this.extractFineGoldPerTola(html);
      if (!rateAtDate) {
        logger.error('Failed to extract gold rate from HTML');
        return null;
      }

      // Cache the result
      const cacheKey = NepaliDateHelper.generateCacheKey(rateAtDate.date);
      await this.cacheRate(cacheKey, rateAtDate);
      
      logger.info(`Gold rate cached for ${NepaliDateHelper.formatNepaliDate(rateAtDate.date)}: Rs. ${rateAtDate.rate}`);
      
      return rateAtDate;
    } catch (error) {
      logger.error('Error fetching and caching gold rate:', error);
      return null;
    }
  }

  /**
   * Cache rate in Redis
   */
  private static async cacheRate(cacheKey: string, rateAtDate: RateAtDate): Promise<void> {
    try {
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(rateAtDate));
    } catch (error) {
      logger.error('Error caching rate:', error);
    }
  }

  /**
   * Fetch HTML content from URL
   */
  private static async fetchHtml(url: string): Promise<string | null> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.status === 200) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      logger.error('Error fetching HTML:', error);
      return null;
    }
  }

  /**
   * Extract fine gold rate per tola from HTML content
   */
  private static extractFineGoldPerTola(html: string): RateAtDate | null {
    try {
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Look for paragraphs containing "FINE GOLD (9999)" and "PER 1 TOLA"
      const paragraphs = Array.from(document.querySelectorAll('p'));
      
      for (const p of paragraphs) {
        const text = p.textContent?.toUpperCase() || '';
        if (text.includes('FINE GOLD (9999)') && text.includes('PER 1 TOLA')) {
          const rate = this.parseBoldNumber(p);
          if (rate !== null) {
            const rateDate = this.extractRateDate(document);
            if (rateDate) {
              return {
                rate: rate,
                date: rateDate
              };
            }
          }
        }
      }

      // Alternative approach - look for elements containing "FINE GOLD (9999)"
      const allElements = Array.from(document.querySelectorAll('*'));
      const labelElements = allElements.filter(el => 
        el.textContent?.toUpperCase().includes('FINE GOLD (9999)')
      );

      for (const el of labelElements) {
        const nearby = this.getNearbyElements(el as Element);
        
        for (const candidate of nearby) {
          const text = candidate.textContent?.toUpperCase() || '';
          if (text.includes('PER 1 TOLA')) {
            const rate = this.parseBoldNumber(candidate);
            if (rate !== null) {
              const rateDate = this.extractRateDate(document);
              if (rateDate) {
                return {
                  rate: rate,
                  date: rateDate
                };
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      logger.error('Error extracting gold rate:', error);
      return null;
    }
  }

  /**
   * Get nearby elements for searching
   */
  private static getNearbyElements(element: Element): Element[] {
    const nearby: Element[] = [];
    
    // Get next siblings
    let nextSibling = element.nextElementSibling;
    for (let i = 0; i < 5 && nextSibling; i++) {
      nearby.push(nextSibling);
      nextSibling = nextSibling.nextElementSibling;
    }

    // Get parent's children
    if (element.parentElement) {
      nearby.push(...Array.from(element.parentElement.children));
    }

    return nearby;
  }

  /**
   * Parse bold number from element
   */
  private static parseBoldNumber(element: Element): number | null {
    const boldElements = element.querySelectorAll('b');
    
    for (const bold of boldElements) {
      const text = bold.textContent?.trim() || '';
      const normalized = text
        .replace(/,/g, '')
        .replace(/[^0-9.]/g, '');

      if (normalized) {
        const number = parseFloat(normalized);
        if (!isNaN(number)) {
          return Math.round(number); // Convert to integer as in Kotlin code
        }
      }
    }
    
    return null;
  }

  /**
   * Extract rate date from document
   */
  private static extractRateDate(document: Document): NepaliDateObject | null {
    try {
      const dayElement = document.querySelector('div.rate-date-day');
      const monthElement = document.querySelector('div.rate-date-month');
      const yearElement = document.querySelector('div.rate-date-year');

      if (dayElement && monthElement && yearElement) {
        const day = parseInt(dayElement.textContent?.trim() || '0');
        const month = monthElement.textContent?.trim() || '';
        const year = parseInt(yearElement.textContent?.trim() || '0');

        if (day > 0 && year > 0 && month) {
          return NepaliDateHelper.getRateDate(day, month, year);
        }
      }

      return null;
    } catch (error) {
      logger.error('Error extracting rate date:', error);
      return null;
    }
  }
}