import type { SeriesMetadata } from '@/domain/entities/seriesMetadata.js';

export interface SeriesMapping {
  internal_series_id: string;
  external_series_id: string;
  provider_name: string;
  keywords?: string[];
  description: string;
}

export interface SeriesMetadataResult {
  frequency: SeriesMetadata['frequency'];
  unit: string;
  metadata: Record<string, unknown>;
}

export interface SeriesVariable {
  idVariable: number;
  descripcion: string;
  categoria: string;
  fecha: string;
  valor: number;
}
