/**
 * Hello World Plugin
 * Simple demonstration plugin
 */

import React from 'react';
import { WavingHand } from '@mui/icons-material';

interface PluginContext {
  manifest: any;
  services: {
    menu?: any;
    router?: any;
    settings?: any;
    [key: string]: any;
  };
  hooks: any;
}

export default class HelloWorldPlugin {
  private context: PluginContext;
  private settings: any;

  constructor(context: PluginContext) {
    this.context = context;
    this.settings = {
      greeting: 'Hello World!',
      showTime: true,
      textColor: 'blue'
    };
    this.initialize();
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    console.log('🌍 Hello World Plugin initializing...');

    // Load settings
    await this.loadSettings();

    // Register menu item
    this.registerMenu();

    // Register route
    this.registerRoute();

    // Register hooks
    this.registerHooks();

    console.log('✅ Hello World Plugin initialized');
  }

  /**
   * Load plugin settings
   */
  private async loadSettings() {
    const { settings } = this.context.services;
    if (settings) {
      const savedSettings = await settings.getPluginSettings('hello-world');
      if (savedSettings) {
        this.settings = { ...this.settings, ...savedSettings };
      }
    }
  }

  /**
   * Register menu item
   */
  private registerMenu() {
    const { menu } = this.context.services;
    
    if (!menu) {
      console.warn('Menu service not available for Hello World plugin');
      return;
    }

    menu.registerMenuItem('hello-world', {
      id: 'main',
      label: 'Hello World',
      icon: <WavingHand />,
      path: '/hello-world',
      position: 500
    });
  }

  /**
   * Register route
   */
  private registerRoute() {
    const { router } = this.context.services;
    
    if (!router) {
      console.warn('Router service not available for Hello World plugin');
      return;
    }

    // Register the route with a component factory
    router.registerRoute('/hello-world', () => {
      return this.createHelloWorldComponent();
    });
  }

  /**
   * Register hooks
   */
  private registerHooks() {
    const { hooks } = this.context;

    // Add action when plugin loads
    hooks.doAction('hello.loaded');

    // Add filter to modify content
    hooks.addFilter('content.render', this.filterContent.bind(this), 10, 'hello-world');
  }

  /**
   * Create the Hello World component
   */
  private createHelloWorldComponent() {
    const settings = this.settings;

    return function HelloWorldView() {
      const [currentTime, setCurrentTime] = React.useState(new Date());

      React.useEffect(() => {
        if (settings.showTime) {
          const timer = setInterval(() => {
            setCurrentTime(new Date());
          }, 1000);
          return () => clearInterval(timer);
        }
      }, []);

      const textStyle = {
        color: settings.textColor || 'blue',
        textAlign: 'center' as const,
        padding: '40px',
        fontFamily: 'Arial, sans-serif'
      };

      return (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '400px',
          backgroundColor: '#f5f5f5',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h1 style={textStyle}>
            <WavingHand style={{ fontSize: '48px', marginBottom: '20px' }} />
            <br />
            {settings.greeting}
          </h1>
          
          {settings.showTime && (
            <div style={{ 
              marginTop: '20px', 
              fontSize: '18px',
              color: '#666'
            }}>
              Current Time: {currentTime.toLocaleTimeString()}
            </div>
          )}

          <div style={{ 
            marginTop: '40px', 
            padding: '20px',
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3>Plugin Information</h3>
            <ul style={{ textAlign: 'left', color: '#333' }}>
              <li>Plugin: Hello World</li>
              <li>Version: 1.0.0</li>
              <li>Status: Enabled</li>
              <li>This content is rendered independently from the shell!</li>
            </ul>
          </div>

          <div style={{ 
            marginTop: '20px',
            fontSize: '14px',
            color: '#999'
          }}>
            This is a demonstration of the plugin system. The shell provides the frame,
            but this content is entirely from the Hello World plugin.
          </div>
        </div>
      );
    };
  }

  /**
   * Filter content (example of using filters)
   */
  private filterContent(content: any) {
    // Could modify content here if needed
    return content;
  }

  /**
   * Update settings
   */
  async updateSettings(newSettings: any) {
    this.settings = { ...this.settings, ...newSettings };
    
    const { settings } = this.context.services;
    if (settings) {
      await settings.savePluginSettings('hello-world', this.settings);
    }

    // Re-render by updating route
    this.registerRoute();
  }

  /**
   * Cleanup when plugin is disabled/unloaded
   */
  async cleanup() {
    console.log('👋 Hello World Plugin cleaning up...');
    
    const { menu, router, hooks } = this.context.services;
    
    // Remove menu items
    if (menu) {
      menu.removePluginMenuItems('hello-world');
    }

    // Remove routes
    if (router) {
      router.removeRoute('/hello-world');
    }

    // Remove hooks
    this.context.hooks.removePluginHooks('hello-world');

    console.log('✅ Hello World Plugin cleaned up');
  }
}