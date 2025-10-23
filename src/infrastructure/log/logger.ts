import pino from 'pino';
import type { ILogger } from '../../domain/ports/index.js';
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

// Logger implementation that implements ILogger interface
class Logger implements ILogger {
  private logger: pino.Logger;

  constructor(context?: Record<string, unknown>) {
    this.logger = context ? pinoLogger.child(context) : pinoLogger;
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.logger.info(meta, message);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.logger.warn(meta, message);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.logger.error(meta, message);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.logger.debug(meta, message);
  }

  // Create a child logger with additional context
  child(context: Record<string, unknown>): Logger {
    return new Logger(context);
  }
}

// Export singleton logger instance
export const logger = new Logger();

// Export Logger class for creating contextual loggers
export { Logger };
