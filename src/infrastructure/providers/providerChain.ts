import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
  ProviderChain as IProviderChain,
} from '@/domain/providers.js';
import { logger } from '@/infrastructure/log/logger.js';
import { config } from '@/infrastructure/config/index.js';
import { PROVIDER_CHAIN as events } from '@/infrastructure/log/log-events.js';

export class ProviderChain implements IProviderChain {
  private readonly providers: Map<string, SeriesProvider>;
  private readonly primaryProvider: string;
  private readonly fallbackProviders: string[];

  constructor(providers: SeriesProvider[]) {
    this.providers = new Map();

    for (const provider of providers) {
      this.providers.set(provider.name, provider);
    }

    this.primaryProvider = config.app.providers.primary;
    this.fallbackProviders = providers
      .filter(p => p.name !== this.primaryProvider)
      .map(p => p.name);

    logger.info({
      event: events.FETCH_RANGE,
      msg: 'Provider chain initialized',
      data: {
        primaryProvider: this.primaryProvider,
        fallbackProviders: this.fallbackProviders,
        availableProviders: Array.from(this.providers.keys()),
      },
    });
  }

  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const suggestedProvider = this.suggestProvider(params.externalId);
    const providersToTry = [
      suggestedProvider,
      ...this.fallbackProviders.filter(p => p !== suggestedProvider),
    ];

    logger.info({
      event: events.FETCH_RANGE,
      msg: 'Starting data fetch with provider chain',
      data: {
        externalId: params.externalId,
        from: params.from,
        to: params.to,
        suggestedProvider,
        providersToTry,
      },
    });

    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Provider not found, skipping',
          data: { providerName },
        });
        continue;
      }

      try {
        const health = await provider.health();

        if (!health.isHealthy) {
          logger.info({
            event: events.FETCH_RANGE,
            msg: 'Provider is unhealthy, skipping',
            data: {
              providerName,
              health,
            },
          });
          continue;
        }

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Attempting to fetch data',
          data: {
            providerName,
            responseTime: health.responseTime,
          },
        });

        const result = await provider.fetchRange(params);

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Data fetch successful',
          data: {
            providerName,
            pointsFetched: result.points.length,
            totalCount: result.totalCount,
            hasMore: result.hasMore,
          },
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        logger.info({
          event: events.FETCH_RANGE,
          msg: 'Provider failed, trying next provider',
          data: {
            providerName,
            error: lastError.message,
            remainingProviders: providersToTry.slice(providersToTry.indexOf(providerName) + 1),
          },
        });

        continue;
      }
    }

    logger.error({
      event: events.FETCH_RANGE,
      msg: 'All providers failed to fetch data',
      err: lastError || new Error('All providers failed to fetch data'),
      data: {
        externalId: params.externalId,
        from: params.from,
        to: params.to,
        providersTried: providersToTry,
      },
    });

    throw lastError || new Error('All providers failed to fetch data');
  }

  async getHealthStatus(): Promise<Record<string, ProviderHealth>> {
    const healthStatus: Record<string, ProviderHealth> = {};

    logger.info({
      event: events.HEALTH,
      msg: 'Checking health status of all providers',
    });

    const healthChecks = Array.from(this.providers.entries()).map(async ([name, provider]) => {
      try {
        const health = await provider.health();
        return [name, health] as [string, ProviderHealth];
      } catch (error) {
        return [
          name,
          {
            isHealthy: false,
            error: error instanceof Error ? error.message : String(error),
          },
        ] as [string, ProviderHealth];
      }
    });

    const results = await Promise.all(healthChecks);

    for (const [name, health] of results) {
      healthStatus[name] = health;
    }

    const healthyProviders = Object.entries(healthStatus).filter(
      ([, health]) => health.isHealthy
    ).length;
    const totalProviders = Object.keys(healthStatus).length;

    logger.info({
      event: events.HEALTH,
      msg: 'Provider health check completed',
      data: {
        healthyProviders,
        totalProviders,
        healthStatus,
      },
    });

    return healthStatus;
  }

  getPrimaryProvider(): SeriesProvider | undefined {
    return this.providers.get(this.primaryProvider);
  }

  getProvider(name: string): SeriesProvider | undefined {
    return this.providers.get(name);
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }

  private suggestProvider(externalId: string): string {
    if (externalId.startsWith('dolarapi.')) {
      return 'DOLARAPI';
    }

    if (externalId.startsWith('bcra.usd_official')) {
      return 'BCRA_CAMBIARIAS';
    }

    if (externalId.startsWith('indec.')) {
      return 'DATOS_SERIES';
    }

    if (externalId.startsWith('bcra.') || /^\d+$/.test(externalId)) {
      return 'BCRA_MONETARIAS';
    }

    return this.primaryProvider;
  }
}
