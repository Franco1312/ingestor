import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '../../domain/providers.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import { BcraClient } from '../http/clients/bcraClient.js';
import { config } from '../config/index.js';
import { logger } from '../log/logger.js';

/**
 * BCRA v3 API Provider
 * Simple provider for BCRA Monetarias API
 */
export class BcraV3Provider implements SeriesProvider {
  readonly name = 'BCRA_V3';

  private readonly bcraClient: BcraClient;
  private readonly loggerContext = logger.child({ provider: this.name });

  constructor() {
    this.bcraClient = new BcraClient();
  }

  /**
   * Health check for BCRA API
   */
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

  /**
   * Fetch series data from BCRA
   */
  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId, from, to, limit = config.app.pageSize, offset = 0 } = params;

    this.loggerContext.info('Fetching BCRA data', { externalId, from, to });

    try {
      const response = await this.bcraClient.getSeriesData({
        seriesId: externalId,
        from,
        to,
        limit,
        offset,
      });

      const points = this.normalizeResponse(response, externalId);

      this.loggerContext.info('BCRA data fetched', {
        externalId,
        pointsFetched: points.length,
      });

      return {
        points,
        totalCount: points.length,
        hasMore: points.length === limit,
        provider: this.name,
      };
    } catch (error) {
      this.loggerContext.error('BCRA data fetch failed', {
        externalId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get available series from BCRA
   */
  async getAvailableSeries(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      frequency?: string;
    }>
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
          id: (seriesItem.idSerie as string) || (seriesItem.id as string) || 'unknown',
          title: (seriesItem.nombre as string) || (seriesItem.title as string) || 'Unknown',
        };

        if (seriesItem.descripcion || seriesItem.description) {
          result.description =
            (seriesItem.descripcion as string) || (seriesItem.description as string);
        }
        if (seriesItem.frecuencia) {
          result.frequency = seriesItem.frecuencia as string;
        }

        return result;
      });
    } catch (error) {
      this.loggerContext.error('Failed to get available BCRA series', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Normalize BCRA API response to our standard format
   */
  private normalizeResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];

    // BCRA API returns data in response.results array
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

  /**
   * Parse date string to YYYY-MM-DD format
   */
  private parseDate(dateString: string | undefined | null): string | null | undefined {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;

    return date.toISOString().split('T')[0];
  }

  /**
   * Parse numeric value
   */
  private parseValue(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;

    const parsedValue = Number(value);
    if (isNaN(parsedValue)) return null;

    return parsedValue;
  }
}
