import { BaseHttpClient } from '../baseHttpClient.js';
import { config } from '../../config/index.js';
import { logger } from '../../log/logger.js';
import { BCRA_CLIENT as events } from '../../log/log-events.js';

export class BcraClient extends BaseHttpClient {
  constructor() {
    super(config.externalServices.bcra.baseUrl, config.externalServices.bcra.timeout);

    if (config.externalServices.bcra.caBundlePath) {
      this.axiosInstance.defaults.httpsAgent = this.createHttpsAgent(
        config.externalServices.bcra.caBundlePath
      );
    }
  }

  async getAvailableSeries(): Promise<unknown[]> {
    logger.info({
      event: events.GET_AVAILABLE_SERIES,
      msg: 'Fetching available series from BCRA',
    });

    try {
      const response = await this.axiosInstance.get('/estadisticas/v3.0/Monetarias');

      const responseData = response.data as Record<string, unknown>;
      const results = (responseData.results as unknown[]) || [];

      logger.info({
        event: events.GET_AVAILABLE_SERIES,
        msg: 'Successfully fetched BCRA series',
        data: { count: results.length },
      });

      return results;
    } catch (error) {
      logger.error({
        event: events.GET_AVAILABLE_SERIES,
        msg: 'Failed to fetch BCRA series',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch BCRA series: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getSeriesData(params: {
    seriesId: string;
    from: string;
    to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<unknown> {
    const { seriesId, from, to, limit, offset } = params;

    logger.info({
      event: events.GET_SERIES_DATA,
      msg: 'Fetching series data from BCRA',
      data: { seriesId, from, to, limit, offset },
    });

    try {
      let url = `/estadisticas/v3.0/Monetarias/${seriesId}?desde=${from}`;

      if (to) url += `&hasta=${to}`;
      if (limit) url += `&limit=${limit}`;
      if (offset) url += `&offset=${offset}`;

      const response = await this.axiosInstance.get(url);

      logger.info({
        event: events.GET_SERIES_DATA,
        msg: 'Successfully fetched BCRA series data',
        data: { seriesId, url },
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_DATA,
        msg: 'Failed to fetch BCRA series data',
        err: error as Error,
        data: { seriesId },
      });
      throw new Error(
        `Failed to fetch BCRA series data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    logger.info({
      event: events.HEALTH_CHECK,
      msg: 'Checking BCRA API health',
    });

    try {
      await this.axiosInstance.get('/estadisticas/v3.0/Monetarias');
      const responseTime = Date.now() - startTime;

      logger.info({
        event: events.HEALTH_CHECK,
        msg: 'BCRA API health check successful',
        data: { responseTime },
      });

      return { isHealthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        event: events.HEALTH_CHECK,
        msg: 'BCRA API health check failed',
        err: error as Error,
        data: { responseTime },
      });

      return {
        isHealthy: false,
        error: errorMessage,
        responseTime,
      };
    }
  }
}
