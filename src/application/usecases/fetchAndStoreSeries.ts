import type { ISeriesRepository } from '../../domain/ports/index.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import type { ProviderChain } from '../../domain/providers.js';
import { getYesterdayString } from '../../domain/utils/index.js';
import { logger } from '../../infrastructure/log/logger.js';
import { FETCH_AND_STORE_SERIES_USE_CASE as events } from '../../infrastructure/log/log-events.js';

/**
 * Result of fetch and store operation
 */
export interface FetchAndStoreResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

/**
 * Fetch and store series data use case
 * Handles fetching data from providers and storing it in the repository
 */
export class FetchAndStoreSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly providerChain: ProviderChain
  ) {}

  /**
   * Execute fetch and store for multiple series
   */
  async executeMultiple(seriesIds: string[]): Promise<FetchAndStoreResult[]> {
    logger.info({
      event: events.EXECUTE_MULTIPLE,
      msg: 'Starting fetch and store for multiple series',
      data: {
        seriesCount: seriesIds.length,
      },
    });

    const results: FetchAndStoreResult[] = [];

    for (const seriesId of seriesIds) {
      try {
        const result = await this.execute(seriesId);
        results.push(result);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({
          event: events.EXECUTE_MULTIPLE,
          msg: 'Failed to process series',
          err: error as Error,
          data: { seriesId },
        });
        results.push({
          success: false,
          seriesId,
          pointsFetched: 0,
          pointsStored: 0,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  /**
   * Execute fetch and store for a single series
   */
  async execute(seriesId: string): Promise<FetchAndStoreResult> {
    logger.info({
      event: events.EXECUTE,
      msg: 'Starting fetch and store for series',
      data: { seriesId },
    });

    try {
      const lastDate = await this.getLastAvailableDate(seriesId);
      const fromDate = this.determineFromDate(lastDate);

      const points = await this.fetchDataFromProvider(seriesId, fromDate);
      const storedCount = await this.storeData(points);

      logger.info({
        event: events.EXECUTE,
        msg: 'Fetch and store completed',
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
        msg: 'Fetch and store failed',
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
   * Get the last available date for a series
   */
  private async getLastAvailableDate(seriesId: string): Promise<string | null> {
    return await this.seriesRepository.getLastDate(seriesId);
  }

  /**
   * Determine the from date for fetching data
   */
  private determineFromDate(lastDate: string | null): string {
    if (lastDate) {
      // If we have data, fetch from the day after the last date
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const result = nextDate.toISOString().split('T')[0];
      if (!result) {
        throw new Error('Invalid date format');
      }
      return result;
    }

    // If no data exists, fetch from yesterday
    return getYesterdayString();
  }

  /**
   * Fetch data from the provider chain
   */
  private async fetchDataFromProvider(seriesId: string, fromDate: string): Promise<SeriesPoint[]> {
    const result = await this.providerChain.fetchRange({
      externalId: seriesId,
      from: fromDate,
      to: undefined,
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
