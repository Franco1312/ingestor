#!/usr/bin/env node

import 'dotenv/config';
import { config } from './src/infrastructure/config/env.js';
import { logger } from './src/infrastructure/log/logger.js';
import { datosSeriesClient } from './src/infrastructure/http/datosSeriesClient.js';

async function testApiConnection() {
  try {
    logger.info('Testing API connection to Datos Argentina...');

    // Test with one of the whitelisted series
    const testSeriesId = config.seriesWhitelist[0]; // Get first series from whitelist
    logger.info('Testing with series', { seriesId: testSeriesId });

    // Test fetching data for a specific period in 2024 (when data is available)
    const startDateStr = '2024-01-01';
    const endDateStr = '2024-01-31';

    logger.info('Fetching data for date range', { startDate: startDateStr, endDate: endDateStr });

    const points = await datosSeriesClient.fetchSeriesData(testSeriesId, startDateStr, endDateStr);

    logger.info('API connection successful!', {
      seriesId: testSeriesId,
      pointsFetched: points.length,
      dateRange: `${startDateStr} to ${endDateStr}`,
      samplePoints: points.slice(0, 3).map(p => ({ date: p.ts, value: p.value })),
    });

    if (points.length === 0) {
      logger.warn('No data points returned for the specified date range');
    }
  } catch (error) {
    logger.error('API connection test failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

testApiConnection();
