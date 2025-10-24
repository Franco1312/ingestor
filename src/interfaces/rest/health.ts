import { db } from '@/infrastructure/db/pg.js';
import { logger } from '@/infrastructure/log/logger.js';
import { DATABASE as events } from '@/infrastructure/log/log-events.js';

export const healthCheck = async (): Promise<{
  status: string;
  timestamp: string;
  services: { database: string };
  error?: string;
}> => {
  try {
    const isDbConnected = await db.isConnected();

    const healthStatus = {
      status: isDbConnected ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: isDbConnected ? 'connected' : 'disconnected',
      },
    };

    logger.info({
      event: events.IS_CONNECTED,
      msg: 'Health check completed',
      data: {
        status: healthStatus.status,
        dbConnected: isDbConnected,
      },
    });

    return healthStatus;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      event: events.IS_CONNECTED,
      msg: 'Health check failed',
      err: error as Error,
    });

    return {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: { database: 'disconnected' },
      error: errorMessage,
    };
  }
};

export const readinessCheck = async (): Promise<{
  status: string;
  timestamp: string;
  services?: { database: string };
  reason?: string;
}> => {
  try {
    const isDbConnected = await db.isConnected();

    if (!isDbConnected) {
      logger.info({
        event: events.IS_CONNECTED,
        msg: 'Readiness check failed - database not connected',
      });
      return {
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database connection failed',
      };
    }

    await db.query('SELECT 1');

    logger.info({
      event: events.IS_CONNECTED,
      msg: 'Readiness check passed',
    });
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ready',
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({
      event: events.IS_CONNECTED,
      msg: 'Readiness check failed',
      err: error as Error,
    });

    return {
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: errorMessage,
    };
  }
};
