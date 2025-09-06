import React, { forwardRef, ReactNode } from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, Size, Color, Variant } from '../../../types';
import { useId } from '../../../hooks';

/**
 * Extended button props interface
 */
export interface ButtonProps extends Omit<MuiButtonProps, 'size' | 'color' | 'variant'>, BaseComponentProps {
  /**
   * Button content
   */
  children: ReactNode;
  
  /**
   * Button size variant
   * @default 'medium'
   */
  size?: Size;
  
  /**
   * Button color variant
   * @default 'primary'
   */
  color?: Color;
  
  /**
   * Button visual variant
   * @default 'contained'
   */
  variant?: Variant;
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Loading text to display during loading state
   */
  loadingText?: string;
  
  /**
   * Icon to display before the button text
   */
  startIcon?: ReactNode;
  
  /**
   * Icon to display after the button text
   */
  endIcon?: ReactNode;
  
  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Button disabled state
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Click handler
   */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  
  /**
   * Button type
   * @default 'button'
   */
  type?: 'button' | 'submit' | 'reset';
  
  /**
   * Tooltip text
   */
  tooltip?: string;
}

/**
 * Styled button component with enhanced theming
 */
const StyledButton = styled(MuiButton, {
  shouldForwardProp: (prop) => prop !== 'loading',
})<{ loading?: boolean }>(({ theme, loading }) => ({
  position: 'relative',
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'border-color',
    'color',
    'transform',
  ], {
    duration: theme.transitions.duration.short,
  }),
  
  '&:hover': {
    transform: 'translateY(-1px)',
  },
  
  '&:active': {
    transform: 'translateY(0)',
  },
  
  '&:disabled': {
    transform: 'none',
    cursor: 'not-allowed',
  },
  
  ...(loading && {
    color: 'transparent',
    '&:hover': {
      transform: 'none',
    },
  }),
}));

/**
 * Loading indicator styled component
 */
const LoadingIndicator = styled(CircularProgress)(({ theme }) => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  marginTop: -10,
  marginLeft: -10,
}));

/**
 * Shell Platform Button component
 * 
 * A comprehensive button component with loading states, icons, and accessibility features.
 * Built on top of Material-UI's Button component with enhanced styling and functionality.
 * 
 * @example
 * ```tsx
 * <Button variant="contained" color="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * <Button
 *   variant="outlined"
 *   loading={isLoading}
 *   loadingText="Processing..."
 *   startIcon={<SaveIcon />}
 * >
 *   Save
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  size = 'medium',
  color = 'primary',
  variant = 'contained',
  loading = false,
  loadingText,
  startIcon,
  endIcon,
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  tooltip,
  className,
  style,
  sx,
  testId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  ...rest
}, ref) => {
  const buttonId = useId('button');
  const isDisabled = disabled || loading;
  
  // Determine button content based on loading state
  const buttonContent = loading && loadingText ? loadingText : children;
  
  // Handle click events
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading && onClick) {
      onClick(event);
    }
  };

  return (
    <StyledButton
      ref={ref}
      id={buttonId}
      size={size}
      color={color}
      variant={variant}
      fullWidth={fullWidth}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
      loading={loading}
      startIcon={!loading ? startIcon : undefined}
      endIcon={!loading ? endIcon : undefined}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-disabled={isDisabled}
      title={tooltip}
      {...rest}
    >
      {buttonContent}
      {loading && (
        <LoadingIndicator
          size={20}
          color="inherit"
          aria-label="Loading"
        />
      )}
    </StyledButton>
  );
});

Button.displayName = 'Button';