import React from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse';
  text?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({
  size = 'md',
  variant = 'spinner',
  text,
  fullScreen = false,
  overlay = false,
  className,
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const renderSpinner = () => (
    <Loader2 
      className={clsx(
        'animate-spin text-primary-600 dark:text-primary-400',
        sizeClasses[size]
      )} 
    />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={clsx(
            'bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse',
            {
              'w-1 h-1': size === 'sm',
              'w-2 h-2': size === 'md',
              'w-3 h-3': size === 'lg',
              'w-4 h-4': size === 'xl',
            }
          )}
          style={{
            animationDelay: `${index * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div
      className={clsx(
        'bg-primary-600 dark:bg-primary-400 rounded-full animate-pulse-slow',
        sizeClasses[size]
      )}
    />
  );

  const renderVariant = () => {
    switch (variant) {
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      default:
        return renderSpinner();
    }
  };

  const content = (
    <div
      className={clsx(
        'flex items-center justify-center',
        {
          'flex-col space-y-2': text,
          'space-x-2': !text && variant === 'spinner',
        },
        className
      )}
    >
      {renderVariant()}
      {text && (
        <span className="text-sm text-gray-600 dark:text-gray-300 animate-pulse">
          {text}
        </span>
      )}
    </div>
  );

  if (fullScreen || overlay) {
    return (
      <div
        className={clsx(
          'fixed inset-0 z-50 flex items-center justify-center',
          {
            'bg-white dark:bg-gray-900': fullScreen,
            'bg-black bg-opacity-50 dark:bg-opacity-70': overlay,
          }
        )}
      >
        {overlay && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
            {content}
          </div>
        )}
        {fullScreen && content}
      </div>
    );
  }

  return content;
};

// Skeleton loader component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  lines?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className,
  variant = 'rectangular',
  lines = 1,
}) => {
  const baseClasses = 'bg-gray-200 dark:bg-gray-700 animate-pulse';
  
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={clsx('space-y-2', className)}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={clsx(
              baseClasses,
              variantClasses[variant],
              'h-4'
            )}
            style={{
              width: index === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={clsx(
        baseClasses,
        variantClasses[variant],
        className
      )}
      style={{
        width: width || (variant === 'text' ? '100%' : '40px'),
        height: height || (variant === 'text' ? '1rem' : '40px'),
      }}
    />
  );
};

// Loading button component
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  loadingText,
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  className,
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin mr-2" />
      )}
      {loading ? loadingText || 'Loading...' : children}
    </button>
  );
};

export default Loading;