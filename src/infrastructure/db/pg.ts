import { Pool, PoolClient } from 'pg';
import { logger } from '../log/logger.js';
import { config } from '../config/index.js';

// Database connection pool
class DatabasePool {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    // Handle pool errors
    this.pool.on('error', err => {
      logger.error('Unexpected error on idle client', { error: err.message });
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      logger.debug('New client connected to database');
    });

    this.pool.on('acquire', () => {
      logger.debug('Client acquired from pool');
    });

    this.pool.on('remove', () => {
      logger.debug('Client removed from pool');
    });
  }

  /**
   * Get a client from the pool
   */
  async getClient(): Promise<PoolClient> {
    try {
      const client = await this.pool.connect();
      logger.debug('Database client acquired');
      return client;
    } catch (error) {
      logger.error('Failed to acquire database client', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Execute a query with automatic client management
   */
  async query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
    const client = await this.getClient();
    try {
      logger.debug('Executing database query', { query: text.substring(0, 100) + '...' });
      const result = await client.query(text, params);
      return result.rows;
    } catch (error) {
      logger.error('Database query failed', {
        error: error instanceof Error ? error.message : String(error),
        query: text.substring(0, 100) + '...',
      });
      throw error;
    } finally {
      client.release();
      logger.debug('Database client released');
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      logger.debug('Database transaction started');

      const result = await callback(client);

      await client.query('COMMIT');
      logger.debug('Database transaction committed');

      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.debug('Database transaction rolled back');
      throw error;
    } finally {
      client.release();
      logger.debug('Database client released');
    }
  }

  /**
   * Check database connectivity
   */
  async isConnected(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      logger.error('Database connectivity check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database connection pool closed');
    } catch (error) {
      logger.error('Error closing database pool', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get pool statistics
   */
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

// Export singleton database pool instance
export const db = new DatabasePool();
