# Menu Service Documentation

## Overview
The Menu Service allows plugins to register menu items that appear in the Shell's navigation menu. The Shell provides the menu component, and plugins register their items with specific positions and hierarchy.

## Menu Hierarchy & Position System

### Position Values
Menu items are sorted by position value (lower numbers appear first):

```
0-99:     Core/System items
100-199:  Primary navigation items  
200-299:  Secondary navigation items
300-399:  Utility items
400-499:  Admin items
500-999:  Plugin-specific items
1000+:    Footer/bottom items
```

### Hierarchy Structure
```
Root Level (position: 1-999)
├── Parent Item (position: 100)
│   ├── Child 1 (parent: 'parent-id', position: 10)
│   ├── Child 2 (parent: 'parent-id', position: 20)
│   └── Child 3 (parent: 'parent-id', position: 30)
├── Another Parent (position: 200)
└── Standalone Item (position: 300)
```

## How Plugins Register Menu Items

### 1. Basic Menu Item Registration

```typescript
// In your plugin's index.tsx
export default class MyPlugin {
  constructor(context) {
    const { menu } = context.services;
    
    // Register a simple menu item
    menu.registerMenuItem('my-plugin', {
      id: 'main',
      label: 'My Plugin',
      icon: <MyIcon />,
      path: '/my-plugin',
      position: 150  // Appears in primary navigation section
    });
  }
}
```

### 2. Hierarchical Menu Structure

```typescript
// Register parent item
menu.registerMenuItem('my-plugin', {
  id: 'parent',
  label: 'Parent Menu',
  icon: <ParentIcon />,
  position: 200,
  // No path - just expands children
});

// Register child items
menu.registerMenuItems('my-plugin', [
  {
    id: 'child1',
    label: 'Child Item 1',
    path: '/parent/child1',
    parent: 'my-plugin-parent',  // Reference parent by full ID
    position: 10
  },
  {
    id: 'child2',
    label: 'Child Item 2',
    path: '/parent/child2',
    parent: 'my-plugin-parent',
    position: 20
  }
]);
```

### 3. Menu Item with Badge

```typescript
// Set a notification badge
menu.registerMenuItem('notifications', {
  id: 'inbox',
  label: 'Inbox',
  icon: <InboxIcon />,
  path: '/inbox',
  position: 150,
  badge: 5  // Shows "5" badge
});

// Update badge dynamically
menu.setMenuBadge('notifications', 'inbox', 12);

// Remove badge
menu.setMenuBadge('notifications', 'inbox', null);
```

### 4. Conditional Menu Items

```typescript
// Register menu item with permission requirement
menu.registerMenuItem('admin', {
  id: 'settings',
  label: 'Admin Settings',
  icon: <SettingsIcon />,
  path: '/admin/settings',
  position: 400,  // Admin section
  permission: 'admin.access'  // Only shows for users with this permission
});
```

### 5. Dynamic Menu State

```typescript
// Disable/enable menu items
menu.setMenuItemEnabled('my-plugin', 'feature', false);  // Disable
menu.setMenuItemEnabled('my-plugin', 'feature', true);   // Enable

// Update menu item properties
menu.updateMenuItem('my-plugin', 'item', {
  label: 'Updated Label',
  badge: 3,
  disabled: false
});
```

## Position Guidelines by Category

### Core System Items (0-99)
```typescript
{
  id: 'home',
  label: 'Home',
  position: 0  // Always first
}
```

### Primary Navigation (100-199)
```typescript
{
  id: 'dashboard',
  label: 'Dashboard',
  position: 100
},
{
  id: 'projects',
  label: 'Projects',
  position: 110
},
{
  id: 'reports',
  label: 'Reports',
  position: 120
}
```

### Secondary Features (200-299)
```typescript
{
  id: 'tools',
  label: 'Tools',
  position: 200
},
{
  id: 'integrations',
  label: 'Integrations',
  position: 210
}
```

### Utility Items (300-399)
```typescript
{
  id: 'help',
  label: 'Help',
  position: 300
},
{
  id: 'support',
  label: 'Support',
  position: 310
}
```

### Admin Section (400-499)
```typescript
{
  id: 'admin',
  label: 'Administration',
  position: 400,
  permission: 'admin.access'
}
```

