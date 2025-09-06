import { Router, Request, Response } from 'express';
import { ApiResponse, HealthStatus } from '../types';
import { getDatabase } from '../services/DatabaseService';
import { dbMonitoring } from '../services/DatabaseMonitoringService';

const router = Router();

/**
 * GET /health
 * Health check endpoint
 */
router.get('/', async (req: Request, res: Response<ApiResponse<HealthStatus>>) => {
  try {
    const uptime = process.uptime();
    const timestamp = new Date().toISOString();

    // Check actual database connection
    const db = getDatabase();
    const dbConnected = await db.testConnection();
    const services = {
      database: dbConnected ? 'connected' as const : 'disconnected' as const,
      redis: 'connected' as const, // TODO: Implement Redis health check
    };

    const healthData: HealthStatus = {
      status: 'healthy',
      timestamp,
      version: '1.0.0',
      uptime,
      services,
    };

    res.status(200).json({
      success: true,
      message: 'Service is healthy',
      data: healthData,
      timestamp,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    res.status(503).json({
      success: false,
      message: 'Service is unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    });
  }
});

/**
 * GET /health/detailed
 * Detailed health check with more information
 */
router.get('/detailed', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();

    const healthData = {
      status: 'healthy',
      timestamp,
      version: '1.0.0',
      uptime,
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
        external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
      },
      cpu: process.cpuUsage(),
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      services: {
        database: await getDatabase().testConnection() ? 'connected' : 'disconnected',
        redis: 'connected', // TODO: Implement Redis health check
        fileSystem: 'accessible',
      },
    };

    res.status(200).json({
      success: true,
      message: 'Detailed health check completed',
      data: healthData,
      timestamp,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    res.status(503).json({
      success: false,
      message: 'Detailed health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    });
  }
});

/**
 * GET /health/readiness
 * Readiness probe for Kubernetes/Docker
 */
router.get('/readiness', async (req: Request, res: Response<ApiResponse>) => {
  try {
    // Check if all required services are ready
    const isReady = await checkServicesReadiness();

    if (isReady) {
      res.status(200).json({
        success: true,
        message: 'Service is ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        success: false,
        message: 'Service is not ready',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Readiness check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /health/liveness
 * Liveness probe for Kubernetes/Docker
 */
router.get('/liveness', (req: Request, res: Response<ApiResponse>) => {
  // Simple liveness check - if this endpoint responds, the service is alive
  res.status(200).json({
    success: true,
    message: 'Service is alive',
    timestamp: new Date().toISOString(),
  });
});

// Helper function to check services readiness
async function checkServicesReadiness(): Promise<boolean> {
  try {
    // Check database connectivity
    const db = getDatabase();
    const dbReady = await db.testConnection();
    if (!dbReady) {
      console.log('Database readiness check failed');
      return false;
    }

    // TODO: Add Redis connectivity check
    // TODO: Add external service dependencies check
    // TODO: Add file system permissions check
    
    return true; // All services are ready
  } catch (error) {
    console.error('Services readiness check failed:', error);
    return false;
  }
}

/**
 * GET /health/database
 * Database health and metrics endpoint
 */
router.get('/database', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const metrics = await dbMonitoring.getMetrics();
    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: 'Database health check completed',
      data: metrics,
      timestamp,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    res.status(503).json({
      success: false,
      message: 'Database health check failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    });
  }
});

/**
 * GET /health/database/alerts
 * Database alerts endpoint
 */
router.get('/database/alerts', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string, 10) : 24;
    const alerts = dbMonitoring.getRecentAlerts(hours);
    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: true,
      message: `Retrieved alerts from last ${hours} hours`,
      data: { alerts, count: alerts.length },
      timestamp,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve database alerts',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    });
  }
});

/**
 * POST /health/database/maintenance
 * Trigger database maintenance
 */
router.post('/database/maintenance', async (req: Request, res: Response<ApiResponse>) => {
  try {
    const maintenanceResult = await dbMonitoring.performMaintenance();
    const timestamp = new Date().toISOString();

    res.status(200).json({
      success: maintenanceResult.success,
      message: maintenanceResult.success ? 'Database maintenance completed' : 'Database maintenance failed',
      data: { results: maintenanceResult.results },
      timestamp,
    });
  } catch (error) {
    const timestamp = new Date().toISOString();
    res.status(500).json({
      success: false,
      message: 'Failed to perform database maintenance',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    });
  }
});

export default router;