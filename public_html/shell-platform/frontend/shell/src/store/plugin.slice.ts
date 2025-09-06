import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Plugin, PluginInstance, PluginError, PluginRegistry } from '@/types';

interface PluginState {
  registry: PluginRegistry | null;
  installedPlugins: Plugin[];
  loadedPlugins: Record<string, PluginInstance>;
  activePlugins: string[];
  errors: PluginError[];
  isLoading: boolean;
  error: string | null;
}

const initialState: PluginState = {
  registry: null,
  installedPlugins: [],
  loadedPlugins: {},
  activePlugins: [],
  errors: [],
  isLoading: false,
  error: null,
};

// Async thunks
export const loadPluginRegistryAsync = createAsyncThunk(
  'plugins/loadRegistry',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/plugins/registry');
      if (!response.ok) {
        throw new Error('Failed to load plugin registry');
      }
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const loadPluginAsync = createAsyncThunk(
  'plugins/loadPlugin',
  async (pluginId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { plugins: PluginState };
      const plugin = state.plugins.installedPlugins.find(p => p.id === pluginId);
      
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Dynamic import of the remote module
      const moduleFactory = await import(/* @vite-ignore */ plugin.remoteUrl);
      const module = await moduleFactory.get(plugin.exposedModule);
      const component = module();

      const instance: PluginInstance = {
        plugin,
        module,
        component: component.default || component,
        isLoaded: true,
      };

      return { pluginId, instance };
    } catch (error: any) {
      const pluginError: PluginError = {
        pluginId,
        error: error,
        timestamp: new Date().toISOString(),
        context: 'loading',
      };
      return rejectWithValue(pluginError);
    }
  }
);

export const installPluginAsync = createAsyncThunk(
  'plugins/installPlugin',
  async (plugin: Plugin, { rejectWithValue }) => {
    try {
      const response = await fetch('/api/plugins/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(plugin),
      });

      if (!response.ok) {
        throw new Error('Failed to install plugin');
      }

      return plugin;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const uninstallPluginAsync = createAsyncThunk(
  'plugins/uninstallPlugin',
  async (pluginId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to uninstall plugin');
      }

      return pluginId;
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const updatePluginAsync = createAsyncThunk(
  'plugins/updatePlugin',
  async (pluginId: string, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/update`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update plugin');
      }

      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

export const togglePluginAsync = createAsyncThunk(
  'plugins/togglePlugin',
  async ({ pluginId, active }: { pluginId: string; active: boolean }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/api/plugins/${pluginId}/toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active }),
      });

      if (!response.ok) {
        throw new Error('Failed to toggle plugin');
      }

      return { pluginId, active };
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const pluginSlice = createSlice({
  name: 'plugins',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearPluginError: (state, action: PayloadAction<string>) => {
      state.errors = state.errors.filter(error => error.pluginId !== action.payload);
    },
    clearAllErrors: (state) => {
      state.errors = [];
    },
    setPluginError: (state, action: PayloadAction<PluginError>) => {
      const existingErrorIndex = state.errors.findIndex(
        error => error.pluginId === action.payload.pluginId
      );
      
      if (existingErrorIndex >= 0) {
        state.errors[existingErrorIndex] = action.payload;
      } else {
        state.errors.push(action.payload);
      }
    },
    unloadPlugin: (state, action: PayloadAction<string>) => {
      const pluginId = action.payload;
      delete state.loadedPlugins[pluginId];
      state.activePlugins = state.activePlugins.filter(id => id !== pluginId);
    },
    updatePluginStatus: (state, action: PayloadAction<{ pluginId: string; status: Plugin['status'] }>) => {
      const { pluginId, status } = action.payload;
      const plugin = state.installedPlugins.find(p => p.id === pluginId);
      if (plugin) {
        plugin.status = status;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Load Registry
      .addCase(loadPluginRegistryAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadPluginRegistryAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registry = action.payload;
        state.error = null;
      })
      .addCase(loadPluginRegistryAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Load Plugin
      .addCase(loadPluginAsync.pending, (state, action) => {
        const pluginId = action.meta.arg;
        const plugin = state.installedPlugins.find(p => p.id === pluginId);
        if (plugin) {
          plugin.status = 'loading';
        }
      })
      .addCase(loadPluginAsync.fulfilled, (state, action) => {
        const { pluginId, instance } = action.payload;
        state.loadedPlugins[pluginId] = instance;
        
        if (!state.activePlugins.includes(pluginId)) {
          state.activePlugins.push(pluginId);
        }
        
        const plugin = state.installedPlugins.find(p => p.id === pluginId);
        if (plugin) {
          plugin.status = 'active';
        }
        
        // Clear any existing errors for this plugin
        state.errors = state.errors.filter(error => error.pluginId !== pluginId);
      })
      .addCase(loadPluginAsync.rejected, (state, action) => {
        const pluginError = action.payload as PluginError;
        state.errors.push(pluginError);
        
        const plugin = state.installedPlugins.find(p => p.id === pluginError.pluginId);
        if (plugin) {
          plugin.status = 'error';
        }
      })
      
      // Install Plugin
      .addCase(installPluginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(installPluginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        const plugin = action.payload;
        plugin.status = 'inactive';
        plugin.metadata.installDate = new Date().toISOString();
        
        const existingIndex = state.installedPlugins.findIndex(p => p.id === plugin.id);
        if (existingIndex >= 0) {
          state.installedPlugins[existingIndex] = plugin;
        } else {
          state.installedPlugins.push(plugin);
        }
      })
      .addCase(installPluginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Uninstall Plugin
      .addCase(uninstallPluginAsync.fulfilled, (state, action) => {
        const pluginId = action.payload;
        state.installedPlugins = state.installedPlugins.filter(p => p.id !== pluginId);
        delete state.loadedPlugins[pluginId];
        state.activePlugins = state.activePlugins.filter(id => id !== pluginId);
        state.errors = state.errors.filter(error => error.pluginId !== pluginId);
      })
      
      // Update Plugin
      .addCase(updatePluginAsync.fulfilled, (state, action) => {
        const updatedPlugin = action.payload;
        const index = state.installedPlugins.findIndex(p => p.id === updatedPlugin.id);
        if (index >= 0) {
          updatedPlugin.metadata.lastUpdate = new Date().toISOString();
          state.installedPlugins[index] = updatedPlugin;
          
          // Reload the plugin if it's currently loaded
          if (state.loadedPlugins[updatedPlugin.id]) {
            delete state.loadedPlugins[updatedPlugin.id];
            // Plugin will be reloaded on next access
          }
        }
      })
      
      // Toggle Plugin
      .addCase(togglePluginAsync.fulfilled, (state, action) => {
        const { pluginId, active } = action.payload;
        const plugin = state.installedPlugins.find(p => p.id === pluginId);
        
        if (plugin) {
          plugin.status = active ? 'active' : 'inactive';
          
          if (active) {
            if (!state.activePlugins.includes(pluginId)) {
              state.activePlugins.push(pluginId);
            }
          } else {
            state.activePlugins = state.activePlugins.filter(id => id !== pluginId);
            delete state.loadedPlugins[pluginId];
          }
        }
      });
  },
});

export const {
  clearError,
  clearPluginError,
  clearAllErrors,
  setPluginError,
  unloadPlugin,
  updatePluginStatus,
} = pluginSlice.actions;

export default pluginSlice.reducer;