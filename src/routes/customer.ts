import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/auth';
import { BasketService } from '../services/basketService';
import { GoldRateFetcher } from '../services/goldRateFetcher';
import { NepaliDateHelper } from '../utils/nepaliDateHelper';
import NepaliDate, { BStoAD, ADtoBS } from 'nepali-date-library';
import { logger } from '../utils/logger';
import { equal } from 'node:assert';

const router = express.Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * /api/v1/customer/create:
 *   post:
 *     summary: Create a new customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *             properties:
 *               firstName:
 *                 type: string
 *                 description: Customer's first name
 *                 example: "John"
 *               lastName:
 *                 type: string
 *                 description: Customer's last name (optional)
 *                 example: "Doe"
 *               phone:
 *                 type: string
 *                 description: Customer's phone number (optional)
 *                 example: "9705002288"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Customer's email address (optional)
 *                 example: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: Customer created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 201
 *                 responseMessage:
 *                   type: string
 *                   example: Customer created successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     customer:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         phone:
 *                           type: string
 *                         email:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or customer already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 400
 *                 responseMessage:
 *                   type: string
 *                   example: Customer already exists
 *                 body:
 *                   type: object
 *                   properties:
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           field:
 *                             type: string
 *                           message:
 *                             type: string
 *       401:
 *         description: Unauthorized - Invalid or missing access token
 *       500:
 *         description: Internal server error
 */
