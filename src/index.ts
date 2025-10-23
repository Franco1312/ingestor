#!/usr/bin/env node

import { scheduler } from './infrastructure/sched/scheduler.js';
import { logger } from './infrastructure/log/logger.js';
import { config } from './infrastructure/config/index.js';

/**
 * Main entry point for the ingestor service
 * This can be used for programmatic access to the scheduler
 */

async function main(): Promise<void> {
  const loggerContext = logger.child({ service: 'ingestor' });

  try {
    loggerContext.info('Starting ingestor service', {
      timezone: config.app.timezone,
      logLevel: config.app.logLevel,
      seriesWhitelist: config.app.seriesWhitelist,
      primaryProvider: config.app.providers.primary,
      fallbackProvider: config.app.providers.fallback,
      httpTimeout: config.app.http.timeout,
      circuitBreakerThreshold: config.app.circuitBreaker.failureThreshold,
    });

    // Start the scheduler
    scheduler.start();

    // Log scheduler status
    const status = scheduler.getStatus();
    loggerContext.info('Scheduler status', status);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      loggerContext.info('Received SIGINT, shutting down gracefully');
      scheduler.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      loggerContext.info('Received SIGTERM, shutting down gracefully');
      scheduler.stop();
      process.exit(0);
    });

    // Keep the process running
    loggerContext.info('Ingestor service is running. Press Ctrl+C to stop.');

    // Run forever
    await new Promise(() => {});
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    loggerContext.error('Failed to start ingestor service', { error: errorMessage });
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
