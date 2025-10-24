import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '@/domain/providers.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import { DatosArgentinaClient } from '@/infrastructure/http/clients/datosArgentinaClient.js';
import { config } from '@/infrastructure/config/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { DateService } from '@/domain/utils/dateService.js';

export class DatosSeriesProvider implements SeriesProvider {
  readonly name = 'DATOS_SERIES';

  private readonly datosClient: DatosArgentinaClient;

  constructor() {
    this.datosClient = new DatosArgentinaClient();
  }

  async health(): Promise<ProviderHealth> {
    const startTime = DateService.now();

    try {
      const healthResult = await this.datosClient.healthCheck();
      const result: ProviderHealth = {
        isHealthy: healthResult.isHealthy,
        responseTime: DateService.now() - startTime,
      };
      if (healthResult.error) {
        result.error = healthResult.error;
      }
      return result;
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: DateService.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId, from, to, limit = config.app.pageSize, offset = 0 } = params;

    logger.info({
      event: 'DATOS_SERIES_PROVIDER.FETCH_RANGE',
      msg: 'Fetching Datos Argentina data',
      data: { externalId, from, to },
    });

    try {
      const response = await this.datosClient.getSeriesData({
        seriesId: externalId,
        from,
        to,
        limit,
        offset,
      });

      const points = this.normalizeResponse(response, externalId);

      logger.info({
        event: 'DATOS_SERIES_PROVIDER.FETCH_RANGE',
        msg: 'Datos Argentina data fetched',
        data: {
          externalId,
          pointsFetched: points.length,
        },
      });

      return {
        points,
        totalCount: points.length,
        hasMore: points.length === limit,
        provider: this.name,
      };
    } catch (error) {
      logger.error({
        event: 'DATOS_SERIES_PROVIDER.FETCH_RANGE',
        msg: 'Datos Argentina data fetch failed',
        err: error as Error,
        data: { externalId },
      });
      throw error;
    }
  }

  async getAvailableSeries(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      frequency?: string;
    }>
  > {
    logger.info({
      event: 'DATOS_SERIES_PROVIDER.GET_AVAILABLE_SERIES',
      msg: 'getAvailableSeries not implemented for Datos Argentina Provider',
    });
    return [];
  }

  private normalizeResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];

    const responseData = response as Record<string, unknown>;
    if (responseData && responseData.data) {
      const data = responseData.data as unknown[];
      for (const item of data) {
        const itemData = item as unknown[];
        const date = this.parseDate(itemData[0] as string);
        const value = this.parseValue(itemData[1]);

        if (date && value !== null) {
          points.push({ seriesId, ts: date, value });
        }
      }
    }
    return points;
  }

  private parseDate(dateString: string | undefined | null): string | null | undefined {
    if (!dateString) return null;
    return DateService.formatDate(new Date(dateString));
  }

  private parseValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsedValue = Number(value);
    if (isNaN(parsedValue)) return null;

    return parsedValue;
  }
}
