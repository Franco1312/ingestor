#!/usr/bin/env node

import { Command } from 'commander';
import { DiscoverSeriesUseCase } from '../../application/usecases/discoverSeries.js';
import { seriesRepository } from '../../infrastructure/db/seriesRepo.js';
import { logger } from '../../infrastructure/log/logger.js';
import { CLI as events } from '../../infrastructure/log/log-events.js';

const program = new Command();

program
  .name('discover')
  .description('Discovers and maps BCRA Monetarias series to the local catalog')
  .action(async () => {
    logger.info({
      event: events.DISCOVER,
      msg: 'Starting BCRA Monetarias discovery',
    });

    try {
      // Initialize use case with repository
      const discoverUseCase = new DiscoverSeriesUseCase(seriesRepository);

      // Execute discovery
      logger.info({
        event: events.DISCOVER,
        msg: 'Executing discovery use case',
      });
      const result = await discoverUseCase.execute();

      // Display results
      console.log('\n🔍 Discovery Results:');
      console.log('=====================');

      if (result.mappedSeries.length > 0) {
        console.log('\n✅ Successfully Mapped Series:');
        result.mappedSeries.forEach(series => {
          console.log(`   ${series.seriesId}: ${series.description}`);
          console.log(`   └─ BCRA Variable ID: ${series.bcraIdVariable}`);
        });
      }

      if (result.unmappedSeries.length > 0) {
        console.log('\n⚠️  Unmapped Series:');
        result.unmappedSeries.forEach(series => {
          console.log(`   ${series.seriesId} (${series.source}): ${series.reason}`);
        });
      }

      console.log('\n📊 Summary:');
      console.log(`   Total mapped: ${result.mappedSeries.length}`);
      console.log(`   Total unmapped: ${result.unmappedSeries.length}`);

      logger.info({
        event: events.DISCOVER,
        msg: 'Discovery completed successfully',
        data: {
          mappedCount: result.mappedSeries.length,
          unmappedCount: result.unmappedSeries.length,
        },
      });
    } catch (error) {
      logger.error({
        event: events.DISCOVER,
        msg: 'Discovery command failed',
        err: error as Error,
      });
      console.error(
        '\n❌ Discovery failed:',
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  });

program.parse(process.argv);
