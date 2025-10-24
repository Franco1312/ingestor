import type { SeriesPoint } from './entities/index.js';

export interface ProviderHealth {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

export interface FetchRangeParams {
  externalId: string;
  from: string; // YYYY-MM-DD format
  to?: string | undefined; // YYYY-MM-DD format, optional
  limit?: number | undefined;
  offset?: number | undefined;
}

export interface FetchRangeResult {
  points: SeriesPoint[];
  totalCount: number;
  hasMore: boolean;
  provider: string;
}

export interface SeriesProvider {
  readonly name: string;

  health(): Promise<ProviderHealth>;

  fetchRange(params: FetchRangeParams): Promise<FetchRangeResult>;

  getAvailableSeries?(): Promise<
    Array<{
      id: string;
      title: string;
      description?: string;
      frequency?: string;
    }>
  >;
}

export interface ProviderChainConfig {
  primaryProvider: string;
  fallbackProviders: string[];
  timeout: number;
  retries: number;
}

export interface ProviderChain {
  fetchRange(params: FetchRangeParams): Promise<FetchRangeResult>;

  getHealthStatus(): Promise<Record<string, ProviderHealth>>;
}
