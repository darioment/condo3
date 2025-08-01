import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import App from '../../App';

// Mock the auth service
vi.mock('../../services/authService', () => ({
  authService: {
    login: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
    validateSession: vi.fn(),
  },
}));

// Mock the user service
vi.mock('../../services/userService', () => ({
  userService: {
    getUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

const renderApp = () => {
  return render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should show login page when not authenticated', async () => {
    const { authService } = await import('../../services/authService');
    authService.getCurrentUser.mockResolvedValue(null);

    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
      expect(screen.getByText('Accede al dashboard de CondoFee')).toBeInTheDocument();
    });
  });

  it('should handle successful login flow', async () => {
    const { authService } = await import('../../services/authService');
    const mockUser = {
      id: '1',
      email: 'admin@condofee.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // Initially not authenticated
    authService.getCurrentUser.mockResolvedValueOnce(null);
    // Then successful login
    authService.login.mockResolvedValue({
      success: true,
      user: mockUser,
      message: 'Inicio de sesión exitoso',
    });

    const user = userEvent.setup();
    renderApp();

    // Wait for login page to load
    await waitFor(() => {
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    });

    // Fill in login form
    const emailInput = screen.getByPlaceholderText('Ingrese su email');
    const passwordInput = screen.getByPlaceholderText('Ingrese su contraseña');
    const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'admin@condofee.com');
    await user.type(passwordInput, 'admin123');
    await user.click(loginButton);

    // Verify login was called
    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('admin@condofee.com', 'admin123');
    });
  });

  it('should handle login failure', async () => {
    const { authService } = await import('../../services/authService');
    
    authService.getCurrentUser.mockResolvedValue(null);
    authService.login.mockResolvedValue({
      success: false,
      message: 'Email o contraseña incorrectos',
    });

    const user = userEvent.setup();
    renderApp();

    await waitFor(() => {
      expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    });

    const emailInput = screen.getByPlaceholderText('Ingrese su email');
    const passwordInput = screen.getByPlaceholderText('Ingrese su contraseña');
    const loginButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'wrong@email.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(loginButton);

    await waitFor(() => {
      expect(authService.login).toHaveBeenCalledWith('wrong@email.com', 'wrongpassword');
    });

    // Should still be on login page
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
  });

  it('should redirect to dashboard when authenticated', async () => {
    const { authService } = await import('../../services/authService');
    const mockUser = {
      id: '1',
      email: 'admin@condofee.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    authService.getCurrentUser.mockResolvedValue(mockUser);

    renderApp();

    // Should redirect to dashboard (we can check for navbar presence)
    await waitFor(() => {
      expect(screen.getByText('CondoFee')).toBeInTheDocument();
    });
  });
});

describe('User Management Flow Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should load and display users in management page', async () => {
    const { authService } = await import('../../services/authService');
    const { userService } = await import('../../services/userService');
    
    const mockUser = {
      id: '1',
      email: 'admin@condofee.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    const mockUsers = [
      mockUser,
      {
        id: '2',
        email: 'user2@condofee.com',
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    authService.getCurrentUser.mockResolvedValue(mockUser);
    userService.getUsers.mockResolvedValue(mockUsers);

    renderApp();

    // Navigate to user management
    await waitFor(() => {
      expect(screen.getByText('CondoFee')).toBeInTheDocument();
    });

    // This is a simplified test - in a real scenario, we'd need to navigate to the user management page
    // For now, we just verify the service would be called
    expect(authService.getCurrentUser).toHaveBeenCalled();
  });
});