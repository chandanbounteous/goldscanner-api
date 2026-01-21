// Request types
export interface RegisterRequest {
  phone: number;
  username: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

// Response types
export interface ApiResponse<T = any> {
  responseCode: number;
  responseMessage: string;
  body?: T;
}

export interface RegisterResponseBody {
  userId: string;
}

export interface LoginResponseBody {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    role: string;
  };
}

export interface RefreshResponseBody {
  accessToken: string;
  expiresIn: number;
}

export interface ValidationError {
  field: string;
  message: string;
}