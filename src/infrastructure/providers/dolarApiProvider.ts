import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
} from '@/domain/providers.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import {
  DolarApiClient,
  defaultDolarApiClient,
} from '@/infrastructure/http/clients/dolarApiClient.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BCRA_MONETARIAS_PROVIDER as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

export class DolarApiProvider implements SeriesProvider {
  readonly name = 'DOLARAPI';

  constructor(private readonly dolarApiClient: DolarApiClient = defaultDolarApiClient) {}

  async health(): Promise<ProviderHealth> {
    const startTime = DateService.now();

    try {
      const healthResult = await this.dolarApiClient.healthCheck();
      const result: ProviderHealth = {
        isHealthy: healthResult.isHealthy,
        responseTime: DateService.now() - startTime,
      };
      if (healthResult.error) {
        result.error = healthResult.error;
      }
      return result;
    } catch (error) {
      return {
        isHealthy: false,
        responseTime: DateService.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const { externalId } = params;

    try {
      const responseBody = await this.getDataByType(externalId);
      const points = this.normalizeResponse(responseBody, externalId);

      return {
        points,
        totalCount: points.length,
        hasMore: false,
        provider: this.name,
      };
    } catch (error) {
      logger.error({
        event: events.FETCH_RANGE,
        msg: 'DolarApi data fetch failed',
        err: error as Error,
      });
      throw error;
    }
  }

  async getAvailableSeries(): Promise<
    Array<{ id: string; title: string; description?: string; frequency?: string }>
  > {
    return [
      {
        id: 'mep',
        title: 'Dólar MEP',
        description: 'Dólar MEP (Mercado Electrónico de Pagos)',
        frequency: 'daily',
      },
      {
        id: 'ccl',
        title: 'Dólar CCL',
        description: 'Dólar Contado con Liquidación',
        frequency: 'daily',
      },
      {
        id: 'blue',
        title: 'Dólar Blue',
        description: 'Dólar Blue (mercado informal)',
        frequency: 'daily',
      },
    ];
  }

  private async getDataByType(externalId: string): Promise<unknown> {
    const type = this.extractTypeFromExternalId(externalId);
    if (type === 'mep') return this.dolarApiClient.getMEPData();
    if (type === 'ccl') return this.dolarApiClient.getCCLData();
    if (type === 'blue') return this.dolarApiClient.getBlueData();
    throw new Error(`Unknown external ID: ${externalId}`);
  }

  private extractTypeFromExternalId(externalId: string): string {
    if (externalId.startsWith('dolarapi.')) {
      return externalId.replace('dolarapi.', '').replace('_ars', '');
    }
    return externalId;
  }

  private normalizeResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];

    const responseData = response as Record<string, unknown>;
    if (responseData?.fechaActualizacion && responseData?.venta) {
      const fechaActualizacion = responseData.fechaActualizacion as string;
      const venta = responseData.venta as number;

      const date = DateService.formatDate(new Date(fechaActualizacion));
      if (date && !isNaN(venta)) {
        points.push({
          seriesId,
          ts: date,
          value: venta,
        });
      }
    }
    return points;
  }
}

export const defaultDolarApiProvider = new DolarApiProvider();
