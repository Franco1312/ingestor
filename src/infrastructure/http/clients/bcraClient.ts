import { BaseHttpClient } from '../baseHttpClient.js';
import { config } from '../../config/index.js';
import { logger } from '../../log/logger.js';

/**
 * BCRA API Client
 * Simple client for BCRA Monetarias v3 API
 */
export class BcraClient extends BaseHttpClient {
  private readonly loggerContext = logger.child({ client: 'BcraClient' });

  constructor() {
    super(config.externalServices.bcra.baseUrl, config.externalServices.bcra.timeout);

    // Update HTTPS agent with CA bundle if provided
    if (config.externalServices.bcra.caBundlePath) {
      this.axiosInstance.defaults.httpsAgent = this.createHttpsAgent(
        config.externalServices.bcra.caBundlePath
      );
    }
  }

  /**
   * Get available series from BCRA
   */
  async getAvailableSeries(): Promise<unknown[]> {
    try {
      const response = await this.axiosInstance.get('/estadisticas/v3.0/Monetarias');
      return response.data.data || [];
    } catch (error) {
      throw new Error(
        `Failed to fetch BCRA series: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get series data by ID
   */
  async getSeriesData(params: {
    seriesId: string;
    from: string;
    to?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<unknown> {
    const { seriesId, from, to, limit, offset } = params;

    try {
      let url = `/estadisticas/v3.0/Monetarias/${seriesId}?desde=${from}`;

      if (to) url += `&hasta=${to}`;
      if (limit) url += `&limit=${limit}`;
      if (offset) url += `&offset=${offset}`;

      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch BCRA series data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Health check for BCRA API
   */
  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    try {
      await this.axiosInstance.get('/estadisticas/v3.0/Monetarias');
      return { isHealthy: true, responseTime: Date.now() - startTime };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      };
    }
  }
}
