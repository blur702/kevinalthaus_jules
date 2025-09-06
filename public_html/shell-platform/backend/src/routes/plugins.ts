import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { ApiResponse, Plugin, PluginInstallRequest, AuthenticatedRequest } from '../types';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// Mock plugins database - In production, this would be a real database
let mockPlugins: Plugin[] = [
  {
    id: '1',
    name: 'File Manager',
    version: '1.0.0',
    description: 'Advanced file management capabilities',
    author: 'Shell Platform Team',
    enabled: true,
    installDate: new Date('2024-01-01'),
    config: {
      maxFileSize: '10MB',
      allowedTypes: ['image/*', 'text/*', 'application/pdf'],
    },
  },
  {
    id: '2',
    name: 'Code Editor',
    version: '2.1.0',
    description: 'Syntax highlighting and code editing',
    author: 'Shell Platform Team',
    enabled: true,
    installDate: new Date('2024-01-15'),
    config: {
      theme: 'dark',
      fontSize: 14,
      tabSize: 2,
    },
  },
  {
    id: '3',
    name: 'Terminal',
    version: '1.5.0',
    description: 'Web-based terminal emulator',
    author: 'Shell Platform Team',
    enabled: false,
    installDate: new Date('2024-02-01'),
    config: {
      shell: '/bin/bash',
      timeout: 300000,
    },
  },
];

/**
 * GET /plugins
 * Get all installed plugins
 */
router.get('/', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse<Plugin[]>>) => {
  try {
    const { enabled } = req.query;
    let plugins = mockPlugins;

    // Filter by enabled status if specified
    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      plugins = plugins.filter(plugin => plugin.enabled === isEnabled);
    }

    res.status(200).json({
      success: true,
      message: 'Plugins retrieved successfully',
      data: plugins,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plugins',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /plugins/:id
 * Get specific plugin by ID
 */
router.get('/:id', [
  param('id').notEmpty().withMessage('Plugin ID is required'),
  authenticate,
], (req: AuthenticatedRequest, res: Response<ApiResponse<Plugin>>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const plugin = mockPlugins.find(p => p.id === id);

    if (!plugin) {
      return res.status(404).json({
        success: false,
        message: 'Plugin not found',
        timestamp: new Date().toISOString(),
      });
    }

    res.status(200).json({
      success: true,
      message: 'Plugin retrieved successfully',
      data: plugin,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve plugin',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /plugins/install
 * Install a new plugin
 */
router.post('/install', [
  body('name').notEmpty().withMessage('Plugin name is required'),
  body('source').notEmpty().withMessage('Plugin source is required'),
  body('version').optional().isString().withMessage('Version must be a string'),
  authenticate,
  authorize('admin'),
], async (req: AuthenticatedRequest, res: Response<ApiResponse<Plugin>>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    const { name, source, version = '1.0.0' }: PluginInstallRequest = req.body;

    // Check if plugin with same name already exists
    const existingPlugin = mockPlugins.find(p => p.name === name);
    if (existingPlugin) {
      return res.status(409).json({
        success: false,
        message: 'Plugin with this name already exists',
        timestamp: new Date().toISOString(),
      });
    }

    // Simulate plugin installation process
    const newPlugin: Plugin = {
      id: (mockPlugins.length + 1).toString(),
      name,
      version,
      description: `${name} plugin installed from ${source}`,
      author: 'External Developer',
      enabled: true,
      installDate: new Date(),
      config: {},
    };

    mockPlugins.push(newPlugin);

    res.status(201).json({
      success: true,
      message: 'Plugin installed successfully',
      data: newPlugin,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to install plugin',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /plugins/:id/toggle
 * Enable/disable a plugin
 */
router.put('/:id/toggle', [
  param('id').notEmpty().withMessage('Plugin ID is required'),
  authenticate,
  authorize('admin'),
], (req: AuthenticatedRequest, res: Response<ApiResponse<Plugin>>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const pluginIndex = mockPlugins.findIndex(p => p.id === id);

    if (pluginIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Plugin not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Toggle enabled status
    mockPlugins[pluginIndex].enabled = !mockPlugins[pluginIndex].enabled;
    mockPlugins[pluginIndex].updateDate = new Date();

    const action = mockPlugins[pluginIndex].enabled ? 'enabled' : 'disabled';

    res.status(200).json({
      success: true,
      message: `Plugin ${action} successfully`,
      data: mockPlugins[pluginIndex],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle plugin',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * PUT /plugins/:id/config
 * Update plugin configuration
 */
router.put('/:id/config', [
  param('id').notEmpty().withMessage('Plugin ID is required'),
  body('config').isObject().withMessage('Config must be an object'),
  authenticate,
  authorize('admin'),
], (req: AuthenticatedRequest, res: Response<ApiResponse<Plugin>>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const { config } = req.body;
    const pluginIndex = mockPlugins.findIndex(p => p.id === id);

    if (pluginIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Plugin not found',
        timestamp: new Date().toISOString(),
      });
    }

    // Update configuration
    mockPlugins[pluginIndex].config = { ...mockPlugins[pluginIndex].config, ...config };
    mockPlugins[pluginIndex].updateDate = new Date();

    res.status(200).json({
      success: true,
      message: 'Plugin configuration updated successfully',
      data: mockPlugins[pluginIndex],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update plugin configuration',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /plugins/:id
 * Uninstall a plugin
 */
router.delete('/:id', [
  param('id').notEmpty().withMessage('Plugin ID is required'),
  authenticate,
  authorize('admin'),
], (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        error: errors.array().map(err => err.msg).join(', '),
        timestamp: new Date().toISOString(),
      });
    }

    const { id } = req.params;
    const pluginIndex = mockPlugins.findIndex(p => p.id === id);

    if (pluginIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Plugin not found',
        timestamp: new Date().toISOString(),
      });
    }

    const removedPlugin = mockPlugins.splice(pluginIndex, 1)[0];

    res.status(200).json({
      success: true,
      message: 'Plugin uninstalled successfully',
      data: { removedPlugin: removedPlugin.name },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to uninstall plugin',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /plugins/marketplace
 * Get available plugins from marketplace
 */
router.get('/marketplace/available', authenticate, (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    // Mock marketplace plugins
    const marketplacePlugins = [
      {
        name: 'Git Integration',
        version: '2.0.0',
        description: 'Git version control integration',
        author: 'DevTools Inc.',
        category: 'Development',
        downloads: 15420,
        rating: 4.8,
      },
      {
        name: 'Database Explorer',
        version: '1.3.0',
        description: 'Browse and manage databases',
        author: 'DataCorp',
        category: 'Database',
        downloads: 8932,
        rating: 4.5,
      },
      {
        name: 'Task Runner',
        version: '1.1.0',
        description: 'Automated task execution',
        author: 'AutomationPro',
        category: 'Productivity',
        downloads: 6721,
        rating: 4.2,
      },
    ];

    res.status(200).json({
      success: true,
      message: 'Marketplace plugins retrieved successfully',
      data: marketplacePlugins,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve marketplace plugins',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;