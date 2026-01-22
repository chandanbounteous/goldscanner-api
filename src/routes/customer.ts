import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';
import { ApiResponse } from '../types/auth';

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

export default router;