/**
 * Utility class for converting numbers to words in Nepali currency format
 */
export class NumberToWords {
  private static readonly units = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'
  ];

  private static readonly teens = [
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];

  private static readonly tens = [
    '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ];

  private static readonly scales = [
    '', 'Thousand', 'Lakh', 'Crore'
  ];

  /**
   * Convert a number (0-999) to words
   */
  private static convertHundreds(num: number): string {
    let result = '';

    if (num >= 100) {
      result += this.units[Math.floor(num / 100)] + ' Hundred ';
      num %= 100;
    }

    if (num >= 10 && num < 20) {
      result += this.teens[num - 10] + ' ';
    } else {
      if (num >= 20) {
        result += this.tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num > 0) {
        result += this.units[num] + ' ';
      }
    }

    return result.trim();
  }

  /**
   * Convert number to words in Nepali currency format
   * @param amount - Amount to convert
   * @returns Number in words with "Rupees Only" suffix
   */
  static convertToWords(amount: number): string {
    if (amount === 0) {
      return 'Zero Rupees Only';
    }

    // Handle negative numbers
    if (amount < 0) {
      return 'Negative ' + this.convertToWords(-amount);
    }

    // Round to nearest integer for currency
    const intAmount = Math.round(amount);
    
    if (intAmount >= 10000000) { // 1 crore and above
      const crores = Math.floor(intAmount / 10000000);
      const remainder = intAmount % 10000000;
      
      let result = this.convertHundreds(crores) + ' Crore';
      
      if (remainder > 0) {
        result += ' ' + this.convertToWords(remainder).replace(' Rupees Only', '');
      }
      
      return result + ' Rupees Only';
    }

    if (intAmount >= 100000) { // 1 lakh and above
      const lakhs = Math.floor(intAmount / 100000);
      const remainder = intAmount % 100000;
      
      let result = this.convertHundreds(lakhs) + ' Lakh';
      
      if (remainder > 0) {
        result += ' ' + this.convertToWords(remainder).replace(' Rupees Only', '');
      }
      
      return result + ' Rupees Only';
    }

    if (intAmount >= 1000) { // 1 thousand and above
      const thousands = Math.floor(intAmount / 1000);
      const remainder = intAmount % 1000;
      
      let result = this.convertHundreds(thousands) + ' Thousand';
      
      if (remainder > 0) {
        result += ' ' + this.convertHundreds(remainder);
      }
      
      return result + ' Rupees Only';
    }

    return this.convertHundreds(intAmount) + ' Rupees Only';
  }

  /**
   * Format number with commas for display
   */
  static formatCurrency(amount: number): string {
    return amount.toLocaleString('en-IN', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2
    });
  }
}