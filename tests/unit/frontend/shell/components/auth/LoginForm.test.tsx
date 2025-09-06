import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, mockUnauthenticatedState, mockFetchSuccess, mockFetchError } from '@/test/utils';
import LoginForm from '@/components/auth/LoginForm';

// Mock the auth service
vi.mock('@/services/auth.service', () => ({
  authService: {
    login: vi.fn(),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    expect(screen.getByRole('heading', { name: /sign in to shell platform/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByText(/don't have an account/i)).toBeInTheDocument();
  });

  it('shows validation errors for empty fields', async () => {
    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    // Try to submit without filling fields
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid email', async () => {
    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
  });

  it('toggles password visibility', async () => {
    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

    expect(passwordInput).toHaveAttribute('type', 'password');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');

    await user.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('submits form with valid credentials', async () => {
    mockFetchSuccess({
      user: global.TEST_USER,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
    });

    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/signing in.../i)).toBeInTheDocument();
    });
  });

  it('displays error message on login failure', async () => {
    mockFetchError(401, 'Invalid credentials');

    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/authentication error/i)).toBeInTheDocument();
    });
  });

  it('remembers user preference', async () => {
    const { user } = renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const rememberMeCheckbox = screen.getByLabelText(/remember me/i);
    
    expect(rememberMeCheckbox).not.toBeChecked();
    
    await user.click(rememberMeCheckbox);
    
    expect(rememberMeCheckbox).toBeChecked();
  });

  it('has link to forgot password page', () => {
    renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const forgotPasswordLink = screen.getByRole('link', { name: /forgot your password/i });
    expect(forgotPasswordLink).toHaveAttribute('href', '/forgot-password');
  });

  it('has link to registration page', () => {
    renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    const signUpLink = screen.getByRole('link', { name: /sign up here/i });
    expect(signUpLink).toHaveAttribute('href', '/register');
  });

  it('shows demo credentials in development mode', () => {
    // Mock development environment
    vi.stubEnv('DEV', true);
    
    renderWithProviders(<LoginForm />, {
      preloadedState: mockUnauthenticatedState,
    });

    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
    expect(screen.getByText(/demo@shell-platform.com/i)).toBeInTheDocument();
  });
});