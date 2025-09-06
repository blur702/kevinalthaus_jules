import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders, mockAuthenticatedState, mockUnauthenticatedState } from '@/test/utils';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to}>Redirect to {to}</div>,
    useLocation: () => ({ pathname: '/test' }),
  };
});

describe('ProtectedRoute', () => {
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  it('renders children when user is authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: mockAuthenticatedState,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', () => {
    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: mockUnauthenticatedState,
      }
    );

    expect(screen.getByTestId('navigate')).toBeInTheDocument();
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/login');
  });

  it('shows loading when authentication is being checked', () => {
    const loadingState = {
      ...mockUnauthenticatedState,
      auth: {
        ...mockUnauthenticatedState.auth,
        isLoading: true,
      },
    };

    renderWithProviders(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: loadingState,
      }
    );

    expect(screen.getByText(/verifying authentication/i)).toBeInTheDocument();
  });

  it('allows access when user has required permissions', () => {
    const userWithPermissions = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          permissions: ['test.read', 'test.write'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute permissions={['test.read']}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithPermissions,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('denies access when user lacks required permissions', () => {
    const userWithoutPermissions = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          permissions: ['other.read'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute permissions={['test.admin']}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithoutPermissions,
      }
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
    expect(screen.getByText(/you don't have the necessary permissions/i)).toBeInTheDocument();
  });

  it('allows access when user has required roles', () => {
    const userWithRoles = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          roles: ['admin', 'user'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute roles={['admin']}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithRoles,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('denies access when user lacks required roles', () => {
    const userWithoutRoles = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          roles: ['user'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute roles={['admin']}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithoutRoles,
      }
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('requires all permissions when requireAll is true', () => {
    const userWithSomePermissions = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          permissions: ['test.read'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute permissions={['test.read', 'test.write']} requireAll={true}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithSomePermissions,
      }
    );

    expect(screen.getByText(/access denied/i)).toBeInTheDocument();
  });

  it('allows access with any permission when requireAll is false', () => {
    const userWithOnePermission = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          permissions: ['test.read'],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute permissions={['test.read', 'test.write']} requireAll={false}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithOnePermission,
      }
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('renders custom fallback when access is denied', () => {
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Access Denied</div>;
    
    const userWithoutPermissions = {
      ...mockAuthenticatedState,
      auth: {
        ...mockAuthenticatedState.auth,
        user: {
          ...mockAuthenticatedState.auth.user,
          permissions: [],
        },
      },
    };

    renderWithProviders(
      <ProtectedRoute permissions={['test.admin']} fallback={<CustomFallback />}>
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: userWithoutPermissions,
      }
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('redirects to custom redirect URL when not authenticated', () => {
    renderWithProviders(
      <ProtectedRoute redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>,
      {
        preloadedState: mockUnauthenticatedState,
      }
    );

    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/custom-login');
  });
});