import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Download, 
  Trash2, 
  Settings, 
  Power, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Grid,
  List
} from 'lucide-react';
import { useAppDispatch, useAppSelector, selectInstalledPlugins, selectPluginRegistry } from '@/store';
import { 
  loadPluginRegistryAsync, 
  installPluginAsync, 
  uninstallPluginAsync, 
  togglePluginAsync,
  updatePluginAsync
} from '@/store/plugin.slice';
import { Plugin, PluginCategory } from '@/types';
import { LoadingButton, Skeleton } from '@/components/common/Loading';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { clsx } from 'clsx';

interface PluginCardProps {
  plugin: Plugin;
  isInstalled: boolean;
  onInstall: (plugin: Plugin) => void;
  onUninstall: (pluginId: string) => void;
  onToggle: (pluginId: string, active: boolean) => void;
  onUpdate: (pluginId: string) => void;
  loading?: boolean;
}

const PluginCard: React.FC<PluginCardProps> = ({
  plugin,
  isInstalled,
  onInstall,
  onUninstall,
  onToggle,
  onUpdate,
  loading = false,
}) => {
  const statusIcons = {
    active: CheckCircle,
    inactive: XCircle,
    loading: RefreshCw,
    error: AlertTriangle,
    updating: RefreshCw,
  };

  const StatusIcon = statusIcons[plugin.status] || Package;
  const hasUpdate = plugin.metadata.updateAvailable;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          {plugin.icon ? (
            <img 
              src={plugin.icon} 
              alt={plugin.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
              <Package className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {plugin.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              v{plugin.version} by {plugin.author}
            </p>
          </div>
        </div>

        {isInstalled && (
          <div className="flex items-center space-x-2">
            <StatusIcon 
              className={clsx(
                'w-5 h-5',
                {
                  'text-green-500': plugin.status === 'active',
                  'text-gray-400': plugin.status === 'inactive',
                  'text-red-500': plugin.status === 'error',
                  'text-blue-500 animate-spin': plugin.status === 'loading' || plugin.status === 'updating',
                }
              )}
            />
            {hasUpdate && (
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            )}
          </div>
        )}
      </div>

      <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
        {plugin.description}
      </p>

      <div className="flex items-center flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
          {plugin.category}
        </span>
        {plugin.tags.slice(0, 2).map(tag => (
          <span 
            key={tag}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full"
          >
            {tag}
          </span>
        ))}
        {plugin.tags.length > 2 && (
          <span className="text-xs text-gray-400">
            +{plugin.tags.length - 2} more
          </span>
        )}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        {isInstalled ? (
          <div className="flex space-x-2">
            <LoadingButton
              loading={loading}
              onClick={() => onToggle(plugin.id, plugin.status !== 'active')}
              variant={plugin.status === 'active' ? 'secondary' : 'primary'}
              size="sm"
            >
              <Power className="w-4 h-4 mr-1" />
              {plugin.status === 'active' ? 'Disable' : 'Enable'}
            </LoadingButton>

            {hasUpdate && (
              <LoadingButton
                loading={loading}
                onClick={() => onUpdate(plugin.id)}
                variant="secondary"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Update
              </LoadingButton>
            )}

            <button
              onClick={() => onUninstall(plugin.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
              title="Uninstall"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <LoadingButton
            loading={loading}
            onClick={() => onInstall(plugin)}
            variant="primary"
            size="sm"
          >
            <Download className="w-4 h-4 mr-1" />
            Install
          </LoadingButton>
        )}

        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const PluginManager: React.FC = () => {
  const dispatch = useAppDispatch();
  const installedPlugins = useAppSelector(selectInstalledPlugins);
  const registry = useAppSelector(selectPluginRegistry);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showInstalled, setShowInstalled] = useState(false);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  // Load plugin registry on component mount
  useEffect(() => {
    dispatch(loadPluginRegistryAsync());
  }, [dispatch]);

  const handleInstall = async (plugin: Plugin) => {
    setLoadingStates(prev => ({ ...prev, [plugin.id]: true }));
    try {
      await dispatch(installPluginAsync(plugin)).unwrap();
    } finally {
      setLoadingStates(prev => ({ ...prev, [plugin.id]: false }));
    }
  };

  const handleUninstall = async (pluginId: string) => {
    if (window.confirm('Are you sure you want to uninstall this plugin?')) {
      setLoadingStates(prev => ({ ...prev, [pluginId]: true }));
      try {
        await dispatch(uninstallPluginAsync(pluginId)).unwrap();
      } finally {
        setLoadingStates(prev => ({ ...prev, [pluginId]: false }));
      }
    }
  };

  const handleToggle = async (pluginId: string, active: boolean) => {
    setLoadingStates(prev => ({ ...prev, [pluginId]: true }));
    try {
      await dispatch(togglePluginAsync({ pluginId, active })).unwrap();
    } finally {
      setLoadingStates(prev => ({ ...prev, [pluginId]: false }));
    }
  };

  const handleUpdate = async (pluginId: string) => {
    setLoadingStates(prev => ({ ...prev, [pluginId]: true }));
    try {
      await dispatch(updatePluginAsync(pluginId)).unwrap();
    } finally {
      setLoadingStates(prev => ({ ...prev, [pluginId]: false }));
    }
  };

  // Get all available plugins (registry + installed)
  const allPlugins = React.useMemo(() => {
    const registryPlugins = registry?.plugins || [];
    const installedPluginIds = new Set(installedPlugins.map(p => p.id));
    
    // Merge registry and installed plugins
    const merged = new Map<string, Plugin>();
    
    // Add installed plugins first
    installedPlugins.forEach(plugin => {
      merged.set(plugin.id, plugin);
    });
    
    // Add registry plugins (but don't override installed ones)
    registryPlugins.forEach(plugin => {
      if (!merged.has(plugin.id)) {
        merged.set(plugin.id, plugin);
      }
    });
    
    return Array.from(merged.values());
  }, [registry, installedPlugins]);

  // Filter plugins based on search and category
  const filteredPlugins = React.useMemo(() => {
    let filtered = allPlugins;

    if (showInstalled) {
      const installedIds = new Set(installedPlugins.map(p => p.id));
      filtered = filtered.filter(p => installedIds.has(p.id));
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(plugin =>
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(plugin => plugin.category === selectedCategory);
    }

    return filtered;
  }, [allPlugins, installedPlugins, searchQuery, selectedCategory, showInstalled]);

  // Get categories from registry
  const categories = React.useMemo(() => {
    return registry?.categories || [];
  }, [registry]);

  // Check if plugin is installed
  const isPluginInstalled = (pluginId: string) => {
    return installedPlugins.some(p => p.id === pluginId);
  };

  if (!registry) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <Skeleton variant="circular" width={40} height={40} />
                <div className="space-y-2">
                  <Skeleton width={120} height={20} />
                  <Skeleton width={80} height={16} />
                </div>
              </div>
              <Skeleton lines={2} className="mb-4" />
              <div className="flex space-x-2 mb-4">
                <Skeleton width={60} height={24} />
                <Skeleton width={40} height={24} />
              </div>
              <div className="flex justify-between">
                <Skeleton width={80} height={32} />
                <Skeleton width={32} height={32} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Plugin Manager
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage and discover plugins for your shell platform
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowInstalled(!showInstalled)}
              className={clsx(
                'px-4 py-2 rounded-lg font-medium transition-colors',
                showInstalled
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              {showInstalled ? 'Show All' : 'Show Installed'}
            </button>

            <div className="flex rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-l-lg transition-colors',
                  viewMode === 'grid'
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-r-lg transition-colors',
                  viewMode === 'list'
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Plugin Grid/List */}
        {filteredPlugins.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No plugins found
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchQuery ? 'Try adjusting your search criteria.' : 'No plugins available in this category.'}
            </p>
          </div>
        ) : (
          <div className={clsx(
            'grid gap-6',
            viewMode === 'grid'
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-1'
          )}>
            {filteredPlugins.map(plugin => (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                isInstalled={isPluginInstalled(plugin.id)}
                onInstall={handleInstall}
                onUninstall={handleUninstall}
                onToggle={handleToggle}
                onUpdate={handleUpdate}
                loading={loadingStates[plugin.id]}
              />
            ))}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default PluginManager;