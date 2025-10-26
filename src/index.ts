#!/usr/bin/env node

import { logger } from '@/infrastructure/log/logger.js';
import { config } from '@/infrastructure/config/index.js';

async function main(): Promise<void> {
  try {
    logger.info({
      event: 'MAIN.START',
      msg: 'Ingestor CLI available',
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

    logger.info({
      event: 'MAIN.READY',
      msg: 'Ingestor CLI is ready. Use command: npm run backfill',
    });
  } catch (error) {
    logger.error({
      event: 'MAIN.ERROR',
      msg: 'Failed to initialize ingestor',
      err: error as Error,
    });
    process.exit(1);
  }
}

// Run main when executed directly
main().catch(error => {
  logger.error({
    event: 'MAIN.FATAL_ERROR',
    msg: 'Fatal error in main function',
    err: error as Error,
  });
  process.exit(1);
});

export { logger };
export { config };
