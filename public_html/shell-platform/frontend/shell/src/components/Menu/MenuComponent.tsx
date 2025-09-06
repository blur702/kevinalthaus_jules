/**
 * Menu Component
 * Shell-provided menu that plugins register items with
 */

import React, { useState, useEffect } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  ListItemButton,
  Collapse,
  Divider,
  IconButton,
  Box,
  Typography
} from '@mui/material';
import {
  Menu as MenuIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { PluginHooks } from '../../plugin-system/PluginHooks';

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  onClick?: () => void;
  children?: MenuItem[];
  permission?: string;
  position?: number;
  dividerAfter?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

interface MenuComponentProps {
  hooks: PluginHooks;
  open?: boolean;
  onClose?: () => void;
  variant?: 'permanent' | 'persistent' | 'temporary';
  width?: number;
}

export const MenuComponent: React.FC<MenuComponentProps> = ({
  hooks,
  open = true,
  onClose,
  variant = 'permanent',
  width = 240
}) => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  /**
   * Load menu items from plugins
   */
  useEffect(() => {
    loadMenuItems();
    
    // Listen for menu updates
    const handleMenuUpdate = () => {
      loadMenuItems();
    };

    // Register for menu update events
    hooks.addAction('menu.updated', handleMenuUpdate, 10, 'menu-component');

    return () => {
      hooks.removeAction('menu.updated', 'menu-component');
    };
  }, [hooks]);

  /**
   * Load and sort menu items from plugins
   */
  const loadMenuItems = async () => {
    // Get base menu items
    let items: MenuItem[] = getBaseMenuItems();

    // Allow plugins to add menu items
    items = await hooks.applyFilters('menu.items', items);

    // Allow plugins to modify the final menu
    items = await hooks.applyFilters('menu.final', items);

    // Sort by position
    items.sort((a, b) => (a.position || 999) - (b.position || 999));

    setMenuItems(items);
  };

  /**
   * Get base menu items (can be empty if everything is plugins)
   */
  const getBaseMenuItems = (): MenuItem[] => {
    // Shell can provide some base items or leave empty
    return [];
  };

  /**
   * Handle menu item click
   */
  const handleItemClick = async (item: MenuItem) => {
    // Fire action before navigation
    await hooks.doAction('menu.item.clicked', item);

    if (item.onClick) {
      item.onClick();
    } else if (item.path) {
      navigate(item.path);
    }

    // Close menu on mobile
    if (variant === 'temporary' && onClose) {
      onClose();
    }
  };

  /**
   * Toggle expanded state for items with children
   */
  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  /**
   * Check if user has permission for menu item
   */
  const hasPermission = (item: MenuItem): boolean => {
    if (!item.permission) return true;
    
    // This would check with auth service
    // For now, return true
    return true;
  };

  /**
   * Check if menu item is active
   */
  const isItemActive = (item: MenuItem): boolean => {
    if (item.path) {
      return location.pathname === item.path || 
             location.pathname.startsWith(item.path + '/');
    }
    return false;
  };

  /**
   * Render a menu item
   */
  const renderMenuItem = (item: MenuItem, depth = 0): React.ReactNode => {
    if (!hasPermission(item)) {
      return null;
    }

    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const isActive = isItemActive(item);

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding sx={{ pl: depth * 2 }}>
          <ListItemButton
            selected={isActive}
            disabled={item.disabled}
            onClick={() => {
              if (hasChildren) {
                toggleExpanded(item.id);
              } else {
                handleItemClick(item);
              }
            }}
          >
            {item.icon && (
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
            )}
            
            <ListItemText primary={item.label} />
            
            {item.badge && (
              <Box
                component="span"
                sx={{
                  bgcolor: 'error.main',
                  color: 'error.contrastText',
                  borderRadius: '12px',
                  px: 1,
                  py: 0.5,
                  fontSize: '0.75rem',
                  minWidth: '20px',
                  textAlign: 'center'
                }}
              >
                {item.badge}
              </Box>
            )}
            
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, depth + 1))}
            </List>
          </Collapse>
        )}

        {item.dividerAfter && <Divider />}
      </React.Fragment>
    );
  };

  return (
    <Drawer
      variant={variant}
      open={open}
      onClose={onClose}
      sx={{
        width: open ? width : 0,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          transition: 'width 0.3s'
        }
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2 
      }}>
        <Typography variant="h6">Menu</Typography>
        {onClose && (
          <IconButton onClick={onClose}>
            <ChevronLeft />
          </IconButton>
        )}
      </Box>
      
      <Divider />
      
      <List>
        {menuItems.map(item => renderMenuItem(item))}
      </List>
    </Drawer>
  );
};