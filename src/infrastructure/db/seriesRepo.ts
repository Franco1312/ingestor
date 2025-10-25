import type { ISeriesRepository } from '@/domain/ports/index.js';
import type { SeriesPoint, SeriesMetadata } from '@/domain/entities/index.js';
import { db } from '@/infrastructure/db/pg.js';
import { logger } from '@/infrastructure/log/logger.js';
import { SERIES_REPOSITORY as events } from '@/infrastructure/log/log-events.js';

class SeriesRepository implements ISeriesRepository {
  async getLastDate(seriesId: string): Promise<string | null> {
    try {
      const result = await db.query<{ ts: string }>(
        'SELECT ts FROM series_points WHERE series_id = $1 ORDER BY ts DESC LIMIT 1',
        [seriesId]
      );

      return result.length > 0 ? result[0]!.ts : null;
    } catch (error) {
      logger.error({
        event: events.GET_LAST_DATE,
        msg: 'Failed to get last date for series',
        err: error as Error,
        data: { seriesId },
      });
      throw error;
    }
  }

  async upsertPoints(points: SeriesPoint[]): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    try {
      return await db.transaction(async client => {
        let upsertedCount = 0;

        const batchSize = 1000;
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);

          const values = batch
            .map((point, index) => {
              const offset = i + index;
              return `($${offset * 4 + 1}, $${offset * 4 + 2}, $${offset * 4 + 3}, $${offset * 4 + 4})`;
            })
            .join(', ');

          const params = batch.flatMap(point => [
            point.seriesId,
            point.ts,
            point.value,
            point.metadata ? JSON.stringify(point.metadata) : null,
          ]);

          const query = `
            INSERT INTO series_points (series_id, ts, value, metadata)
            VALUES ${values}
            ON CONFLICT (series_id, ts)
            DO UPDATE SET 
              value = EXCLUDED.value,
              metadata = EXCLUDED.metadata,
              updated_at = now()
          `;

          const result = await client.query(query, params);
          upsertedCount += result.rowCount || 0;

          logger.info({
            event: events.UPSERT_POINTS,
            msg: 'Upserted batch of series points',
            data: {
              batchSize: batch.length,
              totalProcessed: upsertedCount,
              seriesId: batch[0]?.seriesId,
            },
          });
        }

        logger.info({
          event: events.UPSERT_POINTS,
          msg: 'Completed upsert of series points',
          data: {
            totalPoints: points.length,
            upsertedCount,
            seriesId: points[0]?.seriesId,
          },
        });

        return upsertedCount;
      });
    } catch (error) {
      logger.error({
        event: events.UPSERT_POINTS,
        msg: 'Failed to upsert series points',
        err: error as Error,
        data: {
          pointsCount: points.length,
          seriesId: points[0]?.seriesId,
        },
      });
      throw error;
    }
  }

  async getSeriesMetadata(seriesId: string): Promise<SeriesMetadata | null> {
    try {
      const result = await db.query<SeriesMetadata>('SELECT * FROM series WHERE id = $1', [
        seriesId,
      ]);

      return result.length > 0 ? result[0]! : null;
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_METADATA,
        msg: 'Failed to get series metadata',
        err: error as Error,
        data: { seriesId },
      });
      throw error;
    }
  }

  async getAllSeriesMetadata(): Promise<SeriesMetadata[]> {
    try {
      const result = await db.query<SeriesMetadata>('SELECT * FROM series ORDER BY id');

      logger.info({
        event: events.GET_ALL_SERIES_METADATA,
        msg: 'Retrieved all series metadata',
        data: { count: result.length },
      });
      return result;
    } catch (error) {
      logger.error({
        event: events.GET_ALL_SERIES_METADATA,
        msg: 'Failed to get all series metadata',
        err: error as Error,
      });
      throw error;
    }
  }

  async getAllSeries(): Promise<SeriesMetadata[]> {
    return this.getAllSeriesMetadata();
  }

  async upsertSeriesMetadata(metadata: SeriesMetadata): Promise<void> {
    try {
      await db.query(
        `INSERT INTO series (id, source, frequency, unit, metadata)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id)
         DO UPDATE SET
           source = EXCLUDED.source,
           frequency = EXCLUDED.frequency,
           unit = EXCLUDED.unit,
           metadata = EXCLUDED.metadata`,
        [
          metadata.id,
          metadata.source,
          metadata.frequency,
          metadata.unit || null,
          metadata.metadata ? JSON.stringify(metadata.metadata) : null,
        ]
      );

      logger.info({
        event: events.UPSERT_SERIES_METADATA,
        msg: 'Upserted series metadata',
        data: {
          seriesId: metadata.id,
          source: metadata.source,
          frequency: metadata.frequency,
        },
      });
    } catch (error) {
      logger.error({
        event: events.UPSERT_SERIES_METADATA,
        msg: 'Failed to upsert series metadata',
        err: error as Error,
        data: { seriesId: metadata.id },
      });
      throw error;
    }
  }

  async getSeriesStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
    minValue: number | null;
    maxValue: number | null;
    avgValue: number | null;
  }> {
    try {
      const result = await db.query<{
        total_points: number;
        first_date: string | null;
        last_date: string | null;
        min_value: number | null;
        max_value: number | null;
        avg_value: number | null;
      }>(
        `SELECT 
           COUNT(*) as total_points,
           MIN(ts) as first_date,
           MAX(ts) as last_date,
           MIN(value) as min_value,
           MAX(value) as max_value,
           AVG(value) as avg_value
         FROM series_points 
         WHERE series_id = $1`,
        [seriesId]
      );

      const stats = result[0];
      if (!stats) {
        throw new Error('No statistics found for series');
      }
      return {
        totalPoints: stats.total_points,
        firstDate: stats.first_date,
        lastDate: stats.last_date,
        minValue: stats.min_value,
        maxValue: stats.max_value,
        avgValue: stats.avg_value,
      };
    } catch (error) {
      logger.error({
        event: events.GET_SERIES_STATS,
        msg: 'Failed to get series statistics',
        err: error as Error,
        data: { seriesId },
      });
      throw error;
    }
  }

  async deletePointsInRange(seriesId: string, startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.query(
        'DELETE FROM series_points WHERE series_id = $1 AND ts >= $2 AND ts <= $3',
        [seriesId, startDate, endDate]
      );

      const deletedCount = result.length || 0;
      logger.info({
        event: events.DELETE_POINTS_IN_RANGE,
        msg: 'Deleted series points in range',
        data: {
          seriesId,
          startDate,
          endDate,
          deletedCount,
        },
      });

      return deletedCount;
    } catch (error) {
      logger.error({
        event: events.DELETE_POINTS_IN_RANGE,
        msg: 'Failed to delete series points in range',
        err: error as Error,
        data: { seriesId, startDate, endDate },
      });
      throw error;
    }
  }

  async updateSeriesMetadata(seriesId: string, metadata: Record<string, unknown>): Promise<void> {
    try {
      await db.query('UPDATE series SET metadata = $1 WHERE id = $2', [
        JSON.stringify(metadata),
        seriesId,
      ]);

      logger.info({
        event: events.UPDATE_SERIES_METADATA,
        msg: 'Updated series metadata',
        data: {
          seriesId,
          metadataKeys: Object.keys(metadata),
        },
      });
    } catch (error) {
      logger.error({
        event: events.UPDATE_SERIES_METADATA,
        msg: 'Failed to update series metadata',
        err: error as Error,
        data: { seriesId },
      });
      throw error;
    }
  }
}

export const seriesRepository = new SeriesRepository();
