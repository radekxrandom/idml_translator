import type { Logger } from '../../application/ports/Logger.js'

export class ConsoleLogger implements Logger {
  info = (message: string, meta?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.log(`[info] ${message}`, meta ?? '')
  }

  debug = (message: string, meta?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.debug(`[debug] ${message}`, meta ?? '')
  }

  error = (message: string, meta?: Record<string, unknown>) => {
    // eslint-disable-next-line no-console
    console.error(`[error] ${message}`, meta ?? '')
  }
}


