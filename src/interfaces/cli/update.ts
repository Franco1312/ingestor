#!/usr/bin/env node

import { Command } from 'commander';
import { FetchAndStoreSeriesUseCase } from '../../application/usecases/fetchAndStoreSeries.js';
import { seriesRepository } from '../../infrastructure/db/seriesRepo.js';
import {
  BcraV3Provider,
  DatosSeriesProvider,
  ProviderChain,
} from '../../infrastructure/providers/index.js';
import { logger } from '../../infrastructure/log/logger.js';
import { config } from '../../infrastructure/config/index.js';
import { db } from '../../infrastructure/db/pg.js';

// Create CLI program
const program = new Command();

program
  .name('update')
  .description('Fetch and store latest time series data')
  .version('1.0.0')
  .option('-s, --series <seriesId>', 'Specific series ID to update (optional)')
  .option('-a, --all', 'Update all whitelisted series')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async options => {
    const loggerContext = logger.child({ operation: 'update' });

    try {
      // Check database connectivity
      loggerContext.info('Checking database connectivity');
      const isConnected = await db.isConnected();
      if (!isConnected) {
        loggerContext.error('Database connection failed');
        process.exit(1);
      }
      loggerContext.info('Database connection successful');

      // Initialize providers and provider chain
      const bcraProvider = new BcraV3Provider();
      const datosProvider = new DatosSeriesProvider();
      const providerChain = new ProviderChain([bcraProvider, datosProvider]);

      // Initialize use case
      const fetchAndStoreUseCase = new FetchAndStoreSeriesUseCase(
        seriesRepository,
        providerChain,
        loggerContext
      );

      let seriesToUpdate: string[];

      if (options.series) {
        // Update specific series
        seriesToUpdate = [options.series];
        loggerContext.info('Updating specific series', { seriesId: options.series });
      } else if (options.all) {
        // Update all whitelisted series
        seriesToUpdate = config.app.seriesWhitelist;
        loggerContext.info('Updating all whitelisted series', {
          seriesCount: seriesToUpdate.length,
          series: seriesToUpdate,
        });
      } else {
        // Default: update all whitelisted series
        seriesToUpdate = config.app.seriesWhitelist;
        loggerContext.info('Updating all whitelisted series (default)', {
          seriesCount: seriesToUpdate.length,
          series: seriesToUpdate,
        });
      }

      if (seriesToUpdate.length === 0) {
        loggerContext.warn('No series to update');
        console.log(
          'No series configured for update. Check SERIES_WHITELIST environment variable.'
        );
        process.exit(0);
      }

      // Execute update for all series
      const results = await fetchAndStoreUseCase.executeMultiple(seriesToUpdate);

      // Display results
      console.log('\n📊 Update Results:');
      console.log('==================');

      let totalPointsFetched = 0;
      let totalPointsStored = 0;
      let successCount = 0;

      for (const result of results) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${result.seriesId}:`);
        console.log(`   Points fetched: ${result.pointsFetched}`);
        console.log(`   Points stored: ${result.pointsStored}`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        console.log('');

        totalPointsFetched += result.pointsFetched;
        totalPointsStored += result.pointsStored;
        if (result.success) successCount++;
      }

      // Summary
      console.log('📈 Summary:');
      console.log(`   Series processed: ${results.length}`);
      console.log(`   Successful: ${successCount}`);
      console.log(`   Failed: ${results.length - successCount}`);
      console.log(`   Total points fetched: ${totalPointsFetched}`);
      console.log(`   Total points stored: ${totalPointsStored}`);

      if (successCount === results.length) {
        loggerContext.info('All series updated successfully');
        process.exit(0);
      } else {
        loggerContext.error('Some series failed to update');
        process.exit(1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggerContext.error('Update operation failed', { error: errorMessage });
      console.error('❌ Update failed:', errorMessage);
      process.exit(1);
    } finally {
      // Close database connections
      await db.close();
    }
  });

// Parse command line arguments
program.parse();
