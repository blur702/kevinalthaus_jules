import React from 'react';
import { 
  Grid3X3, 
  TrendingUp, 
  Users, 
  Package, 
  Activity, 
  BarChart3,
  Clock,
  AlertTriangle,
  CheckCircle,
  Plus
} from 'lucide-react';
import { useAppSelector, selectUser, selectInstalledPlugins, selectActivePlugins } from '@/store';
import { PluginGrid } from '@/components/plugins/PluginContainer';
import { usePermissions } from '@/components/auth/ProtectedRoute';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  trend,
  icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500',
  };

  const trendClasses = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-gray-500 dark:text-gray-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', colorClasses[color])}>
              <div className="text-white">
                {icon}
              </div>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                  {value}
                </div>
                {change && trend && (
                  <div className={clsx('ml-2 flex items-baseline text-sm font-semibold', trendClasses[trend])}>
                    {change}
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const QuickAction: React.FC<QuickActionProps> = ({
  title,
  description,
  icon,
  onClick,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-500',
    green: 'hover:bg-green-50 dark:hover:bg-green-900/20 focus:ring-green-500',
    purple: 'hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:ring-purple-500',
    orange: 'hover:bg-orange-50 dark:hover:bg-orange-900/20 focus:ring-orange-500',
  };

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
        colorClasses[color]
      )}
    >
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0 text-gray-400">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {title}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {description}
          </p>
        </div>
      </div>
    </button>
  );
};

const Dashboard: React.FC = () => {
  const user = useAppSelector(selectUser);
  const installedPlugins = useAppSelector(selectInstalledPlugins);
  const activePlugins = useAppSelector(selectActivePlugins);
  const { checkPermission } = usePermissions();

  // Sample data - in a real app, this would come from APIs
  const stats = [
    {
      title: 'Active Plugins',
      value: activePlugins.length,
      change: '+2',
      trend: 'up' as const,
      icon: <Package className="w-5 h-5" />,
      color: 'blue' as const,
    },
    {
      title: 'Total Users',
      value: '1,234',
      change: '+12%',
      trend: 'up' as const,
      icon: <Users className="w-5 h-5" />,
      color: 'green' as const,
    },
    {
      title: 'System Health',
      value: '98.5%',
      change: '+0.2%',
      trend: 'up' as const,
      icon: <Activity className="w-5 h-5" />,
      color: 'green' as const,
    },
    {
      title: 'Storage Used',
      value: '2.4 GB',
      change: '+15%',
      trend: 'up' as const,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'yellow' as const,
    },
  ];

  const quickActions = [
    {
      title: 'Install Plugin',
      description: 'Browse and install new plugins',
      icon: <Plus className="w-5 h-5" />,
      onClick: () => window.location.href = '/plugins/marketplace',
      color: 'blue' as const,
    },
    {
      title: 'View Analytics',
      description: 'Check system performance and usage',
      icon: <BarChart3 className="w-5 h-5" />,
      onClick: () => window.location.href = '/analytics',
      color: 'purple' as const,
    },
    {
      title: 'Manage Users',
      description: 'Add or modify user accounts',
      icon: <Users className="w-5 h-5" />,
      onClick: () => window.location.href = '/users',
      color: 'green' as const,
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: <Grid3X3 className="w-5 h-5" />,
      onClick: () => window.location.href = '/settings',
      color: 'orange' as const,
    },
  ];

  // Filter quick actions based on permissions
  const filteredQuickActions = quickActions.filter(action => {
    const permissionMap: Record<string, string> = {
      'Install Plugin': 'plugins.install',
      'View Analytics': 'analytics.read',
      'Manage Users': 'users.read',
      'System Settings': 'settings.read',
    };
    
    const permission = permissionMap[action.title];
    return !permission || checkPermission(permission);
  });

  // Recent activities - sample data
  const recentActivities = [
    {
      id: 1,
      type: 'plugin_installed',
      message: 'Analytics Dashboard plugin installed',
      timestamp: '2 hours ago',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    },
    {
      id: 2,
      type: 'user_login',
      message: 'John Doe logged in',
      timestamp: '3 hours ago',
      icon: <Clock className="w-4 h-4 text-blue-500" />,
    },
    {
      id: 3,
      type: 'system_alert',
      message: 'High memory usage detected',
      timestamp: '5 hours ago',
      icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    },
    {
      id: 4,
      type: 'plugin_updated',
      message: 'File Manager plugin updated to v2.1.0',
      timestamp: '1 day ago',
      icon: <CheckCircle className="w-4 h-4 text-green-500" />,
    },
  ];

  const welcomeTime = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-full">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="md:flex md:items-center md:justify-between mb-8">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate">
                {welcomeTime()}, {user?.firstName || user?.username}!
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Welcome back to your Shell Platform dashboard
              </p>
            </div>
            <div className="mt-4 flex md:mt-0 md:ml-4">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                onClick={() => window.location.reload()}
              >
                <Activity className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {stats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    {filteredQuickActions.map((action) => (
                      <QuickAction key={action.title} {...action} />
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
                <div className="p-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
                    Recent Activity
                  </h3>
                  <div className="space-y-3">
                    {recentActivities.map((activity) => (
                      <div key={activity.id} className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {activity.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-gray-100">
                            {activity.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {activity.timestamp}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dashboard Plugins */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      Dashboard Widgets
                    </h3>
                    <button className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                      Customize
                    </button>
                  </div>

                  {activePlugins.length > 0 ? (
                    <PluginGrid
                      pluginIds={activePlugins.slice(0, 4)} // Show first 4 active plugins
                      columns={2}
                      gap="md"
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No active plugins
                      </h4>
                      <p className="text-gray-500 dark:text-gray-400 mb-4">
                        Install and activate plugins to see widgets here
                      </p>
                      <button
                        onClick={() => window.location.href = '/plugins/marketplace'}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Browse Plugins
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;