import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import type { ProviderChain } from '@/domain/providers.js';
import { DateService } from '@/domain/utils/dateService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { FETCH_AND_STORE_SERIES_USE_CASE as events } from '@/infrastructure/log/log-events.js';
import { seriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { defaultProviderChain } from '@/infrastructure/providers/providerChain.js';

export interface FetchAndStoreResult {
  success: boolean;
  seriesId: string;
  pointsFetched: number;
  pointsStored: number;
  error?: string;
}

const defaultSeriesRepository = seriesRepository;

export class FetchAndStoreSeriesUseCase {
  private readonly OFFICIAL_FX_SERIES = ['bcra.usd_official_ars', '168.1_T_CAMBIOR_D_0_0_26'];

  constructor(
    private readonly seriesRepository: ISeriesRepository = defaultSeriesRepository,
    private readonly providerChain: ProviderChain = defaultProviderChain
  ) {}

  async executeMultiple(seriesIds: string[]): Promise<FetchAndStoreResult[]> {
    logger.info({
      event: events.EXECUTE_MULTIPLE,
      msg: 'Starting fetch and store for multiple series',
    });

    const results = await Promise.all(
      seriesIds.map(seriesId => this.processSeriesWithErrorHandling(seriesId))
    );

    return results;
  }

  async execute(seriesId: string): Promise<FetchAndStoreResult> {
    logger.info({
      event: events.EXECUTE,
      msg: 'Starting fetch and store operation',
    });

    try {
      const lastDate = await this.getLastAvailableDate(seriesId);
      const fromDate = this.calculateFromDate(lastDate);
      const points = await this.fetchAndEnrichPoints(seriesId, fromDate);
      const storedCount = await this.storePoints(points);

      logger.info({
        event: events.EXECUTE,
        msg: 'Fetch and store completed successfully',
      });

      return this.createSuccessResult(seriesId, points.length, storedCount);
    } catch (error) {
      return this.createErrorResult(seriesId, error);
    }
  }

  private async getLastAvailableDate(seriesId: string): Promise<string | null> {
    return this.seriesRepository.getLastDate(seriesId);
  }

  private calculateFromDate(lastDate: string | null): string {
    if (!lastDate) {
      return DateService.getYesterday();
    }

    const nextDate = DateService.addDays(new Date(lastDate), 1);
    const result = DateService.formatDate(nextDate);

    if (!result) {
      throw new Error('Invalid date format');
    }

    return result;
  }

  private async fetchAndEnrichPoints(seriesId: string, fromDate: string): Promise<SeriesPoint[]> {
    const result = await this.providerChain.fetchRange({
      externalId: seriesId,
      from: fromDate,
      to: undefined,
    });

    return this.enrichPointsWithMetadata(result.points, result.provider);
  }

  private enrichPointsWithMetadata(points: SeriesPoint[], provider: string): SeriesPoint[] {
    return points.map(point => ({
      ...point,
      metadata: {
        oficial_fx_source: this.getOficialFxSource(provider),
        provider_primary: this.getProviderPrimary(provider),
        endpoint: this.getEndpoint(provider),
        fetched_at: new Date().toISOString(),
      },
    }));
  }

  private getOficialFxSource(provider: string): string {
    return provider === 'BCRA_OFICIAL' ? 'bcra' : 'unknown';
  }

  private getProviderPrimary(provider: string): string {
    const mapping: Record<string, string> = {
      BCRA_OFICIAL: 'bcra_cambiarias',
      DATOS_SERIES: 'datos_series',
      DOLARAPI: 'dolarapi',
    };
    return mapping[provider] || 'unknown';
  }

  private getEndpoint(provider: string): string {
    const mapping: Record<string, string> = {
      BCRA_OFICIAL: '/Cotizaciones/USD',
      DATOS_SERIES: '/series?ids=168.1_T_CAMBIOR_D_0_0_26',
      DOLARAPI: '/dolares/oficial',
    };
    return mapping[provider] || 'unknown';
  }

  private async storePoints(points: SeriesPoint[]): Promise<number> {
    return points.length === 0 ? 0 : this.seriesRepository.upsertPoints(points);
  }

  private createSuccessResult(
    seriesId: string,
    pointsFetched: number,
    pointsStored: number
  ): FetchAndStoreResult {
    return {
      success: true,
      seriesId,
      pointsFetched,
      pointsStored,
    };
  }

  private createErrorResult(seriesId: string, error: unknown): FetchAndStoreResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error({
      event: events.EXECUTE,
      msg: 'Fetch and store failed',
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

  private async processSeriesWithErrorHandling(seriesId: string): Promise<FetchAndStoreResult> {
    try {
      return await this.execute(seriesId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error({
        event: events.EXECUTE_MULTIPLE,
        msg: 'Failed to process series',
        err: errorMessage,
        data: { seriesId },
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
}

export const defaultFetchAndStoreSeriesUseCase = new FetchAndStoreSeriesUseCase();
