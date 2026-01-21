import { Router, Request, Response } from 'express';
import { registerValidation, loginValidation, refreshValidation, handleValidationErrors } from '../middleware/validation';
import { AuthService } from '../services/authService';
import { RegisterRequest, LoginRequest, RefreshRequest, ApiResponse, RegisterResponseBody, LoginResponseBody, RefreshResponseBody } from '../types/auth';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication endpoints
 */

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username (3-50 characters)
 *               password:
 *                 type: string
 *                 description: Password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                   example: Login successful
 *                 body:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (15 minutes)
 *                     refreshToken:
 *                       type: string
 *                       description: JWT refresh token (5 days)
 *                     expiresIn:
 *                       type: number
 *                       description: Token expiration time in seconds
 *                       example: 900
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         firstName:
 *                           type: string
 *                         lastName:
 *                           type: string
 *                         role:
 *                           type: string
 *       400:
 *         description: Validation error or invalid credentials
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
 *                   example: Invalid credentials
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
 */
router.post('/login', 
  loginValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const loginData: LoginRequest = req.body;

      // Authenticate user and generate tokens
      const authResult = await AuthService.authenticateUser(loginData);
      
      if (!authResult) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Invalid credentials',
          body: { 
            errors: [{ 
              field: 'credentials', 
              message: 'Invalid username or password' 
            }] 
          }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<LoginResponseBody> = {
        responseCode: 200,
        responseMessage: 'Login successful',
        body: authResult
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Login error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to login',
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
 * /api/v1/auth/register:
 *   post:
 *     summary: User registration
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phone
 *               - password
 *               - username
 *             properties:
 *               phone:
 *                 type: number
 *                 description: Phone number (10-15 digits)
 *               password:
 *                 type: string
 *                 description: Password (min 6 chars, must contain uppercase, lowercase, number)
 *               username:
 *                 type: string
 *                 description: Username (3-50 alphanumeric characters)
 *               firstName:
 *                 type: string
 *                 description: First name (optional, letters only)
 *               lastName:
 *                 type: string
 *                 description: Last name (optional, letters only)
 *     responses:
 *       200:
 *         description: Registration successful
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
 *                   example: User created successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *       400:
 *         description: Validation error or user already exists
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
 *                   example: Unable to create user
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
 */
router.post('/register', 
  registerValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const registerData: RegisterRequest = req.body;

      // Check if user already exists
      const userExists = await AuthService.userExists(registerData.phone, registerData.username);
      
      if (userExists) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Unable to create user',
          body: { 
            errors: [{ 
              field: 'phone/username', 
              message: 'User with this phone number or username already exists' 
            }] 
          }
        };
        res.status(400).json(response);
        return;
      }

      // Create user
      const userId = await AuthService.createUser(registerData);

      const response: ApiResponse<RegisterResponseBody> = {
        responseCode: 200,
        responseMessage: 'User created successfully',
        body: { userId }
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Registration error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to create user',
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
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Valid refresh token
 *     responses:
 *       200:
 *         description: Token refresh successful
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
 *                   example: Token refreshed successfully
 *                 body:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token (15 minutes)
 *                     expiresIn:
 *                       type: number
 *                       description: Token expiration time in seconds
 *                       example: 900
 *       400:
 *         description: Validation error or invalid refresh token
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
 *                   example: Invalid refresh token
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
 */
router.post('/refresh',
  refreshValidation,
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const refreshData: RefreshRequest = req.body;

      // Refresh the access token
      const refreshResult = await AuthService.refreshToken(refreshData);
      
      if (!refreshResult) {
        const response: ApiResponse = {
          responseCode: 400,
          responseMessage: 'Invalid refresh token',
          body: { 
            errors: [{ 
              field: 'refreshToken', 
              message: 'Invalid or expired refresh token' 
            }] 
          }
        };
        res.status(400).json(response);
        return;
      }

      const response: ApiResponse<RefreshResponseBody> = {
        responseCode: 200,
        responseMessage: 'Token refreshed successfully',
        body: refreshResult
      };

      res.status(200).json(response);

    } catch (error) {
      console.error('Token refresh error:', error);
      
      const response: ApiResponse = {
        responseCode: 500,
        responseMessage: 'Unable to refresh token',
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