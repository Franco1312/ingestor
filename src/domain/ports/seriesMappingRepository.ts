export interface SeriesMapping {
  id: number;
  internalSeriesId: string;
  externalSeriesId: string;
  providerName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISeriesMappingRepository {
  getInternalSeriesId(externalSeriesId: string, providerName: string): Promise<string | null>;
  getExternalSeriesId(internalSeriesId: string, providerName: string): Promise<string | null>;
  createMapping(
    internalSeriesId: string,
    externalSeriesId: string,
    providerName: string
  ): Promise<void>;
  getAllMappingsForProvider(providerName: string): Promise<SeriesMapping[]>;
}
