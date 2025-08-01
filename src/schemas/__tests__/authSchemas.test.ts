import { describe, it, expect } from 'vitest';
import { loginSchema, createUserSchema, editUserSchema } from '../authSchemas';

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123'
      };
      
      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Password123'
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        email: 'test@example.com',
        password: '1234567'
      };
      
      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createUserSchema', () => {
    it('should validate correct user creation data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'Password123'
      };
      
      const result = createUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'Password123',
        confirmPassword: 'DifferentPassword123'
      };
      
      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject weak passwords', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'weakpass',
        confirmPassword: 'weakpass'
      };
      
      const result = createUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('editUserSchema', () => {
    it('should validate edit data without password change', () => {
      const validData = {
        email: 'test@example.com',
        password: '',
        confirmPassword: ''
      };
      
      const result = editUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate edit data with password change', () => {
      const validData = {
        email: 'test@example.com',
        password: 'NewPassword123',
        confirmPassword: 'NewPassword123'
      };
      
      const result = editUserSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject mismatched passwords when changing', () => {
      const invalidData = {
        email: 'test@example.com',
        password: 'NewPassword123',
        confirmPassword: 'DifferentPassword123'
      };
      
      const result = editUserSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});