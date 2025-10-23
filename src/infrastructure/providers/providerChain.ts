import type {
  SeriesProvider,
  ProviderHealth,
  FetchRangeParams,
  FetchRangeResult,
  ProviderChain as IProviderChain,
} from '../../domain/providers.js';
import { logger } from '../log/logger.js';
import { config } from '../config/index.js';

/**
 * Provider chain for automatic failover between different data sources
 */
export class ProviderChain implements IProviderChain {
  private readonly providers: Map<string, SeriesProvider>;
  private readonly primaryProvider: string;
  private readonly fallbackProviders: string[];
  private readonly loggerContext = logger.child({ component: 'ProviderChain' });

  constructor(providers: SeriesProvider[]) {
    this.providers = new Map();

    // Register providers
    for (const provider of providers) {
      this.providers.set(provider.name, provider);
    }

    // Configure provider order based on config
    this.primaryProvider = config.app.providers.primary;
    this.fallbackProviders = providers
      .filter(p => p.name !== this.primaryProvider)
      .map(p => p.name);

    this.loggerContext.info('Provider chain initialized', {
      primaryProvider: this.primaryProvider,
      fallbackProviders: this.fallbackProviders,
      availableProviders: Array.from(this.providers.keys()),
    });
  }

  /**
   * Fetch data using the provider chain with automatic failover
   */
  async fetchRange(params: FetchRangeParams): Promise<FetchRangeResult> {
    const providersToTry = [this.primaryProvider, ...this.fallbackProviders];

    this.loggerContext.info('Starting data fetch with provider chain', {
      externalId: params.externalId,
      from: params.from,
      to: params.to,
      providersToTry,
    });

    let lastError: Error | null = null;

    for (const providerName of providersToTry) {
      const provider = this.providers.get(providerName);

      if (!provider) {
        this.loggerContext.warn('Provider not found, skipping', { providerName });
        continue;
      }

      try {
        // Check provider health before attempting to fetch
        const health = await provider.health();

        if (!health.isHealthy) {
          this.loggerContext.warn('Provider is unhealthy, skipping', {
            providerName,
            health,
          });
          continue;
        }

        this.loggerContext.info('Attempting to fetch data', {
          providerName,
          responseTime: health.responseTime,
        });

        // Attempt to fetch data from this provider
        const result = await provider.fetchRange(params);

        this.loggerContext.info('Data fetch successful', {
          providerName,
          pointsFetched: result.points.length,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
        });

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        this.loggerContext.warn('Provider failed, trying next provider', {
          providerName,
          error: lastError.message,
          remainingProviders: providersToTry.slice(providersToTry.indexOf(providerName) + 1),
        });

        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    this.loggerContext.error('All providers failed to fetch data', {
      externalId: params.externalId,
      from: params.from,
      to: params.to,
      lastError: lastError?.message,
      providersTried: providersToTry,
    });

    throw lastError || new Error('All providers failed to fetch data');
  }

  /**
   * Get the health status of all providers in the chain
   */
  async getHealthStatus(): Promise<Record<string, ProviderHealth>> {
    const healthStatus: Record<string, ProviderHealth> = {};

    this.loggerContext.debug('Checking health status of all providers');

    // Check health of all providers in parallel
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

    this.loggerContext.info('Provider health check completed', {
      healthyProviders,
      totalProviders,
      healthStatus,
    });

    return healthStatus;
  }

  /**
   * Get the primary provider
   */
  getPrimaryProvider(): SeriesProvider | undefined {
    return this.providers.get(this.primaryProvider);
  }

  /**
   * Get a specific provider by name
   */
  getProvider(name: string): SeriesProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a specific provider is available
   */
  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
}
