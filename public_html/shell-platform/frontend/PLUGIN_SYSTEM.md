# Shell Platform Plugin System

A comprehensive plugin architecture built with Module Federation, providing a secure, scalable, and developer-friendly platform for extending applications.

## 🏗️ Architecture Overview

The Shell Platform Plugin System is built on several key components:

### Core Components

1. **Plugin Manager** (`PluginManager.ts`)
   - Central orchestrator for plugin lifecycle
   - Handles loading, unloading, and dependency resolution
   - Manages plugin registry and state

2. **Plugin Sandbox** (`PluginSandbox.ts`)
   - Security boundary for plugin execution
   - Scoped API access and resource isolation
   - Error containment and recovery

3. **Event Bus** (`PluginEventBus.ts`)
   - Inter-plugin communication system
   - Event routing and subscription management
   - Performance monitoring and debugging

4. **Plugin Storage** (`PluginStorage.ts`)
   - Scoped data persistence
   - Encryption and security features
   - Quota management and cleanup

5. **Hot Reload Manager** (`HotReloadManager.ts`)
   - Development-time plugin reloading
   - Change detection and automatic updates
   - Error recovery and retry logic

6. **Plugin Validator** (`PluginValidator.ts`)
   - Configuration and security validation
   - Dependency checking
   - Best practices enforcement

## 🚀 Getting Started

### Creating a New Plugin

Use the Plugin Development Kit (PDK) to scaffold a new plugin:

```bash
npx @shell-platform/plugin-dev-kit create my-awesome-plugin
```

This will create a new plugin with the following structure:

```
my-awesome-plugin/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── MyAwesomePlugin.tsx
│   ├── components/
│   ├── hooks/
│   └── types/
├── public/
├── dist/
└── README.md
```

### Basic Plugin Structure

```typescript
// src/MyAwesomePlugin.tsx
import React from 'react';
import { PluginBase } from '@shell-platform/plugin-base';

class MyAwesomePlugin extends PluginBase {
  getName(): string {
    return 'My Awesome Plugin';
  }

  getVersion(): string {
    return '1.0.0';
  }

  getComponent(): React.ComponentType<any> {
    return MyAwesomePluginComponent;
  }

  async onLoad(context: PluginContext): Promise<void> {
    await super.onLoad(context);
    // Custom initialization logic
  }
}

const MyAwesomePluginComponent: React.FC = ({ pluginAPI }) => {
  return (
    <div>
      <h1>My Awesome Plugin</h1>
      <button onClick={() => pluginAPI.showNotification('Hello from plugin!', 'success')}>
        Say Hello
      </button>
    </div>
  );
};

export default MyAwesomePlugin;
```

### Plugin Configuration

Configure your plugin in `package.json`:

```json
{
  "name": "my-awesome-plugin",
  "version": "1.0.0",
  "description": "An awesome plugin for Shell Platform",
  "main": "dist/remoteEntry.js",
  "pluginConfig": {
    "category": "productivity",
    "permissions": [
      "read:dashboard",
      "write:files"
    ],
    "routes": [
      {
        "path": "/my-plugin",
        "component": "MyAwesomePlugin",
        "title": "My Plugin",
        "protected": true
      }
    ],
    "menuItems": [
      {
        "id": "my-plugin",
        "label": "My Plugin",
        "icon": "star",
        "path": "/my-plugin",
        "order": 1
      }
    ],
    "features": [
      "notifications",
      "file-upload",
      "real-time"
    ]
  }
}
```

## 🔧 Development

### Running in Development Mode

```bash
# Start development server
npm run dev

# Or use PDK command
shell-plugin dev
```

### Building for Production

```bash
# Build plugin
npm run build

# Or use PDK command
shell-plugin build
```

### Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Or use PDK command
shell-plugin test
```

### Validation

```bash
# Validate plugin configuration
shell-plugin validate

# Auto-fix common issues
shell-plugin validate --fix
```

## 🎯 Plugin API

### Core APIs

#### Navigation
```typescript
// Navigate to a route
pluginAPI.navigate('/dashboard');

// Go back
pluginAPI.goBack();
```

#### Notifications
```typescript
// Show notification
pluginAPI.showNotification('Success!', 'success', 5000);

// Show confirmation dialog
const confirmed = await pluginAPI.showConfirmDialog('Delete Item', 'Are you sure?');

// Show input dialog
const result = await pluginAPI.showInputDialog('Enter Name', 'Please enter your name:');
```

#### Storage
```typescript
// Get storage instance (scoped to plugin)
const storage = pluginAPI.getStorage();

