import { localConfig } from './environments/local.js';
import { stagingConfig } from './environments/staging.js';
import { productionConfig } from './environments/production.js';
import type { EnvironmentConfig } from './types.js';

/**
 * Get environment configuration based on NODE_ENV
 */
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

/**
 * Environment configuration instance
 */
export const config = getEnvironmentConfig();

/**
 * Export types for use in other modules
 */
export type { EnvironmentConfig, ExternalServiceConfig, ExternalServicesConfig } from './types.js';
