import type { SeriesMapping, SeriesMetadataResult } from '@/domain/types/seriesMetadata.js';

export interface SeriesMetadataProvider {
  getProviderName(): string;

  fetchAvailableSeries(): Promise<unknown[]>;

  buildMetadata(mapping: SeriesMapping, externalData: unknown): SeriesMetadataResult;

  findSeriesByExternalId(externalId: string, availableSeries: unknown[]): unknown | null;
}
