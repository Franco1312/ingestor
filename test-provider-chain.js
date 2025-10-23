#!/usr/bin/env node

import 'dotenv/config';
import { config } from './src/infrastructure/config/env.js';
import { logger } from './src/infrastructure/log/logger.js';
import {
  BcraV3Provider,
  DatosSeriesProvider,
  ProviderChain,
} from './src/infrastructure/providers/index.js';

async function testProviderChain() {
  try {
    logger.info('Testing provider chain with BCRA as primary and Datos Argentina as fallback...');

    // Initialize providers
    const bcraProvider = new BcraV3Provider();
    const datosProvider = new DatosSeriesProvider();
    const providerChain = new ProviderChain([bcraProvider, datosProvider]);

    // Test provider health
    logger.info('Checking provider health...');
    const healthStatus = await providerChain.getHealthStatus();

    logger.info('Provider health status:', {
      bcra: healthStatus.BCRA_V3,
      datos: healthStatus.DATOS_SERIES,
    });

    // Test with a known series ID (using Datos Argentina format for now)
    const testSeriesId = '143.3_NO_PR_2004_A_21:IPC';
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';

    logger.info('Testing data fetch with provider chain', {
      seriesId: testSeriesId,
      startDate,
      endDate,
    });

    try {
      const result = await providerChain.fetchRange({
        externalId: testSeriesId,
        from: startDate,
        to: endDate,
        limit: 10,
      });

      logger.info('Data fetch successful!', {
        provider: result.provider,
        pointsFetched: result.points.length,
        totalCount: result.totalCount,
        hasMore: result.hasMore,
        samplePoints: result.points.slice(0, 3).map(p => ({ date: p.ts, value: p.value })),
      });
    } catch (error) {
      logger.error('Data fetch failed', {
        error: error.message,
      });
    }

    logger.info('Provider chain test completed');
  } catch (error) {
    logger.error('Provider chain test failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

testProviderChain();
