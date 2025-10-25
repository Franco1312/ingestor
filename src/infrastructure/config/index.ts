import { localConfig } from '@/infrastructure/config/environments/local.js';
import { stagingConfig } from '@/infrastructure/config/environments/staging.js';
import { productionConfig } from '@/infrastructure/config/environments/production.js';
import type { EnvironmentConfig } from '@/infrastructure/config/types.js';

function getEnvironmentConfig(): EnvironmentConfig {
  const nodeEnv = process.env.NODE_ENV || 'local';

  switch (nodeEnv) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    case 'local':
    case 'development':
    default:
      return localConfig;
  }
}

export const config = getEnvironmentConfig();

export type {
  EnvironmentConfig,
  ExternalServiceConfig,
  ExternalServicesConfig,
} from '@/infrastructure/config/types.js';
