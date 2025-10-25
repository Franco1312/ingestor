#!/usr/bin/env node

import { Command } from 'commander';
import { BackfillSeriesUseCase } from '@/application/usecases/backfillSeries.js';
import { seriesRepository } from '@/infrastructure/db/seriesRepo.js';
import {
  BcraMonetariasProvider,
  BcraCambiariasProvider,
  BcraOficialProvider,
  DolarApiProvider,
  DatosSeriesProvider,
  ProviderChain,
} from '@/infrastructure/providers/index.js';
import { SeriesMappingServiceImpl } from '@/domain/services/seriesMappingService.js';
import { seriesMappingRepository } from '@/infrastructure/db/seriesMappingRepo.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

interface BackfillOptions {
  series: string;
  from: string;
  to?: string;
  force?: boolean;
  verbose?: boolean;
}

interface BackfillResult {
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  success: boolean;
  error?: string;
}

class BackfillCLI {
  private backfillUseCase!: BackfillSeriesUseCase;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const bcraMonetariasProvider = new BcraMonetariasProvider();
    const bcraCambiariasProvider = new BcraCambiariasProvider();
    const bcraOficialProvider = new BcraOficialProvider();
    const dolarApiProvider = new DolarApiProvider();
    const datosSeriesProvider = new DatosSeriesProvider();

    const providerChain = new ProviderChain([
      bcraMonetariasProvider,
      bcraCambiariasProvider,
      bcraOficialProvider,
      dolarApiProvider,
      datosSeriesProvider,
    ]);

    const mappingService = new SeriesMappingServiceImpl(seriesMappingRepository);
    this.backfillUseCase = new BackfillSeriesUseCase(
      seriesRepository,
      providerChain,
      mappingService
    );
  }

  private validateDateFormats(options: BackfillOptions): void {
    const validationResult = DateService.validateDateRange(options.from, options.to);
    if (!validationResult.isValid) {
      logger.error({
        event: events.BACKFILL,
        msg: 'Date validation failed',
        err: validationResult.error || 'Invalid date format',
      });
      process.exit(1);
    }

    const rangeValidation = DateService.validateDateRangeLogic(options.from, options.to);
    if (!rangeValidation.isValid) {
      logger.error({
        event: events.BACKFILL,
        msg: 'Date range validation failed',
        err: rangeValidation.error || 'Invalid date range',
      });
      process.exit(1);
    }
  }

  private buildBackfillParams(options: BackfillOptions) {
    return {
      seriesId: options.series,
      fromDate: options.from,
      ...(options.to && { toDate: options.to }),
    };
  }

  private async executeBackfill(options: BackfillOptions): Promise<BackfillResult> {
    const backfillParams = this.buildBackfillParams(options);
    return await this.backfillUseCase.execute(backfillParams);
  }

  private logBackfillResults(result: BackfillResult): void {
    if (!result.success) {
      logger.error({
        event: events.BACKFILL,
        msg: 'Backfill failed',
        err: result.error || 'Unknown error',
        data: { seriesId: result.seriesId },
      });
    } else if (result.pointsStored > 0) {
      logger.info({
        event: events.BACKFILL,
        msg: 'Backfill completed',
        data: { seriesId: result.seriesId, pointsStored: result.pointsStored },
      });
    }
  }

  private async getAndLogSeriesStats(seriesId: string): Promise<void> {
    try {
      const stats = await this.backfillUseCase.getBackfillStats(seriesId);

      if (stats) {
        logger.info({
          event: events.BACKFILL,
          msg: 'Series stats',
          data: { seriesId, totalPoints: stats.totalPoints },
        });
      }
    } catch {
      logger.info({
        event: events.BACKFILL,
        msg: 'Could not retrieve series stats',
        data: { seriesId },
      });
    }
  }

  private handleBackfillSuccess(): void {
    process.exit(0);
  }

  private handleBackfillFailure(error: string): void {
    logger.error({
      event: events.BACKFILL,
      msg: 'Backfill failed',
      err: error || 'Unknown error',
    });
    process.exit(1);
  }

  async run(options: BackfillOptions): Promise<void> {
    try {
      logger.info({
        event: events.BACKFILL,
        msg: 'Starting backfill operation',
        data: {
          seriesId: options.series,
          startDate: options.from,
          endDate: options.to,
        },
      });

      this.validateDateFormats(options);
      const result = await this.executeBackfill(options);
      this.logBackfillResults(result);

      if (!result.success) {
        this.handleBackfillFailure(result.error || 'Unknown error');
        return;
      }

      await this.getAndLogSeriesStats(options.series);
      this.handleBackfillSuccess();
    } catch (error) {
      logger.error({
        event: events.BACKFILL,
        msg: 'Backfill failed',
        err: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }
}

const program = new Command();

program
  .name('backfill')
  .description('Backfill time series data for a specific date range')
  .version('1.0.0')
  .requiredOption('-s, --series <seriesId>', 'Series ID to backfill')
  .requiredOption('-f, --from <startDate>', 'Start date (YYYY-MM-DD)')
  .option('-t, --to <endDate>', 'End date (YYYY-MM-DD, defaults to today)')
  .option('--force', 'Force overwrite existing data in the date range')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: BackfillOptions) => {
    const backfillCLI = new BackfillCLI();
    await backfillCLI.run(options);
  });

program.parse();
