import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { u as useAppDispatch, a as useAppSelector, n as selectUser, q as selectEffectiveTheme, v as addNotification, w as selectLoadedPlugins, x as updatePluginStatus, y as loadPluginAsync, z as Loading, E as ErrorBoundary, A as setPluginError, f as selectInstalledPlugins, B as selectActivePlugins, C as usePermissions } from './index-COe2NB-W.js';

const {useCallback,useMemo: useMemo$1} = await importShared('react');

const {useNavigate} = await importShared('react-router-dom');
class EventBus {
  listeners = /* @__PURE__ */ new Map();
  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, /* @__PURE__ */ new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }
  off(event, callback) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }
  // Clean up all listeners
  cleanup() {
    this.listeners.clear();
  }
  // Get listener count for debugging
  getListenerCount(event) {
    if (event) {
      return this.listeners.get(event)?.size || 0;
    }
    let total = 0;
    this.listeners.forEach((listeners) => {
      total += listeners.size;
    });
    return total;
  }
}
class PluginStorageImpl {
  prefix;
  constructor(pluginId) {
    this.prefix = pluginId ? `plugin_${pluginId}_` : "shell_";
  }
  getKey(key) {
    return `${this.prefix}${key}`;
  }
  async get(key) {
    try {
      const item = localStorage.getItem(this.getKey(key));
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Error getting item from plugin storage:", error);
      return null;
    }
  }
  async set(key, value) {
    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(value));
    } catch (error) {
      console.error("Error setting item in plugin storage:", error);
      throw error;
    }
  }
  async remove(key) {
    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error("Error removing item from plugin storage:", error);
      throw error;
    }
  }
  async clear() {
    try {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith(this.prefix));
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Error clearing plugin storage:", error);
      throw error;
    }
  }
  // Additional utility methods
  async has(key) {
    return localStorage.getItem(this.getKey(key)) !== null;
  }
  async keys() {
    return Object.keys(localStorage).filter((key) => key.startsWith(this.prefix)).map((key) => key.replace(this.prefix, ""));
  }
}
let globalEventBus = null;
const getGlobalEventBus = () => {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
    window.addEventListener("beforeunload", () => {
      globalEventBus?.cleanup();
    });
  }
  return globalEventBus;
};
const usePluginContext = (pluginId) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const theme = useAppSelector(selectEffectiveTheme);
  const notification = useCallback((message, type = "info") => {
    dispatch(addNotification({
      title: type.charAt(0).toUpperCase() + type.slice(1),
      message,
      type
    }));
  }, [dispatch]);
  const enhancedNotification = useCallback((title, message, type = "info", options) => {
    dispatch(addNotification({
      title,
      message,
      type,
      duration: options?.duration,
      persistent: options?.persistent,
      actions: options?.actions
    }));
  }, [dispatch]);
  const eventBus = useMemo$1(() => getGlobalEventBus(), []);
  const storage = useMemo$1(() => new PluginStorageImpl(pluginId), [pluginId]);
  const navigateWithHistory = useCallback((path, options) => {
    navigate(path, { replace: options?.replace });
  }, [navigate]);
  const context = useMemo$1(() => ({
    user,
    theme,
    navigate: navigateWithHistory,
    notification,
    eventBus,
    storage,
    // Additional utilities
    enhancedNotification,
    // Plugin metadata (if available)
    pluginId,
    // System information
    system: {
      version: "1.0.0",
      // This could come from package.json or environment
      buildTime: (/* @__PURE__ */ new Date()).toISOString(),
      // This could be set at build time
      environment: "production"
    },
    // Feature flags (for progressive feature rollout)
    features: {
      // Add feature flags here as needed
      beta_features: false,
      advanced_plugins: true
    }
  }), [
    user,
    theme,
    navigateWithHistory,
    notification,
    eventBus,
    storage,
    enhancedNotification,
    pluginId
  ]);
  return context;
};

