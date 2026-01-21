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
}