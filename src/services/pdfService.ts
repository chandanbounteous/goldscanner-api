import puppeteer from 'puppeteer';
import { InvoiceSnapshot } from './invoiceService';
import { NumberToWords } from '../utils/numberToWords';
import { NepaliDateHelper } from '../utils/nepaliDateHelper';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs';

export interface GoldRates {
  24: number;
  22: number;
}

// PDF generation logging flags
const PDF_DEBUG = process.env.PDF_DEBUG === 'true' || process.env.NODE_ENV === 'development';

const logPDF = (message: string, data?: any) => {
  if (PDF_DEBUG) {
    logger.info(`[PDF-GEN] ${message}`, data);
  }
};

const logPDFError = (message: string, error?: any) => {
  logger.error(`[PDF-GEN-ERROR] ${message}`, error);
};

export class PDFService {
  /**
   * Generate PDF buffer from invoice snapshot
   * @param invoiceSnapshot - Complete invoice data
   * @param invoiceNumber - Invoice number
   * @param currentGoldRates - Current gold rates for display
   * @returns PDF buffer
   */
  static async generateInvoicePDF(
    invoiceSnapshot: InvoiceSnapshot,
    invoiceNumber: string,
    currentGoldRates: GoldRates
  ): Promise<Buffer> {
    const startTime = Date.now();
    logPDF(`Starting PDF generation for invoice: ${invoiceNumber}`);
    
    let browser;
    try {
      logPDF('Launching puppeteer browser');
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      logPDF('Browser launched successfully');

      const page = await browser.newPage();
      logPDF('New page created');
      
      // Generate HTML content
      logPDF('Generating HTML content');
      const htmlContent = this.generateHTMLContent(invoiceSnapshot, invoiceNumber, currentGoldRates);
      logPDF(`HTML content generated, length: ${htmlContent.length} characters`);
      
      // Set content
      logPDF('Setting page content');
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      logPDF('Page content set successfully');
      
      // Generate PDF
      logPDF('Generating PDF buffer');
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      });
      
      const endTime = Date.now();
      logPDF(`PDF generated successfully in ${endTime - startTime}ms, size: ${pdfBuffer.length} bytes`);

