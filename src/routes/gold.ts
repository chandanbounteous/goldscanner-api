import { Router, Request, Response } from 'express';
import { GoldRateFetcher } from '../services/goldRateFetcher';
import { GoldCalculator } from '../utils/goldCalculator';
import { NepaliDateHelper } from '../utils/nepaliDateHelper';
import { ApiResponse, GoldRateResponse } from '../types/gold';
import { authenticateToken } from '../middleware/auth';

const router = Router();

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

export default router;