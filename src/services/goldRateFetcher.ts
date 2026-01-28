import axios from 'axios';
import * as cheerio from 'cheerio';
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
      logger.info(`Current Nepali Date: ${NepaliDateHelper.formatNepaliDate(currentNepaliDate)}`);
      const cacheKey = NepaliDateHelper.generateCacheKey(currentNepaliDate);
      logger.info(`Cache Key: ${cacheKey}`);

      // Try to get from Redis cache first
      const cachedRate = await this.getCachedRate(cacheKey);
      logger.info(`Cached Rate: ${JSON.stringify(cachedRate)}`);
      
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
      logger.info(`Cached data for key ${cacheKey}: ${cached}`);
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
      logger.info(`Extracted Rate At Date: ${JSON.stringify(rateAtDate)}`);
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
   * Extract fine gold rate per tola from HTML content using cheerio
   */
  private static extractFineGoldPerTola(html: string): RateAtDate | null {
    try {
      const $ = cheerio.load(html);

      // Look for paragraphs containing "FINE GOLD (9999)" and "PER 1 TOLA"
      const paragraphs = $('p');
      
      for (let i = 0; i < paragraphs.length; i++) {
        const $p = $(paragraphs[i]);
        const text = $p.text().toUpperCase();
        
        if (text.includes('FINE GOLD (9999)') && text.includes('PER 1 TOLA')) {
          const rate = this.parseBoldNumber($p);
          if (rate !== null) {
            const rateDate = this.extractRateDate($);
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
      const allElements = $('*').filter((i, el) => {
        return $(el).text().toUpperCase().includes('FINE GOLD (9999)');
      });

      for (let i = 0; i < allElements.length; i++) {
        const $el = $(allElements[i]);
        const nearby = this.getNearbyElements($, $el);
        
        for (const $candidate of nearby) {
          const text = $candidate.text().toUpperCase();
          if (text.includes('PER 1 TOLA')) {
            const rate = this.parseBoldNumber($candidate);
            if (rate !== null) {
              const rateDate = this.extractRateDate($);
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
   * Get nearby elements for searching using cheerio
   */
  private static getNearbyElements($: cheerio.CheerioAPI, $element: cheerio.Cheerio<any>): cheerio.Cheerio<any>[] {
    const nearby: cheerio.Cheerio<any>[] = [];
    
    // Get next siblings
    let $nextSibling = $element.next();
    for (let i = 0; i < 5 && $nextSibling.length > 0; i++) {
      nearby.push($nextSibling);
      $nextSibling = $nextSibling.next();
    }

    // Get parent's children
    const $parent = $element.parent();
    if ($parent.length > 0) {
      $parent.children().each((i, el) => {
        nearby.push($(el));
      });
    }

    return nearby;
  }

  /**
   * Parse bold number from element using cheerio
   */
  private static parseBoldNumber($element: cheerio.Cheerio<any>): number | null {
    const $boldElements = $element.find('b');
    
    for (let i = 0; i < $boldElements.length; i++) {
      const text = $boldElements.eq(i).text().trim();
      const normalized = text
        .replace(/,/g, '')
        .replace(/[^0-9.]/g, '');

      if (normalized) {
        const number = parseFloat(normalized);
        if (!isNaN(number)) {
          return Math.round(number); // Convert to integer as in original code
        }
      }
    }
    
    return null;
  }

  /**
   * Extract rate date from document using cheerio
   */
  private static extractRateDate($: cheerio.CheerioAPI): NepaliDateObject | null {
    try {
      const $dayElement = $('div.rate-date-day');
      const $monthElement = $('div.rate-date-month');
      const $yearElement = $('div.rate-date-year');

      if ($dayElement.length > 0 && $monthElement.length > 0 && $yearElement.length > 0) {
        const day = parseInt($dayElement.text().trim() || '0');
        const month = $monthElement.text().trim() || '';
        const year = parseInt($yearElement.text().trim() || '0');

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