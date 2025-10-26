#!/usr/bin/env node

import { Command } from 'commander';
import { defaultPopulateBcraSeriesUseCase } from '@/application/usecases/populate-bcra-series.use-case.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';

class PopulateBcraSeriesCLI {
  private readonly populateUseCase = defaultPopulateBcraSeriesUseCase;

  constructor() {}

  async run(): Promise<void> {
    try {
      logger.info({
        event: events.BACKFILL,
        msg: 'Starting BCRA series population',
      });

      const result = await this.populateUseCase.execute();

      if (result.success && result.errors.length === 0) {
        logger.info({
          event: events.BACKFILL,
          msg: 'BCRA series population completed successfully',
          data: {
            populated: result.seriesPopulated,
            skipped: result.seriesSkipped,
          },
        });
        process.exit(0);
      } else {
        logger.error({
          event: events.BACKFILL,
          msg: 'BCRA series population completed with errors',
          err: 'Some series failed to populate',
          data: {
            populated: result.seriesPopulated,
            skipped: result.seriesSkipped,
            errors: result.errors,
          },
        });
        process.exit(1);
      }
    } catch (error) {
      logger.error({
        event: events.BACKFILL,
        msg: 'BCRA series population failed',
        err: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }
}

const program = new Command();

program
  .name('populate-bcra-series')
  .description('Populate BCRA series table from BCRA Monetarias API based on series_mappings')
  .action(async () => {
    const populateCLI = new PopulateBcraSeriesCLI();
    await populateCLI.run();
  });

program.parse();
