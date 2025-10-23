#!/usr/bin/env node

import { Command } from 'commander';
import { BackfillSeriesUseCase } from '../../application/usecases/backfillSeries.js';
import { seriesRepository } from '../../infrastructure/db/seriesRepo.js';
import { BcraMonetariasProvider, ProviderChain } from '../../infrastructure/providers/index.js';
import { logger } from '../../infrastructure/log/logger.js';
import { CLI as events } from '../../infrastructure/log/log-events.js';
// import { config } from '../../infrastructure/config/index.js';

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
    try {
      logger.info({
        event: events.BACKFILL,
        msg: 'Starting backfill operation',
        data: {
          seriesId: options.series,
          startDate: options.from,
          endDate: options.to,
        },
      });

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
      const bcraMonetariasProvider = new BcraMonetariasProvider();
      const providerChain = new ProviderChain([bcraMonetariasProvider]);

      // Initialize use case
      const backfillUseCase = new BackfillSeriesUseCase(seriesRepository, providerChain);

      // Execute backfill
      logger.info({
        event: events.BACKFILL,
        msg: 'Starting backfill operation',
      });
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
          logger.info({
            event: events.BACKFILL,
            msg: 'Failed to retrieve series statistics',
            data: {
              error: statsError instanceof Error ? statsError.message : String(statsError),
            },
          });
        }

        logger.info({
          event: events.BACKFILL,
          msg: 'Backfill operation completed successfully',
        });
        process.exit(0);
      } else {
        logger.error({
          event: events.BACKFILL,
          msg: 'Backfill operation failed',
          err: new Error(result.error || 'Unknown error'),
        });
        process.exit(1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        event: events.BACKFILL,
        msg: 'Backfill operation failed',
        err: error as Error,
      });
      console.error('❌ Backfill failed:', errorMessage);
      process.exit(1);
    } finally {
      // Close database connections
      // Repository handles database connection cleanup
    }
  });

// Parse command line arguments
program.parse();
