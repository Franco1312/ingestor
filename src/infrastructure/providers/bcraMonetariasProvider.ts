import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '../../domain/providers.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import { BcraClient } from '../http/clients/bcraClient.js';

import { logger } from '../log/logger.js';
import { BCRA_MONETARIAS_PROVIDER as events } from '../log/log-events.js';

export class BcraMonetariasProvider implements SeriesProvider {
  readonly name = 'BCRA_MONETARIAS';

  private readonly bcraClient: BcraClient;

  constructor() {
    this.bcraClient = new BcraClient();
  }

  async health(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      const healthResult = await this.bcraClient.healthCheck();
      const result: ProviderHealth = {
        isHealthy: healthResult.isHealthy,
        responseTime: Date.now() - startTime,
      };
      if (healthResult.error) {
        result.error = healthResult.error;
      }
      return result;
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId, from, to, limit = 1000, offset = 0 } = params;

    logger.info({
      event: events.FETCH_RANGE,
      msg: 'Starting BCRA Monetarias data fetch',
      data: {
        externalId,
        from,
        to,
        limit,
        offset,
      },
    });

    try {
      const allPoints: SeriesPoint[] = [];
      let currentOffset = offset;
      let hasMore = true;
      let totalCount = 0;

      while (hasMore) {
        const responseBody = await this.bcraClient.getSeriesData({
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
        totalCount += pagePoints.length;

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Fetched page',
          data: {
            externalId,
            pageOffset: currentOffset - limit,
            pagePointsCount: pagePoints.length,
            totalPointsSoFar: allPoints.length,
            hasMore,
          },
        });
      }

      logger.info({
        event: events.FETCH_RANGE,
        msg: 'BCRA Monetarias data fetch completed',
        data: {
          externalId,
          totalPointsFetched: allPoints.length,
          pagesFetched: Math.ceil(totalCount / limit),
          dateRange: { from, to },
        },
      });

      return {
        points: allPoints,
        totalCount: allPoints.length,
        hasMore: false,
        provider: this.name,
      };
    } catch (error) {
      logger.error({
        event: events.FETCH_RANGE,
        msg: 'BCRA Monetarias data fetch failed',
        err: error as Error,
        data: { externalId },
      });
      throw error;
    }
  }

  async getAvailableSeries(): Promise<
    Array<{ id: string; title: string; description?: string; frequency?: string }>
  > {
    try {
      const data = await this.bcraClient.getAvailableSeries();
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
        msg: 'Failed to get available BCRA Monetarias series',
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

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  }

  private parseValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsedValue = Number(value);
    if (isNaN(parsedValue)) return null;

    return parsedValue;
  }
}
