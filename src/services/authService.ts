import { supabase } from '../lib/supabase';
import { AuthService, AuthResponse, DashboardUser, AuthError, AuthErrorCode } from '../types/auth';
import { comparePassword } from '../utils/password';

class AuthServiceImpl implements AuthService {
  private readonly TOKEN_KEY = 'dashboard_auth_token';
  private readonly USER_KEY = 'dashboard_user';

  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔐 Intentando login con email:', email);
      
      // Get user from dashboard_users table
      const { data: user, error } = await supabase
        .from('dashboard_users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      console.log('👤 Usuario encontrado:', user ? 'Sí' : 'No');
      console.log('❌ Error de consulta:', error);

      if (error || !user) {
        console.log('🚫 Usuario no encontrado o error en consulta');
        return {
          success: false,
          message: 'Email o contraseña incorrectos'
        };
      }

      console.log('🔑 Hash almacenado:', user.password_hash?.substring(0, 10) + '...');
      console.log('🔍 Verificando contraseña...');

      // Verify password
      const isValidPassword = await comparePassword(password, user.password_hash);
      console.log('✅ Contraseña válida:', isValidPassword);
      
      if (!isValidPassword) {
        console.log('🚫 Contraseña incorrecta');
        return {
          success: false,
          message: 'Email o contraseña incorrectos'
        };
      }

      // Update last login
      await supabase
        .from('dashboard_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', user.id);

      // Create session token (simple implementation)
      const token = this.generateToken(user.id);
      
      // Store in localStorage
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(this.mapToUser(user)));

      console.log('🎉 Login exitoso');
      return {
        success: true,
        user: this.mapToUser(user),
        token,
        message: 'Inicio de sesión exitoso'
      };
    } catch (error) {
      console.error('❌ Login error:', error);
      return {
        success: false,
        message: 'Error de conexión. Intente nuevamente'
      };
    }
  }

  async logout(): Promise<void> {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  async getCurrentUser(): Promise<DashboardUser | null> {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      const userStr = localStorage.getItem(this.USER_KEY);
      
      if (!token || !userStr) {
        return null;
      }

      // Validate token
      if (!this.validateToken(token)) {
        await this.logout();
        return null;
      }

      return JSON.parse(userStr);
    } catch (error) {
      console.error('Get current user error:', error);
      await this.logout();
      return null;
    }
  }

  async refreshToken(): Promise<string> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const newToken = this.generateToken(user.id);
    localStorage.setItem(this.TOKEN_KEY, newToken);
    return newToken;
  }

  async validateSession(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  }

  private generateToken(userId: string): string {
    // Simple token implementation - in production, use proper JWT
    const payload = {
      userId,
      timestamp: Date.now(),
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    return btoa(JSON.stringify(payload));
  }

  private validateToken(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token));
      return payload.expires > Date.now();
    } catch {
      return false;
    }
  }

  private mapToUser(dbUser: any): DashboardUser {
    return {
      id: dbUser.id,
      email: dbUser.email,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at,
      lastLogin: dbUser.last_login
    };
  }
}

export const authService = new AuthServiceImpl();