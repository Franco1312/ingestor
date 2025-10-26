import type { SeriesPoint } from '@/domain/entities/index.js';

export interface ProviderHealth {
  isHealthy: boolean;
  responseTime?: number;
  error?: string;
}

export interface FetchRangeParams {
  externalId: string;
  from: string;
  to?: string | undefined;
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
