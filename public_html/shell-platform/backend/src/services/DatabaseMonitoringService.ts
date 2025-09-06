import { getDatabase } from './DatabaseService';
import { config } from '../utils/config';

export interface DatabaseMetrics {
  connectionStats: {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    maxConnections: number;
  };
  queryStats: {
    totalQueries: number;
    avgQueryTime: number;
    slowQueries: number;
  };
  tableStats: {
    totalTables: number;
    totalRows: number;
    databaseSize: string;
    indexHitRatio: number;
  };
  replicationStatus?: {
    isReplica: boolean;
    replicationLag?: number;
    walReceiverStatus?: string;
  };
  health: {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    lastChecked: string;
  };
}

export interface DatabaseAlert {
  level: 'warning' | 'critical';
  category: 'connections' | 'performance' | 'storage' | 'replication';
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: string;
}

export class DatabaseMonitoringService {
  private static instance: DatabaseMonitoringService;
  private alerts: DatabaseAlert[] = [];
  private lastMetrics: DatabaseMetrics | null = null;

  // Thresholds for alerting
  private readonly thresholds = {
    connections: {
      warning: 15, // 75% of max 20 connections
      critical: 18  // 90% of max 20 connections
    },
    queryTime: {
      warning: 1000,   // 1 second
      critical: 5000   // 5 seconds
    },
    indexHitRatio: {
      warning: 0.9,    // 90%
      critical: 0.8    // 80%
    },
    replicationLag: {
      warning: 10,     // 10 seconds
      critical: 30     // 30 seconds
    },
    storageUsage: {
      warning: 0.8,    // 80%
      critical: 0.9    // 90%
    }
  };

  private constructor() {}

  public static getInstance(): DatabaseMonitoringService {
    if (!DatabaseMonitoringService.instance) {
      DatabaseMonitoringService.instance = new DatabaseMonitoringService();
    }
    return DatabaseMonitoringService.instance;
  }

  public async getMetrics(): Promise<DatabaseMetrics> {
    const connectionStats = await this.getConnectionStats();
    const queryStats = await this.getQueryStats();
    const tableStats = await this.getTableStats();
    const replicationStatus = await this.getReplicationStatus();
    
    const health = this.assessHealth(connectionStats, queryStats, tableStats, replicationStatus);
    
    const metrics: DatabaseMetrics = {
      connectionStats,
      queryStats,
      tableStats,
      replicationStatus,
      health
    };

    this.lastMetrics = metrics;
    this.checkThresholds(metrics);
    
    return metrics;
  }

  private async getConnectionStats() {
    try {
      const db = getDatabase();
      const stats = await db.getStats();
      
      // Get max connections from PostgreSQL
      const maxConnResult = await db.query('SHOW max_connections');
      const maxConnections = parseInt(maxConnResult.rows[0].max_connections, 10);
      
      // Get current active connections
      const activeConnResult = await db.query(`
        SELECT COUNT(*) as active_count 
        FROM pg_stat_activity 
        WHERE state = 'active' AND datname = $1
      `, [config.dbName]);
      
      return {
        totalConnections: stats.totalConnections,
        activeConnections: parseInt(activeConnResult.rows[0].active_count, 10),
        idleConnections: stats.idleConnections,
        waitingConnections: stats.waitingConnections,
        maxConnections
      };
    } catch (error) {
      console.error('Error getting connection stats:', error);
      return {
        totalConnections: 0,
        activeConnections: 0,
        idleConnections: 0,
        waitingConnections: 0,
        maxConnections: 100
      };
    }
  }

  private async getQueryStats() {
    try {
      const db = getDatabase();
      const result = await db.query(`
        SELECT 
          sum(calls) as total_queries,
          avg(mean_exec_time) as avg_query_time,
          count(*) filter (where mean_exec_time > 1000) as slow_queries
        FROM pg_stat_statements 
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `);
      
      const row = result.rows[0];
      return {
        totalQueries: parseInt(row.total_queries || '0', 10),
        avgQueryTime: parseFloat(row.avg_query_time || '0'),
        slowQueries: parseInt(row.slow_queries || '0', 10)
      };
    } catch (error) {
      // pg_stat_statements extension might not be installed
      console.warn('pg_stat_statements not available, using basic query stats');
      return {
        totalQueries: 0,
        avgQueryTime: 0,
        slowQueries: 0
      };
    }
  }

  private async getTableStats() {
    try {
      const db = getDatabase();
      const [tableCountResult, totalRowsResult, dbSizeResult, indexHitResult] = await Promise.all([
        db.query(`
          SELECT COUNT(*) as table_count 
          FROM information_schema.tables 
          WHERE table_schema = 'public'
        `),
        db.query(`
          SELECT SUM(n_live_tup) as total_rows 
          FROM pg_stat_user_tables
        `),
        db.query(`
          SELECT pg_size_pretty(pg_database_size(current_database())) as size
        `),
        db.query(`
          SELECT 
            sum(idx_blks_hit) / nullif(sum(idx_blks_hit + idx_blks_read), 0) as index_hit_ratio
          FROM pg_statio_user_indexes
        `)
      ]);

      return {
        totalTables: parseInt(tableCountResult.rows[0].table_count, 10),
        totalRows: parseInt(totalRowsResult.rows[0].total_rows || '0', 10),
        databaseSize: dbSizeResult.rows[0].size,
        indexHitRatio: parseFloat(indexHitResult.rows[0].index_hit_ratio || '1')
      };
    } catch (error) {
      console.error('Error getting table stats:', error);
      return {
        totalTables: 0,
        totalRows: 0,
        databaseSize: '0 bytes',
        indexHitRatio: 1
      };
    }
  }

