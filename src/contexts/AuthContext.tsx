import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthContextType, DashboardUser } from '../types/auth';
import { authService } from '../services/authService';
import { showErrorToast, showSuccessToast, withRetry } from '../utils/errorHandling';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<DashboardUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const currentUser = await withRetry(() => authService.getCurrentUser(), 2, 500);
      setUser(currentUser);
    } catch (error) {
      console.error('Auth initialization error:', error);
      setUser(null);
      // Don't show error toast on initialization failure - user just needs to login
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      const response = await withRetry(() => authService.login(email, password), 2, 1000);
      
      if (response.success && response.user) {
        setUser(response.user);
        showSuccessToast(response.message || 'Inicio de sesión exitoso');
        return true;
      } else {
        showErrorToast(new Error(response.message || 'Error al iniciar sesión'));
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      showErrorToast(error, 'Error al iniciar sesión');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      showSuccessToast('Sesión cerrada exitosamente');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, clear the local state
      setUser(null);
      showErrorToast(error, 'Error al cerrar sesión');
    }
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};