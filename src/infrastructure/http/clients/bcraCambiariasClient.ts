import { BaseHttpClient } from '@/infrastructure/http/baseHttpClient.js';
import { config } from '@/infrastructure/config/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_CLIENT as events } from '@/infrastructure/log/log-events.js';

export class BcraCambiariasClient extends BaseHttpClient {
  constructor() {
    super(
      config.externalServices.bcraCambiarias.baseUrl,
      config.externalServices.bcraCambiarias.timeout
    );

    if (config.externalServices.bcraCambiarias.caBundlePath) {
      this.axiosInstance.defaults.httpsAgent = this.createHttpsAgent(
        config.externalServices.bcraCambiarias.caBundlePath
      );
    }
  }

  async getAvailableSeries(): Promise<unknown[]> {
    logger.info({
      event: events.GET_AVAILABLE_SERIES,
      msg: 'Fetching available series from BCRA Cambiarias',
    });

    try {
      const response = await this.axiosInstance.get('/');

      const responseData = response.data as Record<string, unknown>;
      const results = (responseData.results as unknown[]) || [];

      logger.info({
        event: events.GET_AVAILABLE_SERIES,
        msg: 'Successfully fetched BCRA Cambiarias series',
        data: { count: results.length },
      });

      return results;
    } catch (error) {
      logger.error({
        event: events.GET_AVAILABLE_SERIES,
        msg: 'Failed to fetch BCRA Cambiarias series',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch BCRA Cambiarias series: ${error instanceof Error ? error.message : String(error)}`
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
      msg: 'Fetching series data from BCRA Cambiarias',
      data: { seriesId, from, to, limit, offset },
    });

    try {
      let url = `/${seriesId}?desde=${from}`;

      if (to) url += `&hasta=${to}`;
      if (limit) url += `&limit=${limit}`;
      if (offset) url += `&offset=${offset}`;

      const response = await this.axiosInstance.get(url);

      logger.info({
        event: events.GET_SERIES_DATA,
        msg: 'Successfully fetched BCRA Cambiarias series data',
        data: { seriesId, url },
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_DATA,
        msg: 'Failed to fetch BCRA Cambiarias series data',
        err: error as Error,
        data: { seriesId },
      });
      throw new Error(
        `Failed to fetch BCRA Cambiarias series data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    logger.info({
      event: events.HEALTH_CHECK,
      msg: 'Checking BCRA Cambiarias API health',
    });

    try {
      await this.axiosInstance.get('/');
      const responseTime = Date.now() - startTime;

      logger.info({
        event: events.HEALTH_CHECK,
        msg: 'BCRA Cambiarias API health check successful',
        data: { responseTime },
      });

      return { isHealthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        event: events.HEALTH_CHECK,
        msg: 'BCRA Cambiarias API health check failed',
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
