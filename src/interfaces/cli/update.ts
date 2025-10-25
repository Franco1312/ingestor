#!/usr/bin/env node

import { Command } from 'commander';
import { FetchAndStoreSeriesUseCase } from '@/application/usecases/fetchAndStoreSeries.js';
import { seriesRepository } from '@/infrastructure/db/seriesRepo.js';
import {
  BcraMonetariasProvider,
  BcraCambiariasProvider,
  BcraOficialProvider,
  DatosSeriesProvider,
  DolarApiProvider,
  ProviderChain,
} from '@/infrastructure/providers/index.js';
import { logger } from '@/infrastructure/log/logger.js';
import { CLI as events } from '@/infrastructure/log/log-events.js';
import { config } from '@/infrastructure/config/index.js';

interface UpdateOptions {
  series?: string;
  all?: boolean;
  verbose?: boolean;
}

function getSeriesToUpdate(options: UpdateOptions): string[] {
  return options.series ? [options.series] : config.app.seriesWhitelist;
}

function createUseCase() {
  const bcraMonetariasProvider = new BcraMonetariasProvider();
  const bcraCambiariasProvider = new BcraCambiariasProvider();
  const bcraOficialProvider = new BcraOficialProvider();
  const datosSeriesProvider = new DatosSeriesProvider();
  const dolarApiProvider = new DolarApiProvider();

  const providerChain = new ProviderChain([
    bcraMonetariasProvider,
    bcraCambiariasProvider,
    bcraOficialProvider,
    datosSeriesProvider,
    dolarApiProvider,
  ]);

  return new FetchAndStoreSeriesUseCase(seriesRepository, providerChain);
}

function handleUpdateSuccess(): void {
  logger.info({
    event: events.UPDATE,
    msg: 'Update completed successfully',
  });
  process.exit(0);
}

function handleUpdateFailure(error: string): void {
  logger.error({
    event: events.UPDATE,
    msg: 'Update failed',
    err: error,
  });
  process.exit(1);
}

async function runUpdate(options: UpdateOptions): Promise<void> {
  try {
    logger.info({
      event: events.UPDATE,
      msg: 'Starting update operation',
    });

    const seriesToUpdate = getSeriesToUpdate(options);

    if (seriesToUpdate.length === 0) {
      process.exit(0);
    }

    const fetchAndStoreUseCase = createUseCase();
    const results = await fetchAndStoreUseCase.executeMultiple(seriesToUpdate);
    const successCount = results.filter(r => r.success).length;

    if (successCount === results.length) {
      handleUpdateSuccess();
    } else {
      handleUpdateFailure('Some series failed to update');
    }
  } catch (error) {
    handleUpdateFailure(error instanceof Error ? error.message : String(error));
  }
}

const program = new Command();

program
  .name('update')
  .description('Fetch and store latest time series data')
  .version('1.0.0')
  .option('-s, --series <seriesId>', 'Specific series ID to update (optional)')
  .option('-a, --all', 'Update all whitelisted series')
  .option('-v, --verbose', 'Enable verbose logging')
  .action(async (options: UpdateOptions) => {
    await runUpdate(options);
  });

program.parse();
