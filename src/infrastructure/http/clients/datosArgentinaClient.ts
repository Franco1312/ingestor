import { BaseHttpClient } from '../baseHttpClient.js';
import { config } from '../../config/index.js';
import { logger } from '../../log/logger.js';

/**
 * Datos Argentina API Client
 * Simple client for Datos Argentina /series API
 */
export class DatosArgentinaClient extends BaseHttpClient {
  private readonly loggerContext = logger.child({ client: 'DatosArgentinaClient' });

  constructor() {
    super(
      config.externalServices.datosArgentina.baseUrl,
      config.externalServices.datosArgentina.timeout
    );
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
      // Build URL manually
      let url = `/series?ids=${seriesId}&start_date=${from}&format=json`;

      if (to) url += `&end_date=${to}`;
      if (limit) url += `&limit=${limit}`;
      if (offset) url += `&start=${offset}`;

      const response = await this.axiosInstance.get(url);
      return response.data;
    } catch (error) {
      throw new Error(
        `Failed to fetch Datos Argentina series data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Health check for Datos Argentina API
   */
  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    try {
      const url = '/series?ids=143.3_NO_PR_2004_A_21:IPC&start_date=2024-01-01&format=json&limit=1';
      await this.axiosInstance.get(url);
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
