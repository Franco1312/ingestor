import type { ISeriesRepository } from '../../domain/ports/index.js';
import { logger } from '../../infrastructure/log/logger.js';
import { BcraClient } from '../../infrastructure/http/clients/bcraClient.js';
import { DISCOVER_SERIES_USE_CASE as events } from '../../infrastructure/log/log-events.js';

interface BcraVariable {
  idVariable: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  valor: number;
}

const SERIES_MAPPING = [
  {
    keywords: ['reservas internacionales', 'reservas', 'international reserves'],
    seriesId: '1',
    description: 'Reservas Internacionales del BCRA (en millones de dólares)',
  },
  {
    keywords: ['base monetaria', 'monetary base', 'base monetaria - total'],
    seriesId: '15',
    description: 'Base monetaria - Total (en millones de pesos)',
  },
];

export interface DiscoveryResult {
  mappedSeries: Array<{
    seriesId: string;
    bcraIdVariable: number;
    description: string;
  }>;
  unmappedSeries: Array<{
    seriesId: string;
    source: string;
    reason: string;
  }>;
}

export class DiscoverSeriesUseCase {
  constructor(
    private readonly seriesRepository: ISeriesRepository,
    private readonly bcraClient = new BcraClient()
  ) {}

  async execute(): Promise<DiscoveryResult> {
    logger.info({
      event: events.EXECUTE,
      msg: 'Starting discovery operation',
    });

    try {
      const bcraVariables = (await this.bcraClient.getAvailableSeries()) as BcraVariable[];
      const { mappedSeries, unmappedSeries } = await this.processMappings(bcraVariables);
      const additionalUnmapped = await this.checkUnmappedSeries();

      logger.info({
        event: events.EXECUTE,
        msg: 'Discovery completed successfully',
      });

      return {
        mappedSeries,
        unmappedSeries: [...unmappedSeries, ...additionalUnmapped],
      };
    } catch (error) {
      logger.error({
        event: events.EXECUTE,
        msg: 'Discovery failed',
        err: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private async processMappings(bcraVariables: BcraVariable[]): Promise<{
    mappedSeries: Array<{ seriesId: string; bcraIdVariable: number; description: string }>;
    unmappedSeries: Array<{ seriesId: string; source: string; reason: string }>;
  }> {
    const results = await Promise.all(
      SERIES_MAPPING.map(async mapping => {
        const matchingVariable = this.findMatchingVariable(bcraVariables, mapping.keywords);

        if (matchingVariable) {
          await this.updateSeriesMetadata(
            mapping.seriesId,
            matchingVariable.idVariable,
            mapping.description
          );

          return {
            mapped: {
              seriesId: mapping.seriesId,
              bcraIdVariable: matchingVariable.idVariable,
              description: mapping.description,
            },
            unmapped: null,
          };
        }

        return {
          mapped: null,
          unmapped: {
            seriesId: mapping.seriesId,
            source: 'bcra',
            reason: 'No BCRA mapping found',
          },
        };
      })
    );

    return {
      mappedSeries: results
        .map(r => r.mapped)
        .filter(
          (item): item is { seriesId: string; bcraIdVariable: number; description: string } =>
            item !== null
        ),
      unmappedSeries: results
        .map(r => r.unmapped)
        .filter(
          (item): item is { seriesId: string; source: string; reason: string } => item !== null
        ),
    };
  }

  private findMatchingVariable(variables: BcraVariable[], keywords: string[]): BcraVariable | null {
    return (
      variables.find(variable =>
        keywords.some(keyword => variable.descripcion.toLowerCase().includes(keyword.toLowerCase()))
      ) || null
    );
  }

  private async updateSeriesMetadata(
    seriesId: string,
    bcraIdVariable: number,
    description: string
  ): Promise<void> {
    const seriesMetadata = await this.seriesRepository.getSeriesMetadata(seriesId);
    if (!seriesMetadata) return;

    const updatedMetadata = {
      ...seriesMetadata.metadata,
      bcra_idVariable: bcraIdVariable,
      bcra_description: description,
      last_discovered: new Date().toISOString(),
    };

    await this.seriesRepository.updateSeriesMetadata(seriesId, updatedMetadata);
  }

  private async checkUnmappedSeries(): Promise<
    Array<{ seriesId: string; source: string; reason: string }>
  > {
    const allSeries = await this.seriesRepository.getAllSeries();

    return allSeries
      .filter(series => !series.metadata?.bcra_idVariable)
      .map(series => ({
        seriesId: series.id,
        source: series.source,
        reason:
          series.source === 'indec'
            ? 'INDEC series not available in BCRA Monetarias'
            : 'No BCRA mapping found',
      }));
  }
}
