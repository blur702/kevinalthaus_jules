import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Grid3X3, 
  Settings, 
  User, 
  Package, 
  BarChart3, 
  FileText, 
  Users, 
  Shield,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';
import { useAppSelector, selectUser, selectInstalledPlugins } from '@/store';
import { hasPermission, hasRole } from '@/utils/auth.utils';
import { MenuItem } from '@/types';
import { clsx } from 'clsx';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = useAppSelector(selectUser);
  const installedPlugins = useAppSelector(selectInstalledPlugins);

  // Define core menu items
  const coreMenuItems: MenuItem[] = useMemo(() => [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: 'Home',
      path: '/',
      permissions: ['dashboard.read'],
    },
    {
      id: 'plugins',
      label: 'Plugins',
      icon: 'Package',
      path: '/plugins',
      permissions: ['plugins.read'],
      children: [
        {
          id: 'plugins-installed',
          label: 'Installed',
          path: '/plugins/installed',
          permissions: ['plugins.read'],
        },
        {
          id: 'plugins-marketplace',
          label: 'Marketplace',
          path: '/plugins/marketplace',
          permissions: ['plugins.install'],
        },
        {
          id: 'plugins-develop',
          label: 'Develop',
          path: '/plugins/develop',
          permissions: ['plugins.develop'],
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart3',
      path: '/analytics',
      permissions: ['analytics.read'],
    },
    {
      id: 'content',
      label: 'Content',
      icon: 'FileText',
      path: '/content',
      permissions: ['content.read'],
    },
    {
      id: 'users',
      label: 'Users',
      icon: 'Users',
      path: '/users',
      permissions: ['users.read'],
    },
    {
      id: 'security',
      label: 'Security',
      icon: 'Shield',
      path: '/security',
      permissions: ['security.read'],
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: 'Settings',
      path: '/settings',
      permissions: ['settings.read'],
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: 'User',
      path: '/profile',
    },
  ], []);

  // Get plugin menu items
  const pluginMenuItems: MenuItem[] = useMemo(() => {
    return installedPlugins
      .filter(plugin => plugin.status === 'active' && plugin.configuration.menuItems)
      .flatMap(plugin => plugin.configuration.menuItems || [])
      .filter(item => {
        if (!item.permissions?.length) return true;
        return item.permissions.some(permission => 
          hasPermission(user?.permissions || [], permission)
        );
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [installedPlugins, user?.permissions]);

  // Check if user has permission for menu item
  const hasMenuPermission = (item: MenuItem): boolean => {
    if (!item.permissions?.length) return true;
    return item.permissions.some(permission => 
      hasPermission(user?.permissions || [], permission)
    );
  };

  // Filter menu items based on permissions
  const filteredCoreItems = coreMenuItems.filter(hasMenuPermission);
  const allMenuItems = [...filteredCoreItems, ...pluginMenuItems];

  // Icon mapping
  const iconMap = {
    Home,
    Grid3X3,
    Package,
    BarChart3,
    FileText,
    Users,
    Shield,
    Settings,
    User,
  };

  const renderIcon = (iconName: string, className = "w-5 h-5") => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap] || Grid3X3;
    return <IconComponent className={className} />;
  };

  const renderMenuItem = (item: MenuItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isActive = item.path ? location.pathname === item.path : false;
    const isParentActive = item.children?.some(child => child.path === location.pathname);
    const [isExpanded, setIsExpanded] = React.useState(isParentActive || false);

    const baseClasses = clsx(
      'flex items-center w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 group',
      {
        'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20': isActive,
        'text-gray-700 hover:text-primary-600 hover:bg-primary-50 dark:text-gray-300 dark:hover:text-primary-400 dark:hover:bg-primary-900/20': !isActive,
        'pl-6': level === 1,
        'pl-9': level === 2,
      }
    );

    if (hasChildren) {
      return (
        <div key={item.id}>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={baseClasses}
          >
            {item.icon && (
              <span className="mr-3 flex-shrink-0">
                {renderIcon(item.icon)}
              </span>
            )}
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full">
                {item.badge}
              </span>
            )}
            <span className="ml-2 flex-shrink-0">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          </button>
          
          {isExpanded && (
            <div className="mt-1 space-y-1">
              {item.children?.map(child => renderMenuItem(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (item.onClick) {
      return (
        <button
          key={item.id}
          onClick={item.onClick}
          disabled={item.disabled}
          className={clsx(baseClasses, {
            'opacity-50 cursor-not-allowed': item.disabled,
          })}
        >
          {item.icon && (
            <span className="mr-3 flex-shrink-0">
              {renderIcon(item.icon)}
            </span>
          )}
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full">
              {item.badge}
            </span>
          )}
        </button>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={item.path || '#'}
        className={({ isActive }) => clsx(
          baseClasses,
          {
            'text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/20': isActive,
            'opacity-50 cursor-not-allowed pointer-events-none': item.disabled,
          }
        )}
        onClick={() => {
          if (window.innerWidth < 1024) {
            onClose();
          }
        }}
      >
        {item.icon && (
          <span className="mr-3 flex-shrink-0">
            {renderIcon(item.icon)}
          </span>
        )}
        <span className="flex-1">{item.label}</span>
        {item.badge && (
          <span className="ml-2 px-2 py-1 text-xs bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 rounded-full">
            {item.badge}
          </span>
        )}
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          {
            'translate-x-0': isOpen,
            '-translate-x-full': !isOpen,
          }
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200 dark:border-gray-700 lg:hidden">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Shell Platform
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 overflow-y-auto">
            <div className="space-y-2">
              {/* Core items */}
              <div>
                <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Core
                </h3>
                <div className="space-y-1">
                  {filteredCoreItems.map(item => renderMenuItem(item))}
                </div>
              </div>

              {/* Plugin items */}
              {pluginMenuItems.length > 0 && (
                <div className="pt-4">
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Plugins
                  </h3>
                  <div className="space-y-1">
                    {pluginMenuItems.map(item => renderMenuItem(item))}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  user?.username?.[0]?.toUpperCase() || 'U'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;