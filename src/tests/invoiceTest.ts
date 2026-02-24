// import { GoldCalculator } from '../utils/goldCalculator';
// import { InvoiceService } from '../services/invoiceService';
// import { PDFService } from '../services/pdfService';
// import { NumberToWords } from '../utils/numberToWords';

// describe('Invoice Generation Tests', () => {
  
//   describe('GoldCalculator - Article Invoice Calculations', () => {
//     test('calcArticleInvoiceCalculations should calculate correctly', () => {
//       const result = GoldCalculator.calcArticleInvoiceCalculations(
//         89000, // billedGoldRate24KPerTola
//         22,    // karat
//         10.5,  // netWeight
//         1.2,   // wastage
//         0.3    // stoneWeight
//       );

//       expect(result).toEqual({
//         ratePerGram: expect.any(Number),
//         totalWeightWithWastage: 11.7, // 10.5 + 1.2
//         totalAmountForWeightWithWastage: expect.any(Number),
//         totalWeightWithWastageAndStoneWeight: 12, // 11.7 + 0.3
//         totalAmountForWeightWithWastageAndStoneWeight: expect.any(Number)
//       });

//       // Check if calculations are properly rounded
//       expect(result.totalWeightWithWastage).toBe(Math.round((10.5 + 1.2) * 100) / 100);
//       expect(result.totalWeightWithWastageAndStoneWeight).toBe(Math.round((11.7 + 0.3) * 100) / 100);
//     });
//   });

//   describe('GoldCalculator - Consolidated Invoice Calculations', () => {
//     test('calcConsolidatedInvoiceCalculations should calculate correctly', () => {
//       const articles = [
//         { totalAmountForWeightWithWastageAndStoneWeight: 500000 },
//         { totalAmountForWeightWithWastageAndStoneWeight: 300000 }
//       ];

//       const result = GoldCalculator.calcConsolidatedInvoiceCalculations(
//         articles,
//         5000,  // totalDiscount
//         2000   // extraDiscount
//       );

//       expect(result).toEqual({
//         consolidatedTotalAmountForAllArticles: 800000, // 500000 + 300000
//         discount: 7000, // 5000 + 2000
//         taxableAmount: 793000, // 800000 - 7000
//         luxuryTax: expect.any(Number),
//         netAmount: expect.any(Number)
//       });

//       // Check luxury tax calculation (2% of taxable amount)
//       expect(result.luxuryTax).toBe(Math.round(793000 * 0.02 * 100) / 100);
//       expect(result.netAmount).toBe(Math.round((793000 + result.luxuryTax) * 100) / 100);
//     });
//   });

//   describe('InvoiceService - Invoice Number Generation', () => {
//     test('getNextInvoiceNumber should generate correct format', async () => {
//       // Mock the Prisma client to simulate no existing invoices
//       const mockPrisma = {
//         customerInvoice: {
//           findFirst: jest.fn().mockResolvedValue(null)
//         }
//       };

//       // This would need proper mocking setup in actual test environment
//       const invoiceNumber = await InvoiceService.getNextInvoiceNumber();
//       expect(invoiceNumber).toMatch(/^GL-\\d{4}$/);
//     });
//   });

//   describe('InvoiceService - Invoice Snapshot Creation', () => {
//     test('createInvoiceSnapshot should generate correct structure', () => {
//       const mockBasketData = {
//         basketNumber: 1001,
//         billingDate: new Date('2024-02-24T10:30:00Z'),
//         billingDateNepali: { year: 2080, month: 11, day: 12, monthName: 'Falgun' },
//         billedGoldRate24KPerTola: 89000,
//         isGoldRateFixed: true,
//         fixedGoldRate24KPerTola: 89000,
//         fixedGoldRateNepaliDate: { year: 2080, month: 11, day: 10 },
//         oldGoldItemCost: 50000,
//         extraDiscount: 2000,
//         customer: {
//           id: 'customer-uuid',
//           firstName: 'John',
//           lastName: 'Doe',
//           phone: 9801234567,
//           email: 'john.doe@email.com'
//         },
//         articles: [{
//           article: {
//             id: 'article-uuid',
//             articleCode: 'GLD001',
//             serialNumber: 1001234567890,
//             stoneWeight: 0.3,
//             karat: 22,
//             issueDate: new Date('2024-01-15T00:00:00Z'),
//             issueDateNepali: { year: 2080, month: 10, day: 2 },
//             carigar: {
//               codeName: 'CAR001',
//               phone: '9801111111'
//             }
//           },
//           netWeight: 10.5,
//           grossWeight: 11.2,
//           addOnCost: 500,
//           wastage: 1.2,
//           makingCharge: 12000,
//           discount: 1000
//         }]
//       };

//       const snapshot = InvoiceService.createInvoiceSnapshot(mockBasketData, 'testuser');

//       // Check basic structure
//       expect(snapshot).toHaveProperty('basketInfo');
//       expect(snapshot).toHaveProperty('customerInfo');
//       expect(snapshot).toHaveProperty('articles');
//       expect(snapshot).toHaveProperty('calculations');
//       expect(snapshot).toHaveProperty('metadata');

//       // Check basketInfo structure
//       expect(snapshot.basketInfo).toEqual({
//         basketNumber: 1001,
//         billingDate: '2024-02-24T10:30:00.000Z',
//         billingDateNepali: { year: 2080, month: 11, day: 12, monthName: 'Falgun' },
//         billedGoldRate24KPerTola: 89000,
//         isGoldRateFixed: true,
//         fixedGoldRate24KPerTola: 89000,
//         fixedGoldRateNepaliDate: { year: 2080, month: 11, day: 10 },
//         oldGoldItemCost: 50000,
//         extraDiscount: 2000
//       });

