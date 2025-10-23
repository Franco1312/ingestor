import type { SeriesPoint } from '../../domain/entities/index.js';
import { validateSeriesPoint } from '../../domain/entities/index.js';
import { logger } from '../log/logger.js';

/**
 * Maps raw API response data to normalized SeriesPoint entities
 * Handles data validation, type conversion, and filtering of invalid points
 */
export class DataMappers {
  /**
   * Maps raw API data points to validated SeriesPoint entities
   * @param rawData - Array of raw data points from API
   * @param seriesId - The series identifier
   * @returns Array of validated SeriesPoint entities
   */
  static mapRawDataToSeriesPoints(
    rawData: Array<{ date: string; value: string | number }>,
    seriesId: string
  ): SeriesPoint[] {
    const points: SeriesPoint[] = [];
    const invalidPoints: Array<{ date: string; value: unknown; reason: string }> = [];

    for (const rawPoint of rawData) {
      try {
        // Convert value to number
        const numericValue = this.convertToNumber(rawPoint.value);
        if (numericValue === null) {
          invalidPoints.push({
            date: rawPoint.date,
            value: rawPoint.value,
            reason: 'Invalid numeric value',
          });
          continue;
        }

        // Validate date format
        if (!this.isValidDateFormat(rawPoint.date)) {
          invalidPoints.push({
            date: rawPoint.date,
            value: rawPoint.value,
            reason: 'Invalid date format',
          });
          continue;
        }

        // Create and validate SeriesPoint
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

    // Log invalid points for debugging
    if (invalidPoints.length > 0) {
      logger.warn('Invalid data points encountered', {
        seriesId,
        invalidCount: invalidPoints.length,
        totalCount: rawData.length,
        invalidPoints: invalidPoints.slice(0, 10), // Log first 10 invalid points
      });
    }

    return points;
  }

  /**
   * Converts various value types to numbers
   * @param value - Value to convert (string, number, or unknown)
   * @returns Numeric value or null if conversion fails
   */
  private static convertToNumber(value: unknown): number | null {
    if (typeof value === 'number') {
      return isFinite(value) ? value : null;
    }

    if (typeof value === 'string') {
      // Handle common string formats
      const trimmed = value.trim();
      if (trimmed === '' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'n/a') {
        return null;
      }

      // Parse numeric string
      const parsed = parseFloat(trimmed);
      return isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  /**
   * Validates date format (YYYY-MM-DD)
   * @param dateStr - Date string to validate
   * @returns True if valid format
   */
  private static isValidDateFormat(dateStr: string): boolean {
    if (typeof dateStr !== 'string') {
      return false;
    }

    // Check format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return false;
    }

    // Check if it's a valid date
    const date = new Date(dateStr);
    return (
      date instanceof Date && !isNaN(date.getTime()) && date.toISOString().split('T')[0] === dateStr
    );
  }

  /**
   * Normalizes series ID for consistent storage
   * @param seriesId - Raw series ID from API
   * @returns Normalized series ID
   */
  static normalizeSeriesId(seriesId: string): string {
    return seriesId.trim().toLowerCase();
  }

  /**
   * Extracts series metadata from API response
   * @param apiResponse - Raw API response data
   * @returns Normalized metadata object
   */
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
