import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '@/domain/providers.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import { BcraCambiariasClient } from '@/infrastructure/http/clients/bcraCambiariasClient.js';

import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_MONETARIAS_PROVIDER as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

export class BcraCambiariasProvider implements SeriesProvider {
  readonly name = 'BCRA_CAMBIARIAS';

  private readonly bcraCambiariasClient: BcraCambiariasClient;

  constructor() {
    this.bcraCambiariasClient = new BcraCambiariasClient();
  }

  async health(): Promise<ProviderHealth> {
    const startTime = DateService.now();

    try {
      const healthResult = await this.bcraCambiariasClient.healthCheck();
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
    const { externalId, from, to, limit = 1000, offset = 0 } = params;

    try {
      const allPoints: SeriesPoint[] = [];
      let currentOffset = offset;
      let hasMore = true;

      while (hasMore) {
        const responseBody = await this.bcraCambiariasClient.getSeriesData({
          seriesId: externalId,
          from,
          to,
          limit,
          offset: currentOffset,
        });

        const pagePoints = this.normalizeResponse(responseBody, externalId);
        allPoints.push(...pagePoints);

        hasMore = pagePoints.length === limit;
        currentOffset += limit;
      }

      return {
        points: allPoints,
        totalCount: allPoints.length,
        hasMore: false,
        provider: this.name,
      };
    } catch (error) {
      logger.error({
        event: events.FETCH_RANGE,
        msg: 'BCRA Cambiarias data fetch failed',
        err: error as Error,
      });
      throw error;
    }
  }

  async getAvailableSeries(): Promise<
    Array<{ id: string; title: string; description?: string; frequency?: string }>
  > {
    try {
      const data = await this.bcraCambiariasClient.getAvailableSeries();
      return data.map((item: unknown) => {
        const seriesItem = item as Record<string, unknown>;
        const result: {
          id: string;
          title: string;
          description?: string;
          frequency?: string;
        } = {
          id: String(seriesItem.idVariable || 'unknown'),
          title: (seriesItem.descripcion as string) || 'Unknown',
        };

        if (seriesItem.categoria) {
          result.description = seriesItem.categoria as string;
        }

        return result;
      });
    } catch (error) {
      logger.error({
        event: events.GET_AVAILABLE_SERIES,
        msg: 'Failed to get available BCRA Cambiarias series',
        err: error as Error,
      });
      throw error;
    }
  }

  private normalizeResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];

    const responseData = response as Record<string, unknown>;
    if (responseData && responseData.results) {
      const results = responseData.results as unknown[];
      for (const item of results) {
        const itemData = item as Record<string, unknown>;
        const date = this.parseDate(itemData.fecha as string);
        const value = this.parseValue(itemData.valor);

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
