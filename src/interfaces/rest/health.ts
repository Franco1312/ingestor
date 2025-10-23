import { db } from '../../infrastructure/db/pg.js';
import { logger } from '../../infrastructure/log/logger.js';

// Health check function
export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  services: { database: string };
  error?: string;
}> => {
  const loggerContext = logger.child({ endpoint: 'health' });

  try {
    // Check database connectivity
    const isDbConnected = await db.isConnected();

    const healthStatus = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    };

    loggerContext.info('Health check completed', {
      status: healthStatus.status,
      dbConnected: isDbConnected,
    });

    return healthStatus;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    loggerContext.error('Health check failed', { error: errorMessage });

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: 'disconnected' },
      error: errorMessage,
    };
  }
};

// Readiness check function
export const readinessCheck = async (): Promise<{
  status: string;
  timestamp: string;
  services?: { database: string };
  reason?: string;
}> => {
  const loggerContext = logger.child({ endpoint: 'readiness' });

  try {
    // Check database connectivity and basic queries
    const isDbConnected = await db.isConnected();

    if (!isDbConnected) {
      loggerContext.warn('Readiness check failed - database not connected');
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connection failed',
      };
    }

    // Test a simple query
    await db.query('SELECT 1');

    loggerContext.info('Readiness check passed');
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    loggerContext.error('Readiness check failed', { error: errorMessage });

    return {
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: errorMessage,
    };
  }
};
