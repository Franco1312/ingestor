import type { SeriesProvider, FetchRangeParams, FetchRangeResult } from '@/domain/providers.js';
import { BcraCambiariasClient } from '@/infrastructure/http/clients/bcraCambiariasClient.js';
import { DatosArgentinaClient } from '@/infrastructure/http/clients/datosArgentinaClient.js';
import { DolarApiClient } from '@/infrastructure/http/clients/dolarApiClient.js';
import { DateService } from '@/domain/utils/dateService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_MONETARIAS_PROVIDER as events } from '@/infrastructure/log/log-events.js';

export class BcraOficialProvider implements SeriesProvider {
  readonly name = 'BCRA_OFICIAL';
  private readonly bcraCambiariasClient: BcraCambiariasClient;
  private readonly datosArgentinaClient: DatosArgentinaClient;
  private readonly dolarApiClient: DolarApiClient;

  constructor() {
    this.bcraCambiariasClient = new BcraCambiariasClient();
    this.datosArgentinaClient = new DatosArgentinaClient();
    this.dolarApiClient = new DolarApiClient();
  }

  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId, from, to = DateService.getToday() } = params;

    logger.info({
      event: events.FETCH_RANGE,
      msg: 'Starting official USD fetch with fallback chain',
      data: { externalId, from, to },
    });

    // Try BCRA Cambiarias first (primary)
    try {
      const bcraData = await this.bcraCambiariasClient.getUsdRange({ from, to });

      if (bcraData.length > 0) {
        const points = bcraData.map(item => ({
          seriesId: externalId,
          ts: DateService.formatDate(item.ts),
          value: item.value,
        }));

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Successfully fetched official USD from BCRA Cambiarias',
          data: { externalId, pointsCount: points.length },
        });

        return {
          points,
          totalCount: points.length,
          hasMore: false,
          provider: this.name,
        };
      }
    } catch (error) {
      logger.info({
        event: events.FETCH_RANGE,
        msg: 'BCRA Cambiarias failed, trying fallback',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }

    // Try Datos Argentina (fallback #1)
    try {
      const datosData = await this.datosArgentinaClient.getSeriesRange({
        id: '168.1_T_CAMBIOR_D_0_0_26',
        from,
        to,
      });

      if (datosData.length > 0) {
        const points = datosData.map(item => ({
          seriesId: externalId,
          ts: DateService.formatDate(item.ts),
          value: item.value,
        }));

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Successfully fetched official USD from Datos Argentina',
          data: { externalId, pointsCount: points.length },
        });

        return {
          points,
          totalCount: points.length,
          hasMore: false,
          provider: this.name,
        };
      }
    } catch (error) {
      logger.info({
        event: events.FETCH_RANGE,
        msg: 'Datos Argentina failed, trying DolarApi for today only',
        data: { error: error instanceof Error ? error.message : String(error) },
      });
    }

    // Try DolarApi only for today (fallback #2)
    const today = DateService.getToday();
    if (to === today) {
      try {
        const dolarApiData = await this.dolarApiClient.getOfficialSpot();

        const points = [
          {
            seriesId: externalId,
            ts: DateService.formatDate(dolarApiData.ts),
            value: dolarApiData.value,
          },
        ];

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Successfully fetched official USD from DolarApi (today only)',
          data: { externalId, pointsCount: points.length },
        });

        return {
          points,
          totalCount: points.length,
          hasMore: false,
          provider: this.name,
        };
      } catch (error) {
        logger.info({
          event: events.FETCH_RANGE,
          msg: 'DolarApi failed for today',
          data: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    }

    logger.error({
      event: events.FETCH_RANGE,
      msg: 'All official USD providers failed',
      data: { externalId, from, to },
    });

    throw new Error('All official USD providers failed');
  }

  async health(): Promise<{ isHealthy: boolean; responseTime?: number; error?: string }> {
    const startTime = Date.now();

    try {
      // Check BCRA Cambiarias first
      const bcraHealth = await this.bcraCambiariasClient.healthCheck();
      if (bcraHealth.isHealthy) {
        return { isHealthy: true, responseTime: Date.now() - startTime };
      }

      // Check Datos Argentina
      const datosHealth = await this.datosArgentinaClient.healthCheck();
      if (datosHealth.isHealthy) {
        return { isHealthy: true, responseTime: Date.now() - startTime };
      }

      // Check DolarApi
      const dolarApiHealth = await this.dolarApiClient.healthCheck();
      if (dolarApiHealth.isHealthy) {
        return { isHealthy: true, responseTime: Date.now() - startTime };
      }

      return { isHealthy: false, error: 'All providers unhealthy' };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
