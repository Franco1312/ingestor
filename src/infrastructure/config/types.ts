export interface ExternalServiceConfig {
  baseUrl: string;
  timeout: number;
  caBundlePath?: string | undefined;
}

export interface DatabaseConfig {
  url: string;
}

export interface AppConfig {
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
}

export interface ExternalServicesConfig {
  bcra: ExternalServiceConfig;
  bcraCambiarias: ExternalServiceConfig;
}

export interface EnvironmentConfig {
  externalServices: ExternalServicesConfig;
  database: DatabaseConfig;
  app: AppConfig;
}
