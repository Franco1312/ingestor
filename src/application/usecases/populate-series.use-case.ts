import type { ISeriesRepository, ISeriesMappingRepository } from '@/domain/ports/index.js';
import type { SeriesMetadataProvider } from '@/domain/providers/seriesMetadataProvider.js';
import type { SeriesMetadata } from '@/domain/entities/index.js';
import { defaultSeriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { defaultSeriesMappingRepository } from '@/infrastructure/db/seriesMappingRepo.js';
import { logger } from '@/infrastructure/log/logger.js';

export interface PopulateSeriesResult {
  success: boolean;
  seriesPopulated: number;
  seriesSkipped: number;
  errors: SeriesPopulationError[];
}

export interface SeriesPopulationError {
  seriesId: string;
  error: string;
}

export interface SeriesMappingInput {
  internal_series_id: string;
  external_series_id: string;
  description: string;
  provider_name?: string;
}

export interface SeriesMetadataInput {
  frequency: SeriesMetadata['frequency'];
  unit: string;
  metadata: Record<string, unknown>;
}

export class PopulateSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository = defaultSeriesRepository,
    private readonly seriesMappingRepository: ISeriesMappingRepository = defaultSeriesMappingRepository,
    private readonly provider: SeriesMetadataProvider
  ) {}

  async execute(): Promise<PopulateSeriesResult> {
    const providerName = this.provider.getProviderName();
    logger.info({
      event: 'POPULATE_SERIES_EXECUTE',
      msg: 'Starting series population',
      data: { provider: providerName },
    });

    const mappings = await this.fetchMappings(providerName);
    const availableSeries = await this.provider.fetchAvailableSeries();

    const result = this.initializeResult();

    for (const mapping of mappings) {
      try {
        await this.processMapping(mapping, availableSeries, result);
      } catch (error) {
        this.handleMappingError(mapping, error, result);
      }
    }

    this.logCompletion(result, providerName);
    return result;
  }

  private async fetchMappings(providerName: string) {
    return await this.seriesMappingRepository.getMappingsByProvider(providerName);
  }

  private initializeResult(): PopulateSeriesResult {
    return {
      success: true,
      seriesPopulated: 0,
      seriesSkipped: 0,
      errors: [],
    };
  }

  private async processMapping(
    mapping: SeriesMappingInput,
    availableSeries: unknown[],
    result: PopulateSeriesResult
  ): Promise<void> {
    const seriesVariable = this.provider.findSeriesByExternalId(
      mapping.external_series_id,
      availableSeries
    );

    if (!seriesVariable) {
      result.seriesSkipped++;
      return;
    }

    await this.saveSeries(mapping, seriesVariable);
    result.seriesPopulated++;
  }

  private async saveSeries(mapping: SeriesMappingInput, seriesVariable: unknown): Promise<void> {
    const fullMapping = { ...mapping, provider_name: mapping.provider_name || 'UNKNOWN' };
    const metadata = this.provider.buildMetadata(fullMapping, seriesVariable);
    const existingSeries = await this.seriesRepository.getSeriesMetadata(
      mapping.internal_series_id
    );

    if (!existingSeries) {
      await this.createSeries(mapping, metadata);
    } else {
      await this.updateSeries(mapping, metadata);
    }
  }

  private async createSeries(
    mapping: SeriesMappingInput,
    metadata: SeriesMetadataInput
  ): Promise<void> {
    await this.seriesRepository.upsertSeriesMetadata({
      id: mapping.internal_series_id,
      source: 'bcra',
      frequency: metadata.frequency,
      unit: metadata.unit,
      metadata: metadata.metadata,
    });
  }

  private async updateSeries(
    mapping: SeriesMappingInput,
    metadata: SeriesMetadataInput
  ): Promise<void> {
    await this.seriesRepository.updateSeriesMetadata(mapping.internal_series_id, metadata.metadata);
  }

  private handleMappingError(
    mapping: SeriesMappingInput,
    error: unknown,
    result: PopulateSeriesResult
  ): void {
    result.errors.push({
      seriesId: mapping.internal_series_id,
      error: error instanceof Error ? error.message : String(error),
    });
    result.success = false;
  }

  private logCompletion(result: PopulateSeriesResult, providerName: string): void {
    logger.info({
      event: 'POPULATE_SERIES_COMPLETED',
      msg: 'Series population completed',
      data: {
        provider: providerName,
        populated: result.seriesPopulated,
        skipped: result.seriesSkipped,
        errors: result.errors.length,
      },
    });
  }
}
