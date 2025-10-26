import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import type { SeriesMappingService } from '@/domain/services/seriesMappingService.js';
import { BcraClient, defaultBcraClient } from '@/infrastructure/http/clients/bcraClient.js';
import { defaultSeriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { defaultSeriesMappingService } from '@/domain/services/seriesMappingService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BACKFILL_SERIES_USE_CASE as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

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

export class BackfillBcraSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository = defaultSeriesRepository,
    private readonly mappingService: SeriesMappingService = defaultSeriesMappingService,
    private readonly bcraClient: BcraClient = defaultBcraClient
  ) {}

  async execute(params: BackfillParams): Promise<BackfillResult> {
    const { seriesId, fromDate, toDate } = params;

    logger.info({
      event: events.EXECUTE,
      msg: 'Starting backfill operation',
    });

    try {
      const points = await this.fetchHistoricalData(seriesId, fromDate, toDate);
      const storedCount = await this.storeData(points, seriesId);

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
    const mappings = await this.mappingService.getMappingsByProvider('BCRA_MONETARIAS');
    const mapping = mappings.find(m => m.internal_series_id === seriesId);
    const externalId = mapping?.external_series_id || seriesId;

    const allPoints: SeriesPoint[] = [];
    let currentOffset = 0;
    const pageLimit = 1000;

    while (true) {
      const response = await this.bcraClient.getSeriesData({
        seriesId: externalId,
        from: fromDate,
        to: toDate,
        limit: pageLimit,
        offset: currentOffset,
      });

      const pagePoints = this.normalizeBcraResponse(response, externalId);
      allPoints.push(...pagePoints);

      if (pagePoints.length < pageLimit) {
        break;
      }

      currentOffset += pageLimit;
    }

    return allPoints;
  }

  private normalizeBcraResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const data = response as { results?: unknown[] };

    if (!data.results) {
      return points;
    }

    for (const item of data.results) {
      const row = item as { fecha?: string; valor?: unknown };
      const date = this.parseDate(row.fecha);
      const value = this.parseValue(row.valor);

      if (date && value !== null) {
        points.push({ seriesId, ts: date, value });
      }
    }

    return points;
  }

  private parseDate(dateString: string | undefined): string | null {
    if (!dateString) return null;
    return DateService.formatDate(new Date(dateString));
  }

  private parseValue(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  private async storeData(points: SeriesPoint[], originalSeriesId: string): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    const mappings = await this.mappingService.getMappingsByProvider('BCRA_MONETARIAS');
    const mapping = mappings.find(
      m => m.external_series_id === originalSeriesId || m.internal_series_id === originalSeriesId
    );
    const internalId = mapping?.internal_series_id || originalSeriesId;

    const resolvedPoints = points.map(point => ({
      ...point,
      seriesId: internalId,
    }));

    return await this.seriesRepository.upsertPoints(resolvedPoints);
  }
}

export const defaultBackfillBcraSeriesUseCase = new BackfillBcraSeriesUseCase();
