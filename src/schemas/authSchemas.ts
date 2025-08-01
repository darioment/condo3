import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingrese un email válido')
    .toLowerCase(),
  password: z
    .string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
});

export const createUserSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingrese un email válido')
    .toLowerCase(),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .regex(/(?=.*[a-z])/, 'La contraseña debe contener al menos una letra minúscula')
    .regex(/(?=.*[A-Z])/, 'La contraseña debe contener al menos una letra mayúscula')
    .regex(/(?=.*\d)/, 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string().min(1, 'Confirme la contraseña')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export const editUserSchema = z.object({
  email: z
    .string()
    .min(1, 'El email es requerido')
    .email('Ingrese un email válido')
    .toLowerCase(),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 8, 'La contraseña debe tener al menos 8 caracteres')
    .refine((val) => !val || /(?=.*[a-z])/.test(val), 'La contraseña debe contener al menos una letra minúscula')
    .refine((val) => !val || /(?=.*[A-Z])/.test(val), 'La contraseña debe contener al menos una letra mayúscula')
    .refine((val) => !val || /(?=.*\d)/.test(val), 'La contraseña debe contener al menos un número'),
  confirmPassword: z.string().optional()
}).refine((data) => {
  if (data.password && data.password.length > 0) {
    return data.password === data.confirmPassword;
  }
  return true;
}, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword']
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type EditUserFormData = z.infer<typeof editUserSchema>;