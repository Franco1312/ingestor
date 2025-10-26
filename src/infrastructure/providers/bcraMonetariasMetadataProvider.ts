import type { SeriesMetadataProvider } from '@/domain/providers/seriesMetadataProvider.js';
import type { SeriesMapping, SeriesMetadataResult } from '@/domain/types/seriesMetadata.js';
import { BcraClient, defaultBcraClient } from '@/infrastructure/http/clients/bcraClient.js';
import type { BcraVariable } from '@/infrastructure/http/clients/types/bcraTypes.js';

export class BcraMonetariasMetadataProvider implements SeriesMetadataProvider {
  private readonly bcraClient: BcraClient;

  constructor(bcraClient: BcraClient = defaultBcraClient) {
    this.bcraClient = bcraClient;
  }

  getProviderName(): string {
    return 'BCRA_MONETARIAS';
  }

  async fetchAvailableSeries(): Promise<unknown[]> {
    return await this.bcraClient.getAvailableSeries();
  }

  buildMetadata(mapping: SeriesMapping, externalData: unknown): SeriesMetadataResult {
    const variable = externalData as BcraVariable;
    const frequency = this.determineFrequency(variable.categoria);
    const unit = this.determineUnit(variable.descripcion);

    return {
      frequency,
      unit,
      metadata: {
        bcra_idVariable: variable.idVariable,
        bcra_description: variable.descripcion,
        bcra_categoria: variable.categoria,
        description: mapping.description,
        last_populated: new Date().toISOString(),
      },
    };
  }

  findSeriesByExternalId(externalId: string, availableSeries: unknown[]): unknown | null {
    const series = availableSeries as BcraVariable[];
    return series.find(v => v.idVariable.toString() === externalId) || null;
  }

  private determineFrequency(categoria: string): SeriesMetadataResult['frequency'] {
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

export const defaultBcraMonetariasMetadataProvider = new BcraMonetariasMetadataProvider();