      return Buffer.from(pdfBuffer);
    } catch (error) {
      logPDFError('Error during PDF generation', {
        invoiceNumber,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      throw error;
    } finally {
      if (browser) {
        try {
          logPDF('Closing browser');
          await browser.close();
          logPDF('Browser closed successfully');
        } catch (closeError) {
          logPDFError('Error closing browser', closeError);
        }
      }
    }
  }

  /**
   * Generate HTML content for the invoice
   */
  private static generateHTMLContent(
    snapshot: InvoiceSnapshot,
    invoiceNumber: string,
    goldRates: GoldRates
  ): string {
    logPDF('Starting HTML content generation', {
      invoiceNumber,
      articlesCount: snapshot.articles?.length || 0,
      customerName: `${snapshot.customerInfo.firstName} ${snapshot.customerInfo.lastName || ''}`.trim(),
      goldRates
    });

    try {
      const currentNepaliDate = NepaliDateHelper.getTodayNepaliDate();
      logPDF('Current Nepali date obtained', currentNepaliDate);
      
      const currentNepaliDateString = `${currentNepaliDate.year}-${String(currentNepaliDate.month).padStart(2, '0')}-${String(currentNepaliDate.dayOfMonth).padStart(2, '0')}`;
      
      const billingDateString = `${snapshot.basketInfo.billingDateNepali.year}-${String(snapshot.basketInfo.billingDateNepali.month).padStart(2, '0')}-${String(snapshot.basketInfo.billingDateNepali.day).padStart(2, '0')}`;
      logPDF('Date strings formatted', { currentNepaliDateString, billingDateString });
      
      const customerFullName = `${snapshot.customerInfo.firstName} ${snapshot.customerInfo.lastName || ''}`.trim();
      
      const netAmountInWords = NumberToWords.convertToWords(snapshot.calculations.consolidatedInvoiceCalculations.netAmount);
      logPDF('Net amount converted to words', { 
        netAmount: snapshot.calculations.consolidatedInvoiceCalculations.netAmount,
        netAmountInWords
      });

      logPDF('HTML template generation completed successfully');
      
      return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice ${invoiceNumber}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          font-size: 12px;
          margin: 0;
          padding: 20px;
          line-height: 1.4;
        }
        
        .header {
          display: flex;
          align-items: flex-start;
          margin-bottom: 20px;
        }
        
        .logo-section {
          width: 120px;
          text-align: center;
        }
        
        .company-logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 10px auto;
          display: block;
        }
        
        .purity-box {
          border: 2px solid #000;
          padding: 5px;
          font-weight: bold;
          font-size: 10px;
        }
        
        .company-info {
          flex: 1;
          text-align: center;
          padding-left: 20px;
        }
        
        .company-name {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .company-tagline {
          font-size: 14px;
          margin-bottom: 3px;
        }
        
        .company-address {
          font-size: 12px;
          margin-bottom: 2px;
        }
        
        .invoice-title {
          text-align: center;
          font-size: 24px;
          font-weight: bold;
          margin: 20px 0;
        }
        
        .invoice-details {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .invoice-left {
          width: 48%;
        }
        
        .invoice-right {
          width: 48%;
        }
        
        .detail-row {
          margin-bottom: 5px;
        }
        
        .detail-label {
          font-weight: bold;
          display: inline-block;
          width: 120px;
        }
        
        .articles-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 10px;
        }
        
        .articles-table th,
        .articles-table td {
          border: 1px solid #000;
          padding: 4px;
          text-align: center;
        }
        
        .articles-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }
        
        .articles-table .text-left {
          text-align: left;
        }
        
        .articles-table .text-right {
          text-align: right;
        }
        
        .summary-section {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
        }
        
        .summary-left {
          width: 60%;
        }
        
        .summary-right {
          width: 35%;
        }
        
        .summary-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          padding: 2px 0;
        }
        
        .summary-row.border-top {
          border-top: 1px solid #000;
          padding-top: 5px;
        }
        
        .summary-label {
          font-weight: bold;
        }
        
        .summary-value {
          font-weight: bold;
        }
        
        .words-section {
          margin: 20px 0;
          font-weight: bold;
        }
        
        .footer-section {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        
        .sales-by {
          font-weight: bold;
        }
        
        .print-date {
          font-size: 10px;
        }
        
        .signature-section {
          text-align: center;
          margin-top: 40px;
        }
      </style>
    </head>
    <body>
      <!-- Header Section -->
      <div class="header">
        <div class="logo-section">
          <svg class="company-logo" xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 1008 1041">
            <g>
              <path d="M 592.05 893.97 C533.63,898.44 471.28,888.38 418.31,865.94 C340.37,832.91 267.96,764.68 229.52,688.04 C203.61,636.38 191.72,583.86 191.69,521.00 C191.68,489.02 193.34,471.35 199.13,442.04 C213.09,371.33 248.72,307.48 304.64,252.99 C335.86,222.55 363.30,202.88 400.00,184.62 C444.45,162.51 489.62,151.06 544.50,148.00 C646.63,142.31 740.68,175.34 815.38,243.13 L 820.26 247.56 L 803.88 262.45 C794.87,270.63 786.50,278.22 785.28,279.31 L 783.06 281.29 L 778.42 277.40 C745.76,250.01 717.49,232.65 684.50,219.71 C658.06,209.33 637.45,204.23 604.00,199.78 C589.25,197.82 537.64,198.16 522.11,200.33 C481.94,205.93 451.43,215.19 419.50,231.47 C394.07,244.44 372.85,259.18 349.48,280.10 C300.69,323.77 266.75,378.76 251.57,438.73 C244.98,464.77 242.21,489.21 242.24,521.00 C242.28,567.49 248.42,601.61 263.73,640.50 C279.92,681.63 302.65,715.58 337.02,749.98 C387.92,800.92 449.61,832.32 516.76,841.48 C583.05,850.51 644.66,841.74 702.50,815.02 C719.25,807.28 746.36,790.64 760.25,779.56 L 766.00 774.97 L 766.00 553.00 L 815.00 553.00 L 815.00 793.73 L 807.11 801.27 C781.67,825.58 742.24,851.61 709.50,865.73 C672.41,881.72 635.19,890.67 592.05,893.97 ZM 621.88 590.89 C605.36,594.67 580.87,594.07 524.50,588.50 C515.61,587.62 480.96,585.06 463.50,583.98 C432.13,582.05 389.26,583.11 360.25,586.52 L 354.00 587.26 L 354.67 583.88 C355.04,582.02 355.85,578.50 356.47,576.05 L 357.60 571.61 L 365.05 569.98 C385.67,565.47 396.36,560.67 403.70,552.64 C413.77,541.62 421.24,522.88 431.45,483.00 L 436.70 462.50 L 441.69 462.83 C448.85,463.30 454.06,461.58 459.25,457.02 C464.48,452.41 467.20,446.52 467.22,439.80 C467.23,434.88 464.75,428.94 457.26,416.00 C453.82,410.05 453.50,408.86 453.50,401.95 C453.50,395.25 453.92,393.56 457.20,386.95 C459.24,382.85 463.05,377.06 465.67,374.09 C471.61,367.35 483.05,358.19 491.29,353.58 C498.07,349.79 510.96,344.63 511.73,345.40 C511.99,345.66 511.05,349.39 509.65,353.69 C505.27,367.06 500.19,385.33 491.90,417.50 C467.42,512.51 458.01,539.99 443.72,558.30 C442.09,560.38 440.98,562.31 441.25,562.58 C441.52,562.85 443.76,562.61 446.23,562.06 C465.40,557.77 481.46,555.80 501.50,555.29 C527.14,554.64 533.59,555.47 575.00,564.70 C617.78,574.23 627.35,574.36 637.79,565.53 C645.94,558.64 647.01,549.78 641.50,534.57 C634.58,515.45 638.48,504.37 652.55,503.20 C659.65,502.62 664.31,504.37 668.45,509.21 C673.52,515.13 675.47,521.73 675.36,532.50 C675.21,547.29 669.59,560.19 658.45,571.33 C648.09,581.69 637.61,587.30 621.88,590.89 ZM 551.06 548.75 C550.69,550.14 550.50,551.13 549.93,551.80 C548.50,553.45 544.64,553.01 529.41,551.27 C528.48,551.17 527.51,551.05 526.50,550.94 C517.70,549.94 509.66,549.09 508.63,549.06 C507.34,549.02 506.92,548.46 507.27,547.25 C507.54,546.29 511.24,534.25 515.47,520.50 C525.18,488.97 569.12,335.79 568.60,335.27 C567.76,334.43 540.05,334.99 533.05,335.99 C504.78,340.01 483.20,350.46 465.25,368.80 C459.90,374.26 456.87,378.47 453.75,384.78 C449.75,392.85 449.50,393.84 449.51,401.92 C449.51,411.08 450.50,413.84 458.03,425.71 C464.92,436.57 465.04,444.63 458.42,451.95 C450.46,460.76 440.47,461.34 431.20,453.52 C424.67,448.01 421.00,437.08 421.00,423.13 C421.00,381.43 452.48,343.35 501.17,326.17 C521.26,319.08 539.17,317.03 587.25,316.29 C608.01,315.98 625.00,316.03 625.00,316.41 C625.00,316.79 624.31,318.43 623.47,320.06 C617.62,331.38 599.83,381.11 589.51,415.00 C585.62,427.80 554.02,537.71 551.06,548.75 ZM 410.50 737.96 C384.30,740.93 362.09,734.91 346.17,720.53 C334.06,709.59 330.82,694.31 338.65,685.01 C342.26,680.71 346.06,679.00 351.99,679.00 C359.34,679.00 363.57,681.59 376.98,694.32 C394.68,711.10 405.08,716.45 420.03,716.45 C429.25,716.45 436.16,713.45 444.49,705.84 C457.82,693.65 465.48,676.72 485.59,615.00 C489.80,602.08 493.53,591.18 493.88,590.79 C494.54,590.06 536.60,593.27 537.45,594.12 C537.71,594.38 536.64,598.85 535.07,604.05 C515.55,668.66 487.44,707.42 445.50,727.56 C432.78,733.67 423.16,736.53 410.50,737.96 ZM 500.00 322.24 C495.33,323.88 488.01,326.98 483.75,329.13 C479.49,331.27 476.00,332.56 476.00,331.99 C476.00,330.48 482.16,318.48 488.04,308.52 C518.83,256.40 572.24,225.89 617.66,234.48 C642.42,239.16 661.70,259.41 655.94,274.68 C654.32,278.98 649.01,283.92 644.79,285.06 C637.51,287.02 630.97,283.80 615.50,270.66 C610.55,266.45 603.35,261.32 599.50,259.25 C592.81,255.67 592.07,255.50 583.00,255.50 C574.49,255.51 572.93,255.81 568.00,258.38 C561.08,261.98 547.21,275.93 540.52,285.99 C537.79,290.11 532.93,298.53 529.73,304.69 C526.54,310.85 523.15,316.11 522.21,316.38 C521.27,316.64 517.80,317.40 514.50,318.05 C511.20,318.70 504.67,320.59 500.00,322.24 Z" fill="rgb(0,0,0)"/>
              <path d="M 0.00 520.50 L 0.00 0.00 L 504.00 0.00 L 1008.00 0.00 L 1008.00 520.50 L 1008.00 1041.00 L 504.00 1041.00 L 0.00 1041.00 L 0.00 520.50 ZM 592.05 893.97 C635.19,890.67 672.41,881.72 709.50,865.73 C742.24,851.61 781.67,825.58 807.11,801.27 L 815.00 793.73 L 815.00 673.37 L 815.00 553.00 L 790.50 553.00 L 766.00 553.00 L 766.00 663.99 L 766.00 774.97 L 760.25 779.56 C746.36,790.64 719.25,807.28 702.50,815.02 C644.66,841.74 583.05,850.51 516.76,841.48 C449.61,832.32 387.92,800.92 337.02,749.98 C302.65,715.58 279.92,681.63 263.73,640.50 C248.42,601.61 242.28,567.49 242.24,521.00 C242.21,489.21 244.98,464.77 251.57,438.73 C266.75,378.76 300.69,323.77 349.48,280.10 C372.85,259.18 394.07,244.44 419.50,231.47 C451.43,215.19 481.94,205.93 522.11,200.33 C537.64,198.16 589.25,197.82 604.00,199.78 C637.45,204.23 658.06,209.33 684.50,219.71 C717.49,232.65 745.76,250.01 778.42,277.40 L 783.06 281.29 L 785.28 279.31 C786.50,278.22 794.87,270.63 803.88,262.45 L 820.26 247.56 L 815.38 243.13 C740.68,175.34 646.63,142.31 544.50,148.00 C489.62,151.06 444.45,162.51 400.00,184.62 C363.30,202.88 335.86,222.55 304.64,252.99 C248.72,307.48 213.09,371.33 199.13,442.04 C193.34,471.35 191.68,489.02 191.69,521.00 C191.72,583.86 203.61,636.38 229.52,688.04 C267.96,764.68 340.37,832.91 418.31,865.94 C471.28,888.38 533.63,898.44 592.05,893.97 ZM 410.50 737.96 C423.16,736.53 432.78,733.67 445.50,727.56 C487.44,707.42 515.55,668.66 535.07,604.05 C536.64,598.85 537.71,594.38 537.45,594.12 C536.60,593.27 494.54,590.06 493.88,590.79 C493.53,591.18 489.80,602.08 485.59,615.00 C465.48,676.72 457.82,693.65 444.49,705.84 C436.16,713.45 429.25,716.45 420.03,716.45 C405.08,716.45 394.68,711.10 376.98,694.32 C363.57,681.59 359.34,679.00 351.99,679.00 C346.06,679.00 342.26,680.71 338.65,685.01 C330.82,694.31 334.06,709.59 346.17,720.53 C362.09,734.91 384.30,740.93 410.50,737.96 ZM 621.88 590.89 C637.61,587.30 648.09,581.69 658.45,571.33 C669.59,560.19 675.21,547.29 675.36,532.50 C675.47,521.73 673.52,515.13 668.45,509.21 C664.31,504.37 659.65,502.62 652.55,503.20 C638.48,504.37 634.58,515.45 641.50,534.57 C647.01,549.78 645.94,558.64 637.79,565.53 C627.35,574.36 617.78,574.23 575.00,564.70 C533.59,555.47 527.14,554.64 501.50,555.29 C481.46,555.80 465.40,557.77 446.23,562.06 C443.76,562.61 441.52,562.85 441.25,562.58 C440.98,562.31 442.09,560.38 443.72,558.30 C458.01,539.99 467.42,512.51 491.90,417.50 C500.19,385.33 505.27,367.06 509.65,353.69 C511.05,349.39 511.99,345.66 511.73,345.40 C510.96,344.63 498.07,349.79 491.29,353.58 C483.05,358.19 471.61,367.35 465.67,374.09 C463.05,377.06 459.24,382.85 457.20,386.95 C453.92,393.56 453.50,395.25 453.50,401.95 C453.50,408.86 453.82,410.05 457.26,416.00 C464.75,428.94 467.23,434.88 467.22,439.80 C467.20,446.52 464.48,452.41 459.25,457.02 C454.06,461.58 448.85,463.30 441.69,462.83 L 436.70 462.50 L 431.45 483.00 C421.24,522.88 413.77,541.62 403.70,552.64 C396.36,560.67 385.67,565.47 365.05,569.98 L 357.60 571.61 L 356.47 576.05 C355.85,578.50 355.04,582.02 354.67,583.88 L 354.00 587.26 L 360.25 586.52 C389.26,583.11 432.13,582.05 463.50,583.98 C480.96,585.06 515.61,587.62 524.50,588.50 C580.87,594.07 605.36,594.67 621.88,590.89 ZM 551.06 548.75 C554.02,537.71 585.62,427.80 589.51,415.00 C599.83,381.11 617.62,331.38 623.47,320.06 C624.31,318.43 625.00,316.79 625.00,316.41 C625.00,316.03 608.01,315.98 587.25,316.29 C539.17,317.03 521.26,319.08 501.17,326.17 C452.48,343.35 421.00,381.43 421.00,423.13 C421.00,437.08 424.67,448.01 431.20,453.52 C440.47,461.34 450.46,460.76 458.42,451.95 C465.04,444.63 464.92,436.57 458.03,425.71 C450.50,413.84 449.51,411.08 449.51,401.92 C449.50,393.84 449.75,392.85 453.75,384.78 C456.87,378.47 459.90,374.26 465.25,368.80 C483.20,350.46 504.78,340.01 533.05,335.99 C540.05,334.99 567.76,334.43 568.60,335.27 C569.12,335.79 525.18,488.97 515.47,520.50 C511.24,534.25 507.54,546.29 507.27,547.25 C506.92,548.46 507.34,549.02 508.63,549.06 C509.66,549.09 517.70,549.94 526.50,550.94 C550.82,553.71 549.71,553.81 551.06,548.75 ZM 500.00 322.24 C504.67,320.59 511.20,318.70 514.50,318.05 C517.80,317.40 521.27,316.64 522.21,316.38 C523.15,316.11 526.54,310.85 529.73,304.69 C532.93,298.53 537.79,290.11 540.52,285.99 C547.21,275.93 561.08,261.98 568.00,258.38 C572.93,255.81 574.49,255.51 583.00,255.50 C592.07,255.50 592.81,255.67 599.50,259.25 C603.35,261.32 610.55,266.45 615.50,270.66 C630.97,283.80 637.51,287.02 644.79,285.06 C649.01,283.92 654.32,278.98 655.94,274.68 C661.70,259.41 642.42,239.16 617.66,234.48 C572.24,225.89 518.83,256.40 488.04,308.52 C482.16,318.48 476.00,330.48 476.00,331.99 C476.00,332.56 479.49,331.27 483.75,329.13 C488.01,326.98 495.33,323.88 500.00,322.24 Z" fill="rgb(254,254,254)"/>
            </g>
          </svg>
          <div class="purity-box">
            100% Purity
          </div>
        </div>
        
        <div class="company-info">
          <div class="company-name">Group of Lucky Jewellers Pvt.Ltd.</div>
          <div class="company-tagline">Gold, Silver & Diamond Ornamnets</div>
          <div class="company-address">Shop No.:9, Bishal Bazar, Kathmandu, Nepal</div>
          <div class="company-address">Ph.: 01-5328062, 5342264</div>
        </div>
      </div>
      
      <!-- Invoice Title -->
      <div class="invoice-title">INVOICE</div>
      
      <!-- Invoice Details -->
      <div class="invoice-details">
        <div class="invoice-left">
          <div class="detail-row">
            <span class="detail-label">PAN No.:</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Invoice No.:</span> ${invoiceNumber}
          </div>
          <div class="detail-row">
            <span class="detail-label">M/S</span> ${customerFullName}
          </div>
          <div class="detail-row">
            <span class="detail-label">Address:</span>
          </div>
        </div>
        
        <div class="invoice-right">
          <div class="detail-row">
            <span class="detail-label">Buyer PAN No.:</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Order No.:</span> 0
          </div>
          <div class="detail-row">
            <span class="detail-label">Transaction Date.:</span> ${billingDateString}
          </div>
          <div class="detail-row">
            <span class="detail-label">Issue Date:</span> ${currentNepaliDateString}
          </div>
          <div class="detail-row">
            <span class="detail-label">Contact:</span> ${snapshot.customerInfo.phone || ''}
          </div>
        </div>
      </div>
      
      <!-- Articles Table -->
      <table class="articles-table">
        <thead>
          <tr>
            <th>SN.</th>
            <th>HS Code</th>
            <th>Particular</th>
            <th>Karat</th>
            <th>Net Weight<br>(Gram)</th>
            <th>Loss (Jarti)<br>(Gram)</th>
            <th>Total Weight<br>(Gram)</th>
            <th>Rate<br>Per Gram</th>
            <th>Amount<br>(NPR)</th>
            <th>Making Charge<br>(NPR)</th>
            <th>Gems<br>(NPR)</th>
            <th>Gross Weight<br>(Gram)</th>
            <th>Grand Total<br>(NPR)</th>
          </tr>
        </thead>
        <tbody>
          ${snapshot.articles.map((article, index) => `
            <tr>
              <td>${index + 1}</td>
              <td></td>
              <td class="text-left">${article.articleCode} - ${article.carigar?.codeName || ''}</td>
              <td>${article.karat}</td>
              <td>${NumberToWords.formatCurrency(article.netWeight)}</td>
              <td>${NumberToWords.formatCurrency(article.wastage)}</td>
              <td>${NumberToWords.formatCurrency(article.articleInvoiceCalculations.totalWeightWithWastage)}</td>
              <td class="text-right">${NumberToWords.formatCurrency(article.articleInvoiceCalculations.ratePerGram)}</td>
              <td class="text-right">${NumberToWords.formatCurrency(article.articleInvoiceCalculations.totalAmountForWeightWithWastage)}</td>
              <td class="text-right">${NumberToWords.formatCurrency(article.makingCharge)}</td>
              <td class="text-right">${NumberToWords.formatCurrency(article.stoneWeight)}</td>
              <td>${NumberToWords.formatCurrency(article.articleInvoiceCalculations.totalWeightWithWastageAndStoneWeight)}</td>
              <td class="text-right">${NumberToWords.formatCurrency(article.articleInvoiceCalculations.totalAmountForWeightWithWastageAndStoneWeight)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <!-- Summary Section -->
      <div class="summary-section">
        <div class="summary-left">
          <div><strong>1 Tola = 11.664GM</strong></div>
          <div style="margin-top: 10px;">
            <strong>Today's Rate: ${NumberToWords.formatCurrency(goldRates[24])} (24K) ${NumberToWords.formatCurrency(goldRates[22])} (22K)</strong>
          </div>
          <div class="words-section">
            <strong>In words:</strong> ${netAmountInWords}
          </div>
        </div>
        
        <div class="summary-right">
          <div class="summary-row">
            <span class="summary-label">Bill Amount:</span>
            <span class="summary-value">${NumberToWords.formatCurrency(snapshot.calculations.consolidatedInvoiceCalculations.consolidatedTotalAmountForAllArticles)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Discount:</span>
            <span class="summary-value">${NumberToWords.formatCurrency(snapshot.calculations.consolidatedInvoiceCalculations.discount)}</span>
          </div>
          <div class="summary-row border-top">
            <span class="summary-label">Taxable Amount:</span>
            <span class="summary-value">${NumberToWords.formatCurrency(snapshot.calculations.consolidatedInvoiceCalculations.taxableAmount)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Luxury Tax(2%):</span>
            <span class="summary-value">${NumberToWords.formatCurrency(snapshot.calculations.consolidatedInvoiceCalculations.luxuryTax)}</span>
          </div>
          <div class="summary-row border-top">
            <span class="summary-label">Net Amount:</span>
            <span class="summary-value">${NumberToWords.formatCurrency(snapshot.calculations.consolidatedInvoiceCalculations.netAmount)}</span>
          </div>
        </div>
      </div>
      
      <!-- Footer Section -->
      <div class="footer-section">
        <div class="sales-by">
          Sales By: ${snapshot.metadata.createdBy}
        </div>
        <div class="print-date">
          Print Date.: ${currentNepaliDateString}, ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}, ${new Date().toLocaleTimeString('en-US', { hour12: true })}
        </div>
      </div>
      
      <!-- Signature Section -->
      <div class="signature-section">
        <div style="margin-top: 60px; border-top: 1px solid #000; width: 200px; margin-left: auto; margin-right: auto; text-align: center;">
          Customer Signature
        </div>
      </div>
    </body>
    </html>
    `;
    } catch (error) {
      logPDFError('Error generating HTML content', {
        invoiceNumber,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : error
      });
      throw new Error(`Failed to generate HTML content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}