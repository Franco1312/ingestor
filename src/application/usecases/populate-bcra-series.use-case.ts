import type { ISeriesRepository, ISeriesMappingRepository } from '@/domain/ports/index.js';
import type { SeriesMetadata } from '@/domain/entities/index.js';
import type { BcraClient } from '@/infrastructure/http/clients/bcraClient.js';
import { defaultSeriesRepository } from '@/infrastructure/db/seriesRepo.js';
import { defaultSeriesMappingRepository } from '@/infrastructure/db/seriesMappingRepo.js';
import { defaultBcraClient } from '@/infrastructure/http/clients/bcraClient.js';
import { logger } from '@/infrastructure/log/logger.js';

export interface PopulateBcraSeriesResult {
  success: boolean;
  seriesPopulated: number;
  seriesSkipped: number;
  errors: Array<{ seriesId: string; error: string }>;
}

interface BcraVariable {
  idVariable: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  valor: number;
}

export class PopulateBcraSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository = defaultSeriesRepository,
    private readonly seriesMappingRepository: ISeriesMappingRepository = defaultSeriesMappingRepository,
    private readonly bcraClient: BcraClient = defaultBcraClient
  ) {}

  async execute(): Promise<PopulateBcraSeriesResult> {
    logger.info({ event: 'POPULATE_BCRA_SERIES_EXECUTE', msg: 'Starting BCRA series population' });

    const mappings = await this.fetchMappings();
    const bcraVariables = await this.fetchBcraVariables();

    const result = this.initializeResult();

    for (const mapping of mappings) {
      try {
        await this.processMapping(mapping, bcraVariables, result);
      } catch (error) {
        this.handleMappingError(mapping, error, result);
      }
    }

    this.logCompletion(result);
    return result;
  }

  private async fetchMappings() {
    return await this.seriesMappingRepository.getMappingsByProvider('BCRA_MONETARIAS');
  }

  private async fetchBcraVariables(): Promise<BcraVariable[]> {
    return (await this.bcraClient.getAvailableSeries()) as BcraVariable[];
  }

  private initializeResult(): PopulateBcraSeriesResult {
    return {
      success: true,
      seriesPopulated: 0,
      seriesSkipped: 0,
      errors: [],
    };
  }

  private async processMapping(
    mapping: { internal_series_id: string; external_series_id: string; description: string },
    bcraVariables: BcraVariable[],
    result: PopulateBcraSeriesResult
  ): Promise<void> {
    const bcraVariable = this.findBcraVariable(mapping, bcraVariables);

    if (!bcraVariable) {
      result.seriesSkipped++;
      return;
    }

    await this.saveSeries(mapping, bcraVariable);
    result.seriesPopulated++;
  }

  private findBcraVariable(
    mapping: { external_series_id: string },
    bcraVariables: BcraVariable[]
  ): BcraVariable | null {
    return bcraVariables.find(v => v.idVariable.toString() === mapping.external_series_id) || null;
  }

  private async saveSeries(
    mapping: { internal_series_id: string; external_series_id: string; description: string },
    bcraVariable: BcraVariable
  ): Promise<void> {
    const metadata = this.buildSeriesMetadata(mapping, bcraVariable);
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
    mapping: { internal_series_id: string },
    metadata: {
      frequency: SeriesMetadata['frequency'];
      unit: string;
      metadata: Record<string, unknown>;
    }
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
    mapping: { internal_series_id: string },
    metadata: { metadata: Record<string, unknown> }
  ): Promise<void> {
    await this.seriesRepository.updateSeriesMetadata(mapping.internal_series_id, metadata.metadata);
  }

  private handleMappingError(
    mapping: { internal_series_id: string },
    error: unknown,
    result: PopulateBcraSeriesResult
  ): void {
    result.errors.push({
      seriesId: mapping.internal_series_id,
      error: error instanceof Error ? error.message : String(error),
    });
    result.success = false;
  }

  private logCompletion(result: PopulateBcraSeriesResult): void {
    logger.info({
      event: 'POPULATE_BCRA_SERIES_COMPLETED',
      msg: 'BCRA series population completed',
      data: {
        populated: result.seriesPopulated,
        skipped: result.seriesSkipped,
        errors: result.errors.length,
      },
    });
  }

  private buildSeriesMetadata(
    mapping: {
      internal_series_id: string;
      external_series_id: string;
      description: string;
    },
    bcraVariable: BcraVariable
  ): {
    frequency: SeriesMetadata['frequency'];
    unit: string;
    metadata: Record<string, unknown>;
  } {
    const frequency = this.determineFrequency(bcraVariable.categoria);
    const unit = this.determineUnit(bcraVariable.descripcion);

    return {
      frequency,
      unit,
      metadata: {
        bcra_idVariable: bcraVariable.idVariable,
        bcra_description: bcraVariable.descripcion,
        bcra_categoria: bcraVariable.categoria,
        description: mapping.description,
        last_populated: new Date().toISOString(),
      },
    };
  }

  private determineFrequency(categoria: string): SeriesMetadata['frequency'] {
    const catLower = categoria.toLowerCase();

    if (catLower.includes('diario') || catLower.includes('diaria')) return 'daily';
    if (catLower.includes('mensual')) return 'monthly';
    if (catLower.includes('semanal')) return 'weekly';
    if (catLower.includes('trimestral')) return 'quarterly';
    if (catLower.includes('anual')) return 'yearly';

    return 'daily';
  }

  private determineUnit(descripcion: string): string {
    const descLower = descripcion.toLowerCase();

    if (descLower.includes('dólar') || descLower.includes('dolar') || descLower.includes('usd')) {
      return 'USD';
    }
    if (descLower.includes('peso') || descLower.includes('ars')) {
      return 'ARS';
    }
    if (descLower.includes('porcentaje') || descLower.includes('%') || descLower.includes('tasa')) {
      return 'percent';
    }
    if (descLower.includes('indice') || descLower.includes('index')) {
      return 'index';
    }

    return 'ARS';
  }
}

export const defaultPopulateBcraSeriesUseCase = new PopulateBcraSeriesUseCase();
