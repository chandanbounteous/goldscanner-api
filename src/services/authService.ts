import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { RegisterRequest, ApiResponse, RegisterResponseBody, LoginRequest, LoginResponseBody, RefreshRequest, RefreshResponseBody } from '../types/auth';
import { JWTService, JWTPayload } from '../utils/jwt';

export class AuthService {
  /**
   * Hash password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Verify password against hash
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Check if user exists by phone or username
   */
  static async userExists(phone: number, username: string): Promise<boolean> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: BigInt(phone) },
          { username }
        ]
      }
    });

    return existingUser !== null;
  }

  /**
   * Find user by username
   */
  static async findUserByUsername(username: string) {
    return await prisma.user.findUnique({
      where: { username }
    });
  }

  /**
   * Create new user
   */
  static async createUser(userData: RegisterRequest): Promise<string> {
    const hashedPassword = await this.hashPassword(userData.password);

    const newUser = await prisma.user.create({
      data: {
        phone: BigInt(userData.phone),
        username: userData.username,
        password: hashedPassword,
        firstName: userData.firstName,
        lastName: userData.lastName,
      }
    });

    return newUser.id;
  }

  /**
   * Authenticate user and generate tokens
   */
  static async authenticateUser(loginData: LoginRequest): Promise<LoginResponseBody | null> {
    // Find user by username
    const user = await this.findUserByUsername(loginData.username);
    
    if (!user) {
      return null;
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(loginData.password, user.password);
    
    if (!isPasswordValid) {
      return null;
    }

    // Generate JWT tokens
    const jwtPayload: JWTPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
    };

    const tokens = JWTService.generateTokenPair(jwtPayload);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        role: user.role,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshData: RefreshRequest): Promise<RefreshResponseBody | null> {
    const result = JWTService.refreshAccessToken(refreshData.refreshToken);
    
    if (!result) {
      return null;
    }

    return {
      accessToken: result.accessToken,
      expiresIn: result.expiresIn,
    };
  }
}