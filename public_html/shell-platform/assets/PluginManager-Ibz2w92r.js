import { importShared } from './__federation_fn_import-CGcCI4KO.js';
import { j as jsxRuntimeExports } from './jsx-runtime-a3QmZIrm.js';
import { u as useAppDispatch, a as useAppSelector, f as selectInstalledPlugins, g as selectPluginRegistry, h as loadPluginRegistryAsync, S as Skeleton, E as ErrorBoundary, L as LoadingButton, j as updatePluginAsync, t as togglePluginAsync, k as uninstallPluginAsync, m as installPluginAsync } from './index-DEIz9Ujh.js';

const React = await importShared('react');
const {useState,useEffect} = React;

const {Package,Download,Trash2,Settings,Power,AlertTriangle,CheckCircle,XCircle,RefreshCw,Search,Filter,Grid,List} = await importShared('lucide-react');
const {clsx} = await importShared('clsx');

const PluginCard = ({
  plugin,
  isInstalled,
  onInstall,
  onUninstall,
  onToggle,
  onUpdate,
  loading = false
}) => {
  const statusIcons = {
    active: CheckCircle,
    inactive: XCircle,
    loading: RefreshCw,
    error: AlertTriangle,
    updating: RefreshCw
  };
  const StatusIcon = statusIcons[plugin.status] || Package;
  const hasUpdate = plugin.metadata.updateAvailable;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start justify-between mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3", children: [
        plugin.icon ? /* @__PURE__ */ jsxRuntimeExports.jsx(
          "img",
          {
            src: plugin.icon,
            alt: plugin.name,
            className: "w-10 h-10 rounded-lg object-cover"
          }
        ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "w-6 h-6 text-primary-600 dark:text-primary-400" }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-semibold text-gray-900 dark:text-gray-100", children: plugin.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-gray-500 dark:text-gray-400", children: [
            "v",
            plugin.version,
            " by ",
            plugin.author
          ] })
        ] })
      ] }),
      isInstalled && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          StatusIcon,
          {
            className: clsx(
              "w-5 h-5",
              {
                "text-green-500": plugin.status === "active",
                "text-gray-400": plugin.status === "inactive",
                "text-red-500": plugin.status === "error",
                "text-blue-500 animate-spin": plugin.status === "loading" || plugin.status === "updating"
              }
            )
          }
        ),
        hasUpdate && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-2 h-2 bg-orange-500 rounded-full" })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2", children: plugin.description }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center flex-wrap gap-2 mb-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full", children: plugin.category }),
      plugin.tags.slice(0, 2).map((tag) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: "px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 rounded-full",
          children: tag
        },
        tag
      )),
      plugin.tags.length > 2 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-gray-400", children: [
        "+",
        plugin.tags.length - 2,
        " more"
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700", children: [
      isInstalled ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          LoadingButton,
          {
            loading,
            onClick: () => onToggle(plugin.id, plugin.status !== "active"),
            variant: plugin.status === "active" ? "secondary" : "primary",
            size: "sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Power, { className: "w-4 h-4 mr-1" }),
              plugin.status === "active" ? "Disable" : "Enable"
            ]
          }
        ),
        hasUpdate && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          LoadingButton,
          {
            loading,
            onClick: () => onUpdate(plugin.id),
            variant: "secondary",
            size: "sm",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-4 h-4 mr-1" }),
              "Update"
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => onUninstall(plugin.id),
            className: "p-2 text-gray-400 hover:text-red-500 transition-colors",
            title: "Uninstall",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { className: "w-4 h-4" })
          }
        )
      ] }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(
        LoadingButton,
        {
          loading,
          onClick: () => onInstall(plugin),
          variant: "primary",
          size: "sm",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Download, { className: "w-4 h-4 mr-1" }),
            "Install"
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("button", { className: "p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Settings, { className: "w-4 h-4" }) })
    ] })
  ] });
};
const PluginManager = () => {
  const dispatch = useAppDispatch();
  const installedPlugins = useAppSelector(selectInstalledPlugins);
  const registry = useAppSelector(selectPluginRegistry);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [showInstalled, setShowInstalled] = useState(false);
  const [loadingStates, setLoadingStates] = useState({});
  useEffect(() => {
    dispatch(loadPluginRegistryAsync());
  }, [dispatch]);
  const handleInstall = async (plugin) => {
    setLoadingStates((prev) => ({ ...prev, [plugin.id]: true }));
    try {
      await dispatch(installPluginAsync(plugin)).unwrap();
    } finally {
      setLoadingStates((prev) => ({ ...prev, [plugin.id]: false }));
    }
  };
  const handleUninstall = async (pluginId) => {
    if (window.confirm("Are you sure you want to uninstall this plugin?")) {
      setLoadingStates((prev) => ({ ...prev, [pluginId]: true }));
      try {
        await dispatch(uninstallPluginAsync(pluginId)).unwrap();
      } finally {
        setLoadingStates((prev) => ({ ...prev, [pluginId]: false }));
      }
    }
  };
  const handleToggle = async (pluginId, active) => {
    setLoadingStates((prev) => ({ ...prev, [pluginId]: true }));
    try {
      await dispatch(togglePluginAsync({ pluginId, active })).unwrap();
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pluginId]: false }));
    }
  };
  const handleUpdate = async (pluginId) => {
    setLoadingStates((prev) => ({ ...prev, [pluginId]: true }));
    try {
      await dispatch(updatePluginAsync(pluginId)).unwrap();
    } finally {
      setLoadingStates((prev) => ({ ...prev, [pluginId]: false }));
    }
  };
  const allPlugins = React.useMemo(() => {
    const registryPlugins = registry?.plugins || [];
    new Set(installedPlugins.map((p) => p.id));
    const merged = /* @__PURE__ */ new Map();
    installedPlugins.forEach((plugin) => {
      merged.set(plugin.id, plugin);
    });
    registryPlugins.forEach((plugin) => {
      if (!merged.has(plugin.id)) {
        merged.set(plugin.id, plugin);
      }
    });
    return Array.from(merged.values());
  }, [registry, installedPlugins]);
  const filteredPlugins = React.useMemo(() => {
    let filtered = allPlugins;
    if (showInstalled) {
      const installedIds = new Set(installedPlugins.map((p) => p.id));
      filtered = filtered.filter((p) => installedIds.has(p.id));
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (plugin) => plugin.name.toLowerCase().includes(query) || plugin.description.toLowerCase().includes(query) || plugin.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    if (selectedCategory !== "all") {
      filtered = filtered.filter((plugin) => plugin.category === selectedCategory);
    }
    return filtered;
  }, [allPlugins, installedPlugins, searchQuery, selectedCategory, showInstalled]);
  const categories = React.useMemo(() => {
    return registry?.categories || [];
  }, [registry]);
  const isPluginInstalled = (pluginId) => {
    return installedPlugins.some((p) => p.id === pluginId);
  };
  if (!registry) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "p-6", children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: Array.from({ length: 6 }).map((_, index) => /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-3 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { variant: "circular", width: 40, height: 40 }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 120, height: 20 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 80, height: 16 })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { lines: 2, className: "mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex space-x-2 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 60, height: 24 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 40, height: 24 })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 80, height: 32 }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { width: 32, height: 32 })
      ] })
    ] }, index)) }) });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsx(ErrorBoundary, { children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-6 space-y-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-bold text-gray-900 dark:text-gray-100", children: "Plugin Manager" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300", children: "Manage and discover plugins for your shell platform" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            onClick: () => setShowInstalled(!showInstalled),
            className: clsx(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              showInstalled ? "bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            ),
            children: showInstalled ? "Show All" : "Show Installed"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded-lg border border-gray-300 dark:border-gray-600", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setViewMode("grid"),
              className: clsx(
                "p-2 rounded-l-lg transition-colors",
                viewMode === "grid" ? "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid, { className: "w-5 h-5" })
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              onClick: () => setViewMode("list"),
              className: clsx(
                "p-2 rounded-r-lg transition-colors",
                viewMode === "list" ? "bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400" : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              ),
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(List, { className: "w-5 h-5" })
            }
          )
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "text",
            placeholder: "Search plugins...",
            value: searchQuery,
            onChange: (e) => setSearchQuery(e.target.value),
            className: "w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center space-x-2", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(Filter, { className: "w-5 h-5 text-gray-400" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "select",
          {
            value: selectedCategory,
            onChange: (e) => setSelectedCategory(e.target.value),
            className: "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "all", children: "All Categories" }),
              categories.map((category) => /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: category.id, children: category.name }, category.id))
            ]
          }
        )
      ] })
    ] }),
    filteredPlugins.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(Package, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-lg font-medium text-gray-900 dark:text-gray-100 mb-2", children: "No plugins found" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-gray-600 dark:text-gray-300", children: searchQuery ? "Try adjusting your search criteria." : "No plugins available in this category." })
    ] }) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: clsx(
      "grid gap-6",
      viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
    ), children: filteredPlugins.map((plugin) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      PluginCard,
      {
        plugin,
        isInstalled: isPluginInstalled(plugin.id),
        onInstall: handleInstall,
        onUninstall: handleUninstall,
        onToggle: handleToggle,
        onUpdate: handleUpdate,
        loading: loadingStates[plugin.id]
      },
      plugin.id
    )) })
  ] }) });
};

export { PluginManager as default };