const React = await importShared('react');
const {Suspense,useEffect,useMemo} = React;
const PluginContainer = ({
  pluginId,
  className,
  fallback,
  onError
}) => {
  const dispatch = useAppDispatch();
  const loadedPlugins = useAppSelector(selectLoadedPlugins);
  const pluginContext = usePluginContext();
  const pluginInstance = loadedPlugins[pluginId];
  useEffect(() => {
    if (!pluginInstance) {
      dispatch(updatePluginStatus({ pluginId, status: "loading" }));
      dispatch(loadPluginAsync(pluginId));
    }
  }, [dispatch, pluginId, pluginInstance]);
  const handleError = (error, errorInfo) => {
    const pluginError = {
      pluginId,
      error,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      context: "runtime"
    };
    dispatch(setPluginError(pluginError));
    dispatch(updatePluginStatus({ pluginId, status: "error" }));
    if (onError) {
      onError(pluginError);
    }
  };
  const PluginComponent = useMemo(() => {
    if (!pluginInstance?.isLoaded || !pluginInstance.component) {
      return null;
    }
    const Component = pluginInstance.component;
    return React.memo((props) => /* @__PURE__ */ jsxRuntimeExports.jsx(Component, { ...props, context: pluginContext }));
  }, [pluginInstance, pluginContext]);
  if (!pluginInstance || !pluginInstance.isLoaded) {
    return fallback || /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      Loading,
      {
        variant: "spinner",
        text: `Loading ${pluginId} plugin...`
      }
    ) });
  }
  if (pluginInstance.error) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-red-800 dark:text-red-200 mb-2", children: "Plugin Error" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-red-600 dark:text-red-400 mb-4", children: [
        "Failed to load plugin: ",
        pluginId
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-red-500 dark:text-red-500", children: pluginInstance.error.message }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        "button",
        {
          onClick: () => dispatch(loadPluginAsync(pluginId)),
          className: "mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors",
          children: "Retry"
        }
      )
    ] }) });
  }
  if (!PluginComponent) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 dark:text-gray-400", children: "Plugin component not available" }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    ErrorBoundary,
    {
      onError: handleError,
      fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-8 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-red-800 dark:text-red-200 mb-2", children: "Plugin Runtime Error" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-red-600 dark:text-red-400", children: [
          'The plugin "',
          pluginId,
          '" encountered an error and had to be stopped.'
        ] })
      ] }) }),
      isolate: true,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Suspense,
        {
          fallback: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center justify-center p-8", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Loading, { variant: "spinner", text: "Loading component..." }) }),
          children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className, children: /* @__PURE__ */ jsxRuntimeExports.jsx(PluginComponent, {}) })
        }
      )
    }
  );
};
const PluginGrid = ({
  pluginIds,
  columns = 2,
  gap = "md",
  className
}) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 lg:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
  };
  const gapClasses = {
    sm: "gap-4",
    md: "gap-6",
    lg: "gap-8"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: `grid ${gridClasses[columns]} ${gapClasses[gap]} ${className || ""}`, children: pluginIds.map((pluginId) => /* @__PURE__ */ jsxRuntimeExports.jsx(
    PluginContainer,
    {
      pluginId,
      className: "h-full"
    },
    pluginId
  )) });
};

const {Grid3X3,Users,Package,Activity,BarChart3,Clock,AlertTriangle,CheckCircle,Plus} = await importShared('lucide-react');
const {clsx} = await importShared('clsx');

