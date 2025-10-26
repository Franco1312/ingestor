import { Pool, PoolClient, PoolConfig } from 'pg';
import { logger } from '@/infrastructure/log/logger.js';
import { config } from '@/infrastructure/config/index.js';
import { DATABASE as events } from '@/infrastructure/log/log-events.js';

class DatabasePool {
  private pool: Pool;

  constructor() {
    const poolConfig: PoolConfig = {
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

    // Enable SSL for RDS connections
    if (config.database.url?.includes('rds.amazonaws.com')) {
      poolConfig.ssl = { rejectUnauthorized: false };
    }

    this.pool = new Pool(poolConfig);

    this.pool.on('error', err => {
      logger.error({
        event: events.QUERY,
        msg: 'Unexpected error on idle client',
        err: err as Error,
      });
    });

    this.pool.on('connect', () => {
      logger.info({
        event: events.GET_CLIENT,
        msg: 'New client connected to database',
      });
    });

    this.pool.on('acquire', () => {
      logger.info({
        event: events.GET_CLIENT,
        msg: 'Client acquired from pool',
      });
    });

    this.pool.on('remove', () => {
      logger.info({
        event: events.GET_CLIENT,
        msg: 'Client removed from pool',
      });
    });
  }

  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      logger.info({
        event: events.GET_CLIENT,
        msg: 'Database client acquired',
      });
      return client;
    } catch (error) {
      logger.error({
        event: events.GET_CLIENT,
        msg: 'Failed to acquire database client',
        err: error as Error,
      });
      throw error;
    }
  }

  async query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
    const client = await this.getClient();
    try {
      logger.info({
        event: events.QUERY,
        msg: 'Executing database query',
        data: { query: text.substring(0, 100) + '...' },
      });
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      logger.error({
        event: events.QUERY,
        msg: 'Database query failed',
        err: error as Error,
        data: { query: text.substring(0, 100) + '...' },
      });
      throw error;
    } finally {
      client.release();
      logger.info({
        event: events.GET_CLIENT,
        msg: 'Database client released',
      });
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      logger.info({
        event: events.QUERY,
        msg: 'Database transaction started',
      });

      const result = await callback(client);

      await client.query('COMMIT');
      logger.info({
        event: events.QUERY,
        msg: 'Database transaction committed',
      });

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.info({
        event: events.QUERY,
        msg: 'Database transaction rolled back',
      });
      throw error;
    } finally {
      client.release();
      logger.info({
        event: events.GET_CLIENT,
        msg: 'Database client released',
      });
    }
  }

  async isConnected(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error({
        event: events.IS_CONNECTED,
        msg: 'Database connectivity check failed',
        err: error as Error,
      });
      return false;
    }
  }

  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info({
        event: events.END,
        msg: 'Database connection pool closed',
      });
    } catch (error) {
      logger.error({
        event: events.END,
        msg: 'Error closing database pool',
        err: error as Error,
      });
    }
  }

  getPoolStats(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export const db = new DatabasePool();
