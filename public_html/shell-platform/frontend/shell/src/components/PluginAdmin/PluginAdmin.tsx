/**
 * Plugin Admin Component
 * UI for managing plugin installation, enable/disable states
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Typography,
  Button,
  Chip,
  IconButton,
  Switch,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress
} from '@mui/material';
import {
  Settings,
  Delete,
  Download,
  CheckCircle,
  Cancel,
  Error,
  Info
} from '@mui/icons-material';
import { PluginStateManager, PluginState, PluginStatus } from '../../plugin-system/PluginStateManager';
import { PluginManager } from '../../plugin-system/PluginManager';
import { PluginDiscovery } from '../../plugin-system/PluginDiscovery';

interface PluginAdminProps {
  pluginManager: PluginManager;
  stateManager: PluginStateManager;
  discovery: PluginDiscovery;
}

export const PluginAdmin: React.FC<PluginAdminProps> = ({
  pluginManager,
  stateManager,
  discovery
}) => {
  const [plugins, setPlugins] = useState<PluginStatus[]>([]);
  const [availablePlugins, setAvailablePlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  useEffect(() => {
    loadPlugins();
  }, []);

  /**
   * Load all plugins and their states
   */
  const loadPlugins = async () => {
    setLoading(true);
    try {
      // Get all available plugins
      const discovered = await discovery.discoverPlugins();
      setAvailablePlugins(discovered);

      // Get plugin states
      await stateManager.refresh();
      const statuses = stateManager.getAllPluginStatuses();
      
      // Merge available plugins with their states
      const allPlugins: PluginStatus[] = discovered.map(manifest => {
        const existingStatus = statuses.find(s => s.id === manifest.id);
        
        if (existingStatus) {
          return existingStatus;
        }
        
        // Plugin not in database yet
        return {
          id: manifest.id,
          name: manifest.name,
          version: manifest.version,
          state: PluginState.NOT_INSTALLED,
          installed: false,
          enabled: false
        };
      });

      setPlugins(allPlugins);
    } catch (error) {
      console.error('Failed to load plugins:', error);
      setMessage({ type: 'error', text: 'Failed to load plugins' });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Install a plugin
   */
  const handleInstall = async (pluginId: string) => {
    setLoading(true);
    try {
      const manifest = availablePlugins.find(p => p.id === pluginId);
      if (!manifest) {
        throw new Error('Plugin manifest not found');
      }

      const success = await pluginManager.installPlugin(pluginId);
      
      if (success) {
        setMessage({ type: 'success', text: `Plugin ${manifest.name} installed successfully` });
        await loadPlugins();
      } else {
        throw new Error('Installation failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to install plugin: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Uninstall a plugin
   */
  const handleUninstall = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin? This will remove all plugin data.')) {
      return;
    }

    setLoading(true);
    try {
      const success = await pluginManager.uninstallPlugin(pluginId);
      
      if (success) {
        setMessage({ type: 'success', text: 'Plugin uninstalled successfully' });
        await loadPlugins();
      } else {
        throw new Error('Uninstallation failed');
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to uninstall plugin: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enable/disable a plugin
   */
  const handleToggleEnabled = async (pluginId: string, currentlyEnabled: boolean) => {
    setLoading(true);
    try {
      const success = currentlyEnabled 
        ? await pluginManager.disablePlugin(pluginId)
        : await pluginManager.enablePlugin(pluginId);
      
      if (success) {
        setMessage({ 
          type: 'success', 
          text: `Plugin ${currentlyEnabled ? 'disabled' : 'enabled'} successfully` 
        });
        await loadPlugins();
      } else {
        throw new Error('Operation failed');
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to ${currentlyEnabled ? 'disable' : 'enable'} plugin: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get state color
   */
  const getStateColor = (state: PluginState) => {
    switch (state) {
      case PluginState.ENABLED:
        return 'success';
      case PluginState.DISABLED:
        return 'default';
      case PluginState.NOT_INSTALLED:
        return 'warning';
      case PluginState.ERROR:
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Get state icon
   */
  const getStateIcon = (state: PluginState) => {
    switch (state) {
      case PluginState.ENABLED:
        return <CheckCircle fontSize="small" />;
      case PluginState.DISABLED:
        return <Cancel fontSize="small" />;
      case PluginState.NOT_INSTALLED:
        return <Download fontSize="small" />;
      case PluginState.ERROR:
        return <Error fontSize="small" />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Plugin Management
      </Typography>

      {loading && <LinearProgress />}

      {message && (
        <Alert 
          severity={message.type} 
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {plugins.map(plugin => {
          const manifest = availablePlugins.find(p => p.id === plugin.id);
          
          return (
            <Grid item xs={12} sm={6} md={4} key={plugin.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h2">
                      {plugin.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={plugin.state}
                      color={getStateColor(plugin.state)}
                      icon={getStateIcon(plugin.state)}
                    />
                  </Box>

                  <Typography color="text.secondary" variant="body2" gutterBottom>
                    Version: {plugin.version}
                  </Typography>

                  {manifest?.description && (
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {manifest.description}
                    </Typography>
                  )}

                  {manifest?.author && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                      By: {manifest.author}
                    </Typography>
                  )}

                  {plugin.installed && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body2">
                        Enabled
                      </Typography>
                      <Switch
                        checked={plugin.enabled}
                        onChange={() => handleToggleEnabled(plugin.id, plugin.enabled)}
                        disabled={loading}
                      />
                    </Box>
                  )}
                </CardContent>

                <CardActions sx={{ justifyContent: 'space-between' }}>
                  {!plugin.installed ? (
                    <Button 
                      size="small" 
                      startIcon={<Download />}
                      onClick={() => handleInstall(plugin.id)}
                      disabled={loading}
                      variant="contained"
                    >
                      Install
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="small" 
                        startIcon={<Settings />}
                        onClick={() => {
                          setSelectedPlugin(plugin.id);
                          setDialogOpen(true);
                        }}
                        disabled={loading || !plugin.enabled}
                      >
                        Settings
                      </Button>
                      <IconButton 
                        size="small" 
                        onClick={() => handleUninstall(plugin.id)}
                        disabled={loading || plugin.enabled}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Settings Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Plugin Settings: {plugins.find(p => p.id === selectedPlugin)?.name}
        </DialogTitle>
        <DialogContent>
          <Alert severity="info">
            Plugin settings configuration would go here
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          <Button variant="contained">Save Settings</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};