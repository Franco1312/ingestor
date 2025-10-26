import type { SeriesPoint, SeriesMetadata } from '@/domain/entities/index.js';

export interface ISeriesRepository {
  getLastDate(seriesId: string): Promise<string | null>;

  getSeriesMetadata(seriesId: string): Promise<SeriesMetadata | null>;

  getSeriesStats(seriesId: string): Promise<{
    totalPoints: number;
    firstDate: string | null;
    lastDate: string | null;
  } | null>;

  upsertPoints(points: SeriesPoint[]): Promise<number>;

  deletePointsInRange(seriesId: string, startDate: string, endDate: string): Promise<number>;

  getAllSeries(): Promise<SeriesMetadata[]>;

  updateSeriesMetadata(seriesId: string, metadata: Record<string, unknown>): Promise<void>;

  upsertSeriesMetadata(metadata: SeriesMetadata): Promise<void>;
}
