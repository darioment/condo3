// Authentication types and interfaces

export interface DashboardUser {
  id: string;
  email: string;
  role: string; // Add role property
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

export interface AuthContextType {
  user: DashboardUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface UpdateUserRequest {
  email: string;
  password?: string; // Optional - only if changing password
}

export interface AuthResponse {
  success: boolean;
  user?: DashboardUser;
  token?: string;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Service interfaces
export interface AuthService {
  login(email: string, password: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<DashboardUser | null>;
  refreshToken(): Promise<string>;
  validateSession(): Promise<boolean>;
}

export interface UserService {
  getUsers(): Promise<DashboardUser[]>;
  createUser(data: CreateUserRequest): Promise<DashboardUser>;
  updateUser(id: string, data: UpdateUserRequest): Promise<DashboardUser>;
  deleteUser(id: string): Promise<void>;
  getUserById(id: string): Promise<DashboardUser | null>;
}

// Error types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export type AuthErrorCode = 
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_ALREADY_EXISTS'
  | 'WEAK_PASSWORD'
  | 'NETWORK_ERROR'
  | 'SESSION_EXPIRED'
  | 'UNAUTHORIZED'
  | 'VALIDATION_ERROR';

// Form validation schemas (will be used with zod)
export interface LoginFormData {
  email: string;
  password: string;
}

export interface CreateUserFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface EditUserFormData {
  email: string;
  password?: string;
  confirmPassword?: string;
}