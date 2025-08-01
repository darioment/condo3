import toast from 'react-hot-toast';
import { AuthErrorCode } from '../types/auth';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  retryable?: boolean;
}

export const createError = (
  code: AuthErrorCode | string,
  message: string,
  details?: any,
  retryable = false
): AppError => ({
  code,
  message,
  details,
  retryable
});

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  
  return 'Ha ocurrido un error inesperado';
};

export const handleAuthError = (error: unknown): AppError => {
  const message = getErrorMessage(error);
  
  // Network errors
  if (message.includes('fetch') || message.includes('network') || message.includes('conexión')) {
    return createError('NETWORK_ERROR', 'Error de conexión. Verifique su conexión a internet', error, true);
  }
  
  // Authentication errors
  if (message.includes('credentials') || message.includes('credenciales')) {
    return createError('INVALID_CREDENTIALS', 'Email o contraseña incorrectos', error);
  }
  
  if (message.includes('unauthorized') || message.includes('no autorizado')) {
    return createError('UNAUTHORIZED', 'No tiene permisos para realizar esta acción', error);
  }
  
  if (message.includes('session') || message.includes('sesión')) {
    return createError('SESSION_EXPIRED', 'Su sesión ha expirado. Inicie sesión nuevamente', error);
  }
  
  // User management errors
  if (message.includes('email') && message.includes('exists')) {
    return createError('EMAIL_ALREADY_EXISTS', 'Ya existe un usuario con este email', error);
  }
  
  if (message.includes('password') && message.includes('weak')) {
    return createError('WEAK_PASSWORD', 'La contraseña no cumple con los requisitos de seguridad', error);
  }
  
  // Generic error
  return createError('UNKNOWN_ERROR', message, error, true);
};

export const showErrorToast = (error: unknown, defaultMessage?: string) => {
  const appError = handleAuthError(error);
  toast.error(appError.message || defaultMessage || 'Ha ocurrido un error');
  return appError;
};

export const showSuccessToast = (message: string) => {
  toast.success(message);
};

export const showInfoToast = (message: string) => {
  toast.info(message);
};

export const showWarningToast = (message: string) => {
  toast.error(message, {
    icon: '⚠️',
  });
};

// Retry mechanism for network operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: unknown;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const appError = handleAuthError(error);
      
      // Don't retry if error is not retryable
      if (!appError.retryable || attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

// Loading state manager
export class LoadingManager {
  private loadingStates = new Map<string, boolean>();
  private listeners = new Set<() => void>();

  setLoading(key: string, loading: boolean) {
    this.loadingStates.set(key, loading);
    this.notifyListeners();
  }

  isLoading(key: string): boolean {
    return this.loadingStates.get(key) || false;
  }

  isAnyLoading(): boolean {
    return Array.from(this.loadingStates.values()).some(loading => loading);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

export const loadingManager = new LoadingManager();