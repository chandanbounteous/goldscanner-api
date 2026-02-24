import express, { Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/auth';
import { InvoiceService } from '../services/invoiceService';
import { PDFService } from '../services/pdfService';
import axios from 'axios';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * Recursively converts BigInt values to numbers in an object
 * This is needed because JSON.stringify cannot handle BigInt values
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return Number(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        serialized[key] = serializeBigInt(obj[key]);
      }
    }
    return serialized;
  }
  
  return obj;
}

/**
 * @swagger
 * /api/v1/invoice/basket/{basketId}/pdf:
 *   get:
 *     summary: Generate PDF invoice for a basket
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: basketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket ID
 *     responses:
 *       200:
 *         description: PDF generated successfully
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/basket/:basketId/pdf',
  authenticateToken,
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Validation failed',
          body: {
            errors: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'body',
              message: error.msg
            }))
          }
        };
        res.status(400).json(response);
        return;
      }

      const basketId = req.params.basketId as string;

      console.log(`[INVOICE-PDF-DIRECT] Starting PDF generation for basketId: ${basketId}`);

      // Get invoice data
      const invoice = await InvoiceService.getInvoiceByBasketId(basketId);

      if (!invoice) {
        console.log(`[INVOICE-PDF-DIRECT] No invoice found for basketId: ${basketId}`);
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Invoice not found',
          body: {
            errors: [{
              field: 'basketId',
              message: 'No invoice found for the provided basket ID'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      console.log(`[INVOICE-PDF-DIRECT] Invoice found: ${invoice.invoiceNumber}`);

      // Get current gold rates
      let currentGoldRates = { 24: 150000, 22: 138000 }; // Default fallback rates
      
      try {
        console.log(`[INVOICE-PDF-DIRECT] Fetching gold rates`);
        const goldRateResponse = await axios.get(`${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/gold/currentrate`, {
          headers: {
            'Authorization': req.headers.authorization
          },
          timeout: 5000
        });
        
        if (goldRateResponse.data && goldRateResponse.data.body && goldRateResponse.data.body.rates) {
          currentGoldRates = {
            24: goldRateResponse.data.body.rates['24'],
            22: goldRateResponse.data.body.rates['22']
          };
          console.log(`[INVOICE-PDF-DIRECT] Gold rates fetched:`, currentGoldRates);
        }
      } catch (error) {
        console.warn(`[INVOICE-PDF-DIRECT] Gold rates fetch failed:`, error instanceof Error ? error.message : 'Unknown error');
      }

      try {
        console.log(`[INVOICE-PDF-DIRECT] Generating PDF for invoice: ${invoice.invoiceNumber}`);
        
        // Generate PDF
        const pdfBuffer = await PDFService.generateInvoicePDF(
          invoice.invoiceSnapshot as any,
          invoice.invoiceNumber,
          currentGoldRates
        );

        console.log(`[INVOICE-PDF-DIRECT] PDF generated, size: ${pdfBuffer.length} bytes`);

        // Set response headers for PDF
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
        res.setHeader('Content-Length', pdfBuffer.length);

        console.log(`[INVOICE-PDF-DIRECT] Sending PDF response`);
        // Send PDF buffer
        res.send(pdfBuffer);
      } catch (pdfError) {
        console.error(`[INVOICE-PDF-DIRECT] PDF generation failed:`, {
          invoiceNumber: invoice.invoiceNumber,
          error: pdfError instanceof Error ? {
            message: pdfError.message,
            stack: pdfError.stack
          } : pdfError
        });
        
        const response: ApiResponse = {
          responseCode: 500,
          responseMessage: 'PDF generation failed',
          body: { 
            errors: [{ 
              field: 'pdfGeneration', 
              message: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}` 
            }] 
          }
        };

        res.status(500).json(response);
      }

    } catch (error) {
      console.error('PDF generation error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to generate PDF',
        body: { 
          errors: [{ 
            field: 'server', 
            message: 'Internal server error while generating PDF' 
          }] 
        }
      };

      res.status(500).json(response);
    }
  }
);

/**
 * @swagger
 * /api/v1/invoice/basket/{basketId}:
 *   get:
 *     summary: Get invoice by basket ID (JSON) or generate PDF with ?format=pdf
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: basketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket ID
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, pdf]
 *         description: Response format (json for JSON data, pdf for PDF download)
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully or PDF generated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 200
 *                 responseMessage:
 *                   type: string
 *                   example: Invoice retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     invoice:
 *                       type: object
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/basket/:basketId',
  authenticateToken,
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Validation failed',
          body: {
            errors: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'body',
              message: error.msg
            }))
          }
        };
        res.status(400).json(response);
        return;
      }

      const basketId = req.params.basketId as string;
      const format = req.query.format as string;

      console.log(`[INVOICE-PDF] Starting invoice retrieval for basketId: ${basketId}, format: ${format}`);

      const invoice = await InvoiceService.getInvoiceByBasketId(basketId);

      if (!invoice) {
        console.log(`[INVOICE-PDF] No invoice found for basketId: ${basketId}`);
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Invoice not found',
          body: {
            errors: [{
              field: 'basketId',
              message: 'No invoice found for the provided basket ID'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      console.log(`[INVOICE-PDF] Invoice found: ${invoice.invoiceNumber}, basketNumber: ${invoice.basket.basketNumber}`);

      // If PDF format is requested, generate and return PDF
      if (format === 'pdf') {
        console.log(`[INVOICE-PDF] PDF generation requested for invoice: ${invoice.invoiceNumber}`);
        
        // Get current gold rates
        let currentGoldRates = { 24: 150000, 22: 138000 }; // Default fallback rates
        
        try {
          console.log(`[INVOICE-PDF] Fetching current gold rates from API`);
          const goldRateResponse = await axios.get(`${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/gold/currentrate`, {
            headers: {
              'Authorization': req.headers.authorization
            },
            timeout: 5000 // 5 second timeout
          });
          
          if (goldRateResponse.data && goldRateResponse.data.body && goldRateResponse.data.body.rates) {
            currentGoldRates = {
              24: goldRateResponse.data.body.rates['24'],
              22: goldRateResponse.data.body.rates['22']
            };
            console.log(`[INVOICE-PDF] Gold rates fetched successfully:`, currentGoldRates);
          } else {
            console.log(`[INVOICE-PDF] Invalid gold rate response structure, using defaults`);
          }
        } catch (error) {
          console.warn(`[INVOICE-PDF] Failed to fetch current gold rates, using defaults:`, {
            error: error instanceof Error ? error.message : 'Unknown error',
            url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/v1/gold/currentrate`
          });
        }

        try {
          console.log(`[INVOICE-PDF] Starting PDF generation for invoice: ${invoice.invoiceNumber}`);
          
          // Generate PDF
          const pdfBuffer = await PDFService.generateInvoicePDF(
            invoice.invoiceSnapshot as any,
            invoice.invoiceNumber,
            currentGoldRates
          );

          console.log(`[INVOICE-PDF] PDF generated successfully, size: ${pdfBuffer.length} bytes`);

          // Set response headers for PDF
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Invoice_${invoice.invoiceNumber}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);

          console.log(`[INVOICE-PDF] Sending PDF response for invoice: ${invoice.invoiceNumber}`);
          // Send PDF buffer
          res.send(pdfBuffer);
          return;
        } catch (pdfError) {
          console.error(`[INVOICE-PDF] Error generating PDF for invoice ${invoice.invoiceNumber}:`, {
            error: pdfError instanceof Error ? {
              message: pdfError.message,
              stack: pdfError.stack
            } : pdfError
          });
          
          const response: ApiResponse = {
            responseCode: 500,
            responseMessage: 'PDF generation failed',
            body: { 
              errors: [{ 
                field: 'pdfGeneration', 
                message: `Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}` 
              }] 
            }
          };

          res.status(500).json(response);
          return;
        }
      }

      console.log(`[INVOICE-PDF] Returning JSON response for invoice: ${invoice.invoiceNumber}`);
      // Default: return JSON response - serialize entire response to handle any BigInt values
      const invoiceData = serializeBigInt({
        id: invoice.id,
        basketId: invoice.basketId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceSnapshot: invoice.invoiceSnapshot,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        basket: {
          basketNumber: invoice.basket.basketNumber,
          customer: {
            firstName: invoice.basket.customer.firstName,
            lastName: invoice.basket.customer.lastName,
            phone: invoice.basket.customer.phone,
            email: invoice.basket.customer.email
          }
        }
      });
      
      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Invoice retrieved successfully',
        body: {
          invoice: invoiceData
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Invoice retrieval/PDF generation error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to retrieve invoice or generate PDF',
        body: { 
          errors: [{ 
            field: 'server', 
            message: 'Internal server error' 
          }] 
        }
      };

      res.status(500).json(response);
    }
  }
);

/**
 * @swagger
 * /api/v1/invoice/number/{invoiceNumber}:
 *   get:
 *     summary: Get invoice by invoice number
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: Invoice number (e.g., GL-0001)
 *     responses:
 *       200:
 *         description: Invoice retrieved successfully
 *       404:
 *         description: Invoice not found
 *       500:
 *         description: Internal server error
 */
