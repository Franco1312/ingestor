import type {
  ISeriesMappingRepository,
  SeriesMapping,
} from '@/domain/ports/seriesMappingRepository.js';
import { db } from './pg.js';
import { logger } from '@/infrastructure/log/logger.js';
import { SERIES_MAPPING_REPOSITORY as events } from '@/infrastructure/log/log-events.js';

export class SeriesMappingRepository implements ISeriesMappingRepository {
  async getAllMappings(): Promise<SeriesMapping[]> {
    const rows = await db.query<{
      id: number;
      internal_series_id: string;
      external_series_id: string;
      provider_name: string;
      keywords: unknown;
      description: string;
    }>(
      `SELECT id, internal_series_id, external_series_id, provider_name, 
              keywords, description 
       FROM series_mappings`
    );

    const mappings = rows.map(row => ({
      ...row,
      keywords: Array.isArray(row.keywords) ? row.keywords : JSON.parse(String(row.keywords)),
    }));

    logger.info({
      event: events.GET_ALL_MAPPINGS,
      msg: 'Retrieved all series mappings',
      data: { count: rows.length },
    });

    return mappings as SeriesMapping[];
  }

  async getMappingsByProvider(provider: string): Promise<SeriesMapping[]> {
    const rows = await db.query<{
      id: number;
      internal_series_id: string;
      external_series_id: string;
      provider_name: string;
      keywords: unknown;
      description: string;
    }>(
      `SELECT id, internal_series_id, external_series_id, provider_name, 
              keywords, description 
       FROM series_mappings 
       WHERE provider_name = $1`,
      [provider]
    );

    const mappings = rows.map(row => ({
      ...row,
      keywords: Array.isArray(row.keywords) ? row.keywords : JSON.parse(String(row.keywords)),
    }));

    logger.info({
      event: events.GET_MAPPINGS_BY_PROVIDER,
      msg: 'Retrieved series mappings by provider',
      data: { provider, count: rows.length },
    });

    return mappings as SeriesMapping[];
  }

  async insertMapping(mapping: Omit<SeriesMapping, 'id'>): Promise<void> {
    await db.query(
      `INSERT INTO series_mappings 
       (internal_series_id, external_series_id, provider_name, keywords, description) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (external_series_id, provider_name) DO NOTHING`,
      [
        mapping.internal_series_id,
        mapping.external_series_id,
        mapping.provider_name,
        JSON.stringify(mapping.keywords),
        mapping.description,
      ]
    );

    logger.info({
      event: events.INSERT_MAPPING,
      msg: 'Inserted series mapping',
      data: {
        internalSeriesId: mapping.internal_series_id,
        externalSeriesId: mapping.external_series_id,
        provider: mapping.provider_name,
      },
    });
  }
}

export const defaultSeriesMappingRepository = new SeriesMappingRepository();
