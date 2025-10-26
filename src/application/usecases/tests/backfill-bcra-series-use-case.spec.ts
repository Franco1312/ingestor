import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BackfillBcraSeriesUseCase } from '../backfill-bcra-series.use-case.js';
import type { ISeriesRepository } from '../../../domain/ports/index.js';
import type { SeriesMappingService } from '../../../domain/services/seriesMappingService.js';
import type { BcraClient } from '../../../infrastructure/http/clients/bcraClient.js';

describe('BackfillBcraSeriesUseCase', () => {
  let useCase: BackfillBcraSeriesUseCase;
  let mockSeriesRepository: jest.Mocked<ISeriesRepository>;
  let mockMappingService: jest.Mocked<SeriesMappingService>;
  let mockBcraClient: jest.Mocked<BcraClient>;

  beforeEach(() => {
    mockSeriesRepository = {
      getSeriesMetadata: jest.fn(),
      upsertSeriesMetadata: jest.fn(),
      updateSeriesMetadata: jest.fn(),
      upsertPoints: jest.fn(),
      getLastDate: jest.fn(),
      getSeriesStats: jest.fn(),
      getAllSeries: jest.fn(),
      deletePointsInRange: jest.fn(),
    } as jest.Mocked<ISeriesRepository>;

    mockMappingService = {
      getMappingsByProvider: jest.fn(),
      getAllMappings: jest.fn(),
      insertMapping: jest.fn(),
    } as jest.Mocked<SeriesMappingService>;

    mockBcraClient = {
      getSeriesData: jest.fn(),
      getAvailableSeries: jest.fn(),
      healthCheck: jest.fn(),
    } as jest.Mocked<BcraClient>;

    useCase = new BackfillBcraSeriesUseCase(
      mockSeriesRepository,
      mockMappingService,
      mockBcraClient
    );
  });

  describe('execute', () => {
    it('should successfully backfill data when series exists', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      const mockBcraResponse = {
        results: [
          { fecha: '2024-01-01', valor: 1000 },
          { fecha: '2024-01-02', valor: 1100 },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(2);

      const result = await useCase.execute({
        seriesId: '1',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.pointsFetched).toBe(2);
      expect(result.pointsStored).toBe(2);
      expect(mockBcraClient.getSeriesData).toHaveBeenCalledWith({
        seriesId: '1',
        from: '2024-01-01',
        to: '2024-01-31',
        limit: 1000,
        offset: 0,
      });
    });

    it('should handle pagination correctly', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      const firstPage = {
        results: Array.from({ length: 1000 }, (_, i) => ({
          fecha: `2024-01-${String((i % 31) + 1).padStart(2, '0')}`,
          valor: 1000 + i,
        })),
      };

      const secondPage = {
        results: Array.from({ length: 500 }, (_, i) => ({
          fecha: `2024-02-${String((i % 28) + 1).padStart(2, '0')}`,
          valor: 2000 + i,
        })),
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData
        .mockResolvedValueOnce(firstPage)
        .mockResolvedValueOnce(secondPage);
      mockSeriesRepository.upsertPoints.mockResolvedValue(1500);

      const result = await useCase.execute({
        seriesId: '1',
        fromDate: '2024-01-01',
        toDate: '2024-02-28',
      });

      expect(result.success).toBe(true);
      expect(result.pointsFetched).toBe(1500);
      expect(result.pointsStored).toBe(1500);
      expect(mockBcraClient.getSeriesData).toHaveBeenCalledTimes(2);
    });

    it('should return error when BCRA API fails', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData.mockRejectedValue(new Error('API Error'));

      const result = await useCase.execute({
        seriesId: '1',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
      expect(result.pointsFetched).toBe(0);
      expect(result.pointsStored).toBe(0);
    });

    it('should handle empty response gracefully', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      const emptyResponse = { results: [] };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData.mockResolvedValue(emptyResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(0);

      const result = await useCase.execute({
        seriesId: '1',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.pointsFetched).toBe(0);
      expect(result.pointsStored).toBe(0);
    });

    it('should use external ID from mapping when available', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.reservas',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      const mockBcraResponse = {
        results: [{ fecha: '2024-01-01', valor: 1000 }],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(1);

      await useCase.execute({
        seriesId: 'bcra.reservas',
        fromDate: '2024-01-01',
      });

      expect(mockBcraClient.getSeriesData).toHaveBeenCalledWith(
        expect.objectContaining({
          seriesId: '1',
        })
      );
    });

    it('should skip invalid data points', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
          description: 'Reservas Internacionales',
        },
      ];

      const mockBcraResponse = {
        results: [
          { fecha: '2024-01-01', valor: 1000 },
          { fecha: '2024-01-02', valor: null as unknown as number },
          { fecha: '2024-01-03', valor: 'not-a-number' as unknown as number },
          { fecha: '2024-01-04', valor: 3000 },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraClient.getSeriesData.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(2);

      const result = await useCase.execute({
        seriesId: '1',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(true);
      expect(result.pointsStored).toBe(2);
    });
  });

  describe('getBackfillStats', () => {
    it('should return series statistics', async () => {
      const stats = {
        totalPoints: 100,
        firstDate: '2024-01-01',
        lastDate: '2024-12-31',
      };

      mockSeriesRepository.getSeriesStats.mockResolvedValue(stats);

      const result = await useCase.getBackfillStats('1');

      expect(result).toEqual(stats);
      expect(mockSeriesRepository.getSeriesStats).toHaveBeenCalledWith('1');
    });

    it('should return null when series does not exist', async () => {
      mockSeriesRepository.getSeriesStats.mockResolvedValue(null);

      const result = await useCase.getBackfillStats('999');

      expect(result).toBeNull();
    });
  });
});
