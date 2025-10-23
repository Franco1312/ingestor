#!/usr/bin/env node

import { Command } from 'commander';
import { BackfillSeriesUseCase } from '../../application/usecases/backfillSeries.js';
import { seriesRepository } from '../../infrastructure/db/seriesRepo.js';
import {
  BcraV3Provider,
  DatosSeriesProvider,
  ProviderChain,
} from '../../infrastructure/providers/index.js';
import { logger } from '../../infrastructure/log/logger.js';
// import { config } from '../../infrastructure/config/index.js';
import { db } from '../../infrastructure/db/pg.js';

// Create CLI program
const program = new Command();

program
  .name('backfill')
  .description('Backfill time series data for a specific date range')
  .version('1.0.0')
  .requiredOption('-s, --series <seriesId>', 'Series ID to backfill')
  .requiredOption('-f, --from <startDate>', 'Start date (YYYY-MM-DD)')
  .option('-t, --to <endDate>', 'End date (YYYY-MM-DD, defaults to today)')
  .option('--force', 'Force overwrite existing data in the date range')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async options => {
    const loggerContext = logger.child({
      operation: 'backfill',
      seriesId: options.series,
      startDate: options.from,
      endDate: options.to,
    });

    try {
      // Check database connectivity
      loggerContext.info('Checking database connectivity');
      const isConnected = await db.isConnected();
      if (!isConnected) {
        loggerContext.error('Database connection failed');
        process.exit(1);
      }
      loggerContext.info('Database connection successful');

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(options.from)) {
        console.error('❌ Invalid start date format. Use YYYY-MM-DD');
        process.exit(1);
      }

      if (options.to && !dateRegex.test(options.to)) {
        console.error('❌ Invalid end date format. Use YYYY-MM-DD');
        process.exit(1);
      }

      // Initialize providers and provider chain
      const bcraProvider = new BcraV3Provider();
      const datosProvider = new DatosSeriesProvider();
      const providerChain = new ProviderChain([bcraProvider, datosProvider]);

      // Initialize use case
      const backfillUseCase = new BackfillSeriesUseCase(
        seriesRepository,
        providerChain,
        loggerContext
      );

      // Execute backfill
      loggerContext.info('Starting backfill operation');
      const result = await backfillUseCase.execute({
        seriesId: options.series,
        fromDate: options.from,
        toDate: options.to,
      });

      // Display results
      console.log('\n📊 Backfill Results:');
      console.log('====================');
      console.log(`Series ID: ${result.seriesId}`);
      console.log(`Points fetched: ${result.pointsFetched}`);
      console.log(`Points stored: ${result.pointsStored}`);
      console.log(`Success: ${result.success ? '✅' : '❌'}`);

      if (result.error) {
        console.log(`Error: ${result.error}`);
      }

      if (result.success) {
        // Get and display series statistics
        try {
          const stats = await backfillUseCase.getBackfillStats(options.series);
          console.log('\n📈 Series Statistics:');
          console.log('=====================');
          if (stats) {
            console.log(`Total points: ${stats.totalPoints}`);
            console.log(`Date range: ${stats.firstDate} to ${stats.lastDate}`);
          } else {
            console.log('No statistics available for this series');
          }
        } catch (statsError) {
          loggerContext.warn('Failed to retrieve series statistics', {
            error: statsError instanceof Error ? statsError.message : String(statsError),
          });
        }

        loggerContext.info('Backfill operation completed successfully');
        process.exit(0);
      } else {
        loggerContext.error('Backfill operation failed', { error: result.error });
        process.exit(1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggerContext.error('Backfill operation failed', { error: errorMessage });
      console.error('❌ Backfill failed:', errorMessage);
      process.exit(1);
    } finally {
      // Close database connections
      await db.close();
    }
  });

// Parse command line arguments
program.parse();
