import pino from 'pino';
import { Logger, PinoLogger } from '@/infrastructure/log/simpleLogger.js';
import { config } from '@/infrastructure/config/index.js';

const pinoLogger = pino({
  level: config.app.logLevel,
  formatters: {
    level: label => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'ingestor',
  },
});

export const logger: Logger = new PinoLogger(pinoLogger);
