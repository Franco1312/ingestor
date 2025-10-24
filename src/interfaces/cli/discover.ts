#!/usr/bin/env node

import { Command } from 'commander';
import { DiscoverSeriesUseCase } from '../../application/usecases/discoverSeries.js';
import { seriesRepository } from '../../infrastructure/db/seriesRepo.js';
import { logger } from '../../infrastructure/log/logger.js';
import { CLI as events } from '../../infrastructure/log/log-events.js';

interface DiscoveryResult {
  mappedSeries: Array<{
    seriesId: string;
    description: string;
    bcraIdVariable: number;
  }>;
  unmappedSeries: Array<{
    seriesId: string;
    source: string;
    reason: string;
  }>;
}

class DiscoverCLI {
  private discoverUseCase: DiscoverSeriesUseCase;

  constructor() {
    this.discoverUseCase = new DiscoverSeriesUseCase(seriesRepository);
  }

  private async executeDiscovery(): Promise<DiscoveryResult> {
    return await this.discoverUseCase.execute();
  }

  private logDiscoveryResults(result: DiscoveryResult): void {
    logger.info({
      event: events.DISCOVER,
      msg: 'Discovery completed',
      data: {
        mapped: result.mappedSeries.length,
        unmapped: result.unmappedSeries.length,
      },
    });
  }

  async run(): Promise<void> {
    try {
      const result = await this.executeDiscovery();
      this.logDiscoveryResults(result);
      process.exit(0);
    } catch (error) {
      logger.error({
        event: events.DISCOVER,
        msg: 'Discovery failed',
        err: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  }
}

const program = new Command();

program
  .name('discover')
  .description('Discovers and maps BCRA Monetarias series to the local catalog')
  .action(async () => {
    const discoverCLI = new DiscoverCLI();
    await discoverCLI.run();
  });

program.parse(process.argv);
