import { CircuitBreakerConfig, ApiMetrics } from '@/types/api.types';
import { logger } from '@/utils/logger';
import { EventEmitter } from 'events';

export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private nextAttempt = 0;
  private stats = {
    totalRequests: 0,
    totalFailures: 0,
    totalSuccesses: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
  };

  constructor(
    private config: CircuitBreakerConfig,
    private name: string
  ) {
    super();
    this.setupMetrics();
  }

  private setupMetrics() {
    setInterval(() => {
      this.emit('metrics', this.getMetrics());
    }, this.config.monitoringPeriod);
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.config.enabled) {
      return await operation();
    }

    this.stats.totalRequests++;

    if (this.state === CircuitBreakerState.OPEN) {
      if (Date.now() < this.nextAttempt) {
        logger.warn(`Circuit breaker ${this.name} is OPEN, rejecting request`);
        
        if (this.config.fallbackResponse) {
          return this.config.fallbackResponse as T;
        }
        
        throw new Error(`Circuit breaker ${this.name} is OPEN`);
      } else {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.successCount = 0;
        logger.info(`Circuit breaker ${this.name} moved to HALF_OPEN`);
        this.emit('stateChange', this.state);
      }
    }

    try {
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation);
      
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private async executeWithTimeout<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timeout after ${this.config.timeout}ms`));
      }, this.config.timeout);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private onSuccess() {
    this.stats.totalSuccesses++;
    this.stats.lastSuccessTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      
      if (this.successCount >= this.config.successThreshold) {
        this.reset();
        logger.info(`Circuit breaker ${this.name} moved to CLOSED after successful recovery`);
      }
    } else if (this.state === CircuitBreakerState.CLOSED) {
      this.failureCount = Math.max(0, this.failureCount - 1);
    }
  }

  private onFailure() {
    this.stats.totalFailures++;
    this.stats.lastFailureTime = Date.now();

    this.failureCount++;

    if (this.state === CircuitBreakerState.HALF_OPEN || 
        (this.state === CircuitBreakerState.CLOSED && this.failureCount >= this.config.failureThreshold)) {
      this.trip();
    }
  }

  private trip() {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = Date.now() + this.config.resetTimeout;
    
    logger.warn(`Circuit breaker ${this.name} tripped to OPEN state`);
    this.emit('stateChange', this.state);
    this.emit('open');
  }

  private reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    
    this.emit('stateChange', this.state);
    this.emit('close');
  }

  public forceOpen() {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttempt = Date.now() + this.config.resetTimeout;
    logger.info(`Circuit breaker ${this.name} forced to OPEN state`);
    this.emit('stateChange', this.state);
  }

  public forceClose() {
    this.reset();
    logger.info(`Circuit breaker ${this.name} forced to CLOSED state`);
  }

  public getState(): CircuitBreakerState {
    return this.state;
  }

  public getMetrics(): Partial<ApiMetrics> {
    const now = Date.now();
    const uptime = now - (this.stats.lastSuccessTime || now);
    
    return {
      circuitBreakerState: this.state,
      requestCount: this.stats.totalRequests,
      errorCount: this.stats.totalFailures,
      uptime,
      lastError: this.stats.lastFailureTime ? {
        message: 'Circuit breaker failure',
        timestamp: new Date(this.stats.lastFailureTime),
        statusCode: 503
      } : undefined,
      timestamp: new Date(),
    };
  }

  public getStats() {
    const successRate = this.stats.totalRequests > 0 
      ? (this.stats.totalSuccesses / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      successRate,
      nextAttempt: this.nextAttempt,
      timeUntilNextAttempt: Math.max(0, this.nextAttempt - Date.now()),
    };
  }

  public isRequestAllowed(): boolean {
    if (!this.config.enabled) return true;
    
    if (this.state === CircuitBreakerState.CLOSED || this.state === CircuitBreakerState.HALF_OPEN) {
      return true;
    }
    
    if (this.state === CircuitBreakerState.OPEN) {
      return Date.now() >= this.nextAttempt;
    }
    
    return false;
  }

  public updateConfig(config: Partial<CircuitBreakerConfig>) {
    this.config = { ...this.config, ...config };
    logger.info(`Circuit breaker ${this.name} configuration updated`);
  }
}

export class CircuitBreakerManager {
  private circuitBreakers = new Map<string, CircuitBreaker>();
  private metrics = new Map<string, Partial<ApiMetrics>>();

  getCircuitBreaker(name: string, config: CircuitBreakerConfig): CircuitBreaker {
    if (!this.circuitBreakers.has(name)) {
      const circuitBreaker = new CircuitBreaker(config, name);
      
      // Set up event listeners for metrics collection
      circuitBreaker.on('metrics', (metrics) => {
        this.metrics.set(name, metrics);
      });

      circuitBreaker.on('stateChange', (state) => {
        logger.info(`Circuit breaker ${name} state changed to ${state}`);
      });

      this.circuitBreakers.set(name, circuitBreaker);
    }

    return this.circuitBreakers.get(name)!;
  }

  getAllMetrics(): Map<string, Partial<ApiMetrics>> {
    return new Map(this.metrics);
  }

  getCircuitBreakerMetrics(name: string): Partial<ApiMetrics> | undefined {
    return this.metrics.get(name);
  }

  forceOpenAll() {
    this.circuitBreakers.forEach((circuitBreaker, name) => {
      circuitBreaker.forceOpen();
      logger.info(`Forced circuit breaker ${name} to OPEN`);
    });
  }

  forceCloseAll() {
    this.circuitBreakers.forEach((circuitBreaker, name) => {
      circuitBreaker.forceClose();
      logger.info(`Forced circuit breaker ${name} to CLOSED`);
    });
  }

  removeCircuitBreaker(name: string) {
    if (this.circuitBreakers.has(name)) {
      this.circuitBreakers.delete(name);
      this.metrics.delete(name);
      logger.info(`Removed circuit breaker ${name}`);
    }
  }

  getCircuitBreakerNames(): string[] {
    return Array.from(this.circuitBreakers.keys());
  }

  getHealthStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.circuitBreakers.forEach((circuitBreaker, name) => {
      const stats = circuitBreaker.getStats();
      status[name] = {
        state: stats.state,
        healthy: stats.state === CircuitBreakerState.CLOSED,
        successRate: stats.successRate,
        totalRequests: stats.totalRequests,
        timeUntilNextAttempt: stats.timeUntilNextAttempt,
      };
    });

    return status;
  }
}

// Global circuit breaker manager instance
export const circuitBreakerManager = new CircuitBreakerManager();