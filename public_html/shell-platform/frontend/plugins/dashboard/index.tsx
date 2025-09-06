/**
 * Dashboard Plugin
 * Example of how a plugin registers menu items
 */

import React from 'react';
import { Dashboard as DashboardIcon } from '@mui/icons-material';

interface PluginContext {
  manifest: any;
  services: {
    menu?: any;
    auth?: any;
    database?: any;
    router?: any;
    [key: string]: any;
  };
  hooks: any;
}

export default class DashboardPlugin {
  private context: PluginContext;
  private menuItemsRegistered: boolean = false;

  constructor(context: PluginContext) {
    this.context = context;
    this.initialize();
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    // Register menu items
    this.registerMenuItems();

    // Register routes
    this.registerRoutes();

    // Register hooks
    this.registerHooks();

    // Register widgets
    this.registerWidgets();
  }

  /**
   * Register menu items with the menu service
   */
  private registerMenuItems() {
    const { menu } = this.context.services;
    
    if (!menu) {
      console.warn('Menu service not available');
      return;
    }

    // Register dashboard menu item
    menu.registerMenuItem('dashboard', {
      id: 'main',
      label: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/dashboard',
      position: 1
    });

    // Register dashboard submenu items
    menu.registerMenuItems('dashboard', [
      {
        id: 'overview',
        label: 'Overview',
        path: '/dashboard/overview',
        position: 10,
        parent: 'dashboard-main'
      },
      {
        id: 'analytics',
        label: 'Analytics', 
        path: '/dashboard/analytics',
        position: 20,
        parent: 'dashboard-main'
      },
      {
        id: 'reports',
        label: 'Reports',
        path: '/dashboard/reports',
        position: 30,
        parent: 'dashboard-main',
        dividerAfter: true
      }
    ]);

    this.menuItemsRegistered = true;
  }

  /**
   * Register routes with the router service
   */
  private registerRoutes() {
    const { router } = this.context.services;
    
    if (!router) {
      console.warn('Router service not available');
      return;
    }

    // Register dashboard routes
    router.registerRoute('/dashboard', () => import('./views/DashboardView'));
    router.registerRoute('/dashboard/overview', () => import('./views/OverviewView'));
    router.registerRoute('/dashboard/analytics', () => import('./views/AnalyticsView'));
    router.registerRoute('/dashboard/reports', () => import('./views/ReportsView'));
  }

  /**
   * Register plugin hooks
   */
  private registerHooks() {
    const { hooks } = this.context;

    // Register action hooks
    hooks.addAction('user.login', this.onUserLogin.bind(this), 10, 'dashboard');
    hooks.addAction('user.logout', this.onUserLogout.bind(this), 10, 'dashboard');

    // Register filter hooks
    hooks.addFilter('dashboard.widgets', this.filterWidgets.bind(this), 10, 'dashboard');
  }

  /**
   * Register dashboard widgets
   */
  private registerWidgets() {
    const { widgets } = this.context.services;
    
    if (!widgets) {
      return;
    }

    widgets.registerWidget('dashboard', {
      id: 'stats',
      zone: 'dashboard-top',
      component: () => import('./widgets/StatsWidget'),
      priority: 10
    });

    widgets.registerWidget('dashboard', {
      id: 'chart',
      zone: 'dashboard-main',
      component: () => import('./widgets/ChartWidget'),
      priority: 20
    });
  }

  /**
   * Handle user login
   */
  private async onUserLogin(user: any) {
    console.log('Dashboard: User logged in', user);
    
    // Update menu badge for notifications
    const { menu } = this.context.services;
    if (menu) {
      // Get notification count from database
      const { database } = this.context.services;
      if (database) {
        try {
          const notifications = await database.read('notifications', {
            user_id: user.id,
            unread: true
          });
          
          if (notifications.length > 0) {
            menu.setMenuBadge('dashboard', 'main', notifications.length);
          }
        } catch (error) {
          console.error('Failed to get notifications:', error);
        }
      }
    }
  }

  /**
   * Handle user logout
   */
  private async onUserLogout() {
    console.log('Dashboard: User logged out');
    
    // Clear menu badges
    const { menu } = this.context.services;
    if (menu) {
      menu.setMenuBadge('dashboard', 'main', null);
    }
  }

  /**
   * Filter dashboard widgets based on user permissions
   */
  private async filterWidgets(widgets: any[]) {
    const { auth } = this.context.services;
    
    if (!auth || !auth.isAuthenticated()) {
      // Remove admin-only widgets
      return widgets.filter(w => !w.requiresAdmin);
    }

    const user = auth.getCurrentUser();
    
    if (!auth.hasRole('admin')) {
      return widgets.filter(w => !w.requiresAdmin);
    }

    return widgets;
  }

  /**
   * Cleanup when plugin is unloaded
   */
  async cleanup() {
    console.log('Dashboard plugin cleanup');
    
    // Remove menu items
    if (this.menuItemsRegistered) {
      const { menu } = this.context.services;
      if (menu) {
        menu.removePluginMenuItems('dashboard');
      }
    }

    // Remove hooks
    const { hooks } = this.context;
    hooks.removePluginHooks('dashboard');
  }
}