  private async getReplicationStatus() {
    try {
      const db = getDatabase();
      const isReplicaResult = await db.query('SELECT pg_is_in_recovery() as is_replica');
      const isReplica = isReplicaResult.rows[0].is_replica;
      
      if (isReplica) {
        const lagResult = await db.query(`
          SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp())) as lag
        `);
        
        const statusResult = await db.query(`
          SELECT status FROM pg_stat_wal_receiver
        `);
        
        return {
          isReplica: true,
          replicationLag: parseFloat(lagResult.rows[0]?.lag || '0'),
          walReceiverStatus: statusResult.rows[0]?.status
        };
      }
      
      return { isReplica: false };
    } catch (error) {
      console.warn('Error getting replication status:', error);
      return { isReplica: false };
    }
  }

  private assessHealth(
    connectionStats: any,
    queryStats: any,
    tableStats: any,
    replicationStatus: any
  ) {
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check connection usage
    const connectionUsage = connectionStats.totalConnections / connectionStats.maxConnections;
    if (connectionUsage >= 0.9) {
      status = 'critical';
      issues.push(`High connection usage: ${Math.round(connectionUsage * 100)}%`);
    } else if (connectionUsage >= 0.75) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`Moderate connection usage: ${Math.round(connectionUsage * 100)}%`);
    }

    // Check index hit ratio
    if (tableStats.indexHitRatio < 0.8) {
      status = 'critical';
      issues.push(`Low index hit ratio: ${Math.round(tableStats.indexHitRatio * 100)}%`);
    } else if (tableStats.indexHitRatio < 0.9) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`Moderate index hit ratio: ${Math.round(tableStats.indexHitRatio * 100)}%`);
    }

    // Check replication lag
    if (replicationStatus.isReplica && replicationStatus.replicationLag > 30) {
      status = 'critical';
      issues.push(`High replication lag: ${replicationStatus.replicationLag}s`);
    } else if (replicationStatus.isReplica && replicationStatus.replicationLag > 10) {
      status = status === 'healthy' ? 'warning' : status;
      issues.push(`Moderate replication lag: ${replicationStatus.replicationLag}s`);
    }

    return {
      status,
      issues,
      lastChecked: new Date().toISOString()
    };
  }

  private checkThresholds(metrics: DatabaseMetrics) {
    const now = new Date().toISOString();
    
    // Clear old alerts (keep only last 100)
    this.alerts = this.alerts.slice(-99);

    // Check connection threshold
    const connectionUsage = metrics.connectionStats.totalConnections / metrics.connectionStats.maxConnections;
    if (connectionUsage >= this.thresholds.connections.critical / metrics.connectionStats.maxConnections) {
      this.addAlert('critical', 'connections', 'Critical connection usage', 'connection_usage', 
        connectionUsage, this.thresholds.connections.critical / metrics.connectionStats.maxConnections, now);
    }

    // Check index hit ratio
    if (metrics.tableStats.indexHitRatio < this.thresholds.indexHitRatio.critical) {
      this.addAlert('critical', 'performance', 'Critical index hit ratio', 'index_hit_ratio',
        metrics.tableStats.indexHitRatio, this.thresholds.indexHitRatio.critical, now);
    }

    // Check replication lag
    if (metrics.replicationStatus?.isReplica && 
        metrics.replicationStatus.replicationLag! > this.thresholds.replicationLag.critical) {
      this.addAlert('critical', 'replication', 'Critical replication lag', 'replication_lag',
        metrics.replicationStatus.replicationLag!, this.thresholds.replicationLag.critical, now);
    }
  }

  private addAlert(level: 'warning' | 'critical', category: DatabaseAlert['category'], 
                  message: string, metric: string, value: number, threshold: number, timestamp: string) {
    this.alerts.push({
      level,
      category,
      message,
      metric,
      value,
      threshold,
      timestamp
    });
  }

  public getAlerts(): DatabaseAlert[] {
    return [...this.alerts];
  }

  public getRecentAlerts(hours: number = 24): DatabaseAlert[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    return this.alerts.filter(alert => alert.timestamp >= cutoff);
  }

  public async performMaintenance(): Promise<{ success: boolean; results: string[] }> {
    const results: string[] = [];
    
    try {
      const db = getDatabase();
      // Analyze all tables
      const tables = await db.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      `);
      
      for (const table of tables.rows) {
        await db.query(`ANALYZE ${table.tablename}`);
        results.push(`Analyzed table: ${table.tablename}`);
      }

      // Vacuum analyze (light maintenance)
      await db.query('VACUUM ANALYZE');
      results.push('Performed VACUUM ANALYZE');

      // Update table statistics
      results.push(`Updated statistics for ${tables.rows.length} tables`);

      return { success: true, results };
    } catch (error) {
      console.error('Maintenance error:', error);
      return { 
        success: false, 
        results: [`Maintenance failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }
}

export const dbMonitoring = DatabaseMonitoringService.getInstance();