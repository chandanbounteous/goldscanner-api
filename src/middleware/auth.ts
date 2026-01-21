import { Request, Response, NextFunction } from 'express';
import { JWTService } from '../utils/jwt';
import { ApiResponse } from '../types/auth';

// Extend Request interface to include user data
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) // Remove 'Bearer ' prefix
    : null;

  if (!token) {
    const response: ApiResponse = {
      responseCode: 401,
      responseMessage: 'Access token required',
      body: {
        errors: [{
          field: 'authorization',
          message: 'Authorization header with Bearer token is required'
        }]
      }
    };
    res.status(401).json(response);
    return;
  }

  const decoded = JWTService.verifyAccessToken(token);
  
  if (!decoded) {
    const response: ApiResponse = {
      responseCode: 401,
      responseMessage: 'Invalid or expired token',
      body: {
        errors: [{
          field: 'token',
          message: 'Invalid or expired access token'
        }]
      }
    };
    res.status(401).json(response);
    return;
  }

  // Add user info to request object
  req.user = {
    userId: decoded.userId,
    username: decoded.username,
    role: decoded.role
  };

  next();
};