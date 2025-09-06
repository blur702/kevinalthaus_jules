import React, { forwardRef, ReactNode } from 'react';
import {
  IconButton as MuiIconButton,
  IconButtonProps as MuiIconButtonProps,
  Tooltip,
  CircularProgress,
  Badge,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, Size, Color } from '../../../types';
import { useId } from '../../../hooks';

/**
 * Extended icon button props interface
 */
export interface IconButtonProps extends Omit<MuiIconButtonProps, 'size' | 'color'>, BaseComponentProps {
  /**
   * Icon to display
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
   * Loading state
   * @default false
   */
  loading?: boolean;
  
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
  
  /**
   * Badge content to display
   */
  badge?: string | number;
  
  /**
   * Badge color
   * @default 'error'
   */
  badgeColor?: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  
  /**
   * Whether to show badge as a dot
   * @default false
   */
  badgeVariant?: 'standard' | 'dot';
  
  /**
   * Edge positioning for toolbar usage
   */
  edge?: 'start' | 'end' | false;
}

/**
 * Styled icon button component with enhanced theming
 */
const StyledIconButton = styled(MuiIconButton, {
  shouldForwardProp: (prop) => prop !== 'loading',
})<{ loading?: boolean }>(({ theme, loading }) => ({
  position: 'relative',
  transition: theme.transitions.create([
    'background-color',
    'box-shadow',
    'transform',
    'color',
  ], {
    duration: theme.transitions.duration.short,
  }),
  
  '&:hover': {
    transform: 'scale(1.05)',
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
  marginTop: -8,
  marginLeft: -8,
}));

/**
 * Shell Platform IconButton component
 * 
 * A comprehensive icon button component with loading states, tooltips, badges, and accessibility features.
 * Built on top of Material-UI's IconButton component with enhanced styling and functionality.
 * 
 * @example
 * ```tsx
 * <IconButton tooltip="Delete item" onClick={handleDelete}>
 *   <DeleteIcon />
 * </IconButton>
 * 
 * <IconButton
 *   loading={isLoading}
 *   badge={5}
 *   badgeColor="error"
 *   tooltip="Notifications"
 * >
 *   <NotificationsIcon />
 * </IconButton>
 * ```
 */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(({
  children,
  size = 'medium',
  color = 'primary',
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  tooltip,
  badge,
  badgeColor = 'error',
  badgeVariant = 'standard',
  edge,
  className,
  style,
  sx,
  testId,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  'aria-describedby': ariaDescribedby,
  ...rest
}, ref) => {
  const buttonId = useId('icon-button');
  const isDisabled = disabled || loading;
  
  // Handle click events
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!loading && onClick) {
      onClick(event);
    }
  };

  // Create the button element
  const buttonElement = (
    <StyledIconButton
      ref={ref}
      id={buttonId}
      size={size}
      color={color}
      disabled={isDisabled}
      onClick={handleClick}
      type={type}
      edge={edge}
      loading={loading}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      aria-label={ariaLabel || tooltip}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      aria-disabled={isDisabled}
      {...rest}
    >
      {loading ? null : children}
      {loading && (
        <LoadingIndicator
          size={16}
          color="inherit"
          aria-label="Loading"
        />
      )}
    </StyledIconButton>
  );

  // Wrap with badge if provided
  const badgedButton = badge !== undefined ? (
    <Badge
      badgeContent={badge}
      color={badgeColor}
      variant={badgeVariant}
      overlap="circular"
    >
      {buttonElement}
    </Badge>
  ) : buttonElement;

  // Wrap with tooltip if provided
  if (tooltip) {
    return (
      <Tooltip title={tooltip} arrow>
        {badgedButton}
      </Tooltip>
    );
  }

  return badgedButton;
});

IconButton.displayName = 'IconButton';