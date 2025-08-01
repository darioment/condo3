import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProtectedRoute from '../ProtectedRoute';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the useAuth hook
vi.mock('../../contexts/AuthContext', async () => {
  const actual = await vi.importActual('../../contexts/AuthContext');
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

const MockedAuthProvider = ({ children, mockAuth }: any) => {
  const { useAuth } = require('../../contexts/AuthContext');
  useAuth.mockReturnValue(mockAuth);
  return <div>{children}</div>;
};

const renderWithRouter = (component: React.ReactElement, mockAuth: any) => {
  return render(
    <BrowserRouter>
      <MockedAuthProvider mockAuth={mockAuth}>
        {component}
      </MockedAuthProvider>
    </BrowserRouter>
  );
};

describe('ProtectedRoute', () => {
  it('should show loading spinner when loading', () => {
    const mockAuth = {
      isAuthenticated: false,
      loading: true,
      user: null,
    };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      mockAuth
    );

    expect(screen.getByText('Verificando autenticación...')).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    const mockAuth = {
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
    };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      mockAuth
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    const mockAuth = {
      isAuthenticated: false,
      loading: false,
      user: null,
    };

    renderWithRouter(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>,
      mockAuth
    );

    // Since we're using Navigate, the component won't render the protected content
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });
});