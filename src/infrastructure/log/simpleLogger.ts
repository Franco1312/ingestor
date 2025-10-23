/**
 * Logger with only info and error methods
 * Consistent structure across the application
 */

export interface Logger {
  info(params: { event: string; msg: string; data?: unknown }): void;
  error(params: { event: string; msg: string; err: Error; data?: unknown }): void;
}

export class PinoLogger implements Logger {
  private readonly pino: {
    info: (data: unknown) => void;
    error: (data: unknown) => void;
  };

  constructor(pino: { info: (data: unknown) => void; error: (data: unknown) => void }) {
    this.pino = pino;
  }

  info(params: { event: string; msg: string; data?: unknown }): void {
    this.pino.info({
      event: params.event,
      msg: params.msg,
      data: params.data,
    });
  }

  error(params: { event: string; msg: string; err: Error; data?: unknown }): void {
    this.pino.error({
      event: params.event,
      msg: params.msg,
      data: params.data,
      err: {
        message: params.err.message,
        stack: params.err.stack,
        name: params.err.name,
      },
    });
  }
}
