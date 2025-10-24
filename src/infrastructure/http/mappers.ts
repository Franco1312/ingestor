import type { SeriesPoint } from '@/domain/entities/index.js';
import { validateSeriesPoint } from '@/domain/entities/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { DATA_MAPPERS as events } from '@/infrastructure/log/log-events.js';
import { DateService } from '@/domain/utils/dateService.js';

export class DataMappers {
  static mapRawDataToSeriesPoints(
    rawData: Array<{ date: string; value: string | number }>,
    seriesId: string
  ): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const invalidPoints: Array<{ date: string; value: unknown; reason: string }> = [];

    for (const rawPoint of rawData) {
      try {
        const numericValue = this.convertToNumber(rawPoint.value);
        if (numericValue === null) {
          invalidPoints.push({
            date: rawPoint.date,
            value: rawPoint.value,
            reason: 'Invalid numeric value',
          });
          continue;
        }

        const dateValidation = DateService.validateDateFormat(rawPoint.date);
        if (!dateValidation.isValid) {
          invalidPoints.push({
            date: rawPoint.date,
            value: rawPoint.value,
            reason: dateValidation.error || 'Invalid date format',
          });
          continue;
        }

        const seriesPoint = validateSeriesPoint({
          seriesId,
          ts: rawPoint.date,
          value: numericValue,
        });

        points.push(seriesPoint);
      } catch (error) {
        invalidPoints.push({
          date: rawPoint.date,
          value: rawPoint.value,
          reason: error instanceof Error ? error.message : 'Unknown validation error',
        });
      }
    }

    if (invalidPoints.length > 0) {
      logger.info({
        event: events.MAP_BCRA_RESPONSE_TO_SERIES_POINTS,
        msg: 'Invalid data points encountered',
        data: {
          seriesId,
          invalidCount: invalidPoints.length,
          totalCount: rawData.length,
          invalidPoints: invalidPoints.slice(0, 10),
        },
      });
    }

    return points;
  }

  private static convertToNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
        return null;
      }

      const parsed = parseFloat(trimmed);
      return isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  static normalizeSeriesId(seriesId: string): string {
    return seriesId.trim().toLowerCase();
  }

  static extractSeriesMetadata(apiResponse: unknown): {
    title?: string;
    description?: string;
    units?: string;
    frequency?: string;
  } {
    const response = apiResponse as Record<string, unknown>;
    const result: {
      title?: string;
      description?: string;
      units?: string;
      frequency?: string;
    } = {};

    if (response.title) result.title = response.title as string;
    if (response.description) result.description = response.description as string;
    if (response.units) result.units = response.units as string;
    if (response.frequency) result.frequency = response.frequency as string;

    return result;
  }
}
