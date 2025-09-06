/**
 * Plugin State Manager
 * Manages plugin installation, enabled/disabled states
 */

export enum PluginState {
  NOT_INSTALLED = 'not_installed',
  INSTALLED = 'installed',
  ENABLED = 'enabled',
  DISABLED = 'disabled',
  ERROR = 'error'
}

export interface PluginStatus {
  id: string;
  name: string;
  version: string;
  state: PluginState;
  installed: boolean;
  enabled: boolean;
  error?: string;
  installedAt?: Date;
  updatedAt?: Date;
}

export class PluginStateManager {
  private pluginStates: Map<string, PluginStatus>;
  private database: any;

  constructor(database: any) {
    this.database = database;
    this.pluginStates = new Map();
  }

  /**
   * Initialize by loading plugin states from database
   */
  async initialize(): Promise<void> {
    await this.loadPluginStates();
  }

  /**
   * Load all plugin states from database
   */
  private async loadPluginStates(): Promise<void> {
    try {
      const result = await this.database.query(
        'SELECT * FROM plugins ORDER BY plugin_id'
      );

      for (const row of result.rows) {
        this.pluginStates.set(row.plugin_id, {
          id: row.plugin_id,
          name: row.name,
          version: row.version,
          state: this.determineState(row),
          installed: row.status === 'installed',
          enabled: row.enabled,
          installedAt: row.installed_at,
          updatedAt: row.updated_at
        });
      }
    } catch (error) {
      console.error('Failed to load plugin states:', error);
    }
  }

  /**
   * Determine plugin state from database row
   */
  private determineState(row: any): PluginState {
    if (row.status === 'error') return PluginState.ERROR;
    if (row.status !== 'installed') return PluginState.NOT_INSTALLED;
    if (row.enabled) return PluginState.ENABLED;
    return PluginState.DISABLED;
  }

  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): PluginState {
    const status = this.pluginStates.get(pluginId);
    return status?.state || PluginState.NOT_INSTALLED;
  }

  /**
   * Get plugin status
   */
  getPluginStatus(pluginId: string): PluginStatus | null {
    return this.pluginStates.get(pluginId) || null;
  }

  /**
   * Get all plugin statuses
   */
  getAllPluginStatuses(): PluginStatus[] {
    return Array.from(this.pluginStates.values());
  }

  /**
   * Check if plugin is installed
   */
  isInstalled(pluginId: string): boolean {
    const status = this.pluginStates.get(pluginId);
    return status?.installed || false;
  }

  /**
   * Check if plugin is enabled
   */
  isEnabled(pluginId: string): boolean {
    const status = this.pluginStates.get(pluginId);
    return status?.enabled || false;
  }

  /**
   * Install a plugin
   */
  async installPlugin(pluginId: string, metadata: any): Promise<boolean> {
    try {
      // Insert or update plugin record
      await this.database.query(
        `INSERT INTO plugins (plugin_id, name, version, description, author, status, enabled, installed_at)
         VALUES ($1, $2, $3, $4, $5, 'installed', false, CURRENT_TIMESTAMP)
         ON CONFLICT (plugin_id) 
         DO UPDATE SET 
           name = $2,
           version = $3,
           description = $4,
           author = $5,
           status = 'installed',
           updated_at = CURRENT_TIMESTAMP`,
        [pluginId, metadata.name, metadata.version, metadata.description, metadata.author]
      );

      // Update local state
      this.pluginStates.set(pluginId, {
        id: pluginId,
        name: metadata.name,
        version: metadata.version,
        state: PluginState.DISABLED,
        installed: true,
        enabled: false,
        installedAt: new Date(),
        updatedAt: new Date()
      });

      // Log activity
      await this.logActivity(pluginId, 'installed', metadata);

      return true;
    } catch (error) {
      console.error(`Failed to install plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Uninstall a plugin
   */
  async uninstallPlugin(pluginId: string): Promise<boolean> {
    try {
      // First disable if enabled
      if (this.isEnabled(pluginId)) {
        await this.disablePlugin(pluginId);
      }

      // Delete from database
      await this.database.query(
        'DELETE FROM plugins WHERE plugin_id = $1',
        [pluginId]
      );

      // Remove from local state
      this.pluginStates.delete(pluginId);

      // Log activity
      await this.logActivity(pluginId, 'uninstalled');

      return true;
    } catch (error) {
      console.error(`Failed to uninstall plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<boolean> {
    try {
      // Check if installed
      if (!this.isInstalled(pluginId)) {
        console.error(`Cannot enable plugin ${pluginId}: not installed`);
        return false;
      }

      // Update database
      await this.database.query(
        'UPDATE plugins SET enabled = true, updated_at = CURRENT_TIMESTAMP WHERE plugin_id = $1',
        [pluginId]
      );

      // Update local state
      const status = this.pluginStates.get(pluginId);
      if (status) {
        status.enabled = true;
        status.state = PluginState.ENABLED;
        status.updatedAt = new Date();
      }

      // Log activity
      await this.logActivity(pluginId, 'enabled');

      return true;
    } catch (error) {
      console.error(`Failed to enable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<boolean> {
    try {
      // Update database
      await this.database.query(
        'UPDATE plugins SET enabled = false, updated_at = CURRENT_TIMESTAMP WHERE plugin_id = $1',
        [pluginId]
      );

      // Update local state
      const status = this.pluginStates.get(pluginId);
      if (status) {
        status.enabled = false;
        status.state = PluginState.DISABLED;
        status.updatedAt = new Date();
      }

      // Log activity
      await this.logActivity(pluginId, 'disabled');

      return true;
    } catch (error) {
      console.error(`Failed to disable plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Set plugin error state
   */
  async setPluginError(pluginId: string, error: string): Promise<void> {
    try {
      await this.database.query(
        `UPDATE plugins 
         SET status = 'error', 
             metadata = jsonb_set(COALESCE(metadata, '{}'), '{error}', $2),
             updated_at = CURRENT_TIMESTAMP 
         WHERE plugin_id = $1`,
        [pluginId, JSON.stringify(error)]
      );

      const status = this.pluginStates.get(pluginId);
      if (status) {
        status.state = PluginState.ERROR;
        status.error = error;
        status.updatedAt = new Date();
      }

      await this.logActivity(pluginId, 'error', { error });
    } catch (err) {
      console.error(`Failed to set error state for plugin ${pluginId}:`, err);
    }
  }

  /**
   * Log plugin activity
   */
  private async logActivity(pluginId: string, action: string, details?: any): Promise<void> {
    try {
      await this.database.query(
        'INSERT INTO plugin_activity (plugin_id, action, details) VALUES ($1, $2, $3)',
        [pluginId, action, details ? JSON.stringify(details) : null]
      );
    } catch (error) {
      console.error('Failed to log plugin activity:', error);
    }
  }

  /**
   * Get plugins by state
   */
  getPluginsByState(state: PluginState): PluginStatus[] {
    return Array.from(this.pluginStates.values())
      .filter(status => status.state === state);
  }

  /**
   * Refresh plugin states from database
   */
  async refresh(): Promise<void> {
    await this.loadPluginStates();
  }
}