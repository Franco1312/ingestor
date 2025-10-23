#!/usr/bin/env node

import 'dotenv/config';
import { config } from './src/infrastructure/config/env.js';
import { logger } from './src/infrastructure/log/logger.js';
import { db } from './src/infrastructure/db/pg.js';

async function testConnection() {
  try {
    logger.info('Testing database connection...');

    // Test config loading
    logger.info('Config loaded successfully', {
      databaseUrl: config.databaseUrl.replace(/\/\/.*@/, '//***:***@'),
      seriesBase: config.datosSeriesBase,
      whitelist: config.seriesWhitelist.length + ' series',
    });

    // Test database connection
    const client = await db.getClient();
    const result = await client.query('SELECT version(), current_database(), current_user');

    logger.info('Database connection successful', {
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      database: result.rows[0].current_database,
      user: result.rows[0].current_user,
    });

    // Test TimescaleDB extension
    const timescaleResult = await client.query(
      "SELECT extversion FROM pg_extension WHERE extname = 'timescaledb'"
    );
    if (timescaleResult.rows.length > 0) {
      logger.info('TimescaleDB extension found', { version: timescaleResult.rows[0].extversion });
    }

    // Test tables existence
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('series', 'series_points')
      ORDER BY table_name
    `);

    logger.info('Database tables found', {
      tables: tablesResult.rows.map(r => r.table_name),
    });

    client.release();
    logger.info('Connection test completed successfully');
  } catch (error) {
    logger.error('Connection test failed', { error: error.message });
    process.exit(1);
  }
}

testConnection();
