#!/usr/bin/env node

import { scheduler } from '@/infrastructure/sched/scheduler.js';
import { logger } from '@/infrastructure/log/logger.js';
import { config } from '@/infrastructure/config/index.js';

async function main(): Promise<void> {
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

    scheduler.start();

    const status = scheduler.getStatus();
    logger.info({
      event: 'MAIN.SCHEDULER_STATUS',
      msg: 'Scheduler status',
      data: status,
    });

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

    logger.info({
      event: 'MAIN.RUNNING',
      msg: 'Ingestor service is running. Press Ctrl+C to stop.',
    });

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

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    logger.error({
      event: 'MAIN.FATAL_ERROR',
      msg: 'Fatal error in main function',
      err: error as Error,
    });
    process.exit(1);
  });
}

export { scheduler };
export { logger };
export { config };
