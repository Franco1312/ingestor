import type { SeriesPoint } from './entities/index.js';

/**
 * Health status for a provider
 */
export interface ProviderHealth {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

/**
 * Parameters for fetching series data from a provider
 */
export interface FetchRangeParams {
  externalId: string;
  from: string; // YYYY-MM-DD format
  to?: string | undefined; // YYYY-MM-DD format, optional
  limit?: number | undefined;
  offset?: number | undefined;
}

/**
 * Result of fetching series data from a provider
 */
export interface FetchRangeResult {
  points: SeriesPoint[];
  totalCount: number;
  hasMore: boolean;
  provider: string;
}

/**
 * Abstract interface for series data providers
 * This allows seamless switching between different data sources (BCRA, Datos Argentina, etc.)
 */
export interface SeriesProvider {
  /**
   * Provider name for logging and identification
   */
  readonly name: string;

  /**
   * Check if the provider is healthy and available
   */
  health(): Promise<ProviderHealth>;

  /**
   * Fetch series data for a specific range
   */
  fetchRange(params: FetchRangeParams): Promise<FetchRangeResult>;

  /**
   * Get available series from this provider
   * Useful for discovery and validation
   */
  getAvailableSeries?(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      frequency?: string;
    }>
  >;
}

/**
 * Provider chain configuration
 */
export interface ProviderChainConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  timeout: number;
  retries: number;
}

/**
 * Provider chain for automatic failover between providers
 */
export interface ProviderChain {
  /**
   * Fetch data using the provider chain with automatic failover
   */
  fetchRange(params: FetchRangeParams): Promise<FetchRangeResult>;

  /**
   * Get the health status of all providers in the chain
   */
  getHealthStatus(): Promise<Record<string, ProviderHealth>>;
}
