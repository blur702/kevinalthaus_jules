import React, { ReactNode } from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Backdrop,
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import { BaseComponentProps, Size } from '../../../types';
import { useId } from '../../../hooks';

/**
 * Loading variant types
 */
export type LoadingVariant = 'circular' | 'linear' | 'skeleton' | 'backdrop' | 'inline' | 'pulse' | 'dots';

/**
 * Skeleton variant types
 */
export type SkeletonVariant = 'text' | 'rectangular' | 'rounded' | 'circular';

/**
 * Extended loading props interface
 */
export interface LoadingProps extends BaseComponentProps {
  /**
   * Loading variant
   * @default 'circular'
   */
  variant?: LoadingVariant;
  
  /**
   * Loading state
   * @default true
   */
  loading?: boolean;
  
  /**
   * Size of the loading indicator
   * @default 'medium'
   */
  size?: Size | number;
  
  /**
   * Loading message to display
   */
  message?: string;
  
  /**
   * Color of the loading indicator
   * @default 'primary'
   */
  color?: 'primary' | 'secondary' | 'inherit';
  
  /**
   * Content to show when not loading
   */
  children?: ReactNode;
  
  /**
   * For linear variant: progress value (0-100)
   */
  value?: number;
  
  /**
   * For skeleton variant: skeleton type
   */
  skeletonVariant?: SkeletonVariant;
  
  /**
   * For skeleton variant: number of skeleton lines
   */
  skeletonLines?: number;
  
  /**
   * For skeleton variant: width of skeleton
   */
  skeletonWidth?: number | string;
  
  /**
   * For skeleton variant: height of skeleton
   */
  skeletonHeight?: number | string;
  
  /**
   * Whether to show loading overlay (for backdrop variant)
   * @default true
   */
  overlay?: boolean;
  
  /**
   * Minimum loading duration in milliseconds
   */
  minDuration?: number;
  
  /**
   * Custom loading indicator
   */
  indicator?: ReactNode;
}

/**
 * Pulse animation keyframes
 */
