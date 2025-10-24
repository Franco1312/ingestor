import { BaseHttpClient } from '@/infrastructure/http/baseHttpClient.js';
import { config } from '@/infrastructure/config/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_CLIENT as events } from '@/infrastructure/log/log-events.js';

export class DolarApiClient extends BaseHttpClient {
  constructor() {
    super(config.externalServices.dolarApi.baseUrl, config.externalServices.dolarApi.timeout);
  }

  async getMEPData(): Promise<unknown> {
    logger.info({
      event: events.GET_SERIES_DATA,
      msg: 'Fetching MEP data from DolarApi',
    });

    try {
      const response = await this.axiosInstance.get('/dolares/bolsa');

      logger.info({
        event: events.GET_SERIES_DATA,
        msg: 'Successfully fetched MEP data from DolarApi',
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_DATA,
        msg: 'Failed to fetch MEP data from DolarApi',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch MEP data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getCCLData(): Promise<unknown> {
    logger.info({
      event: events.GET_SERIES_DATA,
      msg: 'Fetching CCL data from DolarApi',
    });

    try {
      const response = await this.axiosInstance.get('/dolares/contadoconliqui');

      logger.info({
        event: events.GET_SERIES_DATA,
        msg: 'Successfully fetched CCL data from DolarApi',
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_DATA,
        msg: 'Failed to fetch CCL data from DolarApi',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch CCL data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getBlueData(): Promise<unknown> {
    logger.info({
      event: events.GET_SERIES_DATA,
      msg: 'Fetching Blue data from DolarApi',
    });

    try {
      const response = await this.axiosInstance.get('/dolares/blue');

      logger.info({
        event: events.GET_SERIES_DATA,
        msg: 'Successfully fetched Blue data from DolarApi',
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_DATA,
        msg: 'Failed to fetch Blue data from DolarApi',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch Blue data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async healthCheck(): Promise<{ isHealthy: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();

    logger.info({
      event: events.HEALTH_CHECK,
      msg: 'Checking DolarApi health',
    });

    try {
      await this.axiosInstance.get('/dolares/blue');
      const responseTime = Date.now() - startTime;

      logger.info({
        event: events.HEALTH_CHECK,
        msg: 'DolarApi health check successful',
        data: { responseTime },
      });

      return { isHealthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        event: events.HEALTH_CHECK,
        msg: 'DolarApi health check failed',
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
