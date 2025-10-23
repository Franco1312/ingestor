import pino from 'pino';
import { Logger, PinoLogger } from './simpleLogger.js';
import { config } from '../config/index.js';

// Create pino logger instance
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

// Export singleton logger instance
export const logger: Logger = new PinoLogger(pinoLogger);
