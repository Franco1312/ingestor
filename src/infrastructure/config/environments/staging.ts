import { EnvironmentConfig } from '../types';

/**
 * Staging environment configuration
 */
export const stagingConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 20000,
      retries: 3,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticas/v3.0/Cambiarias',
      timeout: 20000,
      retries: 3,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    datosArgentina: {
      baseUrl: 'https://apis.datos.gob.ar/series/api',
      timeout: 20000,
      retries: 3,
    },
  },
  database: {
    url: process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/ingestor',
  },
  app: {
    timezone: 'America/Argentina/Buenos_Aires',
    logLevel: 'info',
    pageSize: 1000,
    seriesWhitelist: ['143.3_NO_PR_2004_A_21:IPC', '143.3_NO_PR_2004_A_21:IPC_2024'],
    http: {
      timeout: parseInt(process.env.HTTP_TIMEOUT_MS || '20000'),
      retries: parseInt(process.env.HTTP_RETRIES || '3'),
      backoffBaseMs: parseInt(process.env.HTTP_BACKOFF_BASE_MS || '250'),
      backoffFactor: parseFloat(process.env.HTTP_BACKOFF_FACTOR || '2'),
      backoffMaxMs: parseInt(process.env.HTTP_BACKOFF_MAX_MS || '8000'),
    },
    circuitBreaker: {
      failureThreshold: parseInt(process.env.BREAKER_FAILURE_THRESHOLD || '5'),
      windowMs: parseInt(process.env.BREAKER_WINDOW_MS || '600000'),
      openMs: parseInt(process.env.BREAKER_OPEN_MS || '900000'),
    },
    providers: {
      primary: process.env.PRIMARY_PROVIDER || 'BCRA_V3',
      fallback: process.env.FALLBACK_PROVIDER || 'DATOS_SERIES',
      healthTtlMs: parseInt(process.env.PROVIDER_HEALTH_TTL_MS || '60000'),
    },
  },
};
