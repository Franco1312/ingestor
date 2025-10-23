import cron from 'node-cron';
import { FetchAndStoreSeriesUseCase } from '../../application/usecases/fetchAndStoreSeries.js';
import { seriesRepository } from '../db/seriesRepo.js';
import { BcraV3Provider, DatosSeriesProvider, ProviderChain } from '../providers/index.js';
import { logger } from '../log/logger.js';
import { config } from '../config/index.js';
import { db } from '../db/pg.js';

// Scheduler for automated data updates
export class Scheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the scheduled job
   */
  start(): void {
    if (this.cronJob) {
      logger.warn('Scheduler is already running');
      return;
    }

    // Schedule daily update at 08:05 AM Argentina time
    // Cron format: minute hour day month day-of-week
    // '5 8 * * *' = 5 minutes past 8 AM every day
    this.cronJob = cron.schedule(
      '5 8 * * *',
      async () => {
        await this.executeDailyUpdate();
      },
      {
        scheduled: false,
        timezone: config.app.timezone,
      }
    );

    this.cronJob.start();
    this.isRunning = true;

    logger.info('Scheduler started', {
      timezone: config.app.timezone,
      schedule: '5 8 * * *',
      description: 'Daily update at 08:05 AM Argentina time',
    });
  }

  /**
   * Stop the scheduled job
   */
  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      this.isRunning = false;
      logger.info('Scheduler stopped');
    }
  }

  /**
   * Execute the daily update manually
   */
  async executeDailyUpdate(): Promise<void> {
    const startTime = Date.now();
    const loggerContext = logger.child({ operation: 'dailyUpdate' });

    try {
      loggerContext.info('Starting scheduled daily update');

      // Check database connectivity
      const isConnected = await db.isConnected();
      if (!isConnected) {
        loggerContext.error('Database connection failed');
        return;
      }

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

      // Execute update for all whitelisted series
      const results = await fetchAndStoreUseCase.executeMultiple(config.app.seriesWhitelist);

      // Calculate summary statistics
      const successCount = results.filter(r => r.success).length;
      const totalPointsFetched = results.reduce((sum, r) => sum + r.pointsFetched, 0);
      const totalPointsStored = results.reduce((sum, r) => sum + r.pointsStored, 0);
      const totalDuration = Date.now() - startTime;

      // Log summary
      loggerContext.info('Daily update completed', {
        seriesProcessed: results.length,
        successCount,
        failureCount: results.length - successCount,
        pointsInserted: totalPointsStored,
        pointsUpdated: totalPointsFetched - totalPointsStored,
        durationMs: totalDuration,
        lastTsPerSeries: results.map(r => ({
          seriesId: r.seriesId,
          pointsFetched: r.pointsFetched,
          pointsStored: r.pointsStored,
          success: r.success,
        })),
      });

      // Log individual results for debugging
      for (const result of results) {
        if (result.success) {
          loggerContext.debug('Series update successful', {
            seriesId: result.seriesId,
            pointsFetched: result.pointsFetched,
            pointsStored: result.pointsStored,
          });
        } else {
          loggerContext.error('Series update failed', {
            seriesId: result.seriesId,
            error: result.error,
          });
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      loggerContext.error('Daily update failed', {
        error: errorMessage,
        duration: Date.now() - startTime,
      });
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    timezone: string;
    schedule: string;
    nextRun?: Date;
  } {
    const status = {
      isRunning: this.isRunning,
      timezone: config.app.timezone,
      schedule: '5 8 * * *',
    };
    return status;
  }

  /**
   * Execute a manual update for testing
   */
  async executeManualUpdate(): Promise<void> {
    logger.info('Executing manual update');
    await this.executeDailyUpdate();
  }
}

// Export singleton scheduler instance
export const scheduler = new Scheduler();
