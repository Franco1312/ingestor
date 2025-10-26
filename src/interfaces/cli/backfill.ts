#!/usr/bin/env node

import { Command } from 'commander';
import { defaultBackfillBcraSeriesUseCase } from '@/application/usecases/backfill-bcra-series.use-case.js';
import { defaultSeriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';

interface BackfillResult {
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  success: boolean;
  error?: string;
}

class BackfillCLI {
  private readonly backfillUseCase = defaultBackfillBcraSeriesUseCase;
  constructor() {}

  private async executeBackfill(
    seriesId: string,
    fromDate: string,
    toDate: string
  ): Promise<BackfillResult> {
    const backfillParams = {
      seriesId,
      fromDate,
      toDate,
    };
    return await this.backfillUseCase.execute(backfillParams);
  }

  private async getAllSeriesIds(): Promise<string[]> {
    const allSeries = await defaultSeriesRepository.getAllSeries();
    return allSeries.map(s => s.id);
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

  private getDefaultDateRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];

    if (!fromStr || !toStr) {
      throw new Error('Failed to generate date range');
    }

    return {
      from: fromStr,
      to: toStr,
    };
  }

  async run(): Promise<void> {
    try {
      const { from, to } = this.getDefaultDateRange();

      const seriesToProcess = await this.getAllSeriesIds();

      if (seriesToProcess.length === 0) {
        logger.error({
          event: events.BACKFILL,
          msg: 'No series found in database',
        });
        process.exit(1);
      }

      logger.info({
        event: events.BACKFILL,
        msg: 'Starting backfill operation (last year)',
        data: {
          seriesCount: seriesToProcess.length,
          startDate: from,
          endDate: to,
        },
      });

      let successCount = 0;
      let failureCount = 0;

      for (const seriesId of seriesToProcess) {
        logger.info({
          event: events.BACKFILL,
          msg: 'Processing series',
          data: { seriesId },
        });

        const result = await this.executeBackfill(seriesId, from, to);
        this.logBackfillResults(result);

        if (result.success) {
          successCount++;
          await this.getAndLogSeriesStats(seriesId);
        } else {
          failureCount++;
          logger.error({
            event: events.BACKFILL,
            msg: 'Backfill failed for series',
            err: result.error || 'Unknown error',
            data: { seriesId },
          });
        }
      }

      // Summary
      logger.info({
        event: events.BACKFILL,
        msg: 'Backfill completed',
        data: {
          total: seriesToProcess.length,
          success: successCount,
          failed: failureCount,
        },
      });

      if (failureCount > 0) {
        process.exit(1);
      } else {
        this.handleBackfillSuccess();
      }
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
  .description('Backfill time series data for all available series (last year)')
  .version('1.0.0')
  .action(async () => {
    const backfillCLI = new BackfillCLI();
    await backfillCLI.run();
  });

program.parse();
