-- Script para crear usuario administrador inicial
-- Ejecuta este script en el SQL Editor de Supabase

-- Primero elimina cualquier usuario admin existente con hash inválido
DELETE FROM dashboard_users WHERE email = 'admin@condofee.com';

-- Inserta el usuario admin con hash válido de bcrypt para la contraseña 'admin123'
-- Hash generado con bcrypt, salt rounds = 12
INSERT INTO dashboard_users (email, password_hash, created_at, updated_at) 
VALUES (
  'admin@condofee.com', 
  '$2b$12$LQv3c1yqBwEHFuW.E.dDiOinDjMwcGinqOE.eO3rqOFQP5danFvpe',
  NOW(),
  NOW()
);

-- Verificar que se insertó correctamente
SELECT id, email, created_at, 
       CASE 
         WHEN password_hash LIKE '$2b$%' THEN 'Hash válido'
         ELSE 'Hash inválido'
       END as hash_status
FROM dashboard_users 
WHERE email = 'admin@condofee.com';