import type { ISeriesRepository } from '../../domain/ports/index.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import type { ProviderChain } from '../../domain/providers.js';
import { logger } from '../../infrastructure/log/logger.js';
import { BACKFILL_SERIES_USE_CASE as events } from '../../infrastructure/log/log-events.js';

export interface BackfillResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

export interface BackfillParams {
  seriesId: string;
  fromDate: string;
  toDate?: string;
}

export class BackfillSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly providerChain: ProviderChain
  ) {}

  async execute(params: BackfillParams): Promise<BackfillResult> {
    const { seriesId, fromDate, toDate } = params;

    logger.info({
      event: events.EXECUTE,
      msg: 'Starting backfill operation',
    });

    try {
      const points = await this.fetchHistoricalData(seriesId, fromDate, toDate);
      const storedCount = await this.storeData(points);

      logger.info({
        event: events.EXECUTE,
        msg: 'Backfill completed successfully',
      });

      return {
        success: true,
        seriesId,
        pointsFetched: points.length,
        pointsStored: storedCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        event: events.EXECUTE,
        msg: 'Backfill failed',
        err: errorMessage,
      });

      return {
        success: false,
        seriesId,
        pointsFetched: 0,
        pointsStored: 0,
        error: errorMessage,
      };
    }
  }

  async getBackfillStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
  } | null> {
    return await this.seriesRepository.getSeriesStats(seriesId);
  }

  private async fetchHistoricalData(
    seriesId: string,
    fromDate: string,
    toDate?: string
  ): Promise<SeriesPoint[]> {
    const result = await this.providerChain.fetchRange({
      externalId: seriesId,
      from: fromDate,
      to: toDate,
    });

    return result.points;
  }

  private async storeData(points: SeriesPoint[]): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    return await this.seriesRepository.upsertPoints(points);
  }
}
