import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FetchAndStoreSeriesUseCase } from '../../src/application/usecases/fetchAndStoreSeries.js';
import type { ISeriesRepository, ISeriesSource, ILogger } from '../../src/domain/ports.js';
import type { SeriesPoint } from '../../src/domain/entities.js';

describe('FetchAndStoreSeriesUseCase', () => {
  let mockRepository: ISeriesRepository;
  let mockSeriesSource: ISeriesSource;
  let mockLogger: ILogger;
  let useCase: FetchAndStoreSeriesUseCase;

  beforeEach(() => {
    // Create mocks
    mockRepository = {
      getLastDate: vi.fn(),
      upsertPoints: vi.fn(),
      getSeriesMetadata: vi.fn(),
      getAllSeriesMetadata: vi.fn(),
      upsertSeriesMetadata: vi.fn(),
    };

    mockSeriesSource = {
      fetchSeriesData: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn().mockReturnThis(),
    };

    useCase = new FetchAndStoreSeriesUseCase(mockRepository, mockSeriesSource, mockLogger);
  });

  describe('execute', () => {
    it('should fetch and store data starting from the last available date', async () => {
      const mockPoints: SeriesPoint[] = [
        { seriesId: 'test-series', ts: '2024-01-02', value: 100.5 },
        { seriesId: 'test-series', ts: '2024-01-03', value: 200.75 },
      ];

      // Mock repository to return last date
      vi.mocked(mockRepository.getLastDate).mockResolvedValue('2024-01-01');

      // Mock series source to return data
      vi.mocked(mockSeriesSource.fetchSeriesData).mockResolvedValue(mockPoints);

      // Mock repository to return stored count
      vi.mocked(mockRepository.upsertPoints).mockResolvedValue(2);

      const result = await useCase.execute('test-series');

      expect(result).toEqual({
        seriesId: 'test-series',
        pointsFetched: 2,
        pointsStored: 2,
        lastDate: '2024-01-01',
        duration: expect.any(Number),
        success: true,
      });

      expect(mockRepository.getLastDate).toHaveBeenCalledWith('test-series');
      expect(mockSeriesSource.fetchSeriesData).toHaveBeenCalledWith(
        'test-series',
        '2024-01-02' // Next day after last date
      );
      expect(mockRepository.upsertPoints).toHaveBeenCalledWith(mockPoints);
    });

    it('should use default start date when no existing data', async () => {
      const mockPoints: SeriesPoint[] = [
        { seriesId: 'test-series', ts: '2024-01-01', value: 100.5 },
      ];

      // Mock repository to return no last date
      vi.mocked(mockRepository.getLastDate).mockResolvedValue(null);

      // Mock series source to return data
      vi.mocked(mockSeriesSource.fetchSeriesData).mockResolvedValue(mockPoints);

      // Mock repository to return stored count
      vi.mocked(mockRepository.upsertPoints).mockResolvedValue(1);

      const result = await useCase.execute('test-series');

      expect(result.success).toBe(true);
      expect(mockSeriesSource.fetchSeriesData).toHaveBeenCalledWith(
        'test-series',
        expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) // Should be a date string
      );
    });

    it('should handle no new data available', async () => {
      // Mock repository to return last date
      vi.mocked(mockRepository.getLastDate).mockResolvedValue('2024-01-01');

      // Mock series source to return no data
      vi.mocked(mockSeriesSource.fetchSeriesData).mockResolvedValue([]);

      const result = await useCase.execute('test-series');

      expect(result).toEqual({
        seriesId: 'test-series',
        pointsFetched: 0,
        pointsStored: 0,
        lastDate: '2024-01-01',
        duration: expect.any(Number),
        success: true,
      });

      expect(mockRepository.upsertPoints).not.toHaveBeenCalled();
    });

    it('should throw error when fetch fails', async () => {
      // Mock repository to return last date
      mockRepository.getLastDate = vi.fn().mockResolvedValue('2024-01-01');

      // Mock series source to throw error
      mockSeriesSource.fetchSeriesData = vi.fn().mockRejectedValue(new Error('API error'));

      await expect(useCase.execute('test-series')).rejects.toThrow('API error');
    });

    it('should throw error when storage fails', async () => {
      const mockPoints: SeriesPoint[] = [
        { seriesId: 'test-series', ts: '2024-01-02', value: 100.5 },
      ];

      // Mock repository to return last date
      mockRepository.getLastDate = vi.fn().mockResolvedValue('2024-01-01');

      // Mock series source to return data
      mockSeriesSource.fetchSeriesData = vi.fn().mockResolvedValue(mockPoints);

      // Mock repository to throw error
      mockRepository.upsertPoints = vi.fn().mockRejectedValue(new Error('Database error'));

      await expect(useCase.execute('test-series')).rejects.toThrow('Database error');
    });
  });

  describe('executeMultiple', () => {
    it('should process multiple series successfully', async () => {
      const mockPoints: SeriesPoint[] = [
        { seriesId: 'test-series-1', ts: '2024-01-02', value: 100.5 },
      ];

      // Mock repository to return no last date
      vi.mocked(mockRepository.getLastDate).mockResolvedValue(null);

      // Mock series source to return data
      vi.mocked(mockSeriesSource.fetchSeriesData).mockResolvedValue(mockPoints);

      // Mock repository to return stored count
      vi.mocked(mockRepository.upsertPoints).mockResolvedValue(1);

      const result = await useCase.executeMultiple(['test-series-1', 'test-series-2']);

      expect(result).toHaveLength(2);
      expect(result[0].success).toBe(true);
      expect(result[1].success).toBe(true);
    });

    it('should throw error when batch processing fails', async () => {
      // Mock repository to return no last date for first call, then fail on second
      vi.mocked(mockRepository.getLastDate)
        .mockResolvedValueOnce(null) // First call succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second call fails

      // Mock series source to return data for first call
      vi.mocked(mockSeriesSource.fetchSeriesData).mockResolvedValue([]);

      // Mock repository upsert for first call
      vi.mocked(mockRepository.upsertPoints).mockResolvedValue(0);

      await expect(useCase.executeMultiple(['test-series-1', 'test-series-2'])).rejects.toThrow(
        'Database error'
      );
    });
  });
});
