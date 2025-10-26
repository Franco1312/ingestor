import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint } from '@/domain/entities/index.js';
import type { SeriesMappingService } from '@/domain/services/seriesMappingService.js';
import {
  BcraCambiariasClient,
  defaultBcraCambiariasClient,
} from '@/infrastructure/http/clients/bcraCambiariasClient.js';
import { defaultSeriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { defaultSeriesMappingService } from '@/domain/services/seriesMappingService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { BACKFILL_SERIES_USE_CASE as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

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

export class BackfillBcraCambiariasUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository = defaultSeriesRepository,
    private readonly mappingService: SeriesMappingService = defaultSeriesMappingService,
    private readonly bcraCambiariasClient: BcraCambiariasClient = defaultBcraCambiariasClient
  ) {}

  async execute(params: BackfillParams): Promise<BackfillResult> {
    const { seriesId, fromDate, toDate } = params;

    logger.info({
      event: events.EXECUTE,
      msg: 'Starting BCRA Cambiarias backfill operation',
    });

    try {
      const points = await this.fetchHistoricalData(seriesId, fromDate, toDate);
      const storedCount = await this.storeData(points, seriesId);

      logger.info({
        event: events.EXECUTE,
        msg: 'BCRA Cambiarias backfill completed successfully',
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
        msg: 'BCRA Cambiarias backfill failed',
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
    const mappings = await this.mappingService.getMappingsByProvider('BCRA_CAMBIARIAS');
    const mapping = mappings.find(m => m.internal_series_id === seriesId);
    const externalId = mapping?.external_series_id || seriesId;

    const response = await this.bcraCambiariasClient.getExchangeRate({
      monedaISO: externalId,
      fechaDesde: fromDate,
      fechaHasta: toDate,
    });

    return this.normalizeBcraCambiariasResponse(response, seriesId);
  }

  private normalizeBcraCambiariasResponse(response: unknown, seriesId: string): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const data = response as { results?: unknown[] };

    if (!data.results) {
      return points;
    }

    for (const item of data.results) {
      const row = item as {
        fecha?: string;
        detalle?: Array<{ codigoMoneda?: string; tipoCotizacion?: number }>;
      };

      if (!row.detalle || row.detalle.length === 0) {
        continue;
      }

      const cotizacion = row.detalle[0];
      if (!cotizacion) {
        continue;
      }

      const date = this.parseDate(row.fecha);
      const value = cotizacion.tipoCotizacion;

      if (date && value !== null && value !== undefined) {
        points.push({ seriesId, ts: date, value });
      }
    }

    return points;
  }

  private parseDate(dateString: string | undefined): string | null {
    if (!dateString) return null;
    return DateService.formatDate(new Date(dateString));
  }

  private async storeData(points: SeriesPoint[], originalSeriesId: string): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    const mappings = await this.mappingService.getMappingsByProvider('BCRA_CAMBIARIAS');
    const mapping = mappings.find(
      m => m.external_series_id === originalSeriesId || m.internal_series_id === originalSeriesId
    );
    const internalId = mapping?.internal_series_id || originalSeriesId;

    const resolvedPoints = points.map(point => ({
      ...point,
      seriesId: internalId,
    }));

    return await this.seriesRepository.upsertPoints(resolvedPoints);
  }
}

export const defaultBackfillBcraCambiariasUseCase = new BackfillBcraCambiariasUseCase();
