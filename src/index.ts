#!/usr/bin/env node

import { scheduler } from './infrastructure/sched/scheduler.js';
import { logger } from './infrastructure/log/logger.js';
import { config } from './infrastructure/config/index.js';

/**
 * Main entry point for the ingestor service
 * This can be used for programmatic access to the scheduler
 */

async function main(): Promise<void> {
  // Remove loggerContext as it's not available in the new logger

  try {
    logger.info({
      event: 'MAIN.START',
      msg: 'Starting ingestor service',
      data: {
        timezone: config.app.timezone,
        logLevel: config.app.logLevel,
        seriesWhitelist: config.app.seriesWhitelist,
        primaryProvider: config.app.providers.primary,
        fallbackProvider: config.app.providers.fallback,
        httpTimeout: config.app.http.timeout,
        circuitBreakerThreshold: config.app.circuitBreaker.failureThreshold,
      },
    });

    // Start the scheduler
    scheduler.start();

    // Log scheduler status
    const status = scheduler.getStatus();
    logger.info({
      event: 'MAIN.SCHEDULER_STATUS',
      msg: 'Scheduler status',
      data: status,
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info({
        event: 'MAIN.SHUTDOWN',
        msg: 'Received SIGINT, shutting down gracefully',
      });
      scheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info({
        event: 'MAIN.SHUTDOWN',
        msg: 'Received SIGTERM, shutting down gracefully',
      });
      scheduler.stop();
      process.exit(0);
    });

    // Keep the process running
    logger.info({
      event: 'MAIN.RUNNING',
      msg: 'Ingestor service is running. Press Ctrl+C to stop.',
    });

    // Run forever
    await new Promise(() => {});
  } catch (error) {
    logger.error({
      event: 'MAIN.ERROR',
      msg: 'Failed to start ingestor service',
      err: error as Error,
    });
    process.exit(1);
  }
}

// Only run main if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

// Export for programmatic use
export { scheduler };
export { logger };
export { config };
