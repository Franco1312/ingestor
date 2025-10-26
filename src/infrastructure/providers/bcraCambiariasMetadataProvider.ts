import type { SeriesMetadataProvider } from '@/domain/providers/seriesMetadataProvider.js';
import type { SeriesMapping, SeriesMetadataResult } from '@/domain/types/seriesMetadata.js';
import {
  BcraCambiariasClient,
  defaultBcraCambiariasClient,
} from '@/infrastructure/http/clients/bcraCambiariasClient.js';
import type { CambiariasMoneda } from '@/infrastructure/http/clients/types/bcraCambiariasTypes.js';

export class BcraCambiariasMetadataProvider implements SeriesMetadataProvider {
  private readonly bcraCambiariasClient: BcraCambiariasClient;

  constructor(bcraCambiariasClient: BcraCambiariasClient = defaultBcraCambiariasClient) {
    this.bcraCambiariasClient = bcraCambiariasClient;
  }

  getProviderName(): string {
    return 'BCRA_CAMBIARIAS';
  }

  async fetchAvailableSeries(): Promise<unknown[]> {
    const response = await this.bcraCambiariasClient.getAvailableMonedas();

    // The API returns { status: 200, results: [...] }
    if (response && Array.isArray(response.results)) {
      return response.results;
    }

    return [];
  }

  buildMetadata(mapping: SeriesMapping, externalData: unknown): SeriesMetadataResult {
    const moneda = externalData as CambiariasMoneda;

    return {
      frequency: 'daily',
      unit: 'ARS',
      metadata: {
        bcra_codigo: moneda.codigo,
        bcra_denominacion: moneda.denominacion,
        description: mapping.description,
        last_populated: new Date().toISOString(),
      },
    };
  }

  findSeriesByExternalId(externalId: string, availableSeries: unknown[]): unknown | null {
    const monedas = availableSeries as CambiariasMoneda[];
    return monedas.find(m => m.codigo === externalId) || null;
  }
}

export const defaultBcraCambiariasMetadataProvider = new BcraCambiariasMetadataProvider();
