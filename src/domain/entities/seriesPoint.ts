import { z } from 'zod';

/**
 * Series Point entity - represents a single data point in a time series
 */
export const SeriesPointSchema = z.object({
  seriesId: z.string().min(1, 'Series ID is required'),
  ts: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  value: z.number().finite('Value must be a finite number'),
});

export type SeriesPoint = z.infer<typeof SeriesPointSchema>;

/**
 * Validate a series point
 */
export const validateSeriesPoint = (data: unknown): SeriesPoint => {
  return SeriesPointSchema.parse(data);
};

/**
 * Create a series point with validation
 */
export const createSeriesPoint = (seriesId: string, date: string, value: number): SeriesPoint => {
  return validateSeriesPoint({ seriesId, ts: date, value });
};
