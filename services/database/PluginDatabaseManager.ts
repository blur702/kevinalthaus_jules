/**
 * Plugin Database Manager
 * Smart database management for plugin-specific data
 * Each plugin gets isolated tables with prefix
 */

import { Pool } from 'pg';

export class PluginDatabaseManager {
  private pool: Pool;
  private tablePrefix = 'plugin_';
  
  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString,
      max: 20
    });
  }

  /**
   * Install plugin database schema
   * Creates plugin-specific tables with proper isolation
   */
  async installPluginSchema(pluginId: string, tables: any[]): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create plugin schema namespace
      const schemaName = this.getPluginSchema(pluginId);
      await client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`);
      
      // Track plugin tables in metadata
      for (const table of tables) {
        const tableName = this.getPluginTableName(pluginId, table.name);
        
        // Create the table
        const createTableSQL = this.buildCreateTableSQL(schemaName, table);
        await client.query(createTableSQL);
        
        // Track in plugin_tables metadata
        await client.query(
          `INSERT INTO plugin_tables (plugin_id, table_name, schema_name, definition) 
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (plugin_id, table_name) DO UPDATE 
           SET definition = $4, updated_at = CURRENT_TIMESTAMP`,
          [pluginId, table.name, schemaName, JSON.stringify(table)]
        );
        
        // Create indexes if specified
        if (table.indexes) {
          for (const index of table.indexes) {
            await this.createPluginIndex(client, schemaName, table.name, index);
          }
        }
      }
      
      // Grant permissions
      await this.grantPluginPermissions(client, pluginId, schemaName);
      
      await client.query('COMMIT');
      console.log(`✅ Database schema installed for plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to install plugin schema for ${pluginId}:`, error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Uninstall plugin database schema
   * Safely removes all plugin data and tables
   */
  async uninstallPluginSchema(pluginId: string): Promise<boolean> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Backup data before deletion (optional)
      await this.backupPluginData(client, pluginId);
      
      // Get plugin schema
      const schemaName = this.getPluginSchema(pluginId);
      
      // Drop schema cascade (removes all tables and data)
      await client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      
      // Remove metadata entries
      await client.query(
        'DELETE FROM plugin_tables WHERE plugin_id = $1',
        [pluginId]
      );
      
      // Remove plugin permissions
      await client.query(
        'DELETE FROM plugin_permissions WHERE plugin_id = $1',
        [pluginId]
      );
      
      // Clean up any orphaned data
      await this.cleanupOrphanedData(client, pluginId);
      
      await client.query('COMMIT');
      console.log(`✅ Database schema uninstalled for plugin: ${pluginId}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to uninstall plugin schema for ${pluginId}:`, error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get plugin-specific database connection
   * Returns a scoped connection that can only access plugin's schema
   */
  getPluginConnection(pluginId: string) {
    const schemaName = this.getPluginSchema(pluginId);
    
    return {
      /**
       * Create a record in plugin table
       */
      create: async (tableName: string, data: any): Promise<any> => {
        const fullTableName = `${schemaName}.${tableName}`;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${fullTableName} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
      },

      /**
       * Read records from plugin table
       */
      read: async (tableName: string, conditions?: any): Promise<any[]> => {
        const fullTableName = `${schemaName}.${tableName}`;
        let query = `SELECT * FROM ${fullTableName}`;
        const values: any[] = [];
        
        if (conditions && Object.keys(conditions).length > 0) {
          const whereClauses = Object.keys(conditions).map((key, i) => {
            values.push(conditions[key]);
            return `${key} = $${i + 1}`;
          });
          query += ` WHERE ${whereClauses.join(' AND ')}`;
        }
        
        const result = await this.pool.query(query, values);
        return result.rows;
      },

      /**
       * Update records in plugin table
       */
      update: async (tableName: string, id: any, data: any): Promise<any> => {
        const fullTableName = `${schemaName}.${tableName}`;
        const columns = Object.keys(data);
        const values = Object.values(data);
        values.push(id);
        
        const setClauses = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
        
        const query = `
          UPDATE ${fullTableName}
          SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${values.length}
          RETURNING *
        `;
        
        const result = await this.pool.query(query, values);
        return result.rows[0];
      },

      /**
       * Delete records from plugin table
       */
      delete: async (tableName: string, id: any): Promise<boolean> => {
        const fullTableName = `${schemaName}.${tableName}`;
        
        const query = `DELETE FROM ${fullTableName} WHERE id = $1`;
        const result = await this.pool.query(query, [id]);
        
        return result.rowCount > 0;
      },

      /**
       * Execute raw query (within plugin schema)
       */
      query: async (sql: string, params?: any[]): Promise<any> => {
        // Ensure query is scoped to plugin schema
        const scopedSQL = sql.replace(/FROM\s+(\w+)/gi, `FROM ${schemaName}.$1`);
        const result = await this.pool.query(scopedSQL, params);
        return result.rows;
      },

      /**
       * Begin transaction
       */
      beginTransaction: async (): Promise<any> => {
        const client = await this.pool.connect();
        await client.query('BEGIN');
        await client.query(`SET search_path TO ${schemaName}, public`);
        return client;
      },

      /**
       * Commit transaction
       */
      commitTransaction: async (client: any): Promise<void> => {
        await client.query('COMMIT');
        client.release();
      },

      /**
       * Rollback transaction
       */
      rollbackTransaction: async (client: any): Promise<void> => {
        await client.query('ROLLBACK');
        client.release();
      }
    };
  }

  /**
   * Build CREATE TABLE SQL from table definition
   */
  private buildCreateTableSQL(schemaName: string, table: any): string {
    const columns = [
      'id UUID PRIMARY KEY DEFAULT gen_random_uuid()',
      ...table.columns,
      'created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP',
      'updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP'
    ];
    
    return `CREATE TABLE IF NOT EXISTS ${schemaName}.${table.name} (
      ${columns.join(',\n  ')}
    )`;
  }

  /**
   * Create index for plugin table
   */
  private async createPluginIndex(client: any, schemaName: string, tableName: string, index: any): Promise<void> {
    const indexName = `idx_${tableName}_${index.columns.join('_')}`;
    const unique = index.unique ? 'UNIQUE' : '';
    
    await client.query(
      `CREATE ${unique} INDEX IF NOT EXISTS ${indexName} 
       ON ${schemaName}.${tableName} (${index.columns.join(', ')})`
    );
  }

  /**
   * Get plugin schema name
   */
  private getPluginSchema(pluginId: string): string {
    // Replace special characters for valid schema name
    return `plugin_${pluginId.replace(/[^a-z0-9_]/gi, '_')}`;
  }

  /**
   * Get plugin table name
   */
  private getPluginTableName(pluginId: string, tableName: string): string {
    return `${this.getPluginSchema(pluginId)}.${tableName}`;
  }

  /**
   * Grant permissions to plugin schema
   */
  private async grantPluginPermissions(client: any, pluginId: string, schemaName: string): Promise<void> {
    // Grant usage on schema
    await client.query(
      `GRANT USAGE ON SCHEMA ${schemaName} TO current_user`
    );
    
    // Grant all privileges on all tables in schema
    await client.query(
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA ${schemaName} TO current_user`
    );
    
    // Grant privileges on sequences
    await client.query(
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA ${schemaName} TO current_user`
    );
  }

  /**
   * Backup plugin data before uninstall
   */
  private async backupPluginData(client: any, pluginId: string): Promise<void> {
    const schemaName = this.getPluginSchema(pluginId);
    const backupTable = `backup_${pluginId}_${Date.now()}`;
    
    try {
      // Get all tables in plugin schema
      const tablesResult = await client.query(
        `SELECT table_name FROM information_schema.tables 
         WHERE table_schema = $1`,
        [schemaName]
      );
      
      // Create backup for each table
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        await client.query(
          `CREATE TABLE IF NOT EXISTS public.${backupTable}_${tableName} AS 
           SELECT * FROM ${schemaName}.${tableName}`
        );
      }
      
      console.log(`📦 Backed up data for plugin ${pluginId} to ${backupTable}`);
    } catch (error) {
      console.warn(`Could not backup plugin data: ${error.message}`);
    }
  }

  /**
   * Clean up orphaned data
   */
  private async cleanupOrphanedData(client: any, pluginId: string): Promise<void> {
    // Remove any orphaned settings
    await client.query(
      'DELETE FROM plugin_settings WHERE plugin_id = $1',
      [pluginId]
    );
    
    // Remove any orphaned activity logs
    await client.query(
      'DELETE FROM plugin_activity WHERE plugin_id = $1',
      [pluginId]
    );
    
    // Remove any orphaned dependencies
    await client.query(
      'DELETE FROM plugin_dependencies WHERE plugin_id = $1 OR depends_on = $1',
      [pluginId]
    );
  }

  /**
   * Migrate plugin data between versions
   */
  async migratePluginData(pluginId: string, fromVersion: string, toVersion: string, migrations: any[]): Promise<boolean> {
    const client = await this.pool.connect();
    const schemaName = this.getPluginSchema(pluginId);
    
    try {
      await client.query('BEGIN');
      
      // Set search path to plugin schema
      await client.query(`SET search_path TO ${schemaName}, public`);
      
      // Run migrations in order
      for (const migration of migrations) {
        if (migration.version > fromVersion && migration.version <= toVersion) {
          console.log(`Running migration ${migration.version} for plugin ${pluginId}`);
          
          if (migration.up) {
            await client.query(migration.up);
          }
          
          // Track migration
          await client.query(
            `INSERT INTO plugin_migrations (plugin_id, version, applied_at) 
             VALUES ($1, $2, CURRENT_TIMESTAMP)`,
            [pluginId, migration.version]
          );
        }
      }
      
      await client.query('COMMIT');
      console.log(`✅ Migrated plugin ${pluginId} from ${fromVersion} to ${toVersion}`);
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Migration failed for plugin ${pluginId}:`, error);
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Check if plugin has pending migrations
   */
  async hasPendingMigrations(pluginId: string, currentVersion: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM plugin_migrations 
       WHERE plugin_id = $1 AND version > $2`,
      [pluginId, currentVersion]
    );
    
    return result.rows[0].count > 0;
  }

  /**
   * Get plugin data statistics
   */
  async getPluginDataStats(pluginId: string): Promise<any> {
    const schemaName = this.getPluginSchema(pluginId);
    
    const result = await this.pool.query(`
      SELECT 
        table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = $1
    `, [schemaName]);
    
    return result.rows;
  }

  /**
   * Cleanup and close connections
   */
  async cleanup(): Promise<void> {
    await this.pool.end();
  }
}