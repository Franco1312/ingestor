import type { SeriesPoint, SeriesMetadata } from '../entities/index.js';

/**
 * Repository port for series data persistence
 */
export interface ISeriesRepository {
  /**
   * Get the last available date for a series
   */
  getLastDate(seriesId: string): Promise<string | null>;

  /**
   * Get series metadata
   */
  getSeriesMetadata(seriesId: string): Promise<SeriesMetadata | null>;

  /**
   * Get series statistics
   */
  getSeriesStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
  } | null>;

  /**
   * Upsert series points (idempotent)
   */
  upsertPoints(points: SeriesPoint[]): Promise<number>;

  /**
   * Delete points in a date range
   */
  deletePointsInRange(seriesId: string, startDate: string, endDate: string): Promise<number>;

  /**
   * Get all series from catalog
   */
  getAllSeries(): Promise<SeriesMetadata[]>;

  /**
   * Update series metadata
   */
  updateSeriesMetadata(seriesId: string, metadata: Record<string, unknown>): Promise<void>;
}
