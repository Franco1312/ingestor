import type { ISeriesMappingRepository } from '@/domain/ports/seriesMappingRepository.js';

export interface SeriesMappingService {
  getInternalSeriesId(externalSeriesId: string, providerName: string): Promise<string | null>;
  getExternalSeriesId(internalSeriesId: string, providerName: string): Promise<string | null>;
  createMapping(
    internalSeriesId: string,
    externalSeriesId: string,
    providerName: string
  ): Promise<void>;
  getAllMappingsForProvider(
    providerName: string
  ): Promise<import('../ports/seriesMappingRepository.js').SeriesMapping[]>;
}

export class SeriesMappingServiceImpl implements SeriesMappingService {
  constructor(private readonly mappingRepository: ISeriesMappingRepository) {}

  async getInternalSeriesId(
    externalSeriesId: string,
    providerName: string
  ): Promise<string | null> {
    return await this.mappingRepository.getInternalSeriesId(externalSeriesId, providerName);
  }

  async getExternalSeriesId(
    internalSeriesId: string,
    providerName: string
  ): Promise<string | null> {
    return await this.mappingRepository.getExternalSeriesId(internalSeriesId, providerName);
  }

  async createMapping(
    internalSeriesId: string,
    externalSeriesId: string,
    providerName: string
  ): Promise<void> {
    return await this.mappingRepository.createMapping(
      internalSeriesId,
      externalSeriesId,
      providerName
    );
  }

  async getAllMappingsForProvider(
    providerName: string
  ): Promise<import('../ports/seriesMappingRepository.js').SeriesMapping[]> {
    return await this.mappingRepository.getAllMappingsForProvider(providerName);
  }
}
