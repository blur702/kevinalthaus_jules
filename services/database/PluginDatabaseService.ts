/**
 * Bulletproof Database Service for Plugin Management
 * Each function is focused on a single responsibility
 */

import { Pool, PoolClient } from 'pg';

export class PluginDatabaseService {
  private pool: Pool;
  private retryAttempts = 3;
  private retryDelay = 1000;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * Check if a plugin is enabled in the database
   */
  async isPluginEnabled(pluginId: string): Promise<boolean> {
    const query = `
      SELECT enabled 
      FROM plugins 
      WHERE plugin_id = $1
    `;
    
    try {
      const result = await this.executeQuery(query, [pluginId]);
      return result.rows[0]?.enabled || false;
    } catch (error) {
      console.error(`Failed to check if plugin ${pluginId} is enabled:`, error);
      return false; // Default to disabled on error
    }
  }

  /**
   * Enable a specific plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    const query = `
      UPDATE plugins 
      SET enabled = true, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE plugin_id = $1 
      RETURNING enabled
    `;
    
    try {
      const result = await this.executeQuery(query, [pluginId]);
      if (result.rows.length === 0) {
        // Plugin doesn't exist, create it
        return await this.registerPlugin(pluginId, true);
      }
      await this.logPluginActivity(pluginId, 'enabled');
      return result.rows[0].enabled;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Disable a specific plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    const query = `
      UPDATE plugins 
      SET enabled = false, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE plugin_id = $1 
      RETURNING enabled
    `;
    
    try {
      const result = await this.executeQuery(query, [pluginId]);
      await this.logPluginActivity(pluginId, 'disabled');
      return !result.rows[0]?.enabled;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Register a new plugin in the database
   */
  async registerPlugin(pluginId: string, enabled = false): Promise<boolean> {
    const query = `
      INSERT INTO plugins (plugin_id, enabled, installed_at) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (plugin_id) 
      DO UPDATE SET updated_at = CURRENT_TIMESTAMP
      RETURNING plugin_id
    `;
    
    try {
      const result = await this.executeQuery(query, [pluginId, enabled]);
      await this.logPluginActivity(pluginId, 'registered');
      return result.rows.length > 0;
    } catch (error) {
      console.error(`Failed to register plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get all enabled plugins
   */
  async getEnabledPlugins(): Promise<string[]> {
    const query = `
      SELECT plugin_id 
      FROM plugins 
      WHERE enabled = true 
      ORDER BY load_order, plugin_id
    `;
    
    try {
      const result = await this.executeQuery(query);
      return result.rows.map(row => row.plugin_id);
    } catch (error) {
      console.error('Failed to get enabled plugins:', error);
      return [];
    }
  }

  /**
   * Save plugin settings
   */
  async savePluginSettings(pluginId: string, settings: Record<string, any>): Promise<boolean> {
    const query = `
      INSERT INTO plugin_settings (plugin_id, settings) 
      VALUES ($1, $2)
      ON CONFLICT (plugin_id) 
      DO UPDATE SET settings = $2, updated_at = CURRENT_TIMESTAMP
    `;
    
    try {
      await this.executeQuery(query, [pluginId, JSON.stringify(settings)]);
      return true;
    } catch (error) {
      console.error(`Failed to save settings for plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get plugin settings
   */
  async getPluginSettings(pluginId: string): Promise<Record<string, any> | null> {
    const query = `
      SELECT settings 
      FROM plugin_settings 
      WHERE plugin_id = $1
    `;
    
    try {
      const result = await this.executeQuery(query, [pluginId]);
      return result.rows[0]?.settings || null;
    } catch (error) {
      console.error(`Failed to get settings for plugin ${pluginId}:`, error);
      return null;
    }
  }

  /**
   * Execute database query with retry logic
   */
  private async executeQuery(query: string, params: any[] = []): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      try {
        const client = await this.pool.connect();
        try {
          const result = await client.query(query, params);
          return result;
        } finally {
          client.release();
        }
      } catch (error) {
        lastError = error as Error;
        if (attempt < this.retryAttempts - 1) {
          await this.delay(this.retryDelay * (attempt + 1));
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Log plugin activity
   */
  private async logPluginActivity(pluginId: string, action: string): Promise<void> {
    const query = `
      INSERT INTO plugin_activity (plugin_id, action, timestamp) 
      VALUES ($1, $2, CURRENT_TIMESTAMP)
    `;
    
    try {
      await this.executeQuery(query, [pluginId, action]);
    } catch (error) {
      // Logging failure shouldn't break the main operation
      console.error(`Failed to log activity for plugin ${pluginId}:`, error);
    }
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for database connection
   */
  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.executeQuery('SELECT 1');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Clean up database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}