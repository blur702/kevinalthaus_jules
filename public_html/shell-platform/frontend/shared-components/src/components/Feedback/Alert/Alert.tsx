import React, { ReactNode } from 'react';
import {
  Alert as MuiAlert,
  AlertProps as MuiAlertProps,
  AlertTitle,
  Collapse,
  IconButton,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, Color } from '../../../types';
import { useId } from '../../../hooks';

/**
 * Extended alert props interface
 */
export interface AlertProps extends Omit<MuiAlertProps, 'severity' | 'variant'>, BaseComponentProps {
  /**
   * Alert content
   */
  children: ReactNode;
  
  /**
   * Alert severity/color
   * @default 'info'
   */
  severity?: 'error' | 'warning' | 'info' | 'success';
  
  /**
   * Alert variant
   * @default 'standard'
   */
  variant?: 'standard' | 'filled' | 'outlined';
  
  /**
   * Alert title
   */
  title?: string;
  
  /**
   * Whether the alert is visible
   * @default true
   */
  visible?: boolean;
  
  /**
   * Whether the alert can be dismissed
   * @default false
   */
  dismissible?: boolean;
  
  /**
   * Close handler for dismissible alerts
   */
  onClose?: () => void;
  
  /**
   * Auto-dismiss timeout in milliseconds
   */
  autoHideDuration?: number;
  
  /**
   * Custom icon to display
   */
  icon?: ReactNode;
  
  /**
   * Whether to show the default icon
   * @default true
   */
  showIcon?: boolean;
  
  /**
   * Action buttons or elements
   */
  action?: ReactNode;
  
  /**
   * Custom close button label for accessibility
   * @default 'Close alert'
   */
  closeLabel?: string;
}

/**
 * Styled alert component with enhanced features
 */
const StyledAlert = styled(MuiAlert)(({ theme }) => ({
  '& .MuiAlert-message': {
    flex: 1,
    minWidth: 0,
  },
  
  '& .MuiAlert-action': {
    alignItems: 'flex-start',
    paddingTop: 0,
    paddingLeft: theme.spacing(1),
  },
}));

/**
 * Shell Platform Alert component
 * 
 * A comprehensive alert component with dismissible functionality, auto-hide,
 * custom actions, and accessibility features. Built on top of Material-UI's Alert.
 * 
 * @example
 * ```tsx
 * <Alert severity="success" title="Success!" dismissible onClose={handleClose}>
 *   Your changes have been saved successfully.
 * </Alert>
 * 
 * <Alert
 *   severity="error"
 *   variant="filled"
 *   autoHideDuration={5000}
 *   action={<Button size="small">Retry</Button>}
 * >
 *   Failed to save changes. Please try again.
 * </Alert>
 * ```
 */
export const Alert: React.FC<AlertProps> = ({
  children,
  severity = 'info',
  variant = 'standard',
  title,
  visible = true,
  dismissible = false,
  onClose,
  autoHideDuration,
  icon,
  showIcon = true,
  action,
  closeLabel = 'Close alert',
  className,
  style,
  sx,
  testId,
  ...rest
}) => {
  const alertId = useId('alert');
  const [isVisible, setIsVisible] = React.useState(visible);
  
  // Handle visibility changes from props
  React.useEffect(() => {
    setIsVisible(visible);
  }, [visible]);

  // Handle auto-hide
  React.useEffect(() => {
    if (!autoHideDuration || !isVisible) return;

    const timer = setTimeout(() => {
      handleClose();
    }, autoHideDuration);

    return () => clearTimeout(timer);
  }, [autoHideDuration, isVisible]);

  // Handle close
  const handleClose = () => {
    setIsVisible(false);
    if (onClose) {
      // Delay callback to allow animation to complete
      setTimeout(onClose, 200);
    }
  };

  // Determine action content
  const alertAction = React.useMemo(() => {
    const actions = [];
    
    // Add custom action if provided
    if (action) {
      actions.push(action);
    }
    
    // Add close button if dismissible
    if (dismissible) {
      actions.push(
        <IconButton
          key="close"
          size="small"
          color="inherit"
          onClick={handleClose}
          aria-label={closeLabel}
        >
          <Close fontSize="small" />
        </IconButton>
      );
    }
    
    return actions.length > 0 ? actions : undefined;
  }, [action, dismissible, closeLabel]);

  return (
    <Collapse in={isVisible} timeout={200}>
      <StyledAlert
        id={alertId}
        severity={severity}
        variant={variant}
        icon={showIcon ? icon : false}
        action={alertAction}
        className={className}
        style={style}
        sx={sx}
        data-testid={testId}
        role="alert"
        {...rest}
      >
        {title && <AlertTitle>{title}</AlertTitle>}
        {children}
      </StyledAlert>
    </Collapse>
  );
};