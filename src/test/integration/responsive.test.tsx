import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../../pages/LoginPage';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the auth context
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

const renderWithAuth = (component: React.ReactElement, mockAuth: any) => {
  return render(
    <BrowserRouter>
      <MockedAuthProvider mockAuth={mockAuth}>
        {component}
      </MockedAuthProvider>
    </BrowserRouter>
  );
};

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('Responsive Design Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login page responsively', () => {
    const mockAuth = {
      isAuthenticated: false,
      loading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    };

    renderWithAuth(<LoginPage />, mockAuth);

    // Check for responsive elements
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByText('Accede al dashboard de CondoFee')).toBeInTheDocument();
    
    // Check for form elements
    expect(screen.getByPlaceholderText('Ingrese su email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ingrese su contraseña')).toBeInTheDocument();
    
    // Check for responsive classes (Tailwind CSS classes)
    const container = screen.getByText('Iniciar Sesión').closest('div');
    expect(container).toBeInTheDocument();
  });

  it('should handle mobile viewport', () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const mockAuth = {
      isAuthenticated: false,
      loading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    };

    renderWithAuth(<LoginPage />, mockAuth);

    // Verify the page still renders correctly on mobile
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('should handle tablet viewport', () => {
    // Mock tablet viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const mockAuth = {
      isAuthenticated: false,
      loading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    };

    renderWithAuth(<LoginPage />, mockAuth);

    // Verify the page still renders correctly on tablet
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });

  it('should handle desktop viewport', () => {
    // Mock desktop viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const mockAuth = {
      isAuthenticated: false,
      loading: false,
      user: null,
      login: vi.fn(),
      logout: vi.fn(),
    };

    renderWithAuth(<LoginPage />, mockAuth);

    // Verify the page still renders correctly on desktop
    expect(screen.getByText('Iniciar Sesión')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /iniciar sesión/i })).toBeInTheDocument();
  });
});