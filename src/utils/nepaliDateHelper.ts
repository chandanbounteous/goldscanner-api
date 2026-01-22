import NepaliDate from 'nepali-date-library';

export interface NepaliDateObject {
  year: number;
  month: number;
  dayOfMonth: number;
}

export class NepaliDateHelper {
  private static readonly nepaliMonths = [
    'Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin',
    'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
  ];

  /**
   * Get today's Nepali date
   */
  static getTodayNepaliDate(): NepaliDateObject {
    const today = new NepaliDate();
    return {
      year: today.getYear(),
      month: today.getMonth() + 1, // NepaliDate months are 0-indexed
      dayOfMonth: today.getDate()
    };
  }

  /**
   * Parse rate date from day, month name, and year
   */
  static getRateDate(day: number, monthName: string, year: number): NepaliDateObject {
    const monthIndex = this.nepaliMonths.findIndex(
      month => month.toLowerCase() === monthName.trim().toLowerCase()
    );
    
    if (monthIndex === -1) {
      throw new Error(`Invalid month name: ${monthName}`);
    }

    return {
      year,
      month: monthIndex + 1,
      dayOfMonth: day
    };
  }

  /**
   * Compare two Nepali dates for equality
   */
  static datesAreEqual(date1: NepaliDateObject, date2: NepaliDateObject): boolean {
    return date1.year === date2.year &&
           date1.month === date2.month &&
           date1.dayOfMonth === date2.dayOfMonth;
  }

  /**
   * Generate cache key from Nepali date
   */
  static generateCacheKey(date: NepaliDateObject): string {
    return `gold_rate:${date.year}-${date.month}-${date.dayOfMonth}`;
  }

  /**
   * Format Nepali date as string
   */
  static formatNepaliDate(date: NepaliDateObject): string {
    const monthName = this.nepaliMonths[date.month - 1];
    return `${date.dayOfMonth} ${monthName} ${date.year}`;
  }

  /**
   * Parse Nepali date string (DD/MM/YY or DD/MM/YYYY format) and convert to Gregorian Date
   */
  static parseNepaliDateString(nepaliDateStr: string): { nepaliDate: NepaliDateObject; gregorianDate: Date } {
    const parts = nepaliDateStr.trim().split('/');
    if (parts.length !== 3) {
      throw new Error(`Invalid Nepali date format: ${nepaliDateStr}. Expected DD/MM/YY or DD/MM/YYYY`);
    }

    const day = parseInt(parts[0] ?? '0');
    const month = parseInt(parts[1] ?? '0');
    let year = parseInt(parts[2] ?? '0');

    // Handle both 2-digit and 4-digit years
    if (year < 100) {
      // Convert 2-digit year to 4-digit (assuming 20xx for years 00-30, 19xx for years 31-99)
      if (year <= 30) {
        year = 2000 + year;
      } else {
        year = 1900 + year;
      }
    }
    // 4-digit years are used as-is

    const nepaliDate: NepaliDateObject = {
      year,
      month,
      dayOfMonth: day
    };

    // For now, let's use a simple approximation to convert Nepali to Gregorian
    // This is not 100% accurate but will work for seeding purposes
    // Nepali calendar is roughly 56.7 years behind Gregorian calendar
    const approximateGregorianYear = year - 57;
    const gregorianDate = new Date(approximateGregorianYear, month - 1, day);

    return {
      nepaliDate,
      gregorianDate
    };
  }
}