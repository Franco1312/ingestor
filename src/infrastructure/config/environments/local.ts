import dotenv from 'dotenv';
import { EnvironmentConfig } from '@/infrastructure/config/types';

dotenv.config();

export const localConfig: EnvironmentConfig = {
  externalServices: {
    bcra: {
      baseUrl: 'https://api.bcra.gob.ar',
      timeout: 30000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
    bcraCambiarias: {
      baseUrl: 'https://api.bcra.gob.ar/estadisticascambiarias/v1.0',
      timeout: 30000,
      caBundlePath: process.env.BCRA_CA_BUNDLE_PATH,
    },
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  app: {
    logLevel: 'info',
  },
};
