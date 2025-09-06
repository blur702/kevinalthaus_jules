import { Server } from 'http';
import { logger } from '@/utils/logger';
import { resetAllCircuitBreakers } from '@/utils/circuit-breaker';

export interface GracefulShutdownOptions {
  timeout?: number;
  signals?: string[];
  onShutdown?: () => Promise<void>;
}

export class GracefulShutdown {
  private server: Server;
  private isShuttingDown = false;
  private activeConnections = new Set<any>();
  private timeout: number;
  private signals: string[];
  private onShutdown?: () => Promise<void>;

  constructor(server: Server, options: GracefulShutdownOptions = {}) {
    this.server = server;
    this.timeout = options.timeout || 30000; // 30 seconds default
    this.signals = options.signals || ['SIGTERM', 'SIGINT'];
    this.onShutdown = options.onShutdown;

    this.setupGracefulShutdown();
    this.trackConnections();
  }

  private setupGracefulShutdown(): void {
    this.signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.shutdown(signal);
      });
    });

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught Exception during shutdown', error);
      await this.shutdown('uncaughtException', 1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled Rejection during shutdown', reason as Error, {
        promise: promise.toString(),
      });
      await this.shutdown('unhandledRejection', 1);
    });
  }

  private trackConnections(): void {
    this.server.on('connection', (connection) => {
      this.activeConnections.add(connection);
      
      connection.on('close', () => {
        this.activeConnections.delete(connection);
      });
    });
  }

  private async closeActiveConnections(): Promise<void> {
    logger.info(`Closing ${this.activeConnections.size} active connections`);
    
    // Destroy all active connections
    for (const connection of this.activeConnections) {
      connection.destroy();
    }
    
    this.activeConnections.clear();
  }

  private async closeServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      logger.info('Closing HTTP server');
      
      this.server.close((error) => {
        if (error) {
          logger.error('Error closing HTTP server', error);
          reject(error);
        } else {
          logger.info('HTTP server closed successfully');
          resolve();
        }
      });
    });
  }

  private async performCleanup(): Promise<void> {
    try {
      logger.info('Starting cleanup procedures');

      // Reset all circuit breakers
      logger.info('Resetting circuit breakers');
      resetAllCircuitBreakers();

      // Run custom cleanup if provided
      if (this.onShutdown) {
        logger.info('Running custom shutdown procedures');
        await this.onShutdown();
      }

      // Close active database connections, Redis connections, etc.
      // This would be implemented based on your specific dependencies

      logger.info('Cleanup procedures completed');
    } catch (error) {
      logger.error('Error during cleanup procedures', error as Error);
      throw error;
    }
  }

  public async shutdown(signal: string, exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring signal');
      return;
    }

    this.isShuttingDown = true;
    const shutdownStartTime = Date.now();

    logger.info('Starting graceful shutdown process', {
      signal,
      timeout: this.timeout,
      activeConnections: this.activeConnections.size,
    });

    try {
      // Set a timeout to force exit if graceful shutdown takes too long
      const forceExitTimer = setTimeout(() => {
        logger.error('Graceful shutdown timeout exceeded, forcing exit', {
          timeout: this.timeout,
          elapsedTime: Date.now() - shutdownStartTime,
        });
        process.exit(1);
      }, this.timeout);

      // Perform cleanup operations
      await this.performCleanup();

      // Close active connections
      await this.closeActiveConnections();

      // Close the HTTP server
      await this.closeServer();

      // Clear the force exit timer
      clearTimeout(forceExitTimer);

      const shutdownTime = Date.now() - shutdownStartTime;
      logger.info('Graceful shutdown completed successfully', {
        signal,
        shutdownTime,
        exitCode,
      });

      // Exit the process
      process.exit(exitCode);
      
    } catch (error) {
      logger.error('Error during graceful shutdown', error as Error, {
        signal,
        elapsedTime: Date.now() - shutdownStartTime,
      });
      
      // Force exit on error
      process.exit(1);
    }
  }

  // Method to check if shutdown is in progress
  public isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }

  // Method to get active connection count
  public getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }

  // Method to add custom cleanup function
  public addCleanupHandler(handler: () => Promise<void>): void {{
    const currentHandler = this.onShutdown;
    
    this.onShutdown = async () => {
      if (currentHandler) {
        await currentHandler();
      }
      await handler();
    };
  }
}

// Middleware to reject new requests during shutdown
export const shutdownMiddleware = (gracefulShutdown: GracefulShutdown) => {
  return (req: any, res: any, next: any) => {
    if (gracefulShutdown.isShutdownInProgress()) {
      res.status(503).json({
        error: {
          message: 'Server is shutting down',
          code: 'SERVER_SHUTTING_DOWN',
          statusCode: 503,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next();
  };
};

// Factory function to create and setup graceful shutdown
export const setupGracefulShutdown = (
  server: Server, 
  options?: GracefulShutdownOptions
): GracefulShutdown => {
  return new GracefulShutdown(server, options);
};