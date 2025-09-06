import React, { forwardRef, ReactNode } from 'react';
import {
  Fab as MuiFab,
  FabProps as MuiFabProps,
  Tooltip,
  CircularProgress,
  Zoom,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, Size, Color } from '../../../types';
import { useId, useReducedMotion } from '../../../hooks';

/**
 * Extended FAB props interface
 */
export interface FABProps extends Omit<MuiFabProps, 'size' | 'color' | 'variant'>, BaseComponentProps {
  /**
   * FAB content (usually an icon)
   */
  children: ReactNode;
  
  /**
   * FAB size variant
   * @default 'large'
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * FAB color variant
   * @default 'primary'
   */
  color?: Color;
  
  /**
   * FAB visual variant
   * @default 'circular'
   */
  variant?: 'circular' | 'extended';
  
  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * FAB disabled state
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
  
  /**
   * Whether the FAB is visible
   * @default true
   */
  visible?: boolean;
  
  /**
   * Position of the FAB
   */
  position?: 'fixed' | 'absolute' | 'relative' | 'static';
  
  /**
   * Positioning props when position is fixed/absolute
   */
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
  
  /**
   * Text for extended variant
   */
  label?: string;
}

/**
 * Styled FAB component with enhanced theming and positioning
 */
const StyledFab = styled(MuiFab, {
  shouldForwardProp: (prop) => 
    !['loading', 'position', 'top', 'bottom', 'left', 'right'].includes(prop as string),
})<{
  loading?: boolean;
  position?: string;
  top?: number | string;
  bottom?: number | string;
  left?: number | string;
  right?: number | string;
}>(({ theme, loading, position, top, bottom, left, right }) => ({
  position: position as any,
  top,
  bottom,
  left,
  right,
  zIndex: theme.zIndex.speedDial,
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'transform',
    'opacity',
  ], {
    duration: theme.transitions.duration.complex,
  }),
  
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: theme.shadows[8],
  },
  
  '&:active': {
    transform: 'scale(0.95)',
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
  marginTop: -12,
  marginLeft: -12,
}));

/**
 * Shell Platform FAB (Floating Action Button) component
 * 
 * A comprehensive floating action button component with loading states, tooltips, 
 * positioning, and accessibility features. Built on top of Material-UI's Fab component 
 * with enhanced styling and functionality.
 * 
 * @example
 * ```tsx
 * <FAB tooltip="Add new item" onClick={handleAdd}>
 *   <AddIcon />
 * </FAB>
 * 
 * <FAB
 *   variant="extended"
 *   label="Create"
 *   loading={isCreating}
 *   position="fixed"
 *   bottom={16}
 *   right={16}
 * >
 *   <AddIcon />
 * </FAB>
 * ```
 */
export const FAB = forwardRef<HTMLButtonElement, FABProps>(({
  children,
  size = 'large',
  color = 'primary',
  variant = 'circular',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  tooltip,
  visible = true,
  position = 'relative',
  top,
  bottom,
  left,
  right,
  label,
  className,
  style,
  sx,
  testId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  ...rest
}, ref) => {
  const fabId = useId('fab');
  const isDisabled = disabled || loading;
  const prefersReducedMotion = useReducedMotion();
  
  // Handle click events
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading && onClick) {
      onClick(event);
    }
  };

  // Create the FAB element
  const fabElement = (
    <StyledFab
      ref={ref}
      id={fabId}
      size={size}
      color={color}
      variant={variant}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
      loading={loading}
      position={position}
      top={top}
      bottom={bottom}
      left={left}
      right={right}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      aria-label={ariaLabel || tooltip || label}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-disabled={isDisabled}
      {...rest}
    >
      {loading ? null : children}
      {variant === 'extended' && label && !loading && (
        <span style={{ marginLeft: children ? 8 : 0 }}>{label}</span>
      )}
      {loading && (
        <LoadingIndicator
          size={24}
          color="inherit"
          aria-label="Loading"
        />
      )}
    </StyledFab>
  );

  // Wrap with tooltip if provided
  const tooltippedFab = tooltip ? (
    <Tooltip title={tooltip} arrow placement="left">
      {fabElement}
    </Tooltip>
  ) : fabElement;

  // Handle visibility with animation (respect reduced motion preference)
  if (!prefersReducedMotion) {
    return (
      <Zoom in={visible} timeout={300} unmountOnExit>
        {tooltippedFab}
      </Zoom>
    );
  }

  // No animation for reduced motion users
  return visible ? tooltippedFab : null;
});

FAB.displayName = 'FAB';