const pulseAnimation = keyframes`
  0% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

/**
 * Dot bounce animation keyframes
 */
const bounceAnimation = keyframes`
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
`;

/**
 * Styled loading container
 */
const LoadingContainer = styled(Box)<{ variant?: LoadingVariant }>(({ theme, variant }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  
  ...(variant === 'inline' && {
    display: 'inline-flex',
    verticalAlign: 'middle',
  }),
  
  ...(variant === 'pulse' && {
    animation: `${pulseAnimation} 2s ease-in-out infinite`,
  }),
}));

/**
 * Styled dots container for dots variant
 */
const DotsContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(0.5),
  
  '& > div': {
    width: 8,
    height: 8,
    backgroundColor: theme.palette.primary.main,
    borderRadius: '50%',
    animation: `${bounceAnimation} 1.4s ease-in-out infinite both`,
    
    '&:nth-of-type(1)': {
      animationDelay: '-0.32s',
    },
    '&:nth-of-type(2)': {
      animationDelay: '-0.16s',
    },
    '&:nth-of-type(3)': {
      animationDelay: '0s',
    },
  },
}));

/**
 * Message container
 */
const MessageContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

/**
 * Skeleton lines container
 */
const SkeletonLinesContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(1),
  width: '100%',
}));

/**
 * Shell Platform Loading component
 * 
 * A comprehensive loading component with multiple variants including circular progress,
 * linear progress, skeleton loaders, backdrop overlays, and custom animations.
 * 
 * @example
 * ```tsx
 * <Loading loading={isLoading} message="Loading data...">
 *   <DataContent />
 * </Loading>
 * 
 * <Loading variant="linear" value={progress} message="Uploading..." />
 * 
 * <Loading
 *   variant="skeleton"
 *   skeletonLines={3}
 *   skeletonVariant="text"
 *   loading={isLoading}
 * >
 *   <TextContent />
 * </Loading>
 * ```
 */
export const Loading: React.FC<LoadingProps> = ({
  variant = 'circular',
  loading = true,
  size = 'medium',
  message,
  color = 'primary',
  children,
  value,
  skeletonVariant = 'text',
  skeletonLines = 1,
  skeletonWidth,
  skeletonHeight,
  overlay = true,
  minDuration,
  indicator,
  className,
  style,
  sx,
  testId,
  ...rest
}) => {
  const loadingId = useId('loading');
  const [showLoading, setShowLoading] = React.useState(loading);
  const [minDurationComplete, setMinDurationComplete] = React.useState(!minDuration);

  // Handle minimum duration
  React.useEffect(() => {
    if (!minDuration) {
      setMinDurationComplete(true);
      return;
    }

    if (loading) {
      setMinDurationComplete(false);
      const timer = setTimeout(() => {
        setMinDurationComplete(true);
      }, minDuration);
      return () => clearTimeout(timer);
    } else {
      setMinDurationComplete(true);
    }
  }, [loading, minDuration]);

  // Update visibility based on loading state and minimum duration
  React.useEffect(() => {
    if (loading) {
      setShowLoading(true);
    } else if (minDurationComplete) {
      setShowLoading(false);
    }
  }, [loading, minDurationComplete]);

  // Get size value for indicators
  const getSizeValue = (size: Size | number): number => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'small': return 20;
      case 'large': return 60;
      default: return 40; // medium
    }
  };

  // Render loading indicator based on variant
  const renderLoadingIndicator = () => {
    if (indicator) {
      return indicator;
    }

    const sizeValue = getSizeValue(size);

    switch (variant) {
      case 'linear':
        return (
          <LinearProgress
            variant={value !== undefined ? 'determinate' : 'indeterminate'}
            value={value}
            color={color}
            sx={{ width: '100%' }}
          />
        );

      case 'skeleton':
        return (
          <SkeletonLinesContainer>
            {Array.from({ length: skeletonLines }, (_, index) => (
              <Skeleton
                key={index}
                variant={skeletonVariant}
                width={skeletonWidth || (index === skeletonLines - 1 ? '60%' : '100%')}
                height={skeletonHeight || (skeletonVariant === 'text' ? undefined : 200)}
              />
            ))}
          </SkeletonLinesContainer>
        );

      case 'dots':
        return (
          <DotsContainer>
            <div />
            <div />
            <div />
          </DotsContainer>
        );

      case 'pulse':
        return (
          <Box
            sx={{
              width: sizeValue,
              height: sizeValue,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
            }}
          />
        );

      case 'circular':
      default:
        return (
          <CircularProgress
            size={sizeValue}
            color={color}
            variant={value !== undefined ? 'determinate' : 'indeterminate'}
            value={value}
          />
        );
    }
  };

  // Render content based on loading state
  const renderContent = () => {
    if (showLoading) {
      const loadingIndicator = renderLoadingIndicator();
      
      if (message) {
        return (
          <MessageContainer>
            {loadingIndicator}
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          </MessageContainer>
        );
      }
      
      return loadingIndicator;
    }
    
    return children;
  };

  // Render backdrop variant
  if (variant === 'backdrop' && overlay) {
    return (
      <>
        {children}
        <Backdrop
          open={showLoading}
          sx={{ 
            color: '#fff', 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {renderLoadingIndicator()}
          {message && (
            <Typography variant="body1" color="inherit">
              {message}
            </Typography>
          )}
        </Backdrop>
      </>
    );
  }

  return (
    <LoadingContainer
      id={loadingId}
      variant={variant}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      role={showLoading ? 'status' : undefined}
      aria-live={showLoading ? 'polite' : undefined}
      aria-label={showLoading && message ? message : undefined}
      {...rest}
    >
      {renderContent()}
    </LoadingContainer>
  );
};