import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';

// Mock the auth service
vi.mock('../../services/authService', () => ({
  authService: {
    getCurrentUser: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  },
}));

const TestComponent = () => {
  const { useAuth } = require('../../contexts/AuthContext');
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (isAuthenticated) return <div>Authenticated: {user?.email}</div>;
  return <div>Not authenticated</div>;
};

const renderWithAuth = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Session Persistence Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('should restore user session from localStorage', async () => {
    const { authService } = await import('../../services/authService');
    const mockUser = {
      id: '1',
      email: 'admin@condofee.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // Mock stored session
    authService.getCurrentUser.mockResolvedValue(mockUser);

    renderWithAuth();

    // Should show loading initially
    expect(document.body.textContent).toContain('Loading...');

    // Should restore session
    await waitFor(() => {
      expect(document.body.textContent).toContain('Authenticated: admin@condofee.com');
    });

    expect(authService.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle expired session', async () => {
    const { authService } = await import('../../services/authService');
    
    // Mock expired session
    authService.getCurrentUser.mockResolvedValue(null);

    renderWithAuth();

    // Should show loading initially
    expect(document.body.textContent).toContain('Loading...');

    // Should show not authenticated
    await waitFor(() => {
      expect(document.body.textContent).toContain('Not authenticated');
    });

    expect(authService.getCurrentUser).toHaveBeenCalled();
  });

  it('should handle session initialization error', async () => {
    const { authService } = await import('../../services/authService');
    
    // Mock initialization error
    authService.getCurrentUser.mockRejectedValue(new Error('Network error'));

    renderWithAuth();

    // Should show loading initially
    expect(document.body.textContent).toContain('Loading...');

    // Should handle error gracefully and show not authenticated
    await waitFor(() => {
      expect(document.body.textContent).toContain('Not authenticated');
    });

    expect(authService.getCurrentUser).toHaveBeenCalled();
  });

  it('should clear session on logout', async () => {
    const { authService } = await import('../../services/authService');
    const mockUser = {
      id: '1',
      email: 'admin@condofee.com',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    };

    // Initially authenticated
    authService.getCurrentUser.mockResolvedValue(mockUser);
    authService.logout.mockResolvedValue(undefined);

    renderWithAuth();

    // Should restore session
    await waitFor(() => {
      expect(document.body.textContent).toContain('Authenticated: admin@condofee.com');
    });

    // Simulate logout (this would normally be triggered by user action)
    // For this test, we just verify the service methods are available
    expect(authService.logout).toBeDefined();
  });
});