const StatCard = ({
  title,
  value,
  change,
  trend,
  icon,
  color = "blue"
}) => {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500"
  };
  const trendClasses = {
    up: "text-green-600 dark:text-green-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-gray-500 dark:text-gray-400"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white dark:bg-gray-800 overflow-hidden shadow-sm rounded-lg border border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: clsx("w-10 h-10 rounded-lg flex items-center justify-center", colorClasses[color]), children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-white", children: icon }) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "ml-5 w-0 flex-1", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("dl", { children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("dt", { className: "text-sm font-medium text-gray-500 dark:text-gray-400 truncate", children: title }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("dd", { className: "flex items-baseline", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "text-2xl font-semibold text-gray-900 dark:text-gray-100", children: value }),
        change && trend && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: clsx("ml-2 flex items-baseline text-sm font-semibold", trendClasses[trend]), children: change })
      ] })
    ] }) })
  ] }) }) });
};
const QuickAction = ({
  title,
  description,
  icon,
  onClick,
  color = "blue"
}) => {
  const colorClasses = {
    blue: "hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:ring-blue-500",
    green: "hover:bg-green-50 dark:hover:bg-green-900/20 focus:ring-green-500",
    purple: "hover:bg-purple-50 dark:hover:bg-purple-900/20 focus:ring-purple-500",
    orange: "hover:bg-orange-50 dark:hover:bg-orange-900/20 focus:ring-orange-500"
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      onClick,
      className: clsx(
        "w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
        colorClasses[color]
      ),
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0 text-gray-400", children: icon }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium text-gray-900 dark:text-gray-100", children: title }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: description })
        ] })
      ] })
    }
  );
};
const Dashboard = () => {
  const user = useAppSelector(selectUser);
  useAppSelector(selectInstalledPlugins);
  const activePlugins = useAppSelector(selectActivePlugins);
  const { checkPermission } = usePermissions();
  const stats = [
    {
      title: "Active Plugins",
      value: activePlugins.length,
      change: "+2",
      trend: "up",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "w-5 h-5" }),
      color: "blue"
    },
    {
      title: "Total Users",
      value: "1,234",
      change: "+12%",
      trend: "up",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-5 h-5" }),
      color: "green"
    },
    {
      title: "System Health",
      value: "98.5%",
      change: "+0.2%",
      trend: "up",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-5 h-5" }),
      color: "green"
    },
    {
      title: "Storage Used",
      value: "2.4 GB",
      change: "+15%",
      trend: "up",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { className: "w-5 h-5" }),
      color: "yellow"
    }
  ];
  const quickActions = [
    {
      title: "Install Plugin",
      description: "Browse and install new plugins",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-5 h-5" }),
      onClick: () => window.location.href = "/plugins/marketplace",
      color: "blue"
    },
    {
      title: "View Analytics",
      description: "Check system performance and usage",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(BarChart3, { className: "w-5 h-5" }),
      onClick: () => window.location.href = "/analytics",
      color: "purple"
    },
    {
      title: "Manage Users",
      description: "Add or modify user accounts",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { className: "w-5 h-5" }),
      onClick: () => window.location.href = "/users",
      color: "green"
    },
    {
      title: "System Settings",
      description: "Configure platform settings",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3X3, { className: "w-5 h-5" }),
      onClick: () => window.location.href = "/settings",
      color: "orange"
    }
  ];
  const filteredQuickActions = quickActions.filter((action) => {
    const permissionMap = {
      "Install Plugin": "plugins.install",
      "View Analytics": "analytics.read",
      "Manage Users": "users.read",
      "System Settings": "settings.read"
    };
    const permission = permissionMap[action.title];
    return !permission || checkPermission(permission);
  });
  const recentActivities = [
    {
      id: 1,
      type: "plugin_installed",
      message: "Analytics Dashboard plugin installed",
      timestamp: "2 hours ago",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-4 h-4 text-green-500" })
    },
    {
      id: 2,
      type: "user_login",
      message: "John Doe logged in",
      timestamp: "3 hours ago",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-4 h-4 text-blue-500" })
    },
    {
      id: 3,
      type: "system_alert",
      message: "High memory usage detected",
      timestamp: "5 hours ago",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-500" })
    },
    {
      id: 4,
      type: "plugin_updated",
      message: "File Manager plugin updated to v2.1.0",
      timestamp: "1 day ago",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CheckCircle, { className: "w-4 h-4 text-green-500" })
    }
  ];
  const welcomeTime = () => {
    const hour = (/* @__PURE__ */ new Date()).getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "min-h-full", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "py-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "md:flex md:items-center md:justify-between mb-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("h2", { className: "text-2xl font-bold leading-7 text-gray-900 dark:text-gray-100 sm:text-3xl sm:truncate", children: [
          welcomeTime(),
          ", ",
          user?.firstName || user?.username,
          "!"
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "Welcome back to your Shell Platform dashboard" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 flex md:mt-0 md:ml-4", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: "inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
          onClick: () => window.location.reload(),
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Activity, { className: "w-4 h-4 mr-2" }),
            "Refresh"
          ]
        }
      ) })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8", children: stats.map((stat) => /* @__PURE__ */ jsxRuntimeExports.jsx(StatCard, { ...stat }, stat.title)) }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-8", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "lg:col-span-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-4", children: "Quick Actions" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: filteredQuickActions.map((action) => /* @__PURE__ */ jsxRuntimeExports.jsx(QuickAction, { ...action }, action.title)) })
        ] }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 mt-6", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-4", children: "Recent Activity" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: recentActivities.map((activity) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-shrink-0", children: activity.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-gray-900 dark:text-gray-100", children: activity.message }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-gray-500 dark:text-gray-400", children: activity.timestamp })
            ] })
          ] }, activity.id)) })
        ] }) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "lg:col-span-2", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100", children: "Dashboard Widgets" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300", children: "Customize" })
        ] }),
        activePlugins.length > 0 ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          PluginGrid,
          {
            pluginIds: activePlugins.slice(0, 4),
            columns: 2,
            gap: "md"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-8", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "w-12 h-12 text-gray-400 mx-auto mb-4" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h4", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2", children: "No active plugins" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-500 dark:text-gray-400 mb-4", children: "Install and activate plugins to see widgets here" }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              onClick: () => window.location.href = "/plugins/marketplace",
              className: "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { className: "w-4 h-4 mr-2" }),
                "Browse Plugins"
              ]
            }
          )
        ] })
      ] }) }) })
    ] })
  ] }) }) });
};

export { Dashboard as default };
