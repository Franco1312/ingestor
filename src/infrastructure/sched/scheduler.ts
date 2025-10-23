import cron from 'node-cron';
import { FetchAndStoreSeriesUseCase } from '../../application/usecases/fetchAndStoreSeries.js';
import { seriesRepository } from '../db/seriesRepo.js';
import { BcraMonetariasProvider, ProviderChain } from '../providers/index.js';
import { logger } from '../log/logger.js';
import { config } from '../config/index.js';
import { db } from '../db/pg.js';
import { SCHEDULER as events } from '../log/log-events.js';

// Scheduler for automated data updates
export class Scheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  /**
   * Start the scheduled job
   */
  start(): void {
    if (this.cronJob) {
      logger.info({
        event: events.START,
        msg: 'Scheduler is already running',
      });
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

    logger.info({
      event: events.START,
      msg: 'Scheduler started',
      data: {
        timezone: config.app.timezone,
        schedule: '5 8 * * *',
        description: 'Daily update at 08:05 AM Argentina time',
      },
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
      logger.info({
        event: events.STOP,
        msg: 'Scheduler stopped',
      });
    }
  }

  /**
   * Execute the daily update manually
   */
  async executeDailyUpdate(): Promise<void> {
    const startTime = Date.now();
    // Remove logger.child as it's not available in the new logger

    try {
      logger.info({
        event: events.EXECUTE_DAILY_UPDATE,
        msg: 'Starting scheduled daily update',
      });

      // Check database connectivity
      const isConnected = await db.isConnected();
      if (!isConnected) {
        logger.error({
          event: events.EXECUTE_DAILY_UPDATE,
          msg: 'Database connection failed',
          err: new Error('Database connection failed'),
        });
        return;
      }

      // Initialize BCRA Monetarias provider
      const bcraMonetariasProvider = new BcraMonetariasProvider();
      const providerChain = new ProviderChain([bcraMonetariasProvider]);

      // Initialize use case
      const fetchAndStoreUseCase = new FetchAndStoreSeriesUseCase(seriesRepository, providerChain);

      // Execute update for all whitelisted series
      const results = await fetchAndStoreUseCase.executeMultiple(config.app.seriesWhitelist);

      // Calculate summary statistics
      const successCount = results.filter(r => r.success).length;
      const totalPointsFetched = results.reduce((sum, r) => sum + r.pointsFetched, 0);
      const totalPointsStored = results.reduce((sum, r) => sum + r.pointsStored, 0);
      const totalDuration = Date.now() - startTime;

      // Log summary
      logger.info({
        event: events.EXECUTE_DAILY_UPDATE,
        msg: 'Daily update completed',
        data: {
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
        },
      });

      // Log individual results for debugging
      for (const result of results) {
        if (result.success) {
          logger.info({
            event: events.EXECUTE_DAILY_UPDATE,
            msg: 'Series update successful',
            data: {
              seriesId: result.seriesId,
              pointsFetched: result.pointsFetched,
              pointsStored: result.pointsStored,
            },
          });
        } else {
          logger.error({
            event: events.EXECUTE_DAILY_UPDATE,
            msg: 'Series update failed',
            err: new Error(result.error || 'Unknown error'),
            data: {
              seriesId: result.seriesId,
            },
          });
        }
      }
    } catch (error) {
      logger.error({
        event: events.EXECUTE_DAILY_UPDATE,
        msg: 'Daily update failed',
        err: error as Error,
        data: {
          duration: Date.now() - startTime,
        },
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
    logger.info({
      event: events.EXECUTE_MANUAL_UPDATE,
      msg: 'Executing manual update',
    });
    await this.executeDailyUpdate();
  }

  /**
   * Start scheduler and execute immediate update
   */
  async startWithImmediateUpdate(): Promise<void> {
    this.start();
    logger.info({
      event: events.START_WITH_IMMEDIATE_UPDATE,
      msg: 'Executing immediate update after scheduler start',
    });
    await this.executeDailyUpdate();
  }
}

// Export singleton scheduler instance
export const scheduler = new Scheduler();