router.get('/number/:invoiceNumber',
  authenticateToken,
  [
    param('invoiceNumber').matches(/^GL-\d{4}$/).withMessage('Invoice number must be in format GL-XXXX')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Validation failed',
          body: {
            errors: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'body',
              message: error.msg
            }))
          }
        };
        res.status(400).json(response);
        return;
      }

      const invoiceNumber = req.params.invoiceNumber as string;

      const invoice = await InvoiceService.getInvoiceByNumber(invoiceNumber);

      if (!invoice) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Invoice not found',
          body: {
            errors: [{
              field: 'invoiceNumber',
              message: 'No invoice found with the provided invoice number'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      const invoiceData = serializeBigInt({
        id: invoice.id,
        basketId: invoice.basketId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceSnapshot: invoice.invoiceSnapshot,
        createdAt: invoice.createdAt,
        updatedAt: invoice.updatedAt,
        basket: {
          basketNumber: invoice.basket.basketNumber,
          customer: {
            firstName: invoice.basket.customer.firstName,
            lastName: invoice.basket.customer.lastName,
            phone: invoice.basket.customer.phone,
            email: invoice.basket.customer.email
          }
        }
      });

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Invoice retrieved successfully',
        body: {
          invoice: invoiceData
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Invoice retrieval error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to retrieve invoice',
        body: { 
          errors: [{ 
            field: 'server', 
            message: 'Internal server error' 
          }] 
        }
      };

      res.status(500).json(response);
    }
  }
);

