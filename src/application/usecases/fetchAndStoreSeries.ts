import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import type { ProviderChain } from '@/domain/providers.js';
import { DateService } from '@/domain/utils/dateService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { FETCH_AND_STORE_SERIES_USE_CASE as events } from '@/infrastructure/log/log-events.js';

export interface FetchAndStoreResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

export class FetchAndStoreSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly providerChain: ProviderChain
  ) {}

  async executeMultiple(seriesIds: string[]): Promise<FetchAndStoreResult[]> {
    logger.info({
      event: events.EXECUTE_MULTIPLE,
      msg: 'Starting fetch and store for multiple series',
    });

    const results = await Promise.all(
      seriesIds.map(async seriesId => {
        try {
          return await this.execute(seriesId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logger.error({
            event: events.EXECUTE_MULTIPLE,
            msg: 'Failed to process series',
            err: errorMessage,
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
      })
    );

    return results;
  }

  async execute(seriesId: string): Promise<FetchAndStoreResult> {
    logger.info({
      event: events.EXECUTE,
      msg: 'Starting fetch and store operation',
    });

    try {
      const lastDate = await this.getLastAvailableDate(seriesId);
      const fromDate = this.determineFromDate(lastDate);
      const points = await this.fetchDataFromProvider(seriesId, fromDate);
      const storedCount = await this.storeData(points);

      logger.info({
        event: events.EXECUTE,
        msg: 'Fetch and store completed successfully',
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

  private async getLastAvailableDate(seriesId: string): Promise<string | null> {
    return this.seriesRepository.getLastDate(seriesId);
  }

  private determineFromDate(lastDate: string | null): string {
    if (lastDate) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + 1);
      const result = nextDate.toISOString().split('T')[0];
      if (!result) {
        throw new Error('Invalid date format');
      }
      return result;
    }

    return DateService.getYesterday();
  }

  private async fetchDataFromProvider(seriesId: string, fromDate: string): Promise<SeriesPoint[]> {
    const result = await this.providerChain.fetchRange({
      externalId: seriesId,
      from: fromDate,
      to: undefined,
    });

    return result.points;
  }

  private async storeData(points: SeriesPoint[]): Promise<number> {
    return points.length === 0 ? 0 : this.seriesRepository.upsertPoints(points);
  }
}
