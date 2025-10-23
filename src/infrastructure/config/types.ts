/**
 * External service configuration
 */
export interface ExternalServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  caBundlePath?: string | undefined;
}

/**
 * Database configuration
 */
export interface DatabaseConfig {
  url: string;
}

/**
 * HTTP client configuration
 */
export interface HttpConfig {
  timeout: number;
  retries: number;
  backoffBaseMs: number;
  backoffFactor: number;
  backoffMaxMs: number;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  windowMs: number;
  openMs: number;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  primary: string;
  fallback: string;
  healthTtlMs: number;
}

/**
 * Application configuration
 */
export interface AppConfig {
  timezone: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  pageSize: number;
  seriesWhitelist: string[];
  http: HttpConfig;
  circuitBreaker: CircuitBreakerConfig;
  providers: ProviderConfig;
}

/**
 * External services configuration
 */
export interface ExternalServicesConfig {
  bcra: ExternalServiceConfig;
  bcraCambiarias: ExternalServiceConfig;
  datosArgentina: ExternalServiceConfig;
}

/**
 * Complete environment configuration
 */
export interface EnvironmentConfig {
  externalServices: ExternalServicesConfig;
  database: DatabaseConfig;
  app: AppConfig;
}
