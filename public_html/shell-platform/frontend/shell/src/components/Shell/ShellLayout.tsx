/**
 * Shell Layout Component
 * Provides the frame while plugins provide the content
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Alert
} from '@mui/material';
import {
  Menu as MenuIcon,
  Brightness4,
  Brightness7,
  Settings,
  Extension
} from '@mui/icons-material';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { MenuComponent } from '../Menu/MenuComponent';
import { PluginAdmin } from '../PluginAdmin/PluginAdmin';
import { PluginManager } from '../../plugin-system/PluginManager';
import { PluginHooks } from '../../plugin-system/PluginHooks';

interface ShellLayoutProps {
  pluginManager: PluginManager;
}

export const ShellLayout: React.FC<ShellLayoutProps> = ({ pluginManager }) => {
  const [menuOpen, setMenuOpen] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [pluginRoutes, setPluginRoutes] = useState<any[]>([]);
  const [pluginContent, setPluginContent] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const theme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
    },
  });

  const hooks = pluginManager.getHooks();

  useEffect(() => {
    loadPluginRoutes();
    registerShellHooks();
  }, []);

  /**
   * Load routes from enabled plugins
   */
  const loadPluginRoutes = async () => {
    try {
      // Get router service
      const router = pluginManager.getService('router');
      if (router) {
        const routes = router.getRoutes();
        setPluginRoutes(routes);
      }
    } catch (error) {
      console.error('Failed to load plugin routes:', error);
      setError('Failed to load plugin routes');
    }
  };

  /**
   * Register shell hooks
   */
  const registerShellHooks = () => {
    // Listen for content updates from plugins
    hooks.addAction('shell.content.update', (content: React.ReactNode) => {
      setPluginContent(content);
    }, 10, 'shell');

    // Listen for route changes
    hooks.addAction('router.routes.changed', () => {
      loadPluginRoutes();
    }, 10, 'shell');

    // Listen for errors
    hooks.addAction('shell.error', (error: string) => {
      setError(error);
    }, 10, 'shell');
  };

  /**
   * Toggle theme
   */
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    hooks.doAction('theme.changed', !darkMode ? 'dark' : 'light');
  };

  /**
   * Navigate to plugin admin
   */
  const openPluginAdmin = () => {
    navigate('/admin/plugins');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* App Bar - Shell provides this */}
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            transition: 'all 0.3s'
          }}
        >
          <Toolbar>
            <IconButton
              color="inherit"
              edge="start"
              onClick={() => setMenuOpen(!menuOpen)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
            
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Shell Platform
            </Typography>

            {/* Shell controls */}
            <IconButton color="inherit" onClick={toggleTheme}>
              {darkMode ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            
            <IconButton color="inherit" onClick={openPluginAdmin}>
              <Extension />
            </IconButton>
            
            <IconButton color="inherit">
              <Settings />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Menu - Shell provides component, plugins provide items */}
        <MenuComponent 
          hooks={hooks}
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          variant="persistent"
        />

        {/* Main Content Area - Plugins provide all content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            marginLeft: menuOpen ? '240px' : 0,
            transition: 'margin 0.3s',
            marginTop: '64px' // AppBar height
          }}
        >
          <Container maxWidth="xl">
            {error && (
              <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            {/* Plugin content renders here */}
            <Routes>
              {/* Shell admin route */}
              <Route path="/admin/plugins" element={
                <PluginAdmin 
                  pluginManager={pluginManager}
                  stateManager={pluginManager.getStateManager()}
                  discovery={pluginManager.getDiscovery()}
                />
              } />

              {/* Plugin routes */}
              {pluginRoutes.map(route => (
                <Route 
                  key={route.path}
                  path={route.path}
                  element={<PluginRouteRenderer route={route} />}
                />
              ))}

              {/* Default route */}
              <Route path="/" element={
                <Box sx={{ textAlign: 'center', py: 8 }}>
                  <Typography variant="h3" gutterBottom>
                    Welcome to Shell Platform
                  </Typography>
                  <Typography variant="body1" color="text.secondary" paragraph>
                    This is the shell. All functionality comes from plugins.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Navigate to Admin → Plugins to install and manage plugins.
                  </Typography>
                </Box>
              } />

              {/* Catch all - redirect to home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>

            {/* Render plugin-provided content if any */}
            {pluginContent && (
              <Box sx={{ mt: 3 }}>
                {pluginContent}
              </Box>
            )}
          </Container>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

/**
 * Component to render plugin routes
 */
const PluginRouteRenderer: React.FC<{ route: any }> = ({ route }) => {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponent();
  }, [route]);

  const loadComponent = async () => {
    try {
      setLoading(true);
      setError(null);

      if (typeof route.component === 'function') {
        // Component factory function
        const comp = await route.component();
        setComponent(() => comp);
      } else if (route.component) {
        // Direct component
        setComponent(() => route.component);
      } else {
        throw new Error('No component defined for route');
      }
    } catch (err) {
      console.error(`Failed to load component for route ${route.path}:`, err);
      setError(`Failed to load plugin content: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography>Loading plugin...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (!Component) {
    return (
      <Alert severity="warning">
        No content available for this route
      </Alert>
    );
  }

  return <Component />;
};