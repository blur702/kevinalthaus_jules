import { Router, Request, Response } from 'express';
import { CustomRequest, HealthCheckResult, ServiceHealthStatus } from '@/types';
import { serviceConfig } from '@/utils/config';
import { getCircuitBreakerStats, isServiceHealthy } from '@/utils/circuit-breaker';
import { createContextLogger } from '@/utils/logger';
import { asyncHandler } from '@/middleware/error-handler';

const router = Router();

// Get system memory usage
const getMemoryUsage = () => {
  const memUsage = process.memoryUsage();
  const totalMemory = memUsage.heapTotal + memUsage.external;
  const usedMemory = memUsage.heapUsed;
  
  return {
    used: usedMemory,
    total: totalMemory,
    percentage: Math.round((usedMemory / totalMemory) * 100),
    details: {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss,
    },
  };
};

// Get CPU usage (simplified)
const getCpuUsage = (): Promise<number> => {
  return new Promise((resolve) => {
    const startUsage = process.cpuUsage();
    const startTime = process.hrtime.bigint();
    
    setTimeout(() => {
      const currentUsage = process.cpuUsage(startUsage);
      const currentTime = process.hrtime.bigint();
      
      const elapsedTime = Number(currentTime - startTime) / 1000000; // Convert to milliseconds
      const totalCpuTime = (currentUsage.user + currentUsage.system) / 1000; // Convert to milliseconds
      
      const cpuPercent = (totalCpuTime / elapsedTime) * 100;
      resolve(Math.round(cpuPercent * 100) / 100); // Round to 2 decimal places
    }, 100);
  });
};

// Check individual service health
const checkServiceHealth = async (
  serviceName: string, 
  config: typeof serviceConfig.auth
): Promise<ServiceHealthStatus> => {
  const startTime = Date.now();
  
  try {
    // Check circuit breaker status
    const isHealthy = isServiceHealthy(`${serviceName}-service`);
    
    if (!isHealthy) {
      return {
        name: serviceName,
        status: 'unhealthy',
        error: 'Circuit breaker is open',
      };
    }

    // For now, we'll consider the service healthy if circuit breaker is closed
    // In a real implementation, you might want to make a lightweight health check request
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      name: serviceName,
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Basic health check - returns 200 OK if service is running
router.get('/health', (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  
  res.json({
    status: 'healthy',
    correlationId: customReq.correlationId,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Liveness probe - basic check that service is alive
router.get('/live', (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  
  res.json({
    status: 'alive',
    correlationId: customReq.correlationId,
    timestamp: new Date().toISOString(),
    pid: process.pid,
    uptime: process.uptime(),
  });
});

// Readiness probe - comprehensive check including dependencies
router.get('/ready', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customReq = req as CustomRequest;
  
  const logger = createContextLogger({
    correlationId: customReq.correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip || 'unknown',
  });

  try {
    // Check all services
    const serviceChecks = await Promise.allSettled([
      checkServiceHealth('auth', serviceConfig.auth),
      checkServiceHealth('data', serviceConfig.data),
      checkServiceHealth('files', serviceConfig.files),
      checkServiceHealth('external', serviceConfig.external),
    ]);

    const services: ServiceHealthStatus[] = serviceChecks.map((result, index) => {
      const serviceName = ['auth', 'data', 'files', 'external'][index]!;
      
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          name: serviceName,
          status: 'unhealthy',
          error: result.reason?.message || 'Health check failed',
        };
      }
    });

    // Get system metrics
    const memory = getMemoryUsage();
    const cpuUsage = await getCpuUsage();

    // Determine overall status
    const unhealthyServices = services.filter(s => s.status === 'unhealthy');
    const degradedServices = services.filter(s => s.status === 'degraded');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
    
    if (unhealthyServices.length > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedServices.length > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'healthy';
    }

    const healthResult: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services,
      memory,
      cpu: {
        usage: cpuUsage,
      },
    };

    logger.info('Readiness check completed', {
      status: overallStatus,
      unhealthyCount: unhealthyServices.length,
      degradedCount: degradedServices.length,
      memoryUsage: memory.percentage,
      cpuUsage,
    });

    // Return 200 for healthy/degraded, 503 for unhealthy
    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    
    res.status(statusCode).json({
      ...healthResult,
      correlationId: customReq.correlationId,
    });
    
  } catch (error) {
    logger.error('Readiness check failed', error as Error);
    
    res.status(503).json({
      status: 'unhealthy',
      correlationId: customReq.correlationId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Readiness check failed',
    });
  }
}));

// Detailed status endpoint with circuit breaker information
router.get('/status', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const customReq = req as CustomRequest;
  
  const memory = getMemoryUsage();
  const cpuUsage = await getCpuUsage();
  const circuitBreakerStats = getCircuitBreakerStats();

  // Service checks with circuit breaker info
  const serviceChecks = await Promise.allSettled([
    checkServiceHealth('auth', serviceConfig.auth),
    checkServiceHealth('data', serviceConfig.data),
    checkServiceHealth('files', serviceConfig.files),
    checkServiceHealth('external', serviceConfig.external),
  ]);

  const services = serviceChecks.map((result, index) => {
    const serviceName = ['auth', 'data', 'files', 'external'][index]!;
    
    let serviceStatus: ServiceHealthStatus;
    
    if (result.status === 'fulfilled') {
      serviceStatus = result.value;
    } else {
      serviceStatus = {
        name: serviceName,
        status: 'unhealthy',
        error: result.reason?.message || 'Health check failed',
      };
    }

    // Add circuit breaker info
    const breakerName = `${serviceName}-service`;
    const breakerStats = circuitBreakerStats?.[breakerName];
    
    return {
      ...serviceStatus,
      circuitBreaker: breakerStats,
    };
  });

  res.json({
    status: 'ok',
    correlationId: customReq.correlationId,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services,
    system: {
      memory,
      cpu: {
        usage: cpuUsage,
      },
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
    },
    circuitBreakers: circuitBreakerStats,
  });
}));

export default router;