import type {
  ISeriesMappingRepository,
  SeriesMapping,
} from '@/domain/ports/seriesMappingRepository.js';
import { db } from './pg.js';
import { logger } from '@/infrastructure/log/logger.js';
import { SERIES_MAPPING as events } from '@/infrastructure/log/log-events.js';

class SeriesMappingRepository implements ISeriesMappingRepository {
  async getInternalSeriesId(
    externalSeriesId: string,
    providerName: string
  ): Promise<string | null> {
    try {
      const client = await db.getClient();
      const result = await client.query(
        'SELECT internal_series_id FROM series_mappings WHERE external_series_id = $1 AND provider_name = $2',
        [externalSeriesId, providerName]
      );

      if (result.rows.length === 0) {
        logger.info({
          event: events.GET_INTERNAL_ID,
          msg: 'No mapping found for external series ID',
          data: { externalSeriesId, providerName },
        });
        return null;
      }

      const internalId = result.rows[0].internal_series_id;

      logger.info({
        event: events.GET_INTERNAL_ID,
        msg: 'Found internal series ID mapping',
        data: { externalSeriesId, internalId, providerName },
      });

      return internalId;
    } catch (error) {
      logger.error({
        event: events.GET_INTERNAL_ID,
        msg: 'Failed to get internal series ID',
        err: error as Error,
        data: { externalSeriesId, providerName },
      });
      throw error;
    }
  }

  async getExternalSeriesId(
    internalSeriesId: string,
    providerName: string
  ): Promise<string | null> {
    try {
      const client = await db.getClient();
      const result = await client.query(
        'SELECT external_series_id FROM series_mappings WHERE internal_series_id = $1 AND provider_name = $2',
        [internalSeriesId, providerName]
      );

      if (result.rows.length === 0) {
        logger.info({
          event: events.GET_EXTERNAL_ID,
          msg: 'No mapping found for internal series ID',
          data: { internalSeriesId, providerName },
        });
        return null;
      }

      const externalId = result.rows[0].external_series_id;

      logger.info({
        event: events.GET_EXTERNAL_ID,
        msg: 'Found external series ID mapping',
        data: { internalSeriesId, externalId, providerName },
      });

      return externalId;
    } catch (error) {
      logger.error({
        event: events.GET_EXTERNAL_ID,
        msg: 'Failed to get external series ID',
        err: error as Error,
        data: { internalSeriesId, providerName },
      });
      throw error;
    }
  }

  async createMapping(
    internalSeriesId: string,
    externalSeriesId: string,
    providerName: string
  ): Promise<void> {
    try {
      const client = await db.getClient();
      await client.query(
        'INSERT INTO series_mappings (internal_series_id, external_series_id, provider_name) VALUES ($1, $2, $3) ON CONFLICT (external_series_id, provider_name) DO NOTHING',
        [internalSeriesId, externalSeriesId, providerName]
      );

      logger.info({
        event: events.CREATE_MAPPING,
        msg: 'Created series mapping',
        data: { internalSeriesId, externalSeriesId, providerName },
      });
    } catch (error) {
      logger.error({
        event: events.CREATE_MAPPING,
        msg: 'Failed to create series mapping',
        err: error as Error,
        data: { internalSeriesId, externalSeriesId, providerName },
      });
      throw error;
    }
  }

  async getAllMappingsForProvider(providerName: string): Promise<SeriesMapping[]> {
    try {
      const client = await db.getClient();
      const result = await client.query(
        'SELECT id, internal_series_id, external_series_id, provider_name, created_at, updated_at FROM series_mappings WHERE provider_name = $1 ORDER BY internal_series_id',
        [providerName]
      );

      const mappings: SeriesMapping[] = result.rows.map(row => ({
        id: row.id,
        internalSeriesId: row.internal_series_id,
        externalSeriesId: row.external_series_id,
        providerName: row.provider_name,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      logger.info({
        event: events.GET_ALL_MAPPINGS,
        msg: 'Retrieved all mappings for provider',
        data: { providerName, count: mappings.length },
      });

      return mappings;
    } catch (error) {
      logger.error({
        event: events.GET_ALL_MAPPINGS,
        msg: 'Failed to get all mappings for provider',
        err: error as Error,
        data: { providerName },
      });
      throw error;
    }
  }
}

export const seriesMappingRepository = new SeriesMappingRepository();