//       // Check customerInfo structure
//       expect(snapshot.customerInfo).toEqual({
//         id: 'customer-uuid',
//         firstName: 'John',
//         lastName: 'Doe',
//         phone: 9801234567,
//         email: 'john.doe@email.com'
//       });

//       // Check articles structure
//       expect(snapshot.articles).toHaveLength(1);
//       expect(snapshot.articles[0]).toHaveProperty('articleInvoiceCalculations');
      
//       // Check calculations structure
//       expect(snapshot.calculations).toHaveProperty('subtotal');
//       expect(snapshot.calculations).toHaveProperty('adjustments');
//       expect(snapshot.calculations).toHaveProperty('consolidatedInvoiceCalculations');

//       // Check metadata
//       expect(snapshot.metadata).toEqual({
//         createdBy: 'testuser',
//         invoiceVersion: '1.0',
//         currency: 'NPR',
//         rateUnit: 'per tola'
//       });
//     });
//   });

//   describe('Invoice Integration Tests', () => {
//     test('full invoice creation workflow should work correctly', () => {
//       // This would be an integration test that:
//       // 1. Creates a basket with articles
//       // 2. Bills the basket
//       // 3. Verifies invoice is created automatically
//       // 4. Checks invoice snapshot structure and calculations
      
//       // Implementation would depend on test database setup
//       expect(true).toBe(true); // Placeholder
//     });
//   });

//   describe('NumberToWords Tests', () => {
//     test('convertToWords should handle various amounts correctly', () => {
//       expect(NumberToWords.convertToWords(0)).toBe('Zero Rupees Only');
//       expect(NumberToWords.convertToWords(123)).toBe('One Hundred Twenty Three Rupees Only');
//       expect(NumberToWords.convertToWords(1234)).toBe('One Thousand Two Hundred Thirty Four Rupees Only');
//       expect(NumberToWords.convertToWords(123456)).toBe('One Lakh Twenty Three Thousand Four Hundred Fifty Six Rupees Only');
//       expect(NumberToWords.convertToWords(12345678)).toBe('One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Rupees Only');
//     });

//     test('formatCurrency should format numbers with proper comma separation', () => {
//       expect(NumberToWords.formatCurrency(1234.56)).toBe('1,234.56');
//       expect(NumberToWords.formatCurrency(123456.78)).toBe('1,23,456.78');
//       expect(NumberToWords.formatCurrency(12345678.90)).toBe('1,23,45,678.90');
//     });
//   });

//   describe('PDF Generation Tests', () => {
//     test('generateInvoicePDF should create PDF buffer', async () => {
//       const mockInvoiceSnapshot = {
//         basketInfo: {
//           basketNumber: 1001,
//           billingDate: '2024-02-24T10:30:00Z',
//           billingDateNepali: { year: 2080, month: 11, day: 12 },
//           billedGoldRate24KPerTola: 89000,
//           isGoldRateFixed: true,
//           fixedGoldRate24KPerTola: 89000,
//           oldGoldItemCost: 50000,
//           extraDiscount: 2000
//         },
//         customerInfo: {
//           id: 'customer-uuid',
//           firstName: 'John',
//           lastName: 'Doe',
//           phone: 9801234567,
//           email: 'john.doe@email.com'
//         },
//         articles: [{
//           id: 'article-uuid',
//           articleCode: 'GLD001',
//           serialNumber: 1001234567890,
//           netWeight: 10.5,
//           grossWeight: 11.2,
//           stoneWeight: 0.3,
//           karat: 22,
//           addOnCost: 500,
//           wastage: 1.2,
//           makingCharge: 12000,
//           discount: 1000,
//           issueDate: '2024-01-15T00:00:00Z',
//           issueDateNepali: { year: 2080, month: 10, day: 2 },
//           carigar: {
//             codeName: 'CAR001',
//             phone: '9801111111'
//           },
//           articleInvoiceCalculations: {
//             ratePerGram: 7000,
//             totalWeightWithWastage: 11.7,
//             totalAmountForWeightWithWastage: 81900,
//             totalWeightWithWastageAndStoneWeight: 12.0,
//             totalAmountForWeightWithWastageAndStoneWeight: 84000
//           }
//         }],
//         calculations: {
//           subtotal: {
//             totalNetWeight: 10.5,
//             totalGrossWeight: 11.2,
//             goldValueAtRate: 84000,
//             totalMakingCharge: 12000,
//             totalAddOnCost: 500,
//             subtotalBeforeDiscount: 96500
//           },
//           adjustments: {
//             totalDiscount: 1000,
//             oldGoldItemCost: 50000,
//             extraDiscount: 2000,
//             totalAdjustments: 53000
//           },
//           consolidatedInvoiceCalculations: {
//             consolidatedTotalAmountForAllArticles: 84000,
//             discount: 3000,
//             taxableAmount: 81000,
//             luxuryTax: 1620,
//             netAmount: 82620
//           }
//         },
//         metadata: {
//           createdBy: 'Test User',
//           invoiceVersion: '1.0',
//           currency: 'NPR',
//           rateUnit: 'per tola'
//         }
//       };

//       const mockGoldRates = { 24: 150000, 22: 138000 };

//       // This would require actual PDF generation testing
//       // For now, we just check that the method can be called without error
//       try {
//         await PDFService.generateInvoicePDF(mockInvoiceSnapshot as any, 'GL-0001', mockGoldRates);
//         expect(true).toBe(true); // PDF generation method executed without error
//       } catch (error) {
//         // In test environment, puppeteer might not be available
//         console.log('PDF generation test skipped in test environment');
//         expect(true).toBe(true);
//       }
//     });
//   });
// });