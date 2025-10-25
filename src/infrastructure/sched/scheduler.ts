import cron from 'node-cron';
import { defaultFetchAndStoreSeriesUseCase } from '@/application/usecases/fetchAndStoreSeries.js';
import { logger } from '@/infrastructure/log/logger.js';
import { config } from '@/infrastructure/config/index.js';
import { db } from '@/infrastructure/db/pg.js';
import { SCHEDULER as events } from '@/infrastructure/log/log-events.js';

export class Scheduler {
  private cronJob: cron.ScheduledTask | null = null;
  private isRunning = false;

  start(): void {
    if (this.cronJob) {
      logger.info({
        event: events.START,
        msg: 'Scheduler is already running',
      });
      return;
    }

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

  async executeDailyUpdate(): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info({
        event: events.EXECUTE_DAILY_UPDATE,
        msg: 'Starting scheduled daily update',
      });

      const isConnected = await db.isConnected();
      if (!isConnected) {
        logger.error({
          event: events.EXECUTE_DAILY_UPDATE,
          msg: 'Database connection failed',
        });
        return;
      }

      const fetchAndStoreUseCase = defaultFetchAndStoreSeriesUseCase;

      const results = await fetchAndStoreUseCase.executeMultiple(config.app.seriesWhitelist);

      const successCount = results.filter(r => r.success).length;
      const totalPointsFetched = results.reduce((sum, r) => sum + r.pointsFetched, 0);
      const totalPointsStored = results.reduce((sum, r) => sum + r.pointsStored, 0);
      const totalDuration = Date.now() - startTime;

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
            data: {
              seriesId: result.seriesId,
              error: result.error || 'Unknown error',
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

  async executeManualUpdate(): Promise<void> {
    logger.info({
      event: events.EXECUTE_MANUAL_UPDATE,
      msg: 'Executing manual update',
    });
    await this.executeDailyUpdate();
  }

  async startWithImmediateUpdate(): Promise<void> {
    this.start();
    logger.info({
      event: events.START_WITH_IMMEDIATE_UPDATE,
      msg: 'Executing immediate update after scheduler start',
    });
    await this.executeDailyUpdate();
  }
}

export const scheduler = new Scheduler();
