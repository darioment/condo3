import { describe, it, expect } from 'vitest';
import { validatePasswordStrength, hashPassword, comparePassword } from '../password';

describe('Password Utils', () => {
  describe('validatePasswordStrength', () => {
    it('should reject passwords shorter than 8 characters', () => {
      const result = validatePasswordStrength('1234567');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('al menos 8 caracteres');
    });

    it('should reject passwords without lowercase letters', () => {
      const result = validatePasswordStrength('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('letra minúscula');
    });

    it('should reject passwords without uppercase letters', () => {
      const result = validatePasswordStrength('password123');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('letra mayúscula');
    });

    it('should reject passwords without numbers', () => {
      const result = validatePasswordStrength('Password');
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('número');
    });

    it('should accept valid passwords', () => {
      const result = validatePasswordStrength('Password123');
      expect(result.isValid).toBe(true);
      expect(result.message).toBeUndefined();
    });
  });

  describe('hashPassword and comparePassword', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      
      const isValid = await comparePassword(password, hash);
      expect(isValid).toBe(true);
      
      const isInvalid = await comparePassword('WrongPassword', hash);
      expect(isInvalid).toBe(false);
    });
  });
});