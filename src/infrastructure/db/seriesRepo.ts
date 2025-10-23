import type { ISeriesRepository } from '../../domain/ports/index.js';
import type { SeriesPoint, SeriesMetadata } from '../../domain/entities/index.js';
import { db } from './pg.js';
import { logger } from '../log/logger.js';

// Repository implementation for series data persistence
class SeriesRepository implements ISeriesRepository {
  /**
   * Get the last available date for a series
   */
  async getLastDate(seriesId: string): Promise<string | null> {
    try {
      const result = await db.query<{ ts: string }>(
        'SELECT ts FROM series_points WHERE series_id = $1 ORDER BY ts DESC LIMIT 1',
        [seriesId]
      );

      return result.length > 0 ? result[0]!.ts : null;
    } catch (error) {
      logger.error('Failed to get last date for series', {
        seriesId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Upsert series points (insert or update on conflict)
   */
  async upsertPoints(points: SeriesPoint[]): Promise<number> {
    if (points.length === 0) {
      return 0;
    }

    try {
      return await db.transaction(async client => {
        let upsertedCount = 0;

        // Process points in batches to avoid query size limits
        const batchSize = 1000;
        for (let i = 0; i < points.length; i += batchSize) {
          const batch = points.slice(i, i + batchSize);

          const values = batch
            .map((point, index) => {
              const offset = i + index;
              return `($${offset * 3 + 1}, $${offset * 3 + 2}, $${offset * 3 + 3})`;
            })
            .join(', ');

          const params = batch.flatMap(point => [point.seriesId, point.ts, point.value]);

          const query = `
            INSERT INTO series_points (series_id, ts, value)
            VALUES ${values}
            ON CONFLICT (series_id, ts)
            DO UPDATE SET value = EXCLUDED.value
          `;

          const result = await client.query(query, params);
          upsertedCount += result.rowCount || 0;

          logger.debug('Upserted batch of series points', {
            batchSize: batch.length,
            totalProcessed: upsertedCount,
            seriesId: batch[0]?.seriesId,
          });
        }

        logger.info('Completed upsert of series points', {
          totalPoints: points.length,
          upsertedCount,
          seriesId: points[0]?.seriesId,
        });

        return upsertedCount;
      });
    } catch (error) {
      logger.error('Failed to upsert series points', {
        pointsCount: points.length,
        seriesId: points[0]?.seriesId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get series metadata by ID
   */
  async getSeriesMetadata(seriesId: string): Promise<SeriesMetadata | null> {
    try {
      const result = await db.query<SeriesMetadata>('SELECT * FROM series WHERE id = $1', [
        seriesId,
      ]);

      return result.length > 0 ? result[0]! : null;
    } catch (error) {
      logger.error('Failed to get series metadata', {
        seriesId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get all series metadata
   */
  async getAllSeriesMetadata(): Promise<SeriesMetadata[]> {
    try {
      const result = await db.query<SeriesMetadata>('SELECT * FROM series ORDER BY id');

      logger.debug('Retrieved all series metadata', { count: result.length });
      return result;
    } catch (error) {
      logger.error('Failed to get all series metadata', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Insert or update series metadata
   */
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

      logger.info('Upserted series metadata', {
        seriesId: metadata.id,
        source: metadata.source,
        frequency: metadata.frequency,
      });
    } catch (error) {
      logger.error('Failed to upsert series metadata', {
        seriesId: metadata.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get series statistics
   */
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
      logger.error('Failed to get series statistics', {
        seriesId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Delete series points within a date range
   */
  async deletePointsInRange(seriesId: string, startDate: string, endDate: string): Promise<number> {
    try {
      const result = await db.query(
        'DELETE FROM series_points WHERE series_id = $1 AND ts >= $2 AND ts <= $3',
        [seriesId, startDate, endDate]
      );

      const deletedCount = result.length || 0;
      logger.info('Deleted series points in range', {
        seriesId,
        startDate,
        endDate,
        deletedCount,
      });

      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete series points in range', {
        seriesId,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

// Export singleton repository instance
export const seriesRepository = new SeriesRepository();