// Store data
await storage.set('user-preferences', { theme: 'dark' });

// Retrieve data
const preferences = await storage.get('user-preferences');

// Remove data
await storage.remove('user-preferences');
```

#### Events
```typescript
// Get event bus
const eventBus = pluginAPI.getEventBus();

// Emit event
eventBus.emit('data-updated', { timestamp: Date.now() });

// Listen to events
const unsubscribe = eventBus.on('theme-changed', (data) => {
  console.log('Theme changed to:', data.theme);
});

// Clean up
unsubscribe();
```

#### Inter-plugin Communication
```typescript
// Send message to specific plugin
pluginAPI.sendMessage('other-plugin-id', { action: 'refresh' });

// Broadcast to all plugins
pluginAPI.broadcastMessage({ type: 'global-update' });

// Listen for messages
this.addEventListener('plugin:other-plugin:message', (data) => {
  console.log('Received message:', data);
});
```

#### HTTP Utilities
```typescript
// Make API call (includes plugin headers)
const response = await pluginAPI.makeApiCall('/api/data', {
  method: 'POST',
  body: JSON.stringify({ key: 'value' })
});

// Upload file
const file = document.querySelector('input[type="file"]').files[0];
const response = await pluginAPI.uploadFile(file, '/api/upload');
```

### Lifecycle Hooks

```typescript
class MyPlugin extends PluginBase {
  async onLoad(context: PluginContext): Promise<void> {
    // Plugin is being loaded
    console.log('Plugin loading...');
  }

  async onUnload(context: PluginContext): Promise<void> {
    // Plugin is being unloaded
    console.log('Plugin unloading...');
  }

  async onActivate(context: PluginContext): Promise<void> {
    // Plugin is being activated
    console.log('Plugin activated');
  }

  async onDeactivate(context: PluginContext): Promise<void> {
    // Plugin is being deactivated
    console.log('Plugin deactivated');
  }

  async onSettingsChange(settings: any, context: PluginContext): Promise<void> {
    // Plugin settings have changed
    console.log('Settings updated:', settings);
  }

  async onThemeChange(theme: string, context: PluginContext): Promise<void> {
    // Application theme has changed
    console.log('Theme changed to:', theme);
  }
}
```

## 🔒 Security

### Permission System

Plugins must declare required permissions:

```json
{
  "pluginConfig": {
    "permissions": [
      "read:dashboard",    // Read dashboard data
      "write:dashboard",   // Write dashboard data
      "read:users",        // Read user information
      "write:users",       // Create/update users
      "delete:users",      // Delete users
      "manage:roles",      // Manage user roles
      "read:analytics",    // Read analytics data
      "write:analytics",   // Write analytics data
      "read:settings",     // Read application settings
      "write:settings",    // Write application settings
      "admin:settings",    // Administrative settings
      "read:files",        // Read files
      "write:files",       // Write files
      "upload:files",      // Upload files
      "download:files"     // Download files
    ]
  }
}
```

### Sandbox Environment

Plugins run in a secure sandbox with:

- **Restricted Global Access**: Only approved globals are available
- **Scoped Storage**: Each plugin has isolated storage
- **Network Restrictions**: External requests are validated
- **Error Isolation**: Plugin errors don't crash the host application
- **Resource Limits**: CPU and memory usage monitoring

### Security Best Practices

1. **Validate all inputs** from external sources
2. **Use TypeScript** for type safety
3. **Minimize permissions** - only request what you need
4. **Sanitize HTML** content to prevent XSS
5. **Handle errors gracefully** to maintain stability
6. **Follow CSP guidelines** for content security

## 📊 Performance

### Optimization Strategies

1. **Lazy Loading**: Plugins are loaded only when needed
2. **Code Splitting**: Separate vendor and plugin code
3. **Shared Dependencies**: Common libraries are shared between plugins
4. **Hot Reloading**: Development-time performance optimization
5. **Bundle Analysis**: Identify and eliminate bloat

### Monitoring

```typescript
// Performance monitoring
const eventBus = pluginAPI.getEventBus();

// Monitor performance metrics
eventBus.on('performance:metrics', (metrics) => {
  console.log('Plugin performance:', metrics);
});

// Custom performance tracking
const start = performance.now();
// ... plugin operation
const end = performance.now();
console.log(`Operation took ${end - start} milliseconds`);
```

## 🧪 Testing

### Unit Testing

```typescript
// MyPlugin.test.ts
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyPlugin from './MyPlugin';

