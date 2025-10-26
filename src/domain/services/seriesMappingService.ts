import type {
  ISeriesMappingRepository,
  SeriesMapping,
} from '@/domain/ports/seriesMappingRepository.js';
import { defaultSeriesMappingRepository as defaultMappingRepository } from '@/infrastructure/db/seriesMappingRepo.js';

export interface SeriesMappingService {
  getAllMappings(): Promise<SeriesMapping[]>;
  getMappingsByProvider(provider: string): Promise<SeriesMapping[]>;
  insertMapping(mapping: Omit<SeriesMapping, 'id'>): Promise<void>;
}

export class SeriesMappingServiceImpl implements SeriesMappingService {
  constructor(
    private readonly mappingRepository: ISeriesMappingRepository = defaultMappingRepository
  ) {}

  async getAllMappings(): Promise<SeriesMapping[]> {
    return await this.mappingRepository.getAllMappings();
  }

  async getMappingsByProvider(provider: string): Promise<SeriesMapping[]> {
    return await this.mappingRepository.getMappingsByProvider(provider);
  }

  async insertMapping(mapping: Omit<SeriesMapping, 'id'>): Promise<void> {
    return await this.mappingRepository.insertMapping(mapping);
  }
}

export const defaultSeriesMappingService = new SeriesMappingServiceImpl();