### Plugin-Specific (500-999)
```typescript
{
  id: 'custom-plugin',
  label: 'My Custom Plugin',
  position: 500  // Plugin items
}
```

### Footer Items (1000+)
```typescript
{
  id: 'logout',
  label: 'Logout',
  position: 1000,
  dividerAfter: true  // Add separator after
}
```

## Menu Service API Reference

### Methods

#### `registerMenuItem(pluginId: string, item: MenuItem): void`
Register a single menu item.

#### `registerMenuItems(pluginId: string, items: MenuItem[]): void`
Register multiple menu items at once.

#### `updateMenuItem(pluginId: string, itemId: string, updates: Partial<MenuItem>): void`
Update an existing menu item.

#### `removeMenuItem(pluginId: string, itemId: string): void`
Remove a specific menu item.

#### `removePluginMenuItems(pluginId: string): void`
Remove all menu items for a plugin.

#### `setMenuBadge(pluginId: string, itemId: string, badge: string | number | null): void`
Set or clear a badge on a menu item.

#### `setMenuItemEnabled(pluginId: string, itemId: string, enabled: boolean): void`
Enable or disable a menu item.

### MenuItem Interface

```typescript
interface MenuItem {
  id: string;                    // Unique identifier
  label: string;                 // Display text
  icon?: React.ReactNode;        // Icon component
  path?: string;                 // Navigation path
  onClick?: () => void;          // Custom click handler
  children?: MenuItem[];         // Submenu items
  permission?: string;           // Required permission
  position?: number;             // Sort position (0-1000+)
  parent?: string;               // Parent item ID for hierarchy
  dividerAfter?: boolean;        // Add separator after item
  badge?: string | number;       // Badge content
  disabled?: boolean;            // Disabled state
}
```

## Best Practices

1. **Always specify position**: Without position, items appear at the end (position: 999)

2. **Use consistent position spacing**: Leave gaps (10, 20, 30) for future items

3. **Group related items**: Use parent/child relationships for logical grouping

4. **Clean up on unload**: Remove menu items in your plugin's cleanup method
   ```typescript
   async cleanup() {
     menu.removePluginMenuItems('my-plugin');
   }
   ```

5. **Use meaningful IDs**: Prefix with plugin name to avoid conflicts

6. **Check service availability**:
   ```typescript
   const { menu } = context.services;
   if (!menu) {
     console.warn('Menu service not available');
     return;
   }
   ```

## Example: Complete Plugin Menu Setup

```typescript
export default class CompleteExamplePlugin {
  constructor(context) {
    this.context = context;
    this.setupMenu();
  }

  setupMenu() {
    const { menu, auth } = this.context.services;
    
    // Main menu item
    menu.registerMenuItem('example', {
      id: 'main',
      label: 'Example',
      icon: <ExampleIcon />,
      position: 150,  // Primary navigation
    });

    // Submenu items based on user role
    const user = auth.getCurrentUser();
    const items = [
      {
        id: 'overview',
        label: 'Overview',
        path: '/example',
        parent: 'example-main',
        position: 10
      },
      {
        id: 'analytics',
        label: 'Analytics',
        path: '/example/analytics',
        parent: 'example-main',
        position: 20
      }
    ];

    // Add admin items if user is admin
    if (auth.hasRole('admin')) {
      items.push({
        id: 'settings',
        label: 'Settings',
        path: '/example/settings',
        parent: 'example-main',
        position: 30,
        dividerAfter: true
      });
    }

    menu.registerMenuItems('example', items);

    // Listen for notifications to update badge
    this.context.hooks.addAction('notification.received', (count) => {
      menu.setMenuBadge('example', 'main', count);
    });
  }

  async cleanup() {
    const { menu } = this.context.services;
    menu.removePluginMenuItems('example');
  }
}
```

## How the Shell Menu Component Uses This

The Shell's MenuComponent automatically:
1. Fetches all registered menu items via hooks
2. Sorts items by position
3. Builds hierarchy based on parent relationships
4. Checks permissions before displaying
5. Handles navigation and click events
6. Updates when menu items change

The menu component subscribes to `menu.updated` events to refresh when plugins register/update items.