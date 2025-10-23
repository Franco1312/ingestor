import type { ISeriesRepository } from '../../domain/ports/index.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import type { ProviderChain } from '../../domain/providers.js';
import { logger } from '../../infrastructure/log/logger.js';
import { BACKFILL_SERIES_USE_CASE as events } from '../../infrastructure/log/log-events.js';

/**
 * Result of backfill operation
 */
export interface BackfillResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

/**
 * Parameters for backfill operation
 */
export interface BackfillParams {
  seriesId: string;
  fromDate: string;
  toDate?: string;
}

/**
 * Backfill series data use case
 * Handles fetching historical data from providers and storing it in the repository
 */
export class BackfillSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly providerChain: ProviderChain
  ) {}

  /**
   * Execute backfill for a series
   */
  async execute(params: BackfillParams): Promise<BackfillResult> {
    const { seriesId, fromDate, toDate } = params;

    logger.info({
      event: events.EXECUTE,
      msg: 'Starting backfill for series',
      data: { seriesId, fromDate, toDate },
    });

    try {
      const points = await this.fetchHistoricalData(seriesId, fromDate, toDate);
      const storedCount = await this.storeData(points);

      logger.info({
        event: events.EXECUTE,
        msg: 'Backfill completed',
        data: {
          seriesId,
          pointsFetched: points.length,
          pointsStored: storedCount,
        },
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
        err: error as Error,
        data: { seriesId },
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

  /**
   * Get backfill statistics for a series
   */
  async getBackfillStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
  } | null> {
    return await this.seriesRepository.getSeriesStats(seriesId);
  }

  /**
   * Fetch historical data from the provider chain
   */
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

  /**
   * Store data in the repository
   */
  private async storeData(points: SeriesPoint[]): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    return await this.seriesRepository.upsertPoints(points);
  }
}
