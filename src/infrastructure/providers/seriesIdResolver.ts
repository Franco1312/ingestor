import type { SeriesMappingService } from '@/domain/services/seriesMappingService.js';
import { logger } from '@/infrastructure/log/logger.js';
import { SERIES_MAPPING as events } from '@/infrastructure/log/log-events.js';

export class SeriesIdResolver {
  private cache = new Map<string, string>();

  constructor(private readonly mappingService: SeriesMappingService) {}

  async resolveToInternalId(externalId: string, providerName: string): Promise<string> {
    const cacheKey = `${externalId}:${providerName}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const internalId = await this.mappingService.getInternalSeriesId(externalId, providerName);
    const result = internalId || externalId;

    this.cache.set(cacheKey, result);

    logger.info({
      event: events.GET_INTERNAL_ID,
      msg: internalId
        ? 'Resolved external ID to internal ID'
        : 'No mapping found, using external ID as internal ID',
      data: { externalId, internalId: result, providerName },
    });

    return result;
  }

  async resolveToExternalId(internalId: string, providerName: string): Promise<string> {
    const externalId = await this.mappingService.getExternalSeriesId(internalId, providerName);

    if (externalId) {
      logger.info({
        event: events.GET_EXTERNAL_ID,
        msg: 'Resolved internal ID to external ID',
        data: { internalId, externalId, providerName },
      });
      return externalId;
    }

    logger.info({
      event: events.GET_EXTERNAL_ID,
      msg: 'No mapping found, using internal ID as external ID',
      data: { internalId, providerName },
    });

    return internalId;
  }
}
