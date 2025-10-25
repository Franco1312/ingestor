import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import type { ProviderChain } from '@/domain/providers.js';
import type { SeriesMappingService } from '@/domain/services/seriesMappingService.js';
import { SeriesIdResolver } from '@/infrastructure/providers/seriesIdResolver.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BACKFILL_SERIES_USE_CASE as events } from '@/infrastructure/log/log-events.js';

export interface BackfillResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

export interface BackfillParams {
  seriesId: string;
  fromDate: string;
  toDate?: string;
}

export class BackfillSeriesUseCase {
  private readonly idResolver: SeriesIdResolver;

  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly providerChain: ProviderChain,
    private readonly mappingService: SeriesMappingService
  ) {
    this.idResolver = new SeriesIdResolver(mappingService);
  }

  async execute(params: BackfillParams): Promise<BackfillResult> {
    const { seriesId, fromDate, toDate } = params;

    logger.info({
      event: events.EXECUTE,
      msg: 'Starting backfill operation',
    });

    try {
      const points = await this.fetchHistoricalData(seriesId, fromDate, toDate);
      const storedCount = await this.storeData(points, seriesId);

      logger.info({
        event: events.EXECUTE,
        msg: 'Backfill completed successfully',
      });

      return {
        success: true,
        seriesId,
        pointsFetched: points.length,
        pointsStored: storedCount,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        event: events.EXECUTE,
        msg: 'Backfill failed',
        err: errorMessage,
      });

      return {
        success: false,
        seriesId,
        pointsFetched: 0,
        pointsStored: 0,
        error: errorMessage,
      };
    }
  }

  async getBackfillStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
  } | null> {
    return await this.seriesRepository.getSeriesStats(seriesId);
  }

  private async fetchHistoricalData(
    seriesId: string,
    fromDate: string,
    toDate?: string
  ): Promise<SeriesPoint[]> {
    const result = await this.providerChain.fetchRange({
      externalId: seriesId,
      from: fromDate,
      to: toDate,
    });

    // Add metadata for official USD series
    if (seriesId === 'bcra.usd_official_ars' || seriesId === '168.1_T_CAMBIOR_D_0_0_26') {
      return result.points.map(point => ({
        ...point,
        metadata: {
          oficial_fx_source: this.determineOficialFxSource(result.provider),
          provider_primary: this.determineProviderPrimary(result.provider),
          endpoint: this.determineEndpoint(result.provider),
          fetched_at: new Date().toISOString(),
        },
      }));
    }

    return result.points;
  }

  private determineOficialFxSource(provider: string): string {
    if (provider === 'BCRA_OFICIAL') {
      return 'bcra'; // BCRA Cambiarias is primary
    }
    return 'unknown';
  }

  private determineProviderPrimary(provider: string): string {
    switch (provider) {
      case 'BCRA_OFICIAL':
        return 'bcra_cambiarias';
      case 'DATOS_SERIES':
        return 'datos_series';
      case 'DOLARAPI':
        return 'dolarapi';
      default:
        return 'unknown';
    }
  }

  private determineEndpoint(provider: string): string {
    switch (provider) {
      case 'BCRA_OFICIAL':
        return '/Cotizaciones/USD';
      case 'DATOS_SERIES':
        return '/series?ids=168.1_T_CAMBIOR_D_0_0_26';
      case 'DOLARAPI':
        return '/dolares/oficial';
      default:
        return 'unknown';
    }
  }

  private async storeData(points: SeriesPoint[], originalSeriesId: string): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    const providerName = this.determineProviderName(originalSeriesId);
    const internalId = await this.idResolver.resolveToInternalId(originalSeriesId, providerName);

    const resolvedPoints = points.map(point => ({
      ...point,
      seriesId: internalId,
    }));

    return await this.seriesRepository.upsertPoints(resolvedPoints);
  }

  private determineProviderName(seriesId: string): string {
    if (seriesId.startsWith('dolarapi.')) return 'DOLARAPI';
    if (seriesId.startsWith('bcra.')) return 'BCRA_MONETARIAS';
    if (seriesId.startsWith('indec.')) return 'DATOS_SERIES';
    if (/^\d+$/.test(seriesId)) return 'BCRA_MONETARIAS';
    return 'BCRA_MONETARIAS';
  }
}
