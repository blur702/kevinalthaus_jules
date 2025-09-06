import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { config } from '../utils/config';

export class DatabaseService {
  private static instance: DatabaseService;
  private pool: Pool;

  private constructor() {
    const poolConfig = {
      host: config.dbHost,
      port: config.dbPort,
      user: config.dbUser,
      password: config.dbPassword,
      database: config.dbName,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false,
    };

    // Pool configuration loaded successfully

    this.pool = new Pool(poolConfig);

    // Handle pool events for monitoring
    this.pool.on('connect', (client) => {
      console.log('Database client connected');
    });

    this.pool.on('error', (err, client) => {
      console.error('Unexpected database error:', err);
    });
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      console.log('Database query executed', { text: text.slice(0, 100), duration, rows: result.rowCount });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error('Database query error', { text: text.slice(0, 100), duration, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    return await this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1 as test');
      return result.rows[0].test === 1;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async getStats() {
    return {
      totalConnections: this.pool.totalCount,
      idleConnections: this.pool.idleCount,
      waitingConnections: this.pool.waitingCount
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export function to get database instance (don't create immediately)
export const getDatabase = () => DatabaseService.getInstance();