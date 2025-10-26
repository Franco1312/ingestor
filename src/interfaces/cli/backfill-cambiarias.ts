#!/usr/bin/env node

import { Command } from 'commander';
import { defaultBackfillBcraCambiariasUseCase } from '@/application/usecases/backfill-bcra-cambiarias.use-case.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';

interface BackfillResult {
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  success: boolean;
  error?: string;
}

class BackfillCambiariasCLI {
  private readonly backfillUseCase = defaultBackfillBcraCambiariasUseCase;

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

  private logBackfillResults(result: BackfillResult): void {
    if (!result.success) {
      logger.error({
        event: events.BACKFILL,
        msg: 'BCRA Cambiarias backfill failed',
        err: result.error || 'Unknown error',
        data: { seriesId: result.seriesId },
      });
    } else if (result.pointsStored > 0) {
      logger.info({
        event: events.BACKFILL,
        msg: 'BCRA Cambiarias backfill completed',
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
      msg: 'BCRA Cambiarias backfill failed',
      err: error || 'Unknown error',
    });
    process.exit(1);
  }

  private getDefaultDateRange(): { from: string; to: string } {
    const to = new Date();
    const from = new Date();
    from.setMonth(from.getMonth() - 1);

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
    const program = new Command();

    program
      .name('backfill-cambiarias')
      .description('Backfill BCRA Cambiarias exchange rate data for the last month')
      .option('-s, --series-id <seriesId>', 'Series ID to backfill', 'bcra.usd_oficial_ars')
      .action(async options => {
        try {
          const { from, to } = this.getDefaultDateRange();

          logger.info({
            event: events.BACKFILL,
            msg: 'Starting BCRA Cambiarias backfill',
            data: { seriesId: options.seriesId, from, to },
          });

          const result = await this.executeBackfill(options.seriesId, from, to);

          this.logBackfillResults(result);
          await this.getAndLogSeriesStats(options.seriesId);

          if (result.success) {
            this.handleBackfillSuccess();
          } else {
            this.handleBackfillFailure(result.error || 'Unknown error');
          }
        } catch (error) {
          this.handleBackfillFailure(error instanceof Error ? error.message : String(error));
        }
      });

    await program.parseAsync();
  }
}

const backfillCLI = new BackfillCambiariasCLI();
backfillCLI.run().catch(error => {
  logger.error({
    event: events.BACKFILL,
    msg: 'Fatal error in BCRA Cambiarias backfill CLI',
    err: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
