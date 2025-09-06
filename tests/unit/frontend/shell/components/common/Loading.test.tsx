import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Loading, { Skeleton, LoadingButton } from '@/components/common/Loading';

describe('Loading', () => {
  it('renders spinner variant by default', () => {
    render(<Loading />);
    
    // Check for spinner icon (Loader2 component)
    const spinner = document.querySelector('[data-lucide="loader-2"]');
    expect(spinner).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<Loading text="Loading data..." />);
    
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders dots variant', () => {
    render(<Loading variant="dots" />);
    
    // Dots variant should have 3 dots
    const dots = document.querySelectorAll('.animate-pulse');
    expect(dots).toHaveLength(3);
  });

  it('renders pulse variant', () => {
    render(<Loading variant="pulse" />);
    
    const pulseElement = document.querySelector('.animate-pulse-slow');
    expect(pulseElement).toBeInTheDocument();
  });

  it('renders different sizes', () => {
    const { rerender } = render(<Loading size="sm" />);
    let spinner = document.querySelector('.w-4.h-4');
    expect(spinner).toBeInTheDocument();

    rerender(<Loading size="lg" />);
    spinner = document.querySelector('.w-8.h-8');
    expect(spinner).toBeInTheDocument();
  });

  it('renders fullscreen variant', () => {
    render(<Loading fullScreen />);
    
    const fullscreenContainer = document.querySelector('.fixed.inset-0');
    expect(fullscreenContainer).toBeInTheDocument();
  });

  it('renders overlay variant', () => {
    render(<Loading overlay />);
    
    const overlay = document.querySelector('.bg-black.bg-opacity-50');
    expect(overlay).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders with default props', () => {
    render(<Skeleton />);
    
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });

  it('renders multiple lines', () => {
    render(<Skeleton variant="text" lines={3} />);
    
    const lines = document.querySelectorAll('.animate-pulse');
    expect(lines).toHaveLength(3);
  });

  it('renders circular variant', () => {
    render(<Skeleton variant="circular" />);
    
    const circular = document.querySelector('.rounded-full');
    expect(circular).toBeInTheDocument();
  });

  it('renders with custom dimensions', () => {
    render(<Skeleton width={200} height={100} />);
    
    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toHaveStyle({ width: '200px', height: '100px' });
  });
});

describe('LoadingButton', () => {
  it('renders normally when not loading', () => {
    render(<LoadingButton>Click me</LoadingButton>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('shows loading state', () => {
    render(<LoadingButton loading>Click me</LoadingButton>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Loading...');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows custom loading text', () => {
    render(<LoadingButton loading loadingText="Saving...">Save</LoadingButton>);
    
    expect(screen.getByRole('button')).toHaveTextContent('Saving...');
  });

  it('applies variant classes', () => {
    const { rerender } = render(<LoadingButton variant="primary">Primary</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-primary-600');

    rerender(<LoadingButton variant="secondary">Secondary</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-gray-200');

    rerender(<LoadingButton variant="danger">Danger</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('bg-red-600');
  });

  it('applies size classes', () => {
    const { rerender } = render(<LoadingButton size="sm">Small</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('px-3', 'py-1.5', 'text-sm');

    rerender(<LoadingButton size="lg">Large</LoadingButton>);
    expect(screen.getByRole('button')).toHaveClass('px-6', 'py-3', 'text-base');
  });

  it('is disabled when loading', () => {
    render(<LoadingButton loading>Loading</LoadingButton>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when explicitly disabled', () => {
    render(<LoadingButton disabled>Disabled</LoadingButton>);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(<LoadingButton loading>Loading</LoadingButton>);
    
    const spinner = document.querySelector('[data-lucide="loader-2"]');
    expect(spinner).toBeInTheDocument();
  });
});