import express, { Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/auth';
import { InvoiceService } from '../services/invoiceService';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/invoice/basket/{basketId}:
 *   get:
 *     summary: Get invoice by basket ID
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
 *         description: Invoice retrieved successfully
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

      const invoice = await InvoiceService.getInvoiceByBasketId(basketId);

      if (!invoice) {
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

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Invoice retrieved successfully',
        body: {
          invoice: {
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
          }
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

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Invoice retrieved successfully',
        body: {
          invoice: {
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
          }
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