describe('MyPlugin', () => {
  it('should render correctly', () => {
    const mockPluginAPI = {
      showNotification: jest.fn(),
      navigate: jest.fn(),
      // ... other mock methods
    };

    render(<MyPlugin pluginAPI={mockPluginAPI} />);
    
    expect(screen.getByText('My Plugin')).toBeInTheDocument();
  });

  it('should handle button click', async () => {
    const mockPluginAPI = {
      showNotification: jest.fn(),
    };

    render(<MyPlugin pluginAPI={mockPluginAPI} />);
    
    const button = screen.getByRole('button');
    button.click();
    
    expect(mockPluginAPI.showNotification).toHaveBeenCalledWith(
      'Hello from plugin!',
      'success'
    );
  });
});
```

### Integration Testing

```typescript
// MyPlugin.integration.test.ts
import { PluginManager } from '@shell-platform/core';
import MyPlugin from './MyPlugin';

describe('MyPlugin Integration', () => {
  let pluginManager: PluginManager;

  beforeEach(() => {
    pluginManager = PluginManager.getInstance();
  });

  it('should integrate with plugin manager', async () => {
    const plugin = {
      id: 'my-plugin',
      // ... plugin configuration
    };

    await pluginManager.installPlugin(plugin);
    const instance = pluginManager.getPlugin('my-plugin');
    
    expect(instance).toBeDefined();
    expect(instance?.isLoaded).toBe(true);
  });
});
```

## 📚 Examples

### Basic Widget Plugin

```typescript
// WeatherWidget.tsx
import React, { useState, useEffect } from 'react';
import { PluginBase } from '@shell-platform/plugin-base';

class WeatherWidget extends PluginBase {
  getName() { return 'Weather Widget'; }
  getVersion() { return '1.0.0'; }
  getComponent() { return WeatherComponent; }
}

const WeatherComponent: React.FC<{ pluginAPI: any }> = ({ pluginAPI }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeather();
  }, []);

  const loadWeather = async () => {
    try {
      const response = await pluginAPI.makeApiCall('/api/weather');
      const data = await response.json();
      setWeather(data);
    } catch (error) {
      pluginAPI.showNotification('Failed to load weather', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading weather...</div>;
  }

  return (
    <div className="weather-widget">
      <h3>Current Weather</h3>
      <p>Temperature: {weather?.temperature}°C</p>
      <p>Condition: {weather?.condition}</p>
    </div>
  );
};

export default WeatherWidget;
```

### Data Management Plugin

```typescript
// DataManager.tsx
import React, { useState, useEffect } from 'react';
import { PluginBase } from '@shell-platform/plugin-base';

class DataManager extends PluginBase {
  getName() { return 'Data Manager'; }
  getVersion() { return '1.0.0'; }
  getComponent() { return DataManagerComponent; }

  async onLoad(context) {
    await super.onLoad(context);
    
    // Initialize data synchronization
    this.addEventListener('data:sync', this.handleDataSync);
  }

  private handleDataSync = (data) => {
    console.log('Syncing data:', data);
    // Handle data synchronization
  };
}

const DataManagerComponent: React.FC<{ pluginAPI: any }> = ({ pluginAPI }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadItems();
    
    // Listen for data updates from other plugins
    const unsubscribe = pluginAPI.getEventBus().on('data:updated', (data) => {
      setItems(prev => [...prev, data]);
    });

    return unsubscribe;
  }, []);

  const loadItems = async () => {
    const storage = pluginAPI.getStorage();
    const savedItems = await storage.get('items') || [];
    setItems(savedItems);
  };

  const addItem = async (item) => {
    const newItems = [...items, item];
    setItems(newItems);
    
    const storage = pluginAPI.getStorage();
    await storage.set('items', newItems);
    
    // Notify other plugins
    pluginAPI.broadcastMessage({
      type: 'item-added',
      item
    });
  };

  return (
    <div className="data-manager">
      <h2>Data Manager</h2>
      {/* Component UI */}
    </div>
  );
};

export default DataManager;
```

## 🚀 Deployment

### Building for Production

```bash
# Build plugin
shell-plugin build

# Package for distribution
shell-plugin package

# Publish to registry
shell-plugin publish --registry https://plugins.shell-platform.com
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy plugin files
COPY package*.json ./
COPY dist/ ./dist/

# Install production dependencies
RUN npm ci --only=production

