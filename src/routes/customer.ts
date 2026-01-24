import express, { Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/auth';
import { BasketService } from '../services/basketService';
import { GoldRateFetcher } from '../services/goldRateFetcher';
import { logger } from '../utils/logger';

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
            luxuryTax: newBasket.luxuryTax,
            finalCost: newBasket.finalCost,
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
            discount: basketArticle.discount
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
 *                     articles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           articleId:
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
 *                     totals:
 *                       type: object
 *                       properties:
 *                         preTaxBasketAmount:
 *                           type: number
 *                         luxuryTax:
 *                           type: number
 *                         postTaxBasketAmount:
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
            "netWeight",
            "grossWeight",
            "addOnCost",
            wastage,
            "makingCharge",
            discount,
            karat,
            (article_cost).pre_tax_article_cost AS "preTaxArticleCost",
            (article_cost).luxury_tax_amount AS "luxuryTaxAmount",
            (article_cost).post_tax_article_cost AS "postTaxArticleCost"
        FROM (
            SELECT 
                cba.id,
                cba."basketId",
                cba."articleId",
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

      // Step e: Sum up preTaxArticleCost
      const totalPreTaxArticleCost = articles.reduce((sum, article) => {
        return sum + parseFloat(article.preTaxArticleCost || '0');
      }, 0);

      // Step f: Calculate total basket cost
      const basketCostQuery = `
        SELECT 
            pre_tax_basket_amount,
            taxed_basket_amount,
            post_tax_basket_amount
        FROM calc_total_basket_cost($1, $2, $3);
      `;

      const basketCostResult: any[] = await prisma.$queryRawUnsafe(
        basketCostQuery,
        totalPreTaxArticleCost,
        basket.oldGoldItemCost,
        basket.extraDiscount
      );

      const basketTotals = basketCostResult[0] || {
        pre_tax_basket_amount: 0,
        taxed_basket_amount: 0,
        post_tax_basket_amount: 0
      };

      // Convert BigInt phone to string for JSON serialization
      const customerData = {
        ...basket.customer,
        phone: basket.customer.phone ? basket.customer.phone.toString() : null
      };

      // Step g: Handle different totals based on billing status
      let totals;
      
      if (basket.isBilled) {
        // For billed baskets, use actual values from database
        const luxuryTax = basket.luxuryTax || 0;
        const postTaxBasketAmount = basket.finalCost || 0;
        const preTaxBasketAmount = postTaxBasketAmount - luxuryTax;
        
        totals = {
          preTaxBasketAmount,
          luxuryTax,
          postTaxBasketAmount
        };
      } else {
        // For non-billed baskets, use calculated values
        totals = {
          preTaxBasketAmount: parseFloat(basketTotals.pre_tax_basket_amount || '0'),
          luxuryTax: parseFloat(basketTotals.taxed_basket_amount || '0'),
          postTaxBasketAmount: parseFloat(basketTotals.post_tax_basket_amount || '0')
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
            createdAt: basket.createdAt,
            updatedAt: basket.updatedAt
          },
          articles: articles.map(article => ({
            id: article.id,
            basketId: article.basketId,
            articleId: article.articleId,
            netWeight: parseFloat(article.netWeight),
            grossWeight: parseFloat(article.grossWeight),
            addOnCost: parseFloat(article.addOnCost),
            wastage: parseFloat(article.wastage),
            makingCharge: parseFloat(article.makingCharge),
            discount: parseFloat(article.discount),
            karat: parseInt(article.karat),
            preTaxArticleCost: parseFloat(article.preTaxArticleCost || '0'),
            luxuryTaxAmount: parseFloat(article.luxuryTaxAmount || '0'),
            postTaxArticleCost: parseFloat(article.postTaxArticleCost || '0')
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

export default router;