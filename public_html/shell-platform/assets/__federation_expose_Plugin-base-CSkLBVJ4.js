class PluginBase {
  context = null;
  api = null;
  config = null;
  eventListeners = /* @__PURE__ */ new Map();
  // Lifecycle methods (optional overrides)
  async onLoad(context) {
    this.context = context;
    this.api = this.createAPI(context);
    console.log(`Plugin ${this.getName()} loaded`);
  }
  async onUnload(context) {
    this.removeAllEventListeners();
    console.log(`Plugin ${this.getName()} unloaded`);
  }
  async onActivate(context) {
    console.log(`Plugin ${this.getName()} activated`);
  }
  async onDeactivate(context) {
    console.log(`Plugin ${this.getName()} deactivated`);
  }
  async onSettingsChange(settings, context) {
    console.log(`Plugin ${this.getName()} settings changed:`, settings);
  }
  async onThemeChange(theme, context) {
    console.log(`Plugin ${this.getName()} theme changed to:`, theme);
  }
  async onUserChange(user, context) {
    console.log(`Plugin ${this.getName()} user changed:`, user?.id);
  }
  // Protected helper methods for plugins
  getAPI() {
    if (!this.api) {
      throw new Error("Plugin API not available. Make sure plugin is loaded.");
    }
    return this.api;
  }
  getContext() {
    if (!this.context) {
      throw new Error("Plugin context not available. Make sure plugin is loaded.");
    }
    return this.context;
  }
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, /* @__PURE__ */ new Set());
    }
    this.eventListeners.get(event).add(callback);
    const unsubscribe = this.context?.eventBus.on(event, callback);
    return () => {
      this.eventListeners.get(event)?.delete(callback);
      if (unsubscribe) unsubscribe();
    };
  }
  removeEventListener(event, callback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      this.context?.eventBus.off(event, callback);
    }
  }
  removeAllEventListeners() {
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach((callback) => {
        this.context?.eventBus.off(event, callback);
      });
    });
    this.eventListeners.clear();
  }
  emitEvent(event, data) {
    this.context?.eventBus.emit(event, data);
  }
  // Create the API interface
  createAPI(context) {
    return {
      // Navigation
      navigate: (path) => context.navigate(path),
      goBack: () => window.history.back(),
      // Notifications
      showNotification: (message, type = "info", duration = 5e3) => {
        context.notification(message, type);
      },
      showConfirmDialog: async (title, message) => {
        return new Promise((resolve) => {
          const confirmed = window.confirm(`${title}

${message}`);
          resolve(confirmed);
        });
      },
      showInputDialog: async (title, message, defaultValue) => {
        return new Promise((resolve) => {
          const result = window.prompt(message || title, defaultValue || "");
          resolve(result);
        });
      },
      // Storage
      getStorage: () => context.storage,
      // Events
      getEventBus: () => context.eventBus,
      // Theme
      getCurrentTheme: () => context.theme,
      setTheme: (theme) => {
        context.eventBus.emit("theme:change", { theme });
      },
      // User
      getCurrentUser: () => context.user,
      hasPermission: (permission) => {
        return this.config?.permissions.includes(permission) ?? false;
      },
      // Plugin management
      getPluginConfig: () => {
        if (!this.config) {
          throw new Error("Plugin config not available");
        }
        return this.config;
      },
      updatePluginSettings: async (settings) => {
        if (!this.config) {
          throw new Error("Plugin config not available");
        }
        await context.storage.set("settings", settings);
        await this.onSettingsChange?.(settings, context);
      },
      getPluginSettings: async () => {
        return await context.storage.get("settings");
      },
      // Inter-plugin communication
      sendMessage: (targetPluginId, message) => {
        context.eventBus.emit(`plugin:${targetPluginId}:message`, {
          from: this.config?.id,
          message
        });
      },
      broadcastMessage: (message) => {
        context.eventBus.emit("plugin:broadcast", {
          from: this.config?.id,
          message
        });
      },
      // UI utilities
      registerMenuItem: (item) => {
        context.eventBus.emit("ui:menu:register", {
          pluginId: this.config?.id,
          item
        });
      },
      unregisterMenuItem: (itemId) => {
        context.eventBus.emit("ui:menu:unregister", {
          pluginId: this.config?.id,
          itemId
        });
      },
      registerWidget: (widget) => {
        context.eventBus.emit("ui:widget:register", {
          pluginId: this.config?.id,
          widget
        });
      },
      unregisterWidget: (widgetId) => {
        context.eventBus.emit("ui:widget:unregister", {
          pluginId: this.config?.id,
          widgetId
        });
      },
      // HTTP utilities
      makeApiCall: async (endpoint, options = {}) => {
        const headers = new Headers(options.headers);
        headers.set("X-Plugin-ID", this.config?.id || "unknown");
        headers.set("X-Plugin-Version", this.config?.version || "0.0.0");
        return fetch(endpoint, {
          ...options,
          headers
        });
      },
      uploadFile: async (file, endpoint) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("pluginId", this.config?.id || "unknown");
        const headers = new Headers();
        headers.set("X-Plugin-ID", this.config?.id || "unknown");
        headers.set("X-Plugin-Version", this.config?.version || "0.0.0");
        return fetch(endpoint, {
          method: "POST",
          body: formData,
          headers
        });
      }
    };
  }
  // Plugin configuration setter (called by plugin manager)
  setConfig(config) {
    this.config = config;
  }
}
function pluginMethod(target, propertyName, descriptor) {
  const method = descriptor.value;
  descriptor.value = function(...args) {
    try {
      const result = method.apply(this, args);
      if (result instanceof Promise) {
        return result.catch((error) => {
          console.error(`Error in plugin method ${propertyName}:`, error);
          this.getAPI().showNotification(
            `Plugin error in ${propertyName}: ${error.message}`,
            "error"
          );
          throw error;
        });
      }
      return result;
    } catch (error) {
      console.error(`Error in plugin method ${propertyName}:`, error);
      this.getAPI().showNotification(
        `Plugin error in ${propertyName}: ${error.message}`,
        "error"
      );
      throw error;
    }
  };
  return descriptor;
}

export { PluginBase, pluginMethod };
