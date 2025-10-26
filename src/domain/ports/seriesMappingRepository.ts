export interface SeriesMapping {
  id: number;
  internal_series_id: string;
  external_series_id: string;
  provider_name: string;
  keywords: string[];
  description: string;
}

export interface ISeriesMappingRepository {
  getAllMappings(): Promise<SeriesMapping[]>;
  getMappingsByProvider(provider: string): Promise<SeriesMapping[]>;
  insertMapping(mapping: Omit<SeriesMapping, 'id'>): Promise<void>;
}
