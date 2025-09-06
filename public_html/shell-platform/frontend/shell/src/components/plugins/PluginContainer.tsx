import React, { Suspense, useEffect, useMemo } from 'react';
import { useAppDispatch, useAppSelector, selectLoadedPlugins } from '@/store';
import { loadPluginAsync, setPluginError, updatePluginStatus } from '@/store/plugin.slice';
import { PluginContext, PluginError } from '@/types';
import Loading from '@/components/common/Loading';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { usePluginContext } from '@/hooks/usePluginContext';

interface PluginContainerProps {
  pluginId: string;
  className?: string;
  fallback?: React.ReactNode;
  onError?: (error: PluginError) => void;
}

const PluginContainer: React.FC<PluginContainerProps> = ({
  pluginId,
  className,
  fallback,
  onError,
}) => {
  const dispatch = useAppDispatch();
  const loadedPlugins = useAppSelector(selectLoadedPlugins);
  const pluginContext = usePluginContext();

  const pluginInstance = loadedPlugins[pluginId];

  // Load plugin if not already loaded
  useEffect(() => {
    if (!pluginInstance) {
      dispatch(updatePluginStatus({ pluginId, status: 'loading' }));
      dispatch(loadPluginAsync(pluginId));
    }
  }, [dispatch, pluginId, pluginInstance]);

  // Handle plugin errors
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    const pluginError: PluginError = {
      pluginId,
      error,
      timestamp: new Date().toISOString(),
      context: 'runtime',
    };

    dispatch(setPluginError(pluginError));
    dispatch(updatePluginStatus({ pluginId, status: 'error' }));

    if (onError) {
      onError(pluginError);
    }
  };

  // Memoize the plugin component with context
  const PluginComponent = useMemo(() => {
    if (!pluginInstance?.isLoaded || !pluginInstance.component) {
      return null;
    }

    const Component = pluginInstance.component;

    // Wrap component with context provider
    return React.memo((props: any) => (
      <Component {...props} context={pluginContext} />
    ));
  }, [pluginInstance, pluginContext]);

  // Show loading state
  if (!pluginInstance || !pluginInstance.isLoaded) {
    return (
      fallback || (
        <div className="flex items-center justify-center p-8">
          <Loading 
            variant="spinner" 
            text={`Loading ${pluginId} plugin...`} 
          />
        </div>
      )
    );
  }

  // Show error state
  if (pluginInstance.error) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Plugin Error
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">
            Failed to load plugin: {pluginId}
          </p>
          <p className="text-sm text-red-500 dark:text-red-500">
            {pluginInstance.error.message}
          </p>
          <button
            onClick={() => dispatch(loadPluginAsync(pluginId))}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!PluginComponent) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Plugin component not available
        </p>
      </div>
    );
  }

  return (
    <ErrorBoundary
      onError={handleError}
      fallback={
        <div className="p-8 text-center">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
              Plugin Runtime Error
            </h3>
            <p className="text-red-600 dark:text-red-400">
              The plugin "{pluginId}" encountered an error and had to be stopped.
            </p>
          </div>
        </div>
      }
      isolate={true}
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8">
            <Loading variant="spinner" text="Loading component..." />
          </div>
        }
      >
        <div className={className}>
          <PluginComponent />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
};

// Plugin grid container for rendering multiple plugins
interface PluginGridProps {
  pluginIds: string[];
  columns?: 1 | 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const PluginGrid: React.FC<PluginGridProps> = ({
  pluginIds,
  columns = 2,
  gap = 'md',
  className,
}) => {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  const gapClasses = {
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8',
  };

  return (
    <div className={`grid ${gridClasses[columns]} ${gapClasses[gap]} ${className || ''}`}>
      {pluginIds.map((pluginId) => (
        <PluginContainer
          key={pluginId}
          pluginId={pluginId}
          className="h-full"
        />
      ))}
    </div>
  );
};

// Plugin sidebar container for navigation plugins
interface PluginSidebarProps {
  pluginId: string;
  width?: 'sm' | 'md' | 'lg';
  position?: 'left' | 'right';
  collapsible?: boolean;
}

export const PluginSidebar: React.FC<PluginSidebarProps> = ({
  pluginId,
  width = 'md',
  position = 'left',
  collapsible = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  const widthClasses = {
    sm: 'w-48',
    md: 'w-64',
    lg: 'w-80',
  };

  const collapsedWidth = 'w-12';

  return (
    <aside
      className={`
        ${isCollapsed ? collapsedWidth : widthClasses[width]}
        ${position === 'right' ? 'order-last border-l' : 'border-r'}
        border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-300
      `}
    >
      {collapsible && (
        <div className="p-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 w-full text-left text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {isCollapsed ? '→' : '←'}
          </button>
        </div>
      )}
      
      {!isCollapsed && (
        <PluginContainer
          pluginId={pluginId}
          className="h-full"
        />
      )}
    </aside>
  );
};

// Plugin modal container
interface PluginModalProps {
  pluginId: string;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const PluginModal: React.FC<PluginModalProps> = ({
  pluginId,
  isOpen,
  onClose,
  title,
  size = 'lg',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-black bg-opacity-50"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`
            inline-block w-full ${sizeClasses[size]} p-6 my-8 overflow-hidden text-left align-middle 
            transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg relative z-10
          `}
        >
          {title && (
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
          )}

          <PluginContainer
            pluginId={pluginId}
            className="max-h-96 overflow-y-auto"
          />
        </div>
      </div>
    </div>
  );
};

export default PluginContainer;