import { supabase } from '../lib/supabase';
import { UserService, DashboardUser, CreateUserRequest, UpdateUserRequest } from '../types/auth';
import { hashPassword, validatePasswordStrength } from '../utils/password';
import { createError } from '../utils/errorHandling';

class UserServiceImpl implements UserService {
  async getUsers(): Promise<DashboardUser[]> {
    try {
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('id, email, created_at, updated_at, last_login')
        .order('created_at', { ascending: false });

      if (error) {
        throw createError('FETCH_USERS_ERROR', 'Error al obtener usuarios', error, true);
      }

      return data.map(this.mapToUser);
    } catch (error) {
      console.error('Get users error:', error);
      if (error instanceof Error && 'code' in error) {
        throw error; // Re-throw if it's already an AppError
      }
      throw createError('FETCH_USERS_ERROR', 'Error al obtener usuarios', error, true);
    }
  }

  async createUser(data: CreateUserRequest): Promise<DashboardUser> {
    try {
      // Validate password strength
      const passwordValidation = validatePasswordStrength(data.password);
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      // Validate password confirmation
      if (data.password !== data.confirmPassword) {
        throw new Error('Las contraseñas no coinciden');
      }

      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('dashboard_users')
        .select('id')
        .eq('email', data.email.toLowerCase())
        .single();

      if (existingUser) {
        throw new Error('Ya existe un usuario con este email');
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create user
      const { data: newUser, error } = await supabase
        .from('dashboard_users')
        .insert({
          email: data.email.toLowerCase(),
          password_hash: passwordHash
        })
        .select('id, email, created_at, updated_at, last_login')
        .single();

      if (error) {
        throw new Error('Error al crear usuario');
      }

      return this.mapToUser(newUser);
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  }

  async updateUser(id: string, data: UpdateUserRequest): Promise<DashboardUser> {
    try {
      // Check if email already exists (excluding current user)
      if (data.email) {
        const { data: existingUser } = await supabase
          .from('dashboard_users')
          .select('id')
          .eq('email', data.email.toLowerCase())
          .neq('id', id)
          .single();

        if (existingUser) {
          throw new Error('Ya existe un usuario con este email');
        }
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.email) {
        updateData.email = data.email.toLowerCase();
      }

      // If password is provided, validate and hash it
      if (data.password && data.password.trim() !== '') {
        const passwordValidation = validatePasswordStrength(data.password);
        if (!passwordValidation.isValid) {
          throw new Error(passwordValidation.message);
        }
        updateData.password_hash = await hashPassword(data.password);
      }

      const { data: updatedUser, error } = await supabase
        .from('dashboard_users')
        .update(updateData)
        .eq('id', id)
        .select('id, email, created_at, updated_at, last_login')
        .single();

      if (error) {
        throw new Error('Error al actualizar usuario');
      }

      return this.mapToUser(updatedUser);
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  }

  async deleteUser(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('dashboard_users')
        .delete()
        .eq('id', id);

      if (error) {
        throw new Error('Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  }

  async getUserById(id: string): Promise<DashboardUser | null> {
    try {
      const { data, error } = await supabase
        .from('dashboard_users')
        .select('id, email, created_at, updated_at, last_login')
        .eq('id', id)
        .single();

      if (error || !data) {
        return null;
      }

      return this.mapToUser(data);
    } catch (error) {
      console.error('Get user by id error:', error);
      return null;
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

export const userService = new UserServiceImpl();