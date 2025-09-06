import React, { ReactNode } from 'react';
import {
  Drawer as MuiDrawer,
  DrawerProps as MuiDrawerProps,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Collapse,
  useMediaQuery,
  useTheme as useMuiTheme,
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { BaseComponentProps, MenuItem as MenuItemType } from '../../../types';
import { IconButton } from '../../Buttons';
import { useId, useFocusTrap } from '../../../hooks';

/**
 * Extended drawer props interface
 */
export interface DrawerProps extends Omit<MuiDrawerProps, 'variant' | 'anchor'>, BaseComponentProps {
  /**
   * Navigation items to display
   */
  navigationItems?: MenuItemType[];
  
  /**
   * Header content
   */
  header?: ReactNode;
  
  /**
   * Footer content
   */
  footer?: ReactNode;
  
  /**
   * Whether the drawer is open
   * @default false
   */
  open?: boolean;
  
  /**
   * Close handler
   */
  onClose?: () => void;
  
  /**
   * Drawer variant
   * @default 'temporary'
   */
  variant?: 'permanent' | 'persistent' | 'temporary';
  
  /**
   * Drawer anchor position
   * @default 'left'
   */
  anchor?: 'left' | 'right' | 'top' | 'bottom';
  
  /**
   * Drawer width
   * @default 280
   */
  width?: number;
  
  /**
   * Whether drawer can be collapsed (for permanent variant)
   * @default false
   */
  collapsible?: boolean;
  
  /**
   * Whether drawer is collapsed
   * @default false
   */
  collapsed?: boolean;
  
  /**
   * Collapse toggle handler
   */
  onToggleCollapse?: () => void;
  
  /**
   * Selected navigation item ID
   */
  selectedItem?: string;
  
  /**
   * Navigation item selection handler
   */
  onItemSelect?: (item: MenuItemType) => void;
  
  /**
   * Whether to show item icons
   * @default true
   */
  showIcons?: boolean;
}

/**
 * Styled drawer component
 */
const StyledDrawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => !['drawerWidth', 'collapsed'].includes(prop as string),
})<{ drawerWidth?: number; collapsed?: boolean }>(({ theme, drawerWidth = 280, collapsed }) => ({
  width: collapsed ? 64 : drawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  
  '& .MuiDrawer-paper': {
    width: collapsed ? 64 : drawerWidth,
    transition: theme.transitions.create('width', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
    overflowX: 'hidden',
    borderRight: `1px solid ${theme.palette.divider}`,
  },
  
  ...(collapsed && {
    '& .MuiDrawer-paper': {
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
      }),
    },
  }),
}));

/**
 * Header container
 */
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(0, 1),
  minHeight: 64,
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

/**
 * Navigation item component
 */
const NavigationItem: React.FC<{
  item: MenuItemType;
  level: number;
  collapsed: boolean;
  showIcons: boolean;
  selected: boolean;
  onSelect: (item: MenuItemType) => void;
}> = ({ item, level, collapsed, showIcons, selected, onSelect }) => {
  const [expanded, setExpanded] = React.useState(false);
  const hasChildren = item.children && item.children.length > 0;

  const handleClick = () => {
    if (hasChildren) {
      setExpanded(!expanded);
    } else {
      onSelect(item);
    }
  };

  return (
    <>
      <ListItem disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          selected={selected}
          onClick={handleClick}
          disabled={item.disabled}
          sx={{
            minHeight: 48,
            justifyContent: collapsed ? 'center' : 'initial',
            pl: level * 2 + 2,
          }}
        >
          {showIcons && item.icon && (
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: collapsed ? 0 : 3,
                justifyContent: 'center',
              }}
            >
              {item.icon}
            </ListItemIcon>
          )}
          
          {!collapsed && (
            <>
              <ListItemText primary={item.label} />
              {hasChildren && (expanded ? <ExpandLess /> : <ExpandMore />)}
            </>
          )}
        </ListItemButton>
      </ListItem>
      
      {hasChildren && !collapsed && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            {item.children!.map((child) => (
              <NavigationItem
                key={child.id}
                item={child}
                level={level + 1}
                collapsed={collapsed}
                showIcons={showIcons}
                selected={child.id === selected}
                onSelect={onSelect}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

/**
 * Shell Platform Drawer component
 * 
 * A comprehensive navigation drawer component with collapsible sidebar,
 * nested navigation, and responsive behavior. Built on top of Material-UI's
 * Drawer with enhanced navigation features.
 * 
 * @example
 * ```tsx
 * <Drawer
 *   open={drawerOpen}
 *   onClose={() => setDrawerOpen(false)}
 *   navigationItems={[
 *     { id: "dashboard", label: "Dashboard", icon: <DashboardIcon /> },
 *     { 
 *       id: "projects", 
 *       label: "Projects", 
 *       icon: <ProjectsIcon />,
 *       children: [
 *         { id: "active", label: "Active Projects" },
 *         { id: "archived", label: "Archived Projects" }
 *       ]
 *     }
 *   ]}
 *   selectedItem="dashboard"
 *   onItemSelect={(item) => navigate(item.href)}
 * />
 * ```
 */
export const Drawer: React.FC<DrawerProps> = ({
  navigationItems = [],
  header,
  footer,
  open = false,
  onClose,
  variant = 'temporary',
  anchor = 'left',
  width = 280,
  collapsible = false,
  collapsed = false,
  onToggleCollapse,
  selectedItem,
  onItemSelect,
  showIcons = true,
  className,
  style,
  sx,
  testId,
  ...rest
}) => {
  const drawerId = useId('drawer');
  const muiTheme = useMuiTheme();
  const isMobile = useMediaQuery(muiTheme.breakpoints.down('md'));
  const containerRef = useFocusTrap(open && variant === 'temporary');
  
  // Use temporary variant on mobile
  const effectiveVariant = isMobile ? 'temporary' : variant;
  const isCollapsed = collapsed && variant === 'permanent' && collapsible;

  // Handle item selection
  const handleItemSelect = (item: MenuItemType) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
    
    // Close drawer on mobile after selection
    if (isMobile && onClose) {
      onClose();
    }
  };

  // Handle backdrop click for temporary variant
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };

  return (
    <StyledDrawer
      ref={containerRef}
      id={drawerId}
      variant={effectiveVariant}
      anchor={anchor}
      open={open}
      onClose={handleClose}
      drawerWidth={width}
      collapsed={isCollapsed}
      className={className}
      style={style}
      sx={sx}
      data-testid={testId}
      {...rest}
    >
      {/* Header */}
      {(header || (collapsible && variant === 'permanent')) && (
        <DrawerHeader>
          {!isCollapsed && header}
          {collapsible && variant === 'permanent' && (
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              tooltip={`${collapsed ? 'Expand' : 'Collapse'} sidebar`}
            >
              {collapsed ? <ChevronRight /> : <ChevronLeft />}
            </IconButton>
          )}
        </DrawerHeader>
      )}

      {/* Navigation */}
      {navigationItems.length > 0 && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List>
            {navigationItems.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.divider && index > 0 && <Divider sx={{ my: 1 }} />}
                <NavigationItem
                  item={item}
                  level={0}
                  collapsed={isCollapsed}
                  showIcons={showIcons}
                  selected={item.id === selectedItem}
                  onSelect={handleItemSelect}
                />
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {/* Footer */}
      {footer && !isCollapsed && (
        <Box sx={{ borderTop: `1px solid ${muiTheme.palette.divider}`, p: 2 }}>
          {footer}
        </Box>
      )}
    </StyledDrawer>
  );
};