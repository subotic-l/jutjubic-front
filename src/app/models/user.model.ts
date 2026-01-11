export interface User {
  id: number;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  address?: string;
  role?: string;
  enabled?: boolean;
  createdAt?: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  address: string;
}

export interface JwtAuthenticationResponse {
  accessToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface RegisterResponse {
  message: string;
  user: User;
}
