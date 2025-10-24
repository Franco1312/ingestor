import { EnvironmentConfig } from '@/infrastructure/config/types';

export const localConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 30000,
      retries: 3,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticas/v3.0/Cambiarias',
      timeout: 30000,
      retries: 3,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    datosArgentina: {
      baseUrl: 'https://apis.datos.gob.ar/series/api',
      timeout: 30000,
      retries: 3,
    },
    dolarApi: {
      baseUrl: 'https://dolarapi.com/v1',
      timeout: 15000,
      retries: 3,
    },
  },
  database: {
    url: 'postgresql://user:pass@localhost:5433/ingestor',
  },
  app: {
    timezone: 'America/Argentina/Buenos_Aires',
    logLevel: 'info',
    pageSize: 1000,
    seriesWhitelist: ['1', '15'],
    http: {
      timeout: parseInt(process.env.HTTP_TIMEOUT_MS || '30000'),
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
      primary: process.env.PRIMARY_PROVIDER || 'BCRA_MONETARIAS',
      fallback: process.env.FALLBACK_PROVIDER || 'DATOS_SERIES',
      healthTtlMs: parseInt(process.env.PROVIDER_HEALTH_TTL_MS || '60000'),
    },
  },
};
