import { describe, it, expect } from 'vitest';
import { DataMappers } from '../../src/infrastructure/http/mappers.js';

describe('DataMappers', () => {
  describe('mapRawDataToSeriesPoints', () => {
    it('should map valid raw data to series points', () => {
      const rawData = [
        { date: '2024-01-01', value: 100.5 },
        { date: '2024-01-02', value: '200.75' },
        { date: '2024-01-03', value: 300 },
      ];

      const result = DataMappers.mapRawDataToSeriesPoints(rawData, 'test-series');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        seriesId: 'test-series',
        ts: '2024-01-01',
        value: 100.5,
      });
      expect(result[1]).toEqual({
        seriesId: 'test-series',
        ts: '2024-01-02',
        value: 200.75,
      });
      expect(result[2]).toEqual({
        seriesId: 'test-series',
        ts: '2024-01-03',
        value: 300,
      });
    });

    it('should skip invalid numeric values', () => {
      const rawData = [
        { date: '2024-01-01', value: 100.5 },
        { date: '2024-01-02', value: 'invalid' },
        { date: '2024-01-03', value: 'N/A' },
        { date: '2024-01-04', value: '' },
        { date: '2024-01-05', value: null },
        { date: '2024-01-06', value: 200.75 },
      ];

      const result = DataMappers.mapRawDataToSeriesPoints(rawData, 'test-series');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(100.5);
      expect(result[1].value).toBe(200.75);
    });

    it('should skip invalid date formats', () => {
      const rawData = [
        { date: '2024-01-01', value: 100.5 },
        { date: '2024/01/02', value: 200.75 },
        { date: '01-01-2024', value: 300 },
        { date: 'invalid-date', value: 400 },
        { date: '2024-01-05', value: 500 },
      ];

      const result = DataMappers.mapRawDataToSeriesPoints(rawData, 'test-series');

      expect(result).toHaveLength(2);
      expect(result[0].ts).toBe('2024-01-01');
      expect(result[1].ts).toBe('2024-01-05');
    });

    it('should handle empty input', () => {
      const result = DataMappers.mapRawDataToSeriesPoints([], 'test-series');
      expect(result).toHaveLength(0);
    });

    it('should handle mixed valid and invalid data', () => {
      const rawData = [
        { date: '2024-01-01', value: 100.5 },
        { date: 'invalid-date', value: 200.75 },
        { date: '2024-01-03', value: 'invalid-value' },
        { date: '2024-01-04', value: 300 },
      ];

      const result = DataMappers.mapRawDataToSeriesPoints(rawData, 'test-series');

      expect(result).toHaveLength(2);
      expect(result[0].value).toBe(100.5);
      expect(result[1].value).toBe(300);
    });
  });

  describe('normalizeSeriesId', () => {
    it('should normalize series ID to lowercase and trimmed', () => {
      expect(DataMappers.normalizeSeriesId('  TEST-SERIES  ')).toBe('test-series');
      expect(DataMappers.normalizeSeriesId('BCRA.FX_RESERVES_GROSS')).toBe(
        'bcra.fx_reserves_gross'
      );
    });
  });

  describe('extractSeriesMetadata', () => {
    it('should extract metadata from API response', () => {
      const apiResponse = {
        title: 'Test Series',
        description: 'A test series',
        units: 'USD',
        frequency: 'daily',
        extraField: 'ignored',
      };

      const result = DataMappers.extractSeriesMetadata(apiResponse);

      expect(result).toEqual({
        title: 'Test Series',
        description: 'A test series',
        units: 'USD',
        frequency: 'daily',
      });
    });

    it('should handle missing fields', () => {
      const apiResponse = {
        title: 'Test Series',
      };

      const result = DataMappers.extractSeriesMetadata(apiResponse);

      expect(result).toEqual({
        title: 'Test Series',
        description: undefined,
        units: undefined,
        frequency: undefined,
      });
    });
  });
});
