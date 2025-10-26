import { BaseHttpClient } from '@/infrastructure/http/baseHttpClient.js';
import { config } from '@/infrastructure/config/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_CAMBIARIAS_CLIENT as events } from '@/infrastructure/log/log-events.js';
import type {
  CambiariasMonedasResponse,
  CambiariasExchangeRateResponse,
} from './types/bcraCambiariasTypes.js';

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

  async getAvailableMonedas(): Promise<CambiariasMonedasResponse> {
    logger.info({
      event: events.GET_EXCHANGE_RATE,
      msg: 'Fetching available monedas from BCRA Cambiarias',
    });

    try {
      const response = await this.axiosInstance.get<CambiariasMonedasResponse>('/Maestros/Divisas');

      logger.info({
        event: events.GET_EXCHANGE_RATE,
        msg: 'Successfully fetched BCRA Cambiarias monedas',
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_EXCHANGE_RATE,
        msg: 'Failed to fetch BCRA Cambiarias monedas',
        err: error as Error,
      });
      throw new Error(
        `Failed to fetch monedas: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getExchangeRate(params: {
    monedaISO: string;
    fechaDesde: string;
    fechaHasta?: string | undefined;
  }): Promise<CambiariasExchangeRateResponse> {
    const { monedaISO, fechaDesde, fechaHasta } = params;

    logger.info({
      event: events.GET_EXCHANGE_RATE,
      msg: 'Fetching exchange rate from BCRA Cambiarias',
      data: { monedaISO, fechaDesde, fechaHasta },
    });

    try {
      let url = `/Cotizaciones/${monedaISO}?fechadesde=${fechaDesde}`;

      if (fechaHasta) url += `&fechahasta=${fechaHasta}`;

      const response = await this.axiosInstance.get<CambiariasExchangeRateResponse>(url);

      logger.info({
        event: events.GET_EXCHANGE_RATE,
        msg: 'Successfully fetched BCRA Cambiarias exchange rate',
        data: { monedaISO, url },
      });

      return response.data;
    } catch (error) {
      logger.error({
        event: events.GET_EXCHANGE_RATE,
        msg: 'Failed to fetch BCRA Cambiarias exchange rate',
        err: error as Error,
        data: { monedaISO },
      });
      throw new Error(
        `Failed to fetch exchange rate: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async healthCheck(): Promise<{
    isHealthy: boolean;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();

    logger.info({
      event: events.HEALTH_CHECK,
      msg: 'Checking BCRA Cambiarias API health',
    });

    try {
      await this.axiosInstance.get('/Cotizaciones/USD');
      const responseTime = Date.now() - startTime;

      logger.info({
        event: events.HEALTH_CHECK,
        msg: 'BCRA Cambiarias health check successful',
        data: { responseTime },
      });

      return { isHealthy: true, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        event: events.HEALTH_CHECK,
        msg: 'BCRA Cambiarias health check failed',
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

export const defaultBcraCambiariasClient = new BcraCambiariasClient();
