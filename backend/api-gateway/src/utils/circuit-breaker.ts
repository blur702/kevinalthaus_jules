import CircuitBreaker from 'opossum';
import { CircuitBreakerOptions, ServiceConfig } from '@/types';
import { CircuitBreakerError } from '@/utils/errors';
import { createContextLogger } from '@/utils/logger';
import { appConfig } from '@/utils/config';

const circuitBreakers = new Map<string, CircuitBreaker>();

export const createCircuitBreaker = (
  serviceName: string,
  serviceConfig: ServiceConfig,
  action: (...args: any[]) => Promise<any>
): CircuitBreaker => {
  const options: CircuitBreakerOptions = {
    timeout: serviceConfig.timeout,
    errorThresholdPercentage: appConfig.circuitBreakerThreshold,
    resetTimeout: 30000, // 30 seconds
    rollingCountTimeout: 10000, // 10 seconds
    rollingCountBuckets: 10,
    name: serviceName,
    group: 'api-gateway',
  };

  const breaker = new CircuitBreaker(action, options);

  // Event handlers for circuit breaker
  breaker.on('open', () => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.error(`Circuit breaker opened for service: ${serviceName}`, undefined, {
      serviceName,
      serviceUrl: serviceConfig.url,
      threshold: options.errorThresholdPercentage,
      timeout: options.timeout,
    });
  });

  breaker.on('halfOpen', () => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.info(`Circuit breaker half-open for service: ${serviceName}`, {
      serviceName,
      serviceUrl: serviceConfig.url,
    });
  });

  breaker.on('close', () => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.info(`Circuit breaker closed for service: ${serviceName}`, {
      serviceName,
      serviceUrl: serviceConfig.url,
    });
  });

  breaker.on('failure', (error: Error) => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.warn(`Circuit breaker failure for service: ${serviceName}`, {
      serviceName,
      serviceUrl: serviceConfig.url,
      error: error.message,
      stats: breaker.stats,
    });
  });

  breaker.on('success', () => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.debug(`Circuit breaker success for service: ${serviceName}`, {
      serviceName,
      serviceUrl: serviceConfig.url,
      stats: breaker.stats,
    });
  });

  breaker.on('timeout', () => {
    const logger = createContextLogger({
      correlationId: 'circuit-breaker',
      method: 'CIRCUIT_BREAKER',
      url: serviceConfig.url,
      ip: 'internal',
    });
    
    logger.warn(`Circuit breaker timeout for service: ${serviceName}`, {
      serviceName,
      serviceUrl: serviceConfig.url,
      timeout: options.timeout,
      stats: breaker.stats,
    });
  });

  // Fallback function for when circuit breaker is open
  breaker.fallback((error: Error, correlationId?: string) => {
    if (breaker.opened) {
      throw new CircuitBreakerError(serviceName, correlationId);
    }
    throw error;
  });

  circuitBreakers.set(serviceName, breaker);
  return breaker;
};

export const getCircuitBreaker = (serviceName: string): CircuitBreaker | undefined => {
  return circuitBreakers.get(serviceName);
};

export const getCircuitBreakerStats = (serviceName?: string) => {
  if (serviceName) {
    const breaker = circuitBreakers.get(serviceName);
    return breaker ? {
      [serviceName]: {
        state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
        stats: breaker.stats,
      }
    } : null;
  }

  // Return stats for all circuit breakers
  const allStats: Record<string, any> = {};
  
  for (const [name, breaker] of circuitBreakers.entries()) {
    allStats[name] = {
      state: breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed',
      stats: breaker.stats,
    };
  }

  return allStats;
};

export const resetCircuitBreaker = (serviceName: string): boolean => {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.close();
    return true;
  }
  return false;
};

export const resetAllCircuitBreakers = (): void => {
  for (const breaker of circuitBreakers.values()) {
    breaker.close();
  }
};

// Health check function for circuit breakers
export const isServiceHealthy = (serviceName: string): boolean => {
  const breaker = circuitBreakers.get(serviceName);
  if (!breaker) {
    return true; // If no circuit breaker, assume healthy
  }
  
  return !breaker.opened;
};

// Utility to check if all services are healthy
export const areAllServicesHealthy = (): boolean => {
  for (const breaker of circuitBreakers.values()) {
    if (breaker.opened) {
      return false;
    }
  }
  return true;
};