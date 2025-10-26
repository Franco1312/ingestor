import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PopulateSeriesUseCase } from '../populate-series.use-case';
import type { ISeriesRepository, ISeriesMappingRepository } from '../../../domain/ports/index.js';
import type { SeriesMetadataProvider } from '../../../domain/providers/seriesMetadataProvider.js';

describe('PopulateSeriesUseCase', () => {
  let useCase: PopulateSeriesUseCase;
  let mockSeriesRepository: jest.Mocked<ISeriesRepository>;
  let mockSeriesMappingRepository: jest.Mocked<ISeriesMappingRepository>;
  let mockProvider: jest.Mocked<SeriesMetadataProvider>;

  beforeEach(() => {
    mockSeriesRepository = {
      getSeriesMetadata: jest.fn(),
      upsertSeriesMetadata: jest.fn(),
      updateSeriesMetadata: jest.fn(),
      insertSeriesPoint: jest.fn(),
      insertSeriesPointsBatch: jest.fn(),
      getSeriesStats: jest.fn(),
      getLastDate: jest.fn(),
      upsertPoints: jest.fn(),
      deletePointsInRange: jest.fn(),
      getAllSeries: jest.fn(),
    } as jest.Mocked<ISeriesRepository>;

    mockSeriesMappingRepository = {
      getMappingsByProvider: jest.fn(),
      getAllMappings: jest.fn(),
      insertMapping: jest.fn(),
    } as jest.Mocked<ISeriesMappingRepository>;

    mockProvider = {
      getProviderName: jest.fn(),
      fetchAvailableSeries: jest.fn(),
      findSeriesByExternalId: jest.fn(),
      buildMetadata: jest.fn(),
    } as jest.Mocked<SeriesMetadataProvider>;

    useCase = new PopulateSeriesUseCase(
      mockSeriesRepository,
      mockSeriesMappingRepository,
      mockProvider
    );
  });

  describe('execute', () => {
    it('should populate series when mappings exist and series are found', async () => {
      // Arrange
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          description: 'Reservas Internacionales',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
        },
      ];

      const availableSeries = [
        {
          idVariable: 1,
          descripcion: 'Reservas Internacionales',
          categoria: 'Principales Variables',
        },
      ];

      mockProvider.getProviderName.mockReturnValue('BCRA_MONETARIAS');
      mockSeriesMappingRepository.getMappingsByProvider.mockResolvedValue(mappings);
      mockProvider.fetchAvailableSeries.mockResolvedValue(availableSeries);
      mockProvider.findSeriesByExternalId.mockReturnValue(availableSeries[0]);
      mockProvider.buildMetadata.mockReturnValue({
        frequency: 'daily',
        unit: 'USD',
        metadata: { bcra_idVariable: 1 },
      });
      mockSeriesRepository.getSeriesMetadata.mockResolvedValue(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.seriesPopulated).toBe(1);
      expect(result.seriesSkipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(mockSeriesRepository.upsertSeriesMetadata).toHaveBeenCalledTimes(1);
    });

    it('should skip series when not found in available series', async () => {
      // Arrange
      const mappings = [
        {
          id: 1,
          internal_series_id: '999',
          external_series_id: '999',
          description: 'Non-existent series',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['test'],
        },
      ];

      const availableSeries = [
        {
          idVariable: 1,
          descripcion: 'Reservas Internacionales',
        },
      ];

      mockProvider.getProviderName.mockReturnValue('BCRA_MONETARIAS');
      mockSeriesMappingRepository.getMappingsByProvider.mockResolvedValue(mappings);
      mockProvider.fetchAvailableSeries.mockResolvedValue(availableSeries);
      mockProvider.findSeriesByExternalId.mockReturnValue(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.seriesPopulated).toBe(0);
      expect(result.seriesSkipped).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockSeriesRepository.upsertSeriesMetadata).not.toHaveBeenCalled();
    });

    it('should update existing series instead of creating new one', async () => {
      // Arrange
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          description: 'Reservas Internacionales',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
        },
      ];

      const availableSeries = [
        {
          idVariable: 1,
          descripcion: 'Reservas Internacionales',
        },
      ];

      const existingSeries = {
        id: '1',
        source: 'bcra' as const,
        frequency: 'daily' as const,
        unit: 'USD',
        metadata: { bcra_idVariable: 1 },
      };

      mockProvider.getProviderName.mockReturnValue('BCRA_MONETARIAS');
      mockSeriesMappingRepository.getMappingsByProvider.mockResolvedValue(mappings);
      mockProvider.fetchAvailableSeries.mockResolvedValue(availableSeries);
      mockProvider.findSeriesByExternalId.mockReturnValue(availableSeries[0]);
      mockProvider.buildMetadata.mockReturnValue({
        frequency: 'daily',
        unit: 'USD',
        metadata: { bcra_idVariable: 1, updated: true },
      });
      mockSeriesRepository.getSeriesMetadata.mockResolvedValue(existingSeries);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(true);
      expect(result.seriesPopulated).toBe(1);
      expect(mockSeriesRepository.updateSeriesMetadata).toHaveBeenCalledTimes(1);
      expect(mockSeriesRepository.updateSeriesMetadata).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ bcra_idVariable: 1, updated: true })
      );
    });

    it('should handle errors gracefully and continue processing other series', async () => {
      // Arrange
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          description: 'Reservas Internacionales',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
        },
        {
          id: 2,
          internal_series_id: '2',
          external_series_id: '2',
          description: 'Base Monetaria',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['base monetaria'],
        },
      ];

      const availableSeries = [
        {
          idVariable: 1,
          descripcion: 'Reservas Internacionales',
        },
        {
          idVariable: 2,
          descripcion: 'Base Monetaria',
        },
      ];

      mockProvider.getProviderName.mockReturnValue('BCRA_MONETARIAS');
      mockSeriesMappingRepository.getMappingsByProvider.mockResolvedValue(mappings);
      mockProvider.fetchAvailableSeries.mockResolvedValue(availableSeries);
      mockProvider.findSeriesByExternalId
        .mockReturnValueOnce(availableSeries[0])
        .mockReturnValueOnce(availableSeries[1]);
      mockProvider.buildMetadata
        .mockReturnValueOnce({
          frequency: 'daily',
          unit: 'USD',
          metadata: { bcra_idVariable: 1 },
        })
        .mockReturnValueOnce({
          frequency: 'daily',
          unit: 'ARS',
          metadata: { bcra_idVariable: 2 },
        });
      mockSeriesRepository.getSeriesMetadata
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      const firstError = result.errors[0];
      expect(firstError).toBeDefined();
      expect(firstError!.seriesId).toBe('1');
      expect(firstError!.error).toContain('Database error');
    });

    it('should process all mappings even when some fail', async () => {
      // Arrange
      const mappings = [
        {
          id: 1,
          internal_series_id: '1',
          external_series_id: '1',
          description: 'Reservas Internacionales',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['reservas'],
        },
        {
          id: 2,
          internal_series_id: '2',
          external_series_id: '2',
          description: 'Base Monetaria',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['base monetaria'],
        },
        {
          id: 3,
          internal_series_id: '3',
          external_series_id: '3',
          description: 'Another series',
          provider_name: 'BCRA_MONETARIAS',
          keywords: ['other'],
        },
      ];

      const availableSeries = [
        { idVariable: 1, descripcion: 'Reservas Internacionales' },
        { idVariable: 2, descripcion: 'Base Monetaria' },
        { idVariable: 3, descripcion: 'Another series' },
      ];

      mockProvider.getProviderName.mockReturnValue('BCRA_MONETARIAS');
      mockSeriesMappingRepository.getMappingsByProvider.mockResolvedValue(mappings);
      mockProvider.fetchAvailableSeries.mockResolvedValue(availableSeries);
      mockProvider.findSeriesByExternalId.mockImplementation(id =>
        availableSeries.find(s => s.idVariable === parseInt(id))
      );
      mockProvider.buildMetadata.mockReturnValue({
        frequency: 'daily',
        unit: 'USD',
        metadata: {},
      });
      mockSeriesRepository.getSeriesMetadata
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Error on second'))
        .mockResolvedValueOnce(null);

      // Act
      const result = await useCase.execute();

      // Assert
      expect(result.success).toBe(false);
      expect(result.seriesPopulated).toBe(2);
      expect(result.errors).toHaveLength(1);
    });
  });
});
