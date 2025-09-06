import React, { ReactNode } from 'react';
import {
  AppBar as MuiAppBar,
  AppBarProps as MuiAppBarProps,
  Toolbar,
  Typography,
  Box,
  Avatar,
  IconButton as MuiIconButton,
  Menu,
  MenuItem,
  Divider,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  AccountCircle,
  Brightness4,
  Brightness7,
  MoreVert,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, MenuItem as MenuItemType } from '../../../types';
import { useTheme } from '../../../theme';
import { useId } from '../../../hooks';

/**
 * Extended app bar props interface
 */
export interface AppBarProps extends Omit<MuiAppBarProps, 'position'>, BaseComponentProps {
  /**
   * App bar title
   */
  title?: string | ReactNode;
  
  /**
   * Logo element
   */
  logo?: ReactNode;
  
  /**
   * Navigation items to display
   */
  navigationItems?: MenuItemType[];
  
  /**
   * Actions to display in the app bar
   */
  actions?: ReactNode;
  
  /**
   * User information for profile menu
   */
  user?: {
    name: string;
    email?: string;
    avatar?: string;
  };
  
  /**
   * User menu items
   */
  userMenuItems?: MenuItemType[];
  
  /**
   * Whether to show theme toggle button
   * @default true
   */
  showThemeToggle?: boolean;
  
  /**
   * Whether to show navigation menu button
   * @default true
   */
  showMenuButton?: boolean;
  
  /**
   * Menu button click handler
   */
  onMenuClick?: () => void;
  
  /**
   * Position of the app bar
   * @default 'fixed'
   */
  position?: 'fixed' | 'absolute' | 'sticky' | 'static' | 'relative';
  
  /**
   * Elevation level
   * @default 1
   */
  elevation?: number;
  
  /**
   * Whether the app bar should be transparent
   * @default false
   */
  transparent?: boolean;
  
  /**
   * Custom height for the app bar
   */
  height?: number | string;
}

/**
 * Styled app bar component
 */
const StyledAppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => !['transparent', 'customHeight'].includes(prop as string),
})<{ transparent?: boolean; customHeight?: number | string }>(({ theme, transparent, customHeight }) => ({
  ...(transparent && {
    backgroundColor: 'transparent',
    backdropFilter: 'blur(10px)',
    borderBottom: `1px solid ${theme.palette.divider}`,
  }),
  
  '& .MuiToolbar-root': {
    minHeight: customHeight || 64,
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    
    [theme.breakpoints.up('sm')]: {
      paddingLeft: theme.spacing(3),
      paddingRight: theme.spacing(3),
    },
  },
}));

/**
 * Navigation items container
 */
const NavigationContainer = styled(Box)(({ theme }) => ({
  display: 'none',
  alignItems: 'center',
  gap: theme.spacing(2),
  
  [theme.breakpoints.up('md')]: {
    display: 'flex',
  },
}));

/**
 * Navigation item button
 */
const NavigationItem = styled('button')(({ theme }) => ({
  background: 'none',
  border: 'none',
  color: theme.palette.text.primary,
  cursor: 'pointer',
  padding: theme.spacing(1, 2),
  borderRadius: theme.shape.borderRadius,
  fontSize: theme.typography.button.fontSize,
  fontWeight: theme.typography.button.fontWeight,
  textDecoration: 'none',
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.short,
  }),
  
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  
  '&:focus': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
  
  '&:disabled': {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
}));

/**
 * Shell Platform AppBar component
 * 
 * A comprehensive application bar component with navigation, user menu, theme toggle,
 * and responsive behavior. Built on top of Material-UI's AppBar with enhanced features.
 * 
 * @example
 * ```tsx
 * <AppBar
 *   title="Shell Platform"
 *   logo={<Logo />}
 *   user={{ name: "John Doe", email: "john@example.com" }}
 *   navigationItems={[
 *     { id: "dashboard", label: "Dashboard", href: "/dashboard" },
 *     { id: "projects", label: "Projects", href: "/projects" }
 *   ]}
 *   onMenuClick={() => setDrawerOpen(true)}
 * />
 * ```
 */