router.post('/create',
  authenticateToken,
  [
    body('firstName').notEmpty().isString().trim().withMessage('First name is required and must be a string'),
    body('lastName').optional().isString().trim().withMessage('Last name must be a string'),
    body('phone').optional().isMobilePhone('any').withMessage('Phone must be a valid mobile number'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Email must be a valid email address')
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

      const { firstName, lastName, phone, email } = req.body;

      // Check if customer already exists when firstName, lastName, and phone are all present
      if (firstName && lastName && phone) {
        const phoneNumber = BigInt(phone.toString().replace(/\D/g, ''));
        
        const existingCustomer = await prisma.customer.findFirst({
          where: {
            AND: [
              { firstName: { equals: firstName.trim(), mode: 'insensitive' } },
              { lastName: { equals: lastName.trim(), mode: 'insensitive' } },
              { phone: phoneNumber }
            ]
          }
        });

        if (existingCustomer) {
          const response: ApiResponse = {
            responseCode: 400,
            responseMessage: 'Customer already exists',
            body: {
              errors: [{
                field: 'customer',
                message: 'A customer with the same first name, last name, and phone number already exists'
              }]
            }
          };
          res.status(400).json(response);
          return;
        }
      }

      // Create the customer
      const customerData: any = {
        firstName: firstName.trim(),
        lastName: lastName ? lastName.trim() : null,
        email: email ? email.toLowerCase() : null
      };

      // Convert phone to BigInt if provided
      if (phone) {
        customerData.phone = BigInt(phone.toString().replace(/\D/g, ''));
      }

      const newCustomer = await prisma.customer.create({
        data: customerData
      });

      // Convert BigInt to string for JSON serialization
      const serializedCustomer = {
        ...newCustomer,
        phone: newCustomer.phone ? newCustomer.phone.toString() : null
      };

      const response: ApiResponse = {
        responseCode: 201,
        responseMessage: 'Customer created successfully',
        body: {
          customer: serializedCustomer
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Customer creation error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to create customer',
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
 * /api/v1/customer/list:
 *   get:
 *     summary: Get customers with optional search
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Search term to filter customers (searches in firstName, lastName, phone, email)
 *         example: "chandan"
 *     responses:
 *       200:
 *         description: Customers retrieved successfully
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
 *                   example: Customers retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     customers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           email:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     total:
 *                       type: number
 *                       description: Total number of customers found
 *       401:
 *         description: Unauthorized - Invalid or missing access token
 *       500:
 *         description: Internal server error
 */
router.get('/list',
  authenticateToken,
  [
    query('query').optional().isString().trim().withMessage('Query must be a string')
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
              field: error.type === 'field' ? error.path : 'query',
              message: error.msg
            }))
          }
        };
        res.status(400).json(response);
        return;
      }

      const searchQuery = (req.query.query as string) || '';

      let customers;
      
      if (searchQuery.trim()) {
        // Search in firstName, lastName, phone, and email fields
        const searchTerm = searchQuery.trim();
        
        // Try to parse search term as number for phone search
        let phoneSearchTerm: bigint | null = null;
        if (/^\d+$/.test(searchTerm)) {
          try {
            phoneSearchTerm = BigInt(searchTerm);
          } catch (e) {
            // Ignore if can't convert to BigInt
          }
        }

        customers = await prisma.customer.findMany({
          where: {
            OR: [
              {
                firstName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                lastName: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              {
                email: {
                  contains: searchTerm,
                  mode: 'insensitive'
                }
              },
              ...(phoneSearchTerm ? [{
                phone: {
                  equals: phoneSearchTerm
                }
              }] : [])
            ]
          },
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });
      } else {
        // Get all customers
        customers = await prisma.customer.findMany({
          orderBy: [
            { firstName: 'asc' },
            { lastName: 'asc' }
          ]
        });
      }

      // Convert BigInt to string for JSON serialization
      const serializedCustomers = customers.map(customer => ({
        ...customer,
        phone: customer.phone ? customer.phone.toString() : null
      }));

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Customers retrieved successfully',
        body: {
          customers: serializedCustomers,
          total: serializedCustomers.length
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Customer retrieval error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to retrieve customers',
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
 * /api/v1/customer/{customerId}/basket:
 *   post:
 *     summary: Create a new basket for a customer
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Customer ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isGoldRateFixed:
 *                 type: boolean
 *                 description: Whether gold rate is fixed for this basket
 *                 example: true
 *               fixedGoldRate24KPerTola:
 *                 type: number
 *                 format: float
 *                 description: Fixed gold rate per tola (required if isGoldRateFixed is true)
 *                 example: 95000
 *               fixedGoldRateNepaliDate:
 *                 type: object
 *                 description: Nepali date when rate was fixed (required if isGoldRateFixed is true)
 *                 properties:
 *                   year:
 *                     type: number
 *                   month:
 *                     type: number
 *                   dayOfMonth:
 *                     type: number
 *                 example: {"year": 2081, "month": 10, "dayOfMonth": 15}
 *     responses:
 *       201:
 *         description: Basket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 201
 *                 responseMessage:
 *                   type: string
 *                   example: Basket created successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     basket:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         basketNumber:
 *                           type: number
 *                         customerId:
 *                           type: string
 *                         isGoldRateFixed:
 *                           type: boolean
 *                         fixedGoldRate24KPerTola:
 *                           type: number
 *                         fixedGoldRateNepaliDate:
 *                           type: object
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or open basket exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 400
 *                 responseMessage:
 *                   type: string
 *                   example: Customer already has an open basket
 *                 body:
 *                   type: object
 *                   properties:
 *                     openBasketId:
 *                       type: string
 *                       description: ID of the existing open basket
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Customer not found
 *       500:
 *         description: Internal server error
 */
router.post('/:customerId/basket',
  authenticateToken,
  [
    param('customerId').isUUID().withMessage('Customer ID must be a valid UUID'),
    body('isGoldRateFixed').optional().isBoolean().withMessage('isGoldRateFixed must be a boolean'),
    body('fixedGoldRate24KPerTola')
      .if(body('isGoldRateFixed').equals('true'))
      .notEmpty()
      .isFloat({ min: 0 })
      .withMessage('fixedGoldRate24KPerTola is required and must be a positive number when isGoldRateFixed is true'),
    body('fixedGoldRateNepaliDate')
      .if(body('isGoldRateFixed').equals('true'))
      .notEmpty()
      .isObject()
      .withMessage('fixedGoldRateNepaliDate is required when isGoldRateFixed is true'),
    body('fixedGoldRateNepaliDate.year')
      .if(body('isGoldRateFixed').equals('true'))
      .optional()
      .isInt({ min: 1900, max: 3000 })
      .withMessage('Nepali year must be a valid integer'),
    body('fixedGoldRateNepaliDate.month')
      .if(body('isGoldRateFixed').equals('true'))
      .optional()
      .isInt({ min: 1, max: 12 })
      .withMessage('Nepali month must be between 1 and 12'),
    body('fixedGoldRateNepaliDate.dayOfMonth')
      .if(body('isGoldRateFixed').equals('true'))
      .optional()
      .isInt({ min: 1, max: 32 })
      .withMessage('Nepali day must be between 1 and 32')
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

      const customerId = req.params.customerId as string;
      const { isGoldRateFixed, fixedGoldRate24KPerTola, fixedGoldRateNepaliDate } = req.body;

      // Validate customer exists
      const customer = await prisma.customer.findUnique({
        where: { id: customerId }
      });

      if (!customer) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Customer not found',
          body: {
            errors: [{
              field: 'customerId',
              message: 'Customer with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Check for existing open basket (not billed and not discarded)
      const existingOpenBasket = await prisma.customerBasket.findFirst({
        where: {
          customerId: customerId,
          isBilled: false,
          isDiscarded: false
        }
      });

      if (existingOpenBasket) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Customer already has an open basket',
          body: {
            openBasketId: existingOpenBasket.id,
            errors: [{
              field: 'basket',
              message: `Customer already has an open basket (ID: ${existingOpenBasket.id}). Close or discard the existing basket before creating a new one.`
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Prepare basket data
      const basketData: any = {
        isGoldRateFixed: isGoldRateFixed || false
      };

      if (isGoldRateFixed && fixedGoldRate24KPerTola && fixedGoldRateNepaliDate) {
        basketData.fixedGoldRate24KPerTola = parseFloat(fixedGoldRate24KPerTola);
        basketData.fixedGoldRateNepaliDate = fixedGoldRateNepaliDate;
      }

      // Create the basket using BasketService
      const newBasket = await BasketService.createBasket(customerId, basketData);

      const response: ApiResponse = {
        responseCode: 201,
        responseMessage: 'Basket created successfully',
        body: {
          basket: {
            id: newBasket.id,
            basketNumber: newBasket.basketNumber,
            customerId: newBasket.customerId,
            isGoldRateFixed: newBasket.isGoldRateFixed,
            fixedGoldRate24KPerTola: newBasket.fixedGoldRate24KPerTola,
            fixedGoldRateNepaliDate: newBasket.fixedGoldRateNepaliDate,
            oldGoldItemCost: newBasket.oldGoldItemCost,
            extraDiscount: newBasket.extraDiscount,
            billedGoldRate24KPerTola: newBasket.billedGoldRate24KPerTola,
            isBilled: newBasket.isBilled,
            isDiscarded: newBasket.isDiscarded,
            createdAt: newBasket.createdAt,
            updatedAt: newBasket.updatedAt
          }
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Basket creation error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to create basket',
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
 * /api/v1/customer/basket/{basketId}/article:
 *   post:
 *     summary: Add an article to a customer's basket
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: basketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleId
 *               - netWeight
 *               - grossWeight
 *               - wastage
 *               - makingCharge
 *             properties:
 *               articleId:
 *                 type: string
 *                 description: Gold article ID to add to basket
 *                 example: "uuid-article-id"
 *               netWeight:
 *                 type: number
 *                 format: float
 *                 description: Net weight of the article
 *                 example: 25.50
 *               grossWeight:
 *                 type: number
 *                 format: float
 *                 description: Gross weight of the article
 *                 example: 26.20
 *               addOnCost:
 *                 type: number
 *                 format: float
 *                 description: Additional cost (optional)
 *                 example: 1000
 *                 default: 0
 *               wastage:
 *                 type: number
 *                 format: float
 *                 description: Wastage amount
 *                 example: 0.5
 *               makingCharge:
 *                 type: number
 *                 format: float
 *                 description: Making charge
 *                 example: 2000
 *               discount:
 *                 type: number
 *                 format: float
 *                 description: Discount amount (optional)
 *                 example: 500
 *                 default: 0
 *     responses:
 *       201:
 *         description: Article added to basket successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 201
 *                 responseMessage:
 *                   type: string
 *                   example: Article added to basket successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     basketArticleId:
 *                       type: string
 *                       description: ID of the newly created basket article record
 *                     basketArticle:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         basketId:
 *                           type: string
 *                         articleId:
 *                           type: string
 *                         netWeight:
 *                           type: number
 *                         grossWeight:
 *                           type: number
 *                         addOnCost:
 *                           type: number
 *                         wastage:
 *                           type: number
 *                         makingCharge:
 *                           type: number
 *                         discount:
 *                           type: number
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 400
 *                 responseMessage:
 *                   type: string
 *                   example: Validation failed
 *                 body:
 *                   type: object
 *                   properties:
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Basket or article not found
 *       500:
 *         description: Internal server error
 */
router.post('/basket/:basketId/article',
  authenticateToken,
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID'),
    body('articleId').isUUID().withMessage('Article ID must be a valid UUID'),
    body('netWeight').isFloat({ min: 0 }).withMessage('Net weight must be a positive number'),
    body('grossWeight').isFloat({ min: 0 }).withMessage('Gross weight must be a positive number'),
    body('addOnCost').optional().isFloat({ min: 0 }).withMessage('Add-on cost must be a positive number'),
    body('wastage').isFloat({ min: 0 }).withMessage('Wastage must be a positive number'),
    body('makingCharge').isFloat({ min: 0 }).withMessage('Making charge must be a positive number'),
    body('discount').optional().isFloat({ min: 0 }).withMessage('Discount must be a positive number')
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
      const { 
        articleId, 
        netWeight, 
        grossWeight, 
        addOnCost, 
        wastage, 
        makingCharge, 
        discount 
      } = req.body;

      // Validate that basket exists and is not billed/discarded
      const basket = await prisma.customerBasket.findUnique({
        where: { id: basketId }
      });

      if (!basket) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Basket not found',
          body: {
            errors: [{
              field: 'basketId',
              message: 'Basket with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      if (basket.isBilled) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot add article to billed basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot add articles to a basket that has already been billed'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      if (basket.isDiscarded) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot add article to discarded basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot add articles to a discarded basket'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Validate that article exists
      const article = await prisma.goldArticle.findUnique({
        where: { id: articleId }
      });

      if (!article) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Article not found',
          body: {
            errors: [{
              field: 'articleId',
              message: 'Gold article with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Check if article is already in this basket
      const existingBasketArticle = await prisma.customerBasketArticles.findFirst({
        where: {
          basketId: basketId,
          articleId: articleId
        }
      });

      if (existingBasketArticle) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Article already in basket',
          body: {
            errors: [{
              field: 'articleId',
              message: 'This article is already added to the basket'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Prepare article details
      const articleDetails = {
        netWeight: parseFloat(netWeight),
        grossWeight: parseFloat(grossWeight),
        addOnCost: addOnCost ? parseFloat(addOnCost) : 0,
        wastage: parseFloat(wastage),
        makingCharge: parseFloat(makingCharge),
        discount: discount ? parseFloat(discount) : 0
      };

      // Add article to basket using BasketService
      const basketArticle = await BasketService.addArticleToBasket(
        basketId,
        articleId,
        articleDetails
      );

      const response: ApiResponse = {
        responseCode: 201,
        responseMessage: 'Article added to basket successfully',
        body: {
          basketArticleId: basketArticle.id,
          basketArticle: {
            id: basketArticle.id,
            basketId: basketArticle.basketId,
            articleId: basketArticle.articleId,
            netWeight: basketArticle.netWeight,
            grossWeight: basketArticle.grossWeight,
            addOnCost: basketArticle.addOnCost,
            wastage: basketArticle.wastage,
            makingCharge: basketArticle.makingCharge,
            discount: basketArticle.discount,
            createdAt: basketArticle.createdAt,
            updatedAt: basketArticle.updatedAt
          }
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Article addition error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to add article to basket',
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
 * /api/v1/customer/basket/{basketId}:
 *   get:
 *     summary: Get complete information about a customer basket
 *     tags: [Customer]
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
 *         description: Basket information retrieved successfully
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
 *                   example: Basket information retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     basket:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         basketNumber:
 *                           type: number
 *                         customerId:
 *                           type: string
 *                         isGoldRateFixed:
 *                           type: boolean
 *                         fixedGoldRate24KPerTola:
 *                           type: number
 *                         effectiveGoldRate24KPerTola:
 *                           type: number
 *                         oldGoldItemCost:
 *                           type: number
 *                         extraDiscount:
 *                           type: number
 *                         isBilled:
 *                           type: boolean
 *                         isDiscarded:
 *                           type: boolean
 *                         billedGoldRate24KPerTola:
 *                           type: number
 *                           nullable: true
 *                           description: The gold rate at which basket was billed (only present when isBilled is true)
 *                     articles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           articleId:
 *                             type: string
 *                           articleCode:
 *                             type: string
 *                           netWeight:
 *                             type: number
 *                           grossWeight:
 *                             type: number
 *                           addOnCost:
 *                             type: number
 *                           wastage:
 *                             type: number
 *                           makingCharge:
 *                             type: number
 *                           discount:
 *                             type: number
 *                           karat:
 *                             type: number
 *                           preTaxArticleCost:
 *                             type: number
 *                           luxuryTaxAmount:
 *                             type: number
 *                           postTaxArticleCost:
 *                             type: number
 *                           finalCost:
 *                             type: number
 *                     totals:
 *                       type: object
 *                       properties:
 *                         preTaxBasketAmount:
 *                           type: number
 *                         luxuryTax:
 *                           type: number
 *                         postTaxBasketAmount:
 *                           type: number
 *                         totalAddOnCost:
 *                           type: number
 *                         totalBasketAmount:
 *                           type: number
 *       404:
 *         description: Basket not found
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

      // Step a: Get current gold rate
      const goldRateData = await GoldRateFetcher.getCurrentGoldRate();
      const currentGoldRate24KPerTola = goldRateData?.rate || 100000; // Fallback rate

      // Step b: Get basket details
      const basket = await prisma.customerBasket.findUnique({
        where: { id: basketId },
        include: {
          customer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          }
        }
      });

      if (!basket) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Basket not found',
          body: {
            errors: [{
              field: 'basketId',
              message: 'Basket with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Step c: Determine effective gold rate
      const effectiveGoldRate24KPerTola = basket.isGoldRateFixed && basket.fixedGoldRate24KPerTola
        ? basket.fixedGoldRate24KPerTola
        : currentGoldRate24KPerTola;

      // Step d: Fetch articles with calculated costs
      const articleCostQuery = `
        SELECT 
            id,
            "basketId",
            "articleId",
            "articleCode",
            "netWeight",
            "grossWeight",
            "addOnCost",
            wastage,
            "makingCharge",
            discount,
            karat,
            (article_cost).pre_tax_article_cost AS "preTaxArticleCost",
            (article_cost).luxury_tax_amount AS "luxuryTaxAmount",
            (article_cost).post_tax_article_cost AS "postTaxArticleCost",
            (article_cost).final_cost AS "finalCost"
        FROM (
            SELECT 
                cba.id,
                cba."basketId",
                cba."articleId",
                ga."articleCode",
                cba."netWeight",
                cba."grossWeight",
                cba."addOnCost",
                cba.wastage,
                cba."makingCharge",
                cba.discount,
                ga.karat,
                calc_article_cost(
                    $1::numeric,
                    ga.karat::integer,
                    cba."netWeight"::numeric,
                    cba."addOnCost"::numeric,
                    cba.wastage::numeric,
                    cba."makingCharge"::numeric,
                    cba.discount::numeric
                ) AS article_cost
            FROM public.customer_basket_articles cba
            JOIN public.gold_articles ga ON cba."articleId" = ga.id
            WHERE cba."basketId" = $2
        ) subquery
        ORDER BY id;
      `;

      const articles: any[] = await prisma.$queryRawUnsafe(
        articleCostQuery,
        effectiveGoldRate24KPerTola,
        basketId
      );

      // Step e: Calculate totals from articles
      let totalPreTaxArticleCost = 0;
      let totalAddOnCost = 0;
      
      articles.forEach(article => {
        totalPreTaxArticleCost += parseFloat(article.preTaxArticleCost || '0');
        totalAddOnCost += parseFloat(article.addOnCost || '0');
      });

      // Step f: Calculate total basket cost
      const basketCostQuery = `
        SELECT 
            pre_tax_basket_amount,
            taxed_basket_amount,
            post_tax_basket_amount,
            total_basket_amount
        FROM calc_total_basket_cost($1, $2, $3, $4);
      `;

      const basketCostResult: any[] = await prisma.$queryRawUnsafe(
        basketCostQuery,
        totalPreTaxArticleCost,
        basket.oldGoldItemCost,
        basket.extraDiscount,
        totalAddOnCost
      );

      const basketTotals = basketCostResult[0] || {
        pre_tax_basket_amount: 0,
        taxed_basket_amount: 0,
        post_tax_basket_amount: 0,
        total_basket_amount: 0
      };

      // Convert BigInt phone to string for JSON serialization
      const customerData = {
        ...basket.customer,
        phone: basket.customer.phone ? basket.customer.phone.toString() : null
      };

      // Step g: Handle different totals based on billing status
      let totals;
      
      if (basket.isBilled && basket.billedGoldRate24KPerTola) {
        // For billed baskets, use calculated values with the billed rate
        // We'll calculate from the SQL functions using the billed rate
        totals = {
          preTaxBasketAmount: parseFloat(basketTotals.pre_tax_basket_amount || '0'),
          luxuryTax: parseFloat(basketTotals.taxed_basket_amount || '0'),
          postTaxBasketAmount: parseFloat(basketTotals.post_tax_basket_amount || '0'),
          totalAddOnCost,
          totalBasketAmount: parseFloat(basketTotals.total_basket_amount || '0')
        };
      } else {
        // For non-billed baskets, use calculated values
        totals = {
          preTaxBasketAmount: parseFloat(basketTotals.pre_tax_basket_amount || '0'),
          luxuryTax: parseFloat(basketTotals.taxed_basket_amount || '0'),
          postTaxBasketAmount: parseFloat(basketTotals.post_tax_basket_amount || '0'),
          totalAddOnCost,
          totalBasketAmount: parseFloat(basketTotals.total_basket_amount || '0')
        };
      }

      // Step h: Return the response
      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Basket information retrieved successfully',
        body: {
          basket: {
            id: basket.id,
            basketNumber: basket.basketNumber,
            customerId: basket.customerId,
            customer: customerData,
            isGoldRateFixed: basket.isGoldRateFixed,
            fixedGoldRate24KPerTola: basket.fixedGoldRate24KPerTola,
            effectiveGoldRate24KPerTola,
            oldGoldItemCost: basket.oldGoldItemCost,
            extraDiscount: basket.extraDiscount,
            isBilled: basket.isBilled,
            isDiscarded: basket.isDiscarded,
            billedGoldRate24KPerTola: basket.isBilled ? basket.billedGoldRate24KPerTola : null,
            createdAt: basket.createdAt,
            updatedAt: basket.updatedAt
          },
          articles: articles.map(article => ({
            id: article.id,
            basketId: article.basketId,
            articleId: article.articleId,
            articleCode: article.articleCode,
            netWeight: parseFloat(article.netWeight),
            grossWeight: parseFloat(article.grossWeight),
            addOnCost: parseFloat(article.addOnCost),
            wastage: parseFloat(article.wastage),
            makingCharge: parseFloat(article.makingCharge),
            discount: parseFloat(article.discount),
            karat: parseInt(article.karat),
            preTaxArticleCost: parseFloat(article.preTaxArticleCost || '0'),
            luxuryTaxAmount: parseFloat(article.luxuryTaxAmount || '0'),
            postTaxArticleCost: parseFloat(article.postTaxArticleCost || '0'),
            finalCost: parseFloat(article.finalCost || '0')
          })),
          totals
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Basket retrieval error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to retrieve basket information',
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
 * /api/v1/customer/basket/{basketId}:
 *   patch:
 *     summary: Update specific fields of a customer basket
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: basketId
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               oldGoldItemCost:
 *                 type: number
 *                 format: float
 *                 description: Cost of old gold items
 *                 example: 5000
 *               extraDiscount:
 *                 type: number
 *                 format: float
 *                 description: Extra discount amount
 *                 example: 1000
 *               billedGoldRate24KPerTola:
 *                 type: number
 *                 format: float
 *                 description: Gold rate used for billing
 *                 example: 95000
 *               isBilled:
 *                 type: boolean
 *                 description: Whether the basket is billed
 *                 example: true
 *               billingDate:
 *                 type: string
 *                 format: date-time
 *                 description: Billing date in ISO format
 *                 example: "2024-01-24T10:30:00Z"
 *               billingDateNepali:
 *                 type: object
 *                 description: Billing date in Nepali calendar
 *                 properties:
 *                   year:
 *                     type: number
 *                   month:
 *                     type: number
 *                   dayOfMonth:
 *                     type: number
 *                 example: {"year": 2081, "month": 10, "dayOfMonth": 15}
 *               discardedDate:
 *                 type: string
 *                 format: date-time
 *                 description: Discard date in ISO format
 *                 example: "2024-01-24T10:30:00Z"
 *               discardedDateNepali:
 *                 type: object
 *                 description: Discard date in Nepali calendar
 *                 properties:
 *                   year:
 *                     type: number
 *                   month:
 *                     type: number
 *                   dayOfMonth:
 *                     type: number
 *                 example: {"year": 2081, "month": 10, "dayOfMonth": 15}
 *               isDiscarded:
 *                 type: boolean
 *                 description: Whether the basket is discarded
 *                 example: false
 *     responses:
 *       200:
 *         description: Basket updated successfully
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
 *                   example: Basket updated successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     basket:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         basketNumber:
 *                           type: number
 *                         customerId:
 *                           type: string
 *                         oldGoldItemCost:
 *                           type: number
 *                         extraDiscount:
 *                           type: number
 *                         billedGoldRate24KPerTola:
 *                           type: number
 *                         isBilled:
 *                           type: boolean
 *                         isDiscarded:
 *                           type: boolean
 *                         billingDate:
 *                           type: string
 *                           format: date-time
 *                         discardedDate:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or basket not open for updates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 400
 *                 responseMessage:
 *                   type: string
 *                   example: Cannot update basket - basket is already billed or discarded
 *                 body:
 *                   type: object
 *                   properties:
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Basket not found
 *       500:
 *         description: Internal server error
 */
router.patch('/basket/:basketId',
  authenticateToken,
  [
    param('basketId').isUUID().withMessage('Basket ID must be a valid UUID'),
    body('oldGoldItemCost').optional().isFloat({ min: 0 }).withMessage('Old gold item cost must be a positive number'),
    body('extraDiscount').optional().isFloat({ min: 0 }).withMessage('Extra discount must be a positive number'),
    body('billedGoldRate24KPerTola').optional().isFloat({ min: 0 }).withMessage('Billed gold rate must be a positive number'),
    body('isBilled').optional().isBoolean().withMessage('isBilled must be a boolean'),
    body('billingDate').optional().isISO8601().withMessage('Billing date must be a valid ISO 8601 date'),
    body('billingDateNepali').optional().isObject().withMessage('Billing date Nepali must be an object'),
    body('billingDateNepali.year').optional().isInt({ min: 1900, max: 3000 }).withMessage('Nepali year must be a valid integer'),
    body('billingDateNepali.month').optional().isInt({ min: 1, max: 12 }).withMessage('Nepali month must be between 1 and 12'),
    body('billingDateNepali.dayOfMonth').optional().isInt({ min: 1, max: 32 }).withMessage('Nepali day must be between 1 and 32'),
    body('discardedDate').optional().isISO8601().withMessage('Discarded date must be a valid ISO 8601 date'),
    body('discardedDateNepali').optional().isObject().withMessage('Discarded date Nepali must be an object'),
    body('discardedDateNepali.year').optional().isInt({ min: 1900, max: 3000 }).withMessage('Nepali year must be a valid integer'),
    body('discardedDateNepali.month').optional().isInt({ min: 1, max: 12 }).withMessage('Nepali month must be between 1 and 12'),
    body('discardedDateNepali.dayOfMonth').optional().isInt({ min: 1, max: 32 }).withMessage('Nepali day must be between 1 and 32'),
    body('isDiscarded').optional().isBoolean().withMessage('isDiscarded must be a boolean')
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
      const {
        oldGoldItemCost,
        extraDiscount,
        billedGoldRate24KPerTola,
        isBilled,
        billingDate,
        billingDateNepali,
        discardedDate,
        discardedDateNepali,
        isDiscarded
      } = req.body;

      // Check if basket exists
      const existingBasket = await prisma.customerBasket.findUnique({
        where: { id: basketId }
      });

      if (!existingBasket) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Basket not found',
          body: {
            errors: [{
              field: 'basketId',
              message: 'Basket with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Check if basket is open for updates (not billed and not discarded)
      if (existingBasket.isBilled || existingBasket.isDiscarded) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot update basket - basket is already billed or discarded',
          body: {
            errors: [{
              field: 'basket',
              message: 'Updates can only be made to open baskets (not billed and not discarded)'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Prepare update data with only provided fields
      const updateData: any = {};
      
      if (oldGoldItemCost !== undefined) updateData.oldGoldItemCost = parseFloat(oldGoldItemCost);
      if (extraDiscount !== undefined) updateData.extraDiscount = parseFloat(extraDiscount);
      if (isBilled !== undefined) updateData.isBilled = isBilled;
      if (billingDate !== undefined) updateData.billingDate = new Date(billingDate);
      if (billingDateNepali !== undefined) updateData.billingDateNepali = billingDateNepali;
      if (discardedDate !== undefined) updateData.discardedDate = new Date(discardedDate);
      if (discardedDateNepali !== undefined) updateData.discardedDateNepali = discardedDateNepali;
      if (isDiscarded !== undefined) updateData.isDiscarded = isDiscarded;

      /**
       * Special handling for billedGoldRate24KPerTola when isBilled is being set to true:
       * 
       * 1. If the basket has a fixed gold rate (isGoldRateFixed=true) AND 
       *    the billing date is current date (today), then use the existing fixedGoldRate24KPerTola
       *    value instead of the value passed in the request. This ensures consistency when
       *    billing baskets with fixed rates on the same day they were created.
       * 
       * 2. Otherwise, use the billedGoldRate24KPerTola value provided in the request.
       * 
       * This logic prevents discrepancies between fixed rates and billed rates for same-day billing.
       */
      if (isBilled === true) {
        const currentDate = new Date();
        const billingDateToCheck = billingDate ? new Date(billingDate) : currentDate;
        
        // Check if billing date is today (same date, ignoring time)
        const isBillingDateToday = 
          billingDateToCheck.getFullYear() === currentDate.getFullYear() &&
          billingDateToCheck.getMonth() === currentDate.getMonth() &&
          billingDateToCheck.getDate() === currentDate.getDate();

        if (existingBasket.isGoldRateFixed && 
            existingBasket.fixedGoldRate24KPerTola && 
            isBillingDateToday) {
          // Use the existing fixed gold rate for billing
          updateData.billedGoldRate24KPerTola = existingBasket.fixedGoldRate24KPerTola;
        } else {
          // Use the provided billedGoldRate24KPerTola from the request
          if (billedGoldRate24KPerTola !== undefined) {
            updateData.billedGoldRate24KPerTola = parseFloat(billedGoldRate24KPerTola);
          }
        }
      }

      // Check if at least one field is provided for update
      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'No valid fields provided for update',
          body: {
            errors: [{
              field: 'body',
              message: 'At least one valid field must be provided for update'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Update the basket
      const updatedBasket = await prisma.customerBasket.update({
        where: { id: basketId },
        data: updateData
      });

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Basket updated successfully',
        body: {
          basket: {
            id: updatedBasket.id,
            basketNumber: updatedBasket.basketNumber,
            customerId: updatedBasket.customerId,
            isGoldRateFixed: updatedBasket.isGoldRateFixed,
            fixedGoldRate24KPerTola: updatedBasket.fixedGoldRate24KPerTola,
            fixedGoldRateNepaliDate: updatedBasket.fixedGoldRateNepaliDate,
            oldGoldItemCost: updatedBasket.oldGoldItemCost,
            extraDiscount: updatedBasket.extraDiscount,
            billedGoldRate24KPerTola: updatedBasket.billedGoldRate24KPerTola,
            isBilled: updatedBasket.isBilled,
            isDiscarded: updatedBasket.isDiscarded,
            billingDate: updatedBasket.billingDate,
            billingDateNepali: updatedBasket.billingDateNepali,
            discardedDate: updatedBasket.discardedDate,
            discardedDateNepali: updatedBasket.discardedDateNepali,
            createdAt: updatedBasket.createdAt,
            updatedAt: updatedBasket.updatedAt
          }
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Basket update error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to update basket',
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
 * /api/v1/customer/basket/article/{id}:
 *   delete:
 *     summary: Delete an article from a customer's basket
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket Article ID
 *     responses:
 *       200:
 *         description: Article removed from basket successfully
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
 *                   example: Article removed from basket successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     deletedArticleId:
 *                       type: string
 *                       description: ID of the deleted basket article
 *       400:
 *         description: Validation error or basket is billed/discarded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 400
 *                 responseMessage:
 *                   type: string
 *                   example: Cannot remove article from billed basket
 *                 body:
 *                   type: object
 *                   properties:
 *                     errors:
 *                       type: array
 *                       items:
 *                         type: object
 *       404:
 *         description: Article not found in basket
 *       500:
 *         description: Internal server error
 */
router.delete('/basket/article/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Article ID must be a valid UUID')
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

      const articleId = req.params.id as string;

      // Find the basket article
      const basketArticle = await prisma.customerBasketArticles.findUnique({
        where: { id: articleId },
        include: {
          basket: {
            select: {
              id: true,
              isBilled: true,
              isDiscarded: true
            }
          }
        }
      });

      if (!basketArticle) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Article not found in basket',
          body: {
            errors: [{
              field: 'id',
              message: 'Basket article with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Check if basket is billed or discarded
      if (basketArticle.basket.isBilled) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot remove article from billed basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot remove articles from a basket that has already been billed'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      if (basketArticle.basket.isDiscarded) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot remove article from discarded basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot remove articles from a discarded basket'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Delete the basket article
      await prisma.customerBasketArticles.delete({
        where: { id: articleId }
      });

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Article removed from basket successfully',
        body: {
          deletedArticleId: articleId
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Article deletion error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to remove article from basket',
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
 * /api/v1/customer/basket/article/{id}:
 *   patch:
 *     summary: Update details of an article in a customer's basket
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Basket Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               netWeight:
 *                 type: number
 *                 format: float
 *                 description: Net weight of the article
 *                 example: 25.50
 *               grossWeight:
 *                 type: number
 *                 format: float
 *                 description: Gross weight of the article
 *                 example: 26.20
 *               addOnCost:
 *                 type: number
 *                 format: float
 *                 description: Additional cost
 *                 example: 1000
 *               wastage:
 *                 type: number
 *                 format: float
 *                 description: Wastage amount
 *                 example: 0.5
 *               makingCharge:
 *                 type: number
 *                 format: float
 *                 description: Making charge
 *                 example: 2000
 *               discount:
 *                 type: number
 *                 format: float
 *                 description: Discount amount
 *                 example: 500
 *     responses:
 *       200:
 *         description: Article updated successfully
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
 *                   example: Article updated successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     basketArticle:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         basketId:
 *                           type: string
 *                         articleId:
 *                           type: string
 *                         netWeight:
 *                           type: number
 *                         grossWeight:
 *                           type: number
 *                         addOnCost:
 *                           type: number
 *                         wastage:
 *                           type: number
 *                         makingCharge:
 *                           type: number
 *                         discount:
 *                           type: number
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or basket is billed/discarded
 *       404:
 *         description: Article not found in basket
 *       500:
 *         description: Internal server error
 */
router.patch('/basket/article/:id',
  authenticateToken,
  [
    param('id').isUUID().withMessage('Article ID must be a valid UUID'),
    body('netWeight').optional().isFloat({ min: 0.01 }).withMessage('Net weight must be a positive number greater than 0'),
    body('grossWeight').optional().isFloat({ min: 0.01, max: 1000 }).withMessage('Gross weight must be a positive number and cannot exceed 1000'),
    body('addOnCost').optional().isFloat({ min: 0.01 }).withMessage('Add-on cost must be a positive number'),
    body('wastage').optional().isFloat({ min: 0.01 }).withMessage('Wastage must be a positive number'),
    body('makingCharge').optional().isFloat({ min: 0, max: 9999.99 }).withMessage('Making charge must be >= 0 and < 10000'),
    body('discount').optional().isFloat({ min: 0, max: 9999.99 }).withMessage('Discount must be >= 0 and < 10000')
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

      const articleId = req.params.id as string;
      const { netWeight, grossWeight, addOnCost, wastage, makingCharge, discount } = req.body;

      // Find the basket article with basket information
      const basketArticle = await prisma.customerBasketArticles.findUnique({
        where: { id: articleId },
        include: {
          basket: {
            select: {
              id: true,
              isBilled: true,
              isDiscarded: true
            }
          }
        }
      });

      if (!basketArticle) {
        const response: ApiResponse = {
          responseCode: 404,
          responseMessage: 'Article not found in basket',
          body: {
            errors: [{
              field: 'id',
              message: 'Basket article with the provided ID does not exist'
            }]
          }
        };
        res.status(404).json(response);
        return;
      }

      // Check if basket is open (both isBilled and isDiscarded must be false)
      if (basketArticle.basket.isBilled) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot update article in billed basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot update articles in a basket that has already been billed'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      if (basketArticle.basket.isDiscarded) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Cannot update article in discarded basket',
          body: {
            errors: [{
              field: 'basket',
              message: 'Cannot update articles in a discarded basket'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Prepare update data with only provided fields
      const updateData: any = {};
      const validationErrors: Array<{field: string, message: string}> = [];
      
      // Determine effective weights for validation
      const effectiveNetWeight = netWeight !== undefined ? parseFloat(netWeight) : basketArticle.netWeight;
      const effectiveGrossWeight = grossWeight !== undefined ? parseFloat(grossWeight) : basketArticle.grossWeight;

      // Custom validations
      if (netWeight !== undefined) {
        const parsedNetWeight = parseFloat(netWeight);
        updateData.netWeight = parsedNetWeight;
        
        // Check if netWeight > grossWeight (either new grossWeight or existing)
        if (parsedNetWeight > effectiveGrossWeight) {
          validationErrors.push({
            field: 'netWeight',
            message: `Net weight (${parsedNetWeight}) cannot be greater than gross weight (${effectiveGrossWeight})`
          });
        }
      }

      if (grossWeight !== undefined) {
        const parsedGrossWeight = parseFloat(grossWeight);
        updateData.grossWeight = parsedGrossWeight;
        
        // Check if existing or new netWeight > new grossWeight
        if (effectiveNetWeight > parsedGrossWeight) {
          validationErrors.push({
            field: 'grossWeight',
            message: `Gross weight (${parsedGrossWeight}) cannot be less than net weight (${effectiveNetWeight})`
          });
        }
      }

      if (addOnCost !== undefined) {
        updateData.addOnCost = parseFloat(addOnCost);
      }

      if (wastage !== undefined) {
        const parsedWastage = parseFloat(wastage);
        updateData.wastage = parsedWastage;
        
        // Check if wastage > 20% of netWeight
        const maxWastage = effectiveNetWeight * 0.2;
        if (parsedWastage > maxWastage) {
          validationErrors.push({
            field: 'wastage',
            message: `Wastage (${parsedWastage}) cannot be greater than 20% of net weight (${maxWastage.toFixed(2)})`
          });
        }
      }

      if (makingCharge !== undefined) {
        updateData.makingCharge = parseFloat(makingCharge);
      }

      if (discount !== undefined) {
        updateData.discount = parseFloat(discount);
      }

      // Check if at least one field is provided for update
      if (Object.keys(updateData).length === 0) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'No valid fields provided for update',
          body: {
            errors: [{
              field: 'body',
              message: 'At least one valid field must be provided for update'
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Return validation errors if any
      if (validationErrors.length > 0) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Validation failed',
          body: {
            errors: validationErrors
          }
        };
        res.status(400).json(response);
        return;
      }

      // Update the basket article
      const updatedBasketArticle = await prisma.customerBasketArticles.update({
        where: { id: articleId },
        data: updateData
      });

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Article updated successfully',
        body: {
          basketArticle: {
            id: updatedBasketArticle.id,
            basketId: updatedBasketArticle.basketId,
            articleId: updatedBasketArticle.articleId,
            netWeight: updatedBasketArticle.netWeight,
            grossWeight: updatedBasketArticle.grossWeight,
            addOnCost: updatedBasketArticle.addOnCost,
            wastage: updatedBasketArticle.wastage,
            makingCharge: updatedBasketArticle.makingCharge,
            discount: updatedBasketArticle.discount,
            createdAt: updatedBasketArticle.createdAt,
            updatedAt: updatedBasketArticle.updatedAt
          }
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Article update error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to update article in basket',
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
 * /api/v1/customer/basket/search:
 *   post:
 *     summary: Search for customer baskets based on criteria
 *     tags: [Customer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customerName:
 *                 type: string
 *                 description: Customer name to search for
 *                 example: "John Doe"
 *                 default: ""
 *               phone:
 *                 type: string
 *                 description: Customer phone number
 *                 example: "9876543210"
 *               startDate:
 *                 type: string
 *                 description: Start date in Nepali calendar format yyyy-mm-dd (defaults to current Nepali date)
 *                 example: "2081-10-01"
 *               endDate:
 *                 type: string
 *                 description: End date in Nepali calendar format yyyy-mm-dd (defaults to current Nepali date)
 *                 example: "2081-10-15"
 *               includeBilled:
 *                 type: boolean
 *                 description: Whether to include billed baskets
 *                 example: true
 *                 default: true
 *               includeDiscarded:
 *                 type: boolean
 *                 description: Whether to include discarded baskets
 *                 example: false
 *                 default: false
 *               offset:
 *                 type: number
 *                 description: Number of records to skip for pagination
 *                 example: 0
 *                 default: 0
 *               limit:
 *                 type: number
 *                 description: Maximum number of records to return
 *                 example: 20
 *                 default: 20
 *     responses:
 *       200:
 *         description: Baskets retrieved successfully
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
 *                   example: Baskets retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     baskets:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           basketNumber:
 *                             type: number
 *                           date:
 *                             type: string
 *                             format: date-time
 *                             description: Created date as Gregorian date object
 *                           nepaliDate:
 *                             type: object
 *                             description: Created date in Nepali format
 *                             properties:
 *                               year:
 *                                 type: number
 *                               month:
 *                                 type: number
 *                               dayOfMonth:
 *                                 type: number
 *                           firstName:
 *                             type: string
 *                           lastName:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           count:
 *                             type: number
 *                             description: Total articles in basket
 *                           isBilled:
 *                             type: boolean
 *                           billingDateNepali:
 *                             type: object
 *                           isDiscarded:
 *                             type: boolean
 *                           discardedDateNepali:
 *                             type: object
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         offset:
 *                           type: number
 *                         limit:
 *                           type: number
 *                         total:
 *                           type: number
 *                         hasMore:
 *                           type: boolean
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/basket/search',
  authenticateToken,
  [
    body('customerName').optional().isString().trim().withMessage('Customer name must be a string'),
    body('phone').optional().isString().trim().withMessage('Phone must be a string'),
    body('startDate').optional().isString().matches(/^\d{4}-\d{1,2}-\d{1,2}$/).withMessage('Start date must be in yyyy-mm-dd format'),
    body('endDate').optional().isString().matches(/^\d{4}-\d{1,2}-\d{1,2}$/).withMessage('End date must be in yyyy-mm-dd format'),
    body('includeBilled').optional().isBoolean().withMessage('includeBilled must be a boolean'),
    body('includeDiscarded').optional().isBoolean().withMessage('includeDiscarded must be a boolean'),
    body('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
    body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ],
  async (req: Request, res: Response) => {
    const LOG_BASKET_SEARCH = process.env.LOG_BASKET_SEARCH === 'true';
    
    try {
      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Starting basket search request', {
          timestamp: new Date().toISOString(),
          requestBody: req.body
        });
      }

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        if (LOG_BASKET_SEARCH) {
          console.log('[BASKET_SEARCH] Validation failed', {
            errors: errors.array()
          });
        }
        
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

      // Extract and set defaults for request parameters
      const {
        customerName = '',
        phone,
        startDate,
        endDate,
        includeBilled,
        includeDiscarded = false,
        offset = 0,
        limit = 20
      } = req.body;

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Extracted request parameters', {
          customerName,
          phone,
          startDate,
          endDate,
          includeBilled,
          includeDiscarded,
          offset,
          limit
        });
      }

      // Get current Gregorian date as default if dates not provided
      const currentDate = new Date();
      const currentNepaliDateObj = NepaliDateHelper.getTodayNepaliDate();
      const currentNepaliDateString = `${currentNepaliDateObj.year}-${currentNepaliDateObj.month.toString().padStart(2, '0')}-${currentNepaliDateObj.dayOfMonth.toString().padStart(2, '0')}`;

      // Parse dates using nepali-date-library BStoAD method
      let startDateGregorian: Date;
      let endDateGregorian: Date;
      let effectiveStartDateString: string;
      let effectiveEndDateString: string;

      if (startDate) {
        try {
          // Normalize yyyy-mm-dd format by padding single digits
          const [year, month, day] = startDate.split('-');
          const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const gregorianDateStr = BStoAD(normalizedDate);
          startDateGregorian = new Date(gregorianDateStr);
          effectiveStartDateString = startDate;
          if (LOG_BASKET_SEARCH) {
            console.log('[BASKET_SEARCH] Parsed start date successfully', { 
              nepaliInput: startDate,
              normalizedInput: normalizedDate, 
              gregorianOutput: gregorianDateStr, 
              startDateGregorian 
            });
          }
        } catch (error) {
          if (LOG_BASKET_SEARCH) {
            console.log('[BASKET_SEARCH] Error parsing start date, using current date', { startDate, error });
          }
          startDateGregorian = new Date(currentDate);
          effectiveStartDateString = currentNepaliDateString;
        }
      } else {
        startDateGregorian = new Date(currentDate);
        effectiveStartDateString = currentNepaliDateString;
      }

      if (endDate) {
        try {
          // Normalize yyyy-mm-dd format by padding single digits
          const [year, month, day] = endDate.split('-');
          const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          const gregorianDateStr = BStoAD(normalizedDate);
          endDateGregorian = new Date(gregorianDateStr);
          effectiveEndDateString = endDate;
          if (LOG_BASKET_SEARCH) {
            console.log('[BASKET_SEARCH] Parsed end date successfully', { 
              nepaliInput: endDate,
              normalizedInput: normalizedDate, 
              gregorianOutput: gregorianDateStr, 
              endDateGregorian 
            });
          }
        } catch (error) {
          if (LOG_BASKET_SEARCH) {
            console.log('[BASKET_SEARCH] Error parsing end date, using current date', { endDate, error });
          }
          endDateGregorian = new Date(currentDate);
          effectiveEndDateString = currentNepaliDateString;
        }
      } else {
        endDateGregorian = new Date(currentDate);
        effectiveEndDateString = currentNepaliDateString;
      }

      // Set start date to beginning of day and end date to end of day
      startDateGregorian.setHours(0, 0, 0, 0);
      endDateGregorian.setHours(23, 59, 59, 999);

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Date processing completed', {
          effectiveStartDateString,
          effectiveEndDateString,
          startDateGregorian,
          endDateGregorian
        });
      }



      // Build where clause for filtering
      const whereClause: any = {
        createdAt: {
          gte: startDateGregorian,
          lte: endDateGregorian
        }
      };

      // Add customer name filter if provided
      if (customerName && customerName.trim()) {
        whereClause.customer = {
          OR: [
            { firstName: { contains: customerName.trim(), mode: 'insensitive' } },
            { lastName: { contains: customerName.trim(), mode: 'insensitive' } }
          ]
        };
      }

      // Add phone filter if provided
      if (phone) {
        if (!whereClause.customer) {
          whereClause.customer = {};
        }
        if (whereClause.customer.OR) {
          whereClause.customer.OR.push({ phone: { equals: phone.trim() } });
        } else {
          whereClause.customer.phone = { equals: phone.trim() };
        }
      }

      // Add billing/discard status filters
      const statusConditions: any[] = [];
      
      // Handle includeBilled logic
      if (includeBilled !== undefined) {
        // If includeBilled is explicitly provided, filter based on its value
        if (includeBilled) {
          statusConditions.push({ isBilled: true });
        } else {
          statusConditions.push({ isBilled: false });
        }
      }
      // If includeBilled is not provided, don't add any isBilled filter (include all)

      // Handle includeDiscarded logic
      if (includeDiscarded) {
        // If includeDiscarded is true, only include discarded records
        if (statusConditions.length > 0) {
          // Create a copy of existing conditions to avoid circular reference
          const existingConditions = [...statusConditions];
          statusConditions.length = 0; // Clear array
          statusConditions.push({
            AND: [
              { OR: existingConditions },
              { isDiscarded: true }
            ]
          });
        } else {
          statusConditions.push({ isDiscarded: true });
        }
      } else {
        // If includeDiscarded is false or not provided, only include non-discarded records
        if (statusConditions.length > 0) {
          // Create a copy of existing conditions to avoid circular reference
          const existingConditions = [...statusConditions];
          statusConditions.length = 0; // Clear array
          statusConditions.push({
            AND: [
              { OR: existingConditions },
              { isDiscarded: false }
            ]
          });
        } else {
          statusConditions.push({ isDiscarded: false });
        }
      }

      // Apply status conditions to where clause
      if (statusConditions.length > 0) {
        if (statusConditions.length === 1) {
          // If only one condition, apply it directly
          Object.assign(whereClause, statusConditions[0]);
        } else {
          // If multiple conditions, combine them with OR
          whereClause.OR = statusConditions;
        }
      }

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Where clause built', {
          whereClause: JSON.stringify(whereClause, null, 2),
          statusConditions
        });
      }

      // Get total count for pagination
      const countStartTime = Date.now();
      const totalCount = await prisma.customerBasket.count({
        where: whereClause
      });
      const countDuration = Date.now() - countStartTime;

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Count query completed', {
          totalCount,
          countDuration: `${countDuration}ms`
        });
      }

      // Fetch baskets with customer details and article count
      const fetchStartTime = Date.now();
      const baskets = await prisma.customerBasket.findMany({
        where: whereClause,
        include: {
          customer: {
            select: {
              firstName: true,
              lastName: true,
              phone: true
            }
          },
          _count: {
            select: {
              articles: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      });
      const fetchDuration = Date.now() - fetchStartTime;

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Fetch query completed', {
          basketsFound: baskets.length,
          fetchDuration: `${fetchDuration}ms`,
          offset,
          limit
        });
      }

      // Convert Gregorian dates to Nepali format for response
      const convertGregorianToNepaliDate = (gregorianDate: Date): any => {
        try {
          const year = gregorianDate.getFullYear();
          const month = String(gregorianDate.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-11
          const day = String(gregorianDate.getDate()).padStart(2, '0');
          const gregorianDateStr = `${year}-${month}-${day}`;
          
          const nepaliDateStr = ADtoBS(gregorianDateStr);
          const [nepaliYear, nepaliMonth, nepaliDay] = nepaliDateStr.split('-').map(Number);
          
          return {
            year: nepaliYear,
            month: nepaliMonth,
            dayOfMonth: nepaliDay
          };
        } catch (error) {
          // Fallback to approximate conversion if library fails
          const gregorianYear = gregorianDate.getFullYear();
          const nepaliYear = gregorianYear + 57; // Rough conversion
          const nepaliMonth = gregorianDate.getMonth() + 1;
          const nepaliDay = gregorianDate.getDate();
          
          return {
            year: nepaliYear,
            month: nepaliMonth,
            dayOfMonth: nepaliDay
          };
        }
      };

      // Format the response
      const formatStartTime = Date.now();
      const formattedBaskets = baskets.map(basket => {
        const gregorianCreatedDate = basket.createdAt;
        const nepaliCreatedDate = convertGregorianToNepaliDate(basket.createdAt);
        
        const basketData: any = {
          id: basket.id,
          basketNumber: basket.basketNumber,
          date: gregorianCreatedDate, // Gregorian date object
          nepaliDate: nepaliCreatedDate, // Nepali date object
          firstName: basket.customer.firstName,
          lastName: basket.customer.lastName,
          phone: basket.customer.phone ? basket.customer.phone.toString() : null,
          count: basket._count.articles,
          isBilled: basket.isBilled,
          billingDateNepali: basket.billingDateNepali
        };

        // Include discard information only if discarded records are being included
        if (includeDiscarded) {
          basketData.isDiscarded = basket.isDiscarded;
          basketData.discardedDateNepali = basket.discardedDateNepali;
        }

        return basketData;
      });
      const formatDuration = Date.now() - formatStartTime;

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Response formatting completed', {
          formattedBasketsCount: formattedBaskets.length,
          formatDuration: `${formatDuration}ms`,
          totalProcessingTime: `${Date.now() - (req as any).startTime || 'N/A'}ms`
        });
      }

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Baskets retrieved successfully',
        body: {
          baskets: formattedBaskets,
          pagination: {
            offset,
            limit,
            total: totalCount,
            hasMore: offset + limit < totalCount
          }
        }
      };

      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Search completed successfully', {
          totalRecords: totalCount,
          returnedRecords: formattedBaskets.length,
          responseCode: 200
        });
      }

      res.status(200).json(response);

    } catch (error) {
      if (LOG_BASKET_SEARCH) {
        console.log('[BASKET_SEARCH] Error occurred', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString()
        });
      }
      
      console.error('Basket search error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to search baskets',
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

export default router;