// Logger service for centralized logging
// Replaces direct console usage with configurable logging levels

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  minLevel: LogLevel;
  enableInProduction: boolean;
  prefix?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      minLevel: 'info',
      enableInProduction: false,
      prefix: '[YGY]',
      ...config,
    };
  }

  private shouldLog(level: LogLevel): boolean {
    if (import.meta.env.PROD && !this.config.enableInProduction) {
      return false;
    }
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, message: string): string {
    return `${this.config.prefix} [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message), ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog('info')) {
      console.info(this.formatMessage('info', message), ...args);
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message), ...args);
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message), ...args);
    }
  }

  // For production error tracking integration
  captureException(error: Error, context?: Record<string, unknown>): void {
    if (import.meta.env.PROD) {
      // Send to error tracking service (Sentry, etc.)
      // Example: Sentry.captureException(error, { extra: context });
    } else {
      this.error('Exception captured:', error.message, context);
    }
  }

  // Performance logging
  time(label: string): void {
    if (this.shouldLog('debug')) {
      console.time(`${this.config.prefix} ${label}`);
    }
  }

  timeEnd(label: string): void {
    if (this.shouldLog('debug')) {
      console.timeEnd(`${this.config.prefix} ${label}`);
    }
  }
}

// Default logger instance
export const logger = new Logger();

// Create named loggers for different modules
export const createLogger = (name: string): Logger => {
  return new Logger({ prefix: `[YGY:${name}]` });
};

export { Logger };
export type { LogLevel, LoggerConfig };
