import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '../../domain/providers.js';
import type { SeriesPoint } from '../../domain/entities/index.js';
import { DatosArgentinaClient } from '../http/clients/datosArgentinaClient.js';
import { config } from '../config/index.js';
import { logger } from '../log/logger.js';

/**
 * Datos Argentina Series Provider
 * Simple provider for Datos Argentina /series API
 */
export class DatosSeriesProvider implements SeriesProvider {
  readonly name = 'DATOS_SERIES';

  private readonly datosClient: DatosArgentinaClient;
  private readonly loggerContext = logger.child({ provider: this.name });

  constructor() {
    this.datosClient = new DatosArgentinaClient();
  }

  /**
   * Health check for Datos Argentina API
   */
  async health(): Promise<ProviderHealth> {
    const startTime = Date.now();

    try {
      const healthResult = await this.datosClient.healthCheck();
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
   * Fetch series data from Datos Argentina
   */
  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId, from, to, limit = config.app.pageSize, offset = 0 } = params;

    this.loggerContext.info('Fetching Datos Argentina data', { externalId, from, to });

    try {
      const response = await this.datosClient.getSeriesData({
        seriesId: externalId,
        from,
        to,
        limit,
        offset,
      });

      const points = this.normalizeResponse(response, externalId);

      this.loggerContext.info('Datos Argentina data fetched', {
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
      this.loggerContext.error('Datos Argentina data fetch failed', {
        externalId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get available series from Datos Argentina
   */
  async getAvailableSeries(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      frequency?: string;
    }>
  > {
    // Datos Argentina API does not have a direct endpoint for listing all available series
    this.loggerContext.warn('getAvailableSeries not implemented for Datos Argentina Provider');
    return [];
  }

  /**
   * Normalize Datos Argentina API response to our standard format
   */
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
