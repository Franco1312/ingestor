import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BackfillBcraCambiariasUseCase } from '../backfill-bcra-cambiarias.use-case.js';
import type { ISeriesRepository } from '../../../domain/ports/index.js';
import type { SeriesMappingService } from '../../../domain/services/seriesMappingService.js';
import type { BcraCambiariasClient } from '../../../infrastructure/http/clients/bcraCambiariasClient.js';

describe('BackfillBcraCambiariasUseCase', () => {
  let useCase: BackfillBcraCambiariasUseCase;
  let mockSeriesRepository: jest.Mocked<ISeriesRepository>;
  let mockMappingService: jest.Mocked<SeriesMappingService>;
  let mockBcraCambiariasClient: jest.Mocked<BcraCambiariasClient>;

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

    mockBcraCambiariasClient = {
      getExchangeRate: jest.fn(),
      healthCheck: jest.fn(),
      getAvailableMonedas: jest.fn(),
    } as jest.Mocked<BcraCambiariasClient>;

    useCase = new BackfillBcraCambiariasUseCase(
      mockSeriesRepository,
      mockMappingService,
      mockBcraCambiariasClient
    );
  });

  describe('execute', () => {
    it('should successfully backfill cambiarias data when series exists', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      const mockBcraResponse = {
        results: [
          {
            fecha: '2024-01-01',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 950.0 }],
          },
          {
            fecha: '2024-01-02',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 955.5 }],
          },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(2);

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.pointsFetched).toBe(2);
      expect(result.pointsStored).toBe(2);
      expect(mockBcraCambiariasClient.getExchangeRate).toHaveBeenCalledWith({
        monedaISO: 'USD',
        fechaDesde: '2024-01-01',
        fechaHasta: '2024-01-31',
      });
    });

    it('should handle empty response gracefully', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      const emptyResponse = { results: [] };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(emptyResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(0);

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
        toDate: '2024-01-31',
      });

      expect(result.success).toBe(true);
      expect(result.pointsFetched).toBe(0);
      expect(result.pointsStored).toBe(0);
    });

    it('should return error when BCRA Cambiarias API fails', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockRejectedValue(new Error('API Error'));

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('API Error');
      expect(result.pointsFetched).toBe(0);
      expect(result.pointsStored).toBe(0);
    });

    it('should use external ID from mapping when available', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      const mockBcraResponse = {
        results: [
          {
            fecha: '2024-01-01',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 950.0 }],
          },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(1);

      await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
      });

      expect(mockBcraCambiariasClient.getExchangeRate).toHaveBeenCalledWith({
        monedaISO: 'USD',
        fechaDesde: '2024-01-01',
        fechaHasta: undefined,
      });
    });

    it('should skip entries without detalle', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      const mockBcraResponse = {
        results: [
          {
            fecha: '2024-01-01',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 950.0 }],
          },
          {
            fecha: '2024-01-02',
            detalle: [],
          },
          {
            fecha: '2024-01-03',
            detalle: [] as unknown as Array<{ codigoMoneda?: string; tipoCotizacion?: number }>,
          },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(1);

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(true);
      expect(result.pointsStored).toBe(1);
    });

    it('should handle multiple currencies', async () => {
      const usdMapping = {
        id: 1,
        internal_series_id: 'bcra.cambiarias.usd',
        external_series_id: 'USD',
        provider_name: 'BCRA_CAMBIARIAS',
        keywords: ['dolar', 'usd'],
        description: 'Cotización Dólar USD',
      };

      const eurMapping = {
        id: 2,
        internal_series_id: 'bcra.cambiarias.eur',
        external_series_id: 'EUR',
        provider_name: 'BCRA_CAMBIARIAS',
        keywords: ['euro', 'eur'],
        description: 'Cotización Euro',
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue([usdMapping, eurMapping]);

      const mockUsdResponse = {
        results: [
          {
            fecha: '2024-01-01',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 950.0 }],
          },
        ],
      };

      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(mockUsdResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(1);

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(true);
      expect(result.pointsStored).toBe(1);
    });

    it('should handle null or undefined tipoCotizacion values', async () => {
      const mappings = [
        {
          id: 1,
          internal_series_id: 'bcra.cambiarias.usd',
          external_series_id: 'USD',
          provider_name: 'BCRA_CAMBIARIAS',
          keywords: ['dolar', 'usd'],
          description: 'Cotización Dólar USD',
        },
      ];

      const mockBcraResponse = {
        results: [
          {
            fecha: '2024-01-01',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 950.0 }],
          },
          {
            fecha: '2024-01-02',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: null as unknown as number }],
          },
          {
            fecha: '2024-01-03',
            detalle: [{ codigoMoneda: 'USD', tipoCotizacion: 960.0 }],
          },
        ],
      };

      mockMappingService.getMappingsByProvider.mockResolvedValue(mappings);
      mockBcraCambiariasClient.getExchangeRate.mockResolvedValue(mockBcraResponse);
      mockSeriesRepository.upsertPoints.mockResolvedValue(2);

      const result = await useCase.execute({
        seriesId: 'bcra.cambiarias.usd',
        fromDate: '2024-01-01',
      });

      expect(result.success).toBe(true);
      expect(result.pointsStored).toBe(2);
    });
  });

  describe('getBackfillStats', () => {
    it('should return series statistics', async () => {
      const stats = {
        totalPoints: 365,
        firstDate: '2024-01-01',
        lastDate: '2024-12-31',
      };

      mockSeriesRepository.getSeriesStats.mockResolvedValue(stats);

      const result = await useCase.getBackfillStats('bcra.cambiarias.usd');

      expect(result).toEqual(stats);
      expect(mockSeriesRepository.getSeriesStats).toHaveBeenCalledWith('bcra.cambiarias.usd');
    });

    it('should return null when series does not exist', async () => {
      mockSeriesRepository.getSeriesStats.mockResolvedValue(null);

      const result = await useCase.getBackfillStats('bcra.cambiarias.nonexistent');

      expect(result).toBeNull();
    });
  });
});
