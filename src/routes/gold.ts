import { Router, Request, Response } from 'express';
import { GoldRateFetcher } from '../services/goldRateFetcher';
import { GoldCalculator } from '../utils/goldCalculator';
import { NepaliDateHelper } from '../utils/nepaliDateHelper';
import { ApiResponse, GoldRateResponse } from '../types/gold';
import { authenticateToken } from '../middleware/auth';
import { PrismaClient } from '@prisma/client';
import { query, body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

/**
 * @swagger
 * tags:
 *   name: Gold
 *   description: Gold rate endpoints
 */

/**
 * @swagger
 * /api/v1/gold/currentrate:
 *   get:
 *     summary: Get current gold rates for different karats
 *     tags: [Gold]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current gold rates retrieved successfully
 *         headers:
 *           X-Cache-Status:
 *             description: Indicates whether the response was served from cache
 *             schema:
 *               type: string
 *               enum: [HIT, MISS]
 *               example: HIT
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
 *                   example: Gold rates retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     rates:
 *                       type: object
 *                       properties:
 *                         24:
 *                           type: number
 *                           description: 24 karat gold rate per tola
 *                           example: 150000
 *                         22:
 *                           type: number
 *                           description: 22 karat gold rate per tola
 *                           example: 138000
 *                         18:
 *                           type: number
 *                           description: 18 karat gold rate per tola
 *                           example: 112500
 *                         14:
 *                           type: number
 *                           description: 14 karat gold rate per tola
 *                           example: 87450
 *                     date:
 *                       type: object
 *                       properties:
 *                         year:
 *                           type: number
 *                           example: 2081
 *                         month:
 *                           type: number
 *                           example: 10
 *                         dayOfMonth:
 *                           type: number
 *                           example: 5
 *                     lastUpdated:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-01-21T10:30:00.000Z"
 *       401:
 *         description: Unauthorized - Invalid or missing access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 401
 *                 responseMessage:
 *                   type: string
 *                   example: Access token required
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
 *       500:
 *         description: Unable to fetch gold rates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 500
 *                 responseMessage:
 *                   type: string
 *                   example: Unable to fetch gold rates
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
 */
router.get('/currentrate', authenticateToken, async (req: Request, res: Response) => {
  try {
    // Fetch current gold rate
    const rateAtDate = await GoldRateFetcher.getCurrentGoldRate();
    
    if (!rateAtDate) {
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to fetch gold rates',
        body: { 
          errors: [{ 
            field: 'goldRate', 
            message: 'Failed to retrieve current gold rate from source' 
          }] 
        }
      };
      res.status(500).json(response);
      return;
    }

    // Set cache status header
    res.set('X-Cache-Status', rateAtDate.fromCache ? 'HIT' : 'MISS');

    // Calculate rates for different karats
    const roundedRates = GoldCalculator.calculateGoldRates(rateAtDate.rate);
    console.log('Calculated gold rates:', JSON.stringify(roundedRates, null, 2));
    
    const response: GoldRateResponse = {
      responseCode: 200,
      responseMessage: 'Gold rates retrieved successfully',
      body: {
        rates: roundedRates,
        date: rateAtDate.date,
        lastUpdated: new Date().toISOString()
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Gold rate endpoint error:', error);
    
    const response: ApiResponse = {
      responseCode: 500,
      responseMessage: 'Unable to fetch gold rates',
      body: { 
        errors: [{ 
          field: 'server', 
          message: 'Internal server error' 
        }] 
      }
    };

    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/v1/gold/calculate:
 *   post:
 *     summary: Calculate gold rates for different karats based on pure gold rate
 *     tags: [Gold]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pureGoldRate
 *             properties:
 *               pureGoldRate:
 *                 type: number
 *                 description: Pure gold (24 karat) rate per tola
 *                 example: 150000
 *     responses:
 *       200:
 *         description: Gold rates calculated successfully
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
 *                   example: Gold rates calculated successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     rates:
 *                       type: object
 *                       properties:
 *                         24:
 *                           type: number
 *                         22:
 *                           type: number
 *                         18:
 *                           type: number
 *                         14:
 *                           type: number
 *       400:
 *         description: Invalid pure gold rate
 *       401:
 *         description: Unauthorized - Invalid or missing access token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 401
 *                 responseMessage:
 *                   type: string
 *                   example: Access token required
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
 */
router.post('/calculate', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { pureGoldRate } = req.body;

    if (!pureGoldRate || typeof pureGoldRate !== 'number' || pureGoldRate <= 0) {
      const response: ApiResponse = {
        responseCode: 400,
        responseMessage: 'Invalid pure gold rate',
        body: { 
          errors: [{ 
            field: 'pureGoldRate', 
            message: 'Pure gold rate must be a positive number' 
          }] 
        }
      };
      res.status(400).json(response);
      return;
    }

    const roundedRates = GoldCalculator.calculateGoldRates(pureGoldRate);
    console.log('Calculated gold rates:', JSON.stringify(roundedRates, null, 2));

    const response: ApiResponse = {
      responseCode: 200,
      responseMessage: 'Gold rates calculated successfully',
      body: {
        rates: roundedRates
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Gold calculation error:', error);
    
    const response: ApiResponse = {
      responseCode: 500,
      responseMessage: 'Unable to calculate gold rates',
      body: { 
        errors: [{ 
          field: 'server', 
          message: 'Internal server error' 
        }] 
      }
    };

    res.status(500).json(response);
  }
});

/**
 * @swagger
 * /api/v1/gold/articles:
 *   get:
 *     summary: Get gold articles with optional filtering and pagination
 *     tags: [Gold]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Filter articles by article code (case insensitive, partial match)
 *         example: "RNC"
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           minimum: 0
 *         description: Number of records to skip for pagination
 *         example: 0
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *         description: Maximum number of records to return
 *         example: 50
 *     responses:
 *       200:
 *         description: Gold articles retrieved successfully
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
 *                   example: Gold articles retrieved successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     articles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           articleCode:
 *                             type: string
 *                           serialNumber:
 *                             type: string
 *                           issueDate:
 *                             type: string
 *                             format: date-time
 *                           issueDateNepali:
 *                             type: object
 *                             properties:
 *                               year:
 *                                 type: number
 *                               month:
 *                                 type: number
 *                               dayOfMonth:
 *                                 type: number
 *                           netWeight:
 *                             type: number
 *                           grossWeight:
 *                             type: number
 *                           stoneWeight:
 *                             type: number
 *                           addOnCost:
 *                             type: number
 *                           karat:
 *                             type: integer
 *                           carigar:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               codeName:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         offset:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         hasMore:
 *                           type: boolean
 *       400:
 *         description: Invalid query parameters
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
 *                   example: Invalid query parameters
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 401
 *                 responseMessage:
 *                   type: string
 *                   example: Access token required
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 500
 *                 responseMessage:
 *                   type: string
 *                   example: Unable to retrieve gold articles
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
 */
router.get('/articles', 
  authenticateToken,
  [
    query('code').optional().isString().trim().withMessage('Code must be a string'),
    query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be a non-negative integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be an integer between 1 and 100')
  ],
  async (req: Request, res: Response) => {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Invalid query parameters',
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

      // Extract and validate query parameters
      const code = (req.query.code as string) || '';
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 50;

      // Build the where clause for filtering
      const whereClause = code.trim() ? {
        articleCode: {
          contains: code.trim(),
          mode: 'insensitive' as const
        }
      } : {};

      // Get total count for pagination
      const totalCount = await prisma.goldArticle.count({
        where: whereClause
      });

      // Fetch articles with pagination and include carigar data
      const articles = await prisma.goldArticle.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: {
          articleCode: 'asc'
        },
        include: {
          carigar: {
            select: {
              id: true,
              codeName: true
            }
          }
        }
      });

      // Convert BigInt to string for JSON serialization
      const serializedArticles = articles.map(article => ({
        ...article,
        serialNumber: article.serialNumber.toString()
      }));

      const response: ApiResponse = {
        responseCode: 200,
        responseMessage: 'Gold articles retrieved successfully',
        body: {
          articles: serializedArticles,
          pagination: {
            offset,
            limit,
            total: totalCount,
            hasMore: offset + limit < totalCount
          }
        }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Articles retrieval error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to retrieve gold articles',
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
 * /api/v1/gold/article:
 *   post:
 *     summary: Create a new gold article
 *     tags: [Gold]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleCode
 *               - netWeight
 *               - grossWeight
 *               - karat
 *             properties:
 *               articleCode:
 *                 type: string
 *                 description: Unique article code
 *                 example: "RNC1001"
 *               serialNumber:
 *                 type: string
 *                 description: Serial number (optional)
 *                 example: "50001"
 *               carigarNameCode:
 *                 type: string
 *                 description: Carigar code name (optional)
 *                 example: "GAUTAM KR"
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
 *               stoneWeight:
 *                 type: number
 *                 format: float
 *                 description: Stone weight (optional, defaults to 0)
 *                 example: 0.70
 *               addOnCost:
 *                 type: number
 *                 format: float
 *                 description: Additional cost (optional, defaults to 0)
 *                 example: 500
 *               karat:
 *                 type: integer
 *                 description: Gold purity (24, 22, 18, 14)
 *                 enum: [24, 22, 18, 14]
 *                 example: 22
 *     responses:
 *       201:
 *         description: Gold article created successfully
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
 *                   example: Gold article created successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     article:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         articleCode:
 *                           type: string
 *                         serialNumber:
 *                           type: string
 *                         issueDate:
 *                           type: string
 *                           format: date-time
 *                         issueDateNepali:
 *                           type: object
 *                           properties:
 *                             year:
 *                               type: number
 *                             month:
 *                               type: number
 *                             dayOfMonth:
 *                               type: number
 *                         netWeight:
 *                           type: number
 *                         grossWeight:
 *                           type: number
 *                         stoneWeight:
 *                           type: number
 *                         addOnCost:
 *                           type: number
 *                         karat:
 *                           type: integer
 *                         carigarId:
 *                           type: string
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *       400:
 *         description: Validation error or article already exists
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
 *                   example: Article code already exists
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 401
 *                 responseMessage:
 *                   type: string
 *                   example: Access token required
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 responseCode:
 *                   type: number
 *                   example: 500
 *                 responseMessage:
 *                   type: string
 *                   example: Unable to create gold article
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
 */
router.post('/article',
  authenticateToken,
  [
    body('articleCode').notEmpty().isString().trim().withMessage('Article code is required and must be a string'),
    body('serialNumber').optional().isString().trim().withMessage('Serial number must be a string'),
    body('carigarNameCode').optional().isString().trim().withMessage('Carigar name code must be a string'),
    body('netWeight').isFloat({ min: 0 }).withMessage('Net weight must be a positive number'),
    body('grossWeight').isFloat({ min: 0 }).withMessage('Gross weight must be a positive number'),
    body('stoneWeight').optional().isFloat({ min: 0 }).withMessage('Stone weight must be a positive number'),
    body('addOnCost').optional().isFloat({ min: 0 }).withMessage('Add-on cost must be a positive number'),
    body('karat').isInt({ min: 1 }).isIn([24, 22, 18, 14]).withMessage('Karat must be one of: 24, 22, 18, 14')
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

      const { 
        articleCode, 
        serialNumber, 
        carigarNameCode, 
        netWeight, 
        grossWeight, 
        stoneWeight = 0, 
        addOnCost = 0, 
        karat 
      } = req.body;

      // Check if article code already exists
      const existingArticle = await prisma.goldArticle.findFirst({
        where: {
          articleCode: {
            equals: articleCode.trim(),
            mode: 'insensitive'
          }
        }
      });

      if (existingArticle) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Article code already exists',
          body: {
            errors: [{
              field: 'articleCode',
              message: `Article with code '${articleCode}' already exists`
            }]
          }
        };
        res.status(400).json(response);
        return;
      }

      // Find carigar by codeName or set to null if not provided
      let carigarId: string | null = null;
      
      if (carigarNameCode && carigarNameCode.trim()) {
        const foundCarigar = await prisma.carigar.findFirst({
          where: {
            codeName: {
              equals: carigarNameCode.trim(),
              mode: 'insensitive'
            }
          }
        });

        if (foundCarigar) {
          carigarId = foundCarigar.id;
        }
      }

      // Get current date and convert to Nepali date
      const currentDate = new Date();
      const currentNepaliDate = NepaliDateHelper.getTodayNepaliDate();

      // Create the gold article
      const newArticle = await prisma.goldArticle.create({
        data: {
          articleCode: articleCode.trim(),
          serialNumber: serialNumber ? BigInt(serialNumber) : BigInt(0),
          issueDate: currentDate,
          issueDateNepali: currentNepaliDate as any,
          carigarId: carigarId,
          netWeight: parseFloat(netWeight),
          grossWeight: parseFloat(grossWeight),
          stoneWeight: parseFloat(stoneWeight),
          addOnCost: parseFloat(addOnCost),
          karat: parseInt(karat)
        }
      });

      // Convert BigInt to string for JSON serialization
      const serializedArticle = {
        ...newArticle,
        serialNumber: newArticle.serialNumber.toString()
      };

      const response: ApiResponse = {
        responseCode: 201,
        responseMessage: 'Gold article created successfully',
        body: {
          article: serializedArticle
        }
      };

      res.status(201).json(response);

    } catch (error) {
      console.error('Article creation error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to create gold article',
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