import { readFileSync } from 'fs';
import { join } from 'path';
import { getDatabase } from '../services/DatabaseService';

export class DatabaseInitializer {
  private static async executeSQLFile(filePath: string): Promise<void> {
    try {
      const sql = readFileSync(filePath, 'utf8');
      
      // Split the SQL file into individual statements
      const statements = sql
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement.length > 0 && !statement.startsWith('--'));

      console.log(`Executing ${statements.length} SQL statements from ${filePath}`);

      // Execute each statement
      for (const statement of statements) {
        try {
          const db = getDatabase();
          await db.query(statement);
        } catch (error: any) {
          // Continue if error is about existing objects, but throw for other errors
          if (error.code !== '42P07' && error.code !== '42710' && error.code !== '23505') {
            console.error(`Error executing statement: ${statement.substring(0, 100)}...`);
            throw error;
          } else {
            console.log(`Skipping statement (already exists): ${statement.substring(0, 50)}...`);
          }
        }
      }

      console.log(`Successfully executed SQL file: ${filePath}`);
    } catch (error) {
      console.error(`Error executing SQL file ${filePath}:`, error);
      throw error;
    }
  }

  public static async initializeDatabase(): Promise<void> {
    console.log('Starting database initialization...');
    
    try {
      // Test connection first
      const db = getDatabase();
      const connectionTest = await db.testConnection();
      if (!connectionTest) {
        throw new Error('Database connection test failed');
      }
      console.log('Database connection successful');

      // Execute schema
      const schemaPath = join(__dirname, 'schema.sql');
      await this.executeSQLFile(schemaPath);

      // Verify tables were created
      await this.verifyTables();

      console.log('Database initialization completed successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private static async verifyTables(): Promise<void> {
    const db = getDatabase();
    const expectedTables = [
      'users', 
      'sessions', 
      'plugins', 
      'files', 
      'file_permissions', 
      'audit_logs', 
      'system_settings'
    ];

    for (const table of expectedTables) {
      try {
        const result = await db.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`Table '${table}' verified (${result.rows[0].count} rows)`);
      } catch (error) {
        console.error(`Table '${table}' verification failed:`, error);
        throw error;
      }
    }
  }

  public static async seedDatabase(): Promise<void> {
    console.log('Starting database seeding...');

    try {
      const db = getDatabase();
      // Check if admin user exists
      const adminExists = await db.query(
        'SELECT id FROM users WHERE username = $1', 
        ['admin']
      );

      if (adminExists.rows.length === 0) {
        // Create admin user with hashed password
        const bcrypt = await import('bcryptjs');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        
        await db.query(`
          INSERT INTO users (username, email, password_hash, role) 
          VALUES ($1, $2, $3, $4)
        `, ['admin', 'admin@shellplatform.local', hashedPassword, 'admin']);
        
        console.log('Created default admin user');
      } else {
        console.log('Admin user already exists');
      }

      // Insert sample plugins if none exist
      const pluginCount = await db.query('SELECT COUNT(*) FROM plugins');
      if (parseInt(pluginCount.rows[0].count) === 0) {
        const samplePlugins = [
          {
            name: 'File Manager',
            version: '1.0.0',
            description: 'Browse and manage files in the system',
            author: 'Shell Platform Team',
            enabled: true,
            config: { defaultPath: '/home', showHidden: false }
          },
          {
            name: 'Text Editor',
            version: '1.0.0',
            description: 'Edit text files with syntax highlighting',
            author: 'Shell Platform Team',
            enabled: true,
            config: { theme: 'dark', fontSize: 14 }
          },
          {
            name: 'Terminal',
            version: '1.0.0',
            description: 'Web-based terminal emulator',
            author: 'Shell Platform Team',
            enabled: true,
            config: { shell: '/bin/bash', theme: 'dark' }
          }
        ];

        for (const plugin of samplePlugins) {
          await db.query(`
            INSERT INTO plugins (name, version, description, author, enabled, config)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [plugin.name, plugin.version, plugin.description, plugin.author, plugin.enabled, JSON.stringify(plugin.config)]);
        }
        
        console.log('Created sample plugins');
      } else {
        console.log('Plugins already exist, skipping seed');
      }

      console.log('Database seeding completed successfully');
    } catch (error) {
      console.error('Database seeding failed:', error);
      throw error;
    }
  }

  public static async getHealthStatus() {
    try {
      const db = getDatabase();
      const stats = await db.getStats();
      const connectionTest = await db.testConnection();
      
      return {
        status: connectionTest ? 'connected' : 'disconnected',
        stats,
        lastChecked: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString()
      };
    }
  }
}

// Export for CLI usage
export const initDb = DatabaseInitializer.initializeDatabase;
export const seedDb = DatabaseInitializer.seedDatabase;