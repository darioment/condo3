# Design Document

## Overview

El sistema de autenticación para el dashboard será implementado utilizando la infraestructura existente de Supabase, aprovechando su sistema de autenticación integrado y las políticas RLS (Row Level Security) ya configuradas. El diseño incluye un sistema de login simple con gestión de sesiones y un módulo CRUD completo para administrar usuarios del dashboard.

La solución se integrará de manera transparente con la aplicación React existente, utilizando React Router para proteger rutas y Context API para manejar el estado de autenticación global.

## Architecture

### Authentication Flow
```
Usuario → Login Form → Supabase Auth → Session Storage → Dashboard Access
                ↓
            Error Handling → User Feedback
```

### Component Architecture
```
App.tsx
├── AuthProvider (Context)
├── ProtectedRoute (HOC)
├── LoginPage
├── Dashboard (Protected)
└── UserManagement (Protected)
    ├── UserList
    ├── UserForm (Create/Edit)
    └── UserDeleteConfirm
```

### Database Schema Extension
Se creará una nueva tabla `dashboard_users` para gestionar usuarios específicos del dashboard:

```sql
dashboard_users (
  id: UUID (PK)
  email: TEXT (UNIQUE)
  password_hash: TEXT
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
  last_login: TIMESTAMP
)
```

## Components and Interfaces

### 1. Authentication Context
**Ubicación:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: DashboardUser | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
}
```

**Responsabilidades:**
- Mantener el estado de autenticación global
- Proporcionar métodos para login/logout
- Persistir sesión en localStorage
- Manejar la validación de tokens

### 2. Protected Route Component
**Ubicación:** `src/components/ProtectedRoute.tsx`

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
}
```

**Responsabilidades:**
- Verificar autenticación antes de renderizar componentes
- Redirigir a login si no está autenticado
- Mostrar loading state durante verificación

### 3. Login Page
**Ubicación:** `src/pages/LoginPage.tsx`

**Características:**
- Formulario con validación usando react-hook-form y zod
- Manejo de errores con mensajes claros
- Diseño responsive usando Tailwind CSS
- Integración con react-hot-toast para notificaciones

### 4. User Management Module
**Ubicación:** `src/pages/UserManagementPage.tsx`

**Sub-componentes:**
- `UserList`: Tabla con lista de usuarios y acciones
- `UserForm`: Modal para crear/editar usuarios
- `DeleteConfirmDialog`: Confirmación de eliminación

### 5. Enhanced Navbar
**Modificación:** `src/components/Navbar.tsx`

**Cambios:**
- Agregar opción "Gestión de Usuarios" al menú
- Agregar botón de "Cerrar Sesión" en el dropdown del usuario
- Mostrar información del usuario autenticado

## Data Models

### DashboardUser Interface
```typescript
interface DashboardUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
}

interface CreateUserRequest {
  email: string;
  password: string;
  confirmPassword: string;
}

interface UpdateUserRequest {
  email: string;
  password?: string; // Optional - only if changing password
}
```

### Authentication Service
```typescript
interface AuthService {
  login(email: string, password: string): Promise<AuthResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<DashboardUser | null>;
  refreshToken(): Promise<string>;
}

interface UserService {
  getUsers(): Promise<DashboardUser[]>;
  createUser(data: CreateUserRequest): Promise<DashboardUser>;
  updateUser(id: string, data: UpdateUserRequest): Promise<DashboardUser>;
  deleteUser(id: string): Promise<void>;
}
```

## Error Handling

### Authentication Errors
- **Invalid Credentials**: "Email o contraseña incorrectos"
- **Network Error**: "Error de conexión. Intente nuevamente"
- **Session Expired**: "Su sesión ha expirado. Inicie sesión nuevamente"

### User Management Errors
- **Duplicate Email**: "Ya existe un usuario con este email"
- **Weak Password**: "La contraseña debe tener al menos 8 caracteres"
- **Delete Error**: "No se puede eliminar el usuario. Intente nuevamente"

### Error Handling Strategy
1. **Client-side validation** usando zod schemas
2. **Server-side validation** en el backend
3. **User-friendly messages** con react-hot-toast
4. **Retry mechanisms** para errores de red
5. **Fallback UI** para estados de error

## Testing Strategy

### Unit Tests
- **AuthContext**: Verificar login/logout y manejo de estado
- **ProtectedRoute**: Verificar redirección y renderizado condicional
- **UserService**: Verificar operaciones CRUD
- **Form Validation**: Verificar validaciones de formularios

### Integration Tests
- **Login Flow**: Desde formulario hasta dashboard
- **User Management**: Crear, editar y eliminar usuarios
- **Session Management**: Persistencia y expiración de sesiones

### E2E Tests
- **Complete Authentication Flow**: Login → Dashboard → Logout
- **User Management Workflow**: Acceder a gestión → CRUD operations
- **Security**: Verificar protección de rutas

## Security Considerations

### Password Security
- **Hashing**: Usar bcrypt con salt rounds apropiados
- **Validation**: Mínimo 8 caracteres, combinación de letras y números
- **Storage**: Nunca almacenar contraseñas en texto plano

### Session Management
- **JWT Tokens**: Con expiración apropiada (24 horas)
- **Refresh Tokens**: Para renovación automática
- **Secure Storage**: HttpOnly cookies para tokens sensibles

### Route Protection
- **Client-side**: ProtectedRoute component
- **Server-side**: Verificación de tokens en cada request
- **RLS Policies**: Políticas de Supabase para acceso a datos

## Implementation Phases

### Phase 1: Core Authentication
1. Crear tabla dashboard_users
2. Implementar AuthContext y AuthService
3. Crear LoginPage con validación
4. Implementar ProtectedRoute

### Phase 2: User Management
1. Crear UserManagementPage
2. Implementar UserService con CRUD operations
3. Crear formularios de usuario con validación
4. Implementar confirmación de eliminación

### Phase 3: Integration & Polish
1. Integrar con Navbar existente
2. Agregar manejo de errores robusto
3. Implementar tests
4. Optimizar UX con loading states

## Technical Dependencies

### New Dependencies
- **bcryptjs**: Para hashing de contraseñas
- **jsonwebtoken**: Para manejo de JWT tokens (si no se usa Supabase Auth)

### Existing Dependencies (Leveraged)
- **@supabase/supabase-js**: Para base de datos y posible autenticación
- **react-hook-form**: Para formularios
- **zod**: Para validación
- **react-hot-toast**: Para notificaciones
- **lucide-react**: Para iconos
- **tailwindcss**: Para estilos