/**
 * @swagger
 * /api/v1/invoice/create/{basketId}:
 *   post:
 *     summary: Manually create an invoice for a billed basket
 *     tags: [Invoice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: basketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket ID
 *     responses:
 *       201:
 *         description: Invoice created successfully
 *       400:
 *         description: Basket is not billed or invoice already exists
 *       404:
 *         description: Basket not found
 *       500:
 *         description: Internal server error
 */
router.post('/create/:basketId',
  authenticateToken,
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Validation failed',
          body: {
            errors: errors.array().map(error => ({
              field: error.type === 'field' ? error.path : 'body',
              message: error.msg
            }))
          }
        };
        res.status(400).json(response);
        return;
      }

      const basketId = req.params.basketId as string;
      const user = (req as any).user;
      const userId = user?.userId;
      
      // Get user's full name for invoice metadata
      let createdByName = 'system';
      if (userId) {
        const userDetails = await prisma.user.findUnique({
          where: { id: userId },
          select: { firstName: true, lastName: true, username: true }
        });
        
        createdByName = userDetails 
          ? `${userDetails.firstName || ''} ${userDetails.lastName || ''}`.trim() || userDetails.username || 'system'
          : 'system';
      }

      const invoice = await InvoiceService.createInvoice(basketId, createdByName);

      const response: ApiResponse = {
        responseCode: 201,
        responseMessage: 'Invoice created successfully',
        body: {
          invoice: {
            id: invoice.id,
            basketId: invoice.basketId,
            invoiceNumber: invoice.invoiceNumber,
            createdAt: invoice.createdAt,
            basket: {
              basketNumber: invoice.basket.basketNumber,
              customer: {
                firstName: invoice.basket.customer.firstName,
                lastName: invoice.basket.customer.lastName
              }
            }
          }
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Invoice creation error:', error);
      
      let responseCode = 500;
      let message = 'Unable to create invoice';
      
      if (error instanceof Error) {
        if (error.message.includes('already exists')) {
          responseCode = 400;
          message = 'Invoice already exists for this basket';
        } else if (error.message.includes('not found')) {
          responseCode = 404;
          message = 'Basket not found';
        } else if (error.message.includes('non-billed')) {
          responseCode = 400;
          message = 'Cannot create invoice for non-billed basket';
        }
      }

      const response: ApiResponse = {
        responseCode,
        responseMessage: message,
        body: { 
          errors: [{ 
            field: 'server', 
            message: error instanceof Error ? error.message : 'Internal server error' 
          }] 
        }
      };

      res.status(responseCode).json(response);
    }
  }
);

export default router;