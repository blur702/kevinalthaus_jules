/**
 * Database Service
 * Provides database operations for plugins
 */

export class DatabaseService {
  private config: any;
  private baseUrl: string;

  constructor(config: any) {
    this.config = config;
    this.baseUrl = config.apiUrl || '/api/data';
  }

  /**
   * Initialize database service
   */
  async initialize(): Promise<void> {
    // Check database connectivity
    const isHealthy = await this.healthCheck();
    if (!isHealthy) {
      console.warn('Database service not healthy');
    }
  }

  /**
   * Create a record
   */
  async create(table: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${table}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to create record: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Database create error:`, error);
      throw error;
    }
  }

  /**
   * Read records
   */
  async read(table: string, query?: any): Promise<any[]> {
    try {
      const queryString = query ? '?' + new URLSearchParams(query).toString() : '';
      const response = await fetch(`${this.baseUrl}/${table}${queryString}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to read records: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Database read error:`, error);
      throw error;
    }
  }

  /**
   * Get single record by ID
   */
  async get(table: string, id: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to get record: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Database get error:`, error);
      throw error;
    }
  }

  /**
   * Update a record
   */
  async update(table: string, id: string, data: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`Failed to update record: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Database update error:`, error);
      throw error;
    }
  }

  /**
   * Delete a record
   */
  async delete(table: string, id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${table}/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to delete record: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error(`Database delete error:`, error);
      throw error;
    }
  }

  /**
   * Execute custom query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders()
        },
        body: JSON.stringify({ sql, params })
      });

      if (!response.ok) {
        throw new Error(`Query failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Database query error:`, error);
      throw error;
    }
  }

  /**
   * Begin transaction
   */
  async beginTransaction(): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/begin`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to begin transaction: ${response.statusText}`);
      }

      const data = await response.json();
      return data.transactionId;
    } catch (error) {
      console.error(`Transaction begin error:`, error);
      throw error;
    }
  }

  /**
   * Commit transaction
   */
  async commitTransaction(transactionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/${transactionId}/commit`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to commit transaction: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Transaction commit error:`, error);
      throw error;
    }
  }

  /**
   * Rollback transaction
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/${transactionId}/rollback`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error(`Failed to rollback transaction: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Transaction rollback error:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  /**
   * Get auth headers
   */
  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('auth_token');
    if (!token) return {};
    
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    // Cleanup any database connections
  }
}