export const AppBar: React.FC<AppBarProps> = ({
  title,
  logo,
  navigationItems = [],
  actions,
  user,
  userMenuItems = [],
  showThemeToggle = true,
  showMenuButton = true,
  onMenuClick,
  position = 'fixed',
  elevation = 1,
  transparent = false,
  height,
  className,
  style,
  sx,
  testId,
  ...rest
}) => {
  const appBarId = useId('app-bar');
  const muiTheme = useMuiTheme();
  const { mode, toggleTheme } = useTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  
  const [userMenuAnchorEl, setUserMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = React.useState<null | HTMLElement>(null);
  
  const isUserMenuOpen = Boolean(userMenuAnchorEl);
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl);

  // Handle user menu
  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchorEl(null);
  };

  // Handle mobile menu
  const handleMobileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMobileMenuAnchorEl(event.currentTarget);
  };

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null);
  };

  // Handle navigation item click
  const handleNavigationItemClick = (item: MenuItemType) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  // Handle user menu item click
  const handleUserMenuItemClick = (item: MenuItemType) => {
    handleUserMenuClose();
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  return (
    <>
      <StyledAppBar
        id={appBarId}
        position={position}
        elevation={elevation}
        transparent={transparent}
        customHeight={height}
        className={className}
        style={style}
        sx={sx}
        data-testid={testId}
        {...rest}
      >
        <Toolbar>
          {/* Menu button for mobile */}
          {showMenuButton && (
            <MuiIconButton
              edge="start"
              color="inherit"
              aria-label="Open navigation menu"
              onClick={onMenuClick}
              sx={{ mr: 2, display: { md: 'none' } }}
            >
              <MenuIcon />
            </MuiIconButton>
          )}

          {/* Logo */}
          {logo && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
              {logo}
            </Box>
          )}

          {/* Title */}
          {title && (
            <Typography
              variant="h6"
              component="div"
              sx={{ 
                flexGrow: { xs: 1, md: 0 },
                mr: { md: 4 },
              }}
            >
              {title}
            </Typography>
          )}

          {/* Navigation items (desktop) */}
          <NavigationContainer>
            {navigationItems.map((item) => (
              <NavigationItem
                key={item.id}
                disabled={item.disabled}
                onClick={() => handleNavigationItemClick(item)}
                aria-label={item.label}
              >
                {item.icon}
                {item.label}
              </NavigationItem>
            ))}
          </NavigationContainer>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Actions */}
          {actions && (
            <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
              {actions}
            </Box>
          )}

          {/* Theme toggle */}
          {showThemeToggle && (
            <MuiIconButton
              color="inherit"
              onClick={toggleTheme}
              aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} theme`}
            >
              {mode === 'light' ? <Brightness4 /> : <Brightness7 />}
            </MuiIconButton>
          )}

          {/* User menu */}
          {user && (
            <MuiIconButton
              edge="end"
              aria-label="User account menu"
              aria-controls="user-menu"
              aria-haspopup="true"
              onClick={handleUserMenuOpen}
              color="inherit"
            >
              {user.avatar ? (
                <Avatar src={user.avatar} alt={user.name} sx={{ width: 32, height: 32 }} />
              ) : (
                <AccountCircle />
              )}
            </MuiIconButton>
          )}

          {/* Mobile menu button */}
          {isMobile && navigationItems.length > 0 && (
            <MuiIconButton
              edge="end"
              aria-label="More options"
              aria-controls="mobile-menu"
              aria-haspopup="true"
              onClick={handleMobileMenuOpen}
              color="inherit"
              sx={{ ml: 1 }}
            >
              <MoreVert />
            </MuiIconButton>
          )}
        </Toolbar>
      </StyledAppBar>

      {/* User menu */}
      {user && (
        <Menu
          id="user-menu"
          anchorEl={userMenuAnchorEl}
          open={isUserMenuOpen}
          onClose={handleUserMenuClose}
          onClick={handleUserMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 200,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {/* User info */}
          <MenuItem disabled>
            <Box>
              <Typography variant="subtitle2">{user.name}</Typography>
              {user.email && (
                <Typography variant="caption" color="text.secondary">
                  {user.email}
                </Typography>
              )}
            </Box>
          </MenuItem>
          
          {userMenuItems.length > 0 && <Divider />}
          
          {/* User menu items */}
          {userMenuItems.map((item) => (
            <MenuItem
              key={item.id}
              onClick={() => handleUserMenuItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <Box sx={{ mr: 2, display: 'flex' }}>{item.icon}</Box>}
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      )}

      {/* Mobile navigation menu */}
      {isMobile && (
        <Menu
          id="mobile-menu"
          anchorEl={mobileMenuAnchorEl}
          open={isMobileMenuOpen}
          onClose={handleMobileMenuClose}
          onClick={handleMobileMenuClose}
          PaperProps={{
            elevation: 3,
            sx: {
              mt: 1.5,
              minWidth: 200,
            },
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          {navigationItems.map((item) => (
            <MenuItem
              key={item.id}
              onClick={() => handleNavigationItemClick(item)}
              disabled={item.disabled}
            >
              {item.icon && <Box sx={{ mr: 2, display: 'flex' }}>{item.icon}</Box>}
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      )}
    </>
  );
};