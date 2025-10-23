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

// Mapping criteria for series discovery
const SERIES_MAPPING = [
  {
    keywords: ['reservas internacionales', 'reservas', 'international reserves'],
    seriesId: '1', // Our series ID for reserves
    description: 'Reservas Internacionales del BCRA (en millones de dólares)',
  },
  {
    keywords: ['base monetaria', 'monetary base', 'base monetaria - total'],
    seriesId: '15', // Our series ID for monetary base
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
  private readonly seriesRepository: ISeriesRepository;
  private readonly bcraClient: BcraClient;

  constructor(seriesRepository: ISeriesRepository) {
    this.seriesRepository = seriesRepository;
    this.bcraClient = new BcraClient();
  }

  async execute(): Promise<DiscoveryResult> {
    logger.info({
      event: events.EXECUTE,
      msg: 'Starting BCRA Monetarias discovery',
    });

    try {
      // Fetch all available variables from BCRA
      const bcraVariables = await this.bcraClient.getAvailableSeries();
      logger.info({
        event: events.EXECUTE,
        msg: 'BCRA variables fetched',
        data: { count: bcraVariables.length },
      });

      const mappedSeries = [];
      const unmappedSeries = [];

      // Process each mapping criteria
      for (const mapping of SERIES_MAPPING) {
        logger.info({
          event: events.EXECUTE,
          msg: 'Processing mapping criteria',
          data: {
            seriesId: mapping.seriesId,
            keywords: mapping.keywords,
          },
        });

        // Find matching BCRA variable
        const matchingVariable = this.findMatchingVariable(bcraVariables, mapping.keywords);

        if (matchingVariable) {
          logger.info({
            event: events.FIND_MATCHING_VARIABLE,
            msg: 'Found matching BCRA variable',
            data: {
              seriesId: mapping.seriesId,
              bcraIdVariable: matchingVariable.idVariable,
              description: matchingVariable.descripcion,
            },
          });

          // Update series metadata with bcra_idVariable
          await this.updateSeriesMetadata(
            mapping.seriesId,
            matchingVariable.idVariable,
            mapping.description
          );

          mappedSeries.push({
            seriesId: mapping.seriesId,
            bcraIdVariable: matchingVariable.idVariable,
            description: mapping.description,
          });

          logger.info({
            event: events.UPDATE_SERIES_METADATA,
            msg: 'Successfully mapped series',
            data: {
              seriesId: mapping.seriesId,
              bcraIdVariable: matchingVariable.idVariable,
            },
          });
        } else {
          logger.info({
            event: events.FIND_MATCHING_VARIABLE,
            msg: 'No matching BCRA variable found',
            data: {
              seriesId: mapping.seriesId,
              keywords: mapping.keywords,
            },
          });

          unmappedSeries.push({
            seriesId: mapping.seriesId,
            source: 'bcra',
            reason: 'No BCRA mapping found',
          });
        }
      }

      // Check for series without BCRA mapping
      const additionalUnmapped = await this.checkUnmappedSeries();
      unmappedSeries.push(...additionalUnmapped);

      logger.info({
        event: events.EXECUTE,
        msg: 'BCRA Monetarias discovery completed successfully',
      });

      return {
        mappedSeries,
        unmappedSeries,
      };
    } catch (error) {
      logger.error({
        event: events.EXECUTE,
        msg: 'Discovery failed',
        err: error as Error,
      });
      throw error;
    }
  }

  private findMatchingVariable(variables: unknown[], keywords: string[]): BcraVariable | null {
    for (const variable of variables) {
      const varData = variable as BcraVariable;
      const description = varData.descripcion.toLowerCase();

      for (const keyword of keywords) {
        if (description.includes(keyword.toLowerCase())) {
          return varData;
        }
      }
    }
    return null;
  }

  private async updateSeriesMetadata(
    seriesId: string,
    bcraIdVariable: number,
    description: string
  ): Promise<void> {
    try {
      // Get current series metadata
      const seriesMetadata = await this.seriesRepository.getSeriesMetadata(seriesId);

      if (!seriesMetadata) {
        logger.info({
          event: events.UPDATE_SERIES_METADATA,
          msg: 'Series not found in catalog',
          data: { seriesId },
        });
        return;
      }

      // Update metadata with BCRA information
      const updatedMetadata = {
        ...seriesMetadata.metadata,
        bcra_idVariable: bcraIdVariable,
        bcra_description: description,
        last_discovered: new Date().toISOString(),
      };

      // Update series in database using repository
      await this.seriesRepository.updateSeriesMetadata(seriesId, updatedMetadata);

      logger.info({
        event: events.UPDATE_SERIES_METADATA,
        msg: 'Series metadata updated',
        data: {
          seriesId,
          bcraIdVariable,
          description,
        },
      });
    } catch (error) {
      logger.error({
        event: events.UPDATE_SERIES_METADATA,
        msg: 'Failed to update series metadata',
        err: error as Error,
        data: {
          seriesId,
          bcraIdVariable,
        },
      });
      throw error;
    }
  }

  private async checkUnmappedSeries(): Promise<
    Array<{ seriesId: string; source: string; reason: string }>
  > {
    try {
      // Get all series from catalog using repository
      const allSeries = await this.seriesRepository.getAllSeries();

      const unmappedSeries = [];

      for (const series of allSeries) {
        const metadata = series.metadata || {};

        if (!metadata.bcra_idVariable) {
          const reason =
            series.source === 'indec'
              ? 'INDEC series not available in BCRA Monetarias'
              : 'No BCRA mapping found';

          unmappedSeries.push({
            seriesId: series.id,
            source: series.source,
            reason,
          });

          if (reason.includes('INDEC')) {
            logger.info({
              event: events.CHECK_UNMAPPED_SERIES,
              msg: 'Skipping INDEC series - not available in BCRA Monetarias',
              data: {
                seriesId: series.id,
                source: series.source,
              },
            });
          } else {
            logger.info({
              event: events.CHECK_UNMAPPED_SERIES,
              msg: 'Series without BCRA mapping',
              data: {
                seriesId: series.id,
                source: series.source,
              },
            });
          }
        }
      }

      if (unmappedSeries.length > 0) {
        logger.info({
          event: events.CHECK_UNMAPPED_SERIES,
          msg: 'Series without BCRA mapping',
          data: {
            count: unmappedSeries.length,
            unmapped: unmappedSeries,
          },
        });
      } else {
        logger.info({
          event: events.CHECK_UNMAPPED_SERIES,
          msg: 'All catalog series have BCRA mappings',
        });
      }

      return unmappedSeries;
    } catch (error) {
      logger.error({
        event: events.CHECK_UNMAPPED_SERIES,
        msg: 'Failed to check unmapped series',
        err: error as Error,
      });
      throw error;
    }
  }
}
