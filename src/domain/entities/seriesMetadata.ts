import { z } from 'zod';

/**
 * Series metadata entity - represents metadata about a time series
 */
export const SeriesMetadataSchema = z.object({
  id: z.string().min(1, 'Series ID is required'),
  source: z.enum(['bcra', 'indec', 'mintrab', 'afip']),
  frequency: z.enum(['daily', 'monthly', 'weekly', 'quarterly', 'yearly']),
  unit: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type SeriesMetadata = z.infer<typeof SeriesMetadataSchema>;

/**
 * Validate series metadata
 */
export const validateSeriesMetadata = (data: unknown): SeriesMetadata => {
  return SeriesMetadataSchema.parse(data);
};

/**
 * Create series metadata with validation
 */
export const createSeriesMetadata = (
  id: string,
  source: 'bcra' | 'indec' | 'mintrab' | 'afip',
  frequency: 'daily' | 'monthly' | 'weekly' | 'quarterly' | 'yearly',
  unit?: string,
  metadata?: Record<string, unknown>
): SeriesMetadata => {
  return validateSeriesMetadata({ id, source, frequency, unit, metadata });
};