# Serve plugin
EXPOSE 3001
CMD ["npx", "serve", "-s", "dist", "-l", "3001"]
```

### Registry Configuration

Add to plugin registry:

```json
{
  "plugins": [
    {
      "id": "my-awesome-plugin",
      "name": "My Awesome Plugin",
      "version": "1.0.0",
      "remoteUrl": "https://cdn.example.com/plugins/my-awesome-plugin/remoteEntry.js",
      "exposedModule": "./MyAwesomePlugin",
      "status": "active"
    }
  ]
}
```

## 🐛 Debugging

### Development Tools

```bash
# Enable debug mode
shell-plugin dev --debug

# Analyze bundle
shell-plugin build --analyze

# Generate documentation
shell-plugin docs

# Run diagnostics
shell-plugin doctor
```

### Logging

```typescript
// Enable plugin logging
console.log('[MyPlugin] Operation completed');

// Use plugin API for structured logging
pluginAPI.getEventBus().emit('log', {
  level: 'info',
  message: 'Operation completed',
  timestamp: Date.now()
});
```

### Error Handling

```typescript
// Global error handler
window.addEventListener('error', (event) => {
  if (event.filename?.includes('my-plugin')) {
    console.error('Plugin error:', event.error);
    
    // Report to plugin manager
    pluginAPI.getEventBus().emit('plugin:error', {
      pluginId: 'my-plugin',
      error: event.error
    });
  }
});
```

## 📖 API Reference

### Plugin Base Class

```typescript
abstract class PluginBase {
  // Abstract methods (must implement)
  abstract getName(): string;
  abstract getVersion(): string;
  abstract getComponent(): React.ComponentType<any>;

  // Lifecycle hooks (optional)
  async onLoad(context: PluginContext): Promise<void>;
  async onUnload(context: PluginContext): Promise<void>;
  async onActivate(context: PluginContext): Promise<void>;
  async onDeactivate(context: PluginContext): Promise<void>;
  async onSettingsChange(settings: any, context: PluginContext): Promise<void>;
  async onThemeChange(theme: string, context: PluginContext): Promise<void>;

  // Helper methods
  protected getAPI(): PluginAPI;
  protected getContext(): PluginContext;
  protected addEventListener(event: string, callback: Function): () => void;
  protected removeEventListener(event: string, callback: Function): void;
  protected emitEvent(event: string, data?: any): void;
}
```

### Plugin API Interface

```typescript
interface PluginAPI {
  // Navigation
  navigate(path: string): void;
  goBack(): void;

  // Notifications
  showNotification(message: string, type?: 'info' | 'success' | 'warning' | 'error', duration?: number): void;
  showConfirmDialog(title: string, message: string): Promise<boolean>;
  showInputDialog(title: string, message?: string, defaultValue?: string): Promise<string | null>;

  // Storage
  getStorage(): PluginStorage;

  // Events
  getEventBus(): PluginEventBus;

  // Theme
  getCurrentTheme(): string;
  setTheme(theme: string): void;

  // User
  getCurrentUser(): any;
  hasPermission(permission: string): boolean;

  // Plugin management
  getPluginConfig(): Plugin;
  updatePluginSettings(settings: any): Promise<void>;
  getPluginSettings(): Promise<any>;

  // Inter-plugin communication
  sendMessage(targetPluginId: string, message: any): void;
  broadcastMessage(message: any): void;

  // UI utilities
  registerMenuItem(item: any): void;
  unregisterMenuItem(itemId: string): void;
  registerWidget(widget: any): void;
  unregisterWidget(widgetId: string): void;

  // HTTP utilities
  makeApiCall(endpoint: string, options?: RequestInit): Promise<Response>;
  uploadFile(file: File, endpoint: string): Promise<Response>;
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📚 [Documentation](https://docs.shell-platform.com)
- 💬 [Community Discord](https://discord.gg/shell-platform)
- 🐛 [Issue Tracker](https://github.com/shell-platform/plugin-system/issues)
- 📧 [Email Support](mailto:support@shell-platform.com)

## 🗺️ Roadmap

- [ ] GraphQL plugin API
- [ ] WebAssembly plugin support
- [ ] Plugin marketplace improvements
- [ ] Advanced security features
- [ ] Performance monitoring dashboard
- [ ] Plugin analytics and insights
- [ ] Multi-language plugin support
- [ ] Plugin testing framework
- [ ] Visual plugin builder
- [ ] Plugin certification program