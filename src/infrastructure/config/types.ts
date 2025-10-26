export interface ExternalServiceConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  caBundlePath?: string | undefined;
}

export interface DatabaseConfig {
  url: string;
  ssl?: boolean;
}

export interface HttpConfig {
  timeout: number;
  retries: number;
  backoffBaseMs: number;
  backoffFactor: number;
  backoffMaxMs: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  windowMs: number;
  openMs: number;
}

export interface ProviderConfig {
  primary: string;
  fallback: string;
  healthTtlMs: number;
}

export interface AppConfig {
  timezone: string;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  pageSize: number;
  seriesWhitelist: string[];
  http: HttpConfig;
  circuitBreaker: CircuitBreakerConfig;
  providers: ProviderConfig;
}

export interface ExternalServicesConfig {
  bcra: ExternalServiceConfig;
  bcraCambiarias: ExternalServiceConfig;
  datosArgentina: ExternalServiceConfig;
  dolarApi: ExternalServiceConfig;
}

export interface EnvironmentConfig {
  externalServices: ExternalServicesConfig;
  database: DatabaseConfig;
  app: AppConfig;
}
