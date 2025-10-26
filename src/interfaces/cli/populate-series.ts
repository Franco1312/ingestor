#!/usr/bin/env node

import { Command } from 'commander';
import { PopulateSeriesUseCase } from '@/application/usecases/populate-series.use-case.js';
import { defaultBcraMonetariasMetadataProvider } from '@/infrastructure/providers/bcraMonetariasMetadataProvider.js';
import { defaultBcraCambiariasMetadataProvider } from '@/infrastructure/providers/bcraCambiariasMetadataProvider.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';

class PopulateSeriesCLI {
  async run(provider: string): Promise<void> {
    try {
      const metadataProvider = this.getProvider(provider);

      const useCase = new PopulateSeriesUseCase(undefined, undefined, metadataProvider);

      logger.info({
        event: events.BACKFILL,
        msg: 'Starting series population',
        data: { provider },
      });

      const result = await useCase.execute();

      if (result.success && result.errors.length === 0) {
        logger.info({
          event: events.BACKFILL,
          msg: 'Series population completed successfully',
          data: {
            provider,
            populated: result.seriesPopulated,
            skipped: result.seriesSkipped,
          },
        });
        process.exit(0);
      } else {
        logger.error({
          event: events.BACKFILL,
          msg: 'Series population completed with errors',
          err: 'Some series failed to populate',
          data: {
            provider,
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
        msg: 'Series population failed',
        err: error instanceof Error ? error.message : String(error),
        data: { provider },
      });
      process.exit(1);
    }
  }

  private getProvider(provider: string) {
    switch (provider) {
      case 'BCRA_MONETARIAS':
        return defaultBcraMonetariasMetadataProvider;
      case 'BCRA_CAMBIARIAS':
        return defaultBcraCambiariasMetadataProvider;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }
}

const program = new Command();

program
  .name('populate-series')
  .description('Populate series table from external APIs based on series_mappings')
  .option(
    '-p, --provider <provider>',
    'Provider to use (BCRA_MONETARIAS, BCRA_CAMBIARIAS)',
    'BCRA_MONETARIAS'
  )
  .action(async options => {
    const populateCLI = new PopulateSeriesCLI();
    await populateCLI.run(options.provider);
  });

program.parse();
