import { env } from '../env.js';

/**
 * Log levels in order of severity
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
} as const;

/**
 * Format timestamp for log output
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Check if a log level should be output based on configured level
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[env.logLevel];
}

/**
 * Format log prefix with timestamp and level
 */
function formatPrefix(level: LogLevel): string {
  const timestamp = getTimestamp();
  const levelColors: Record<LogLevel, string> = {
    debug: COLORS.dim,
    info: COLORS.blue,
    warn: COLORS.yellow,
    error: COLORS.red,
  };

  return `${COLORS.dim}${timestamp}${COLORS.reset} ${levelColors[level]}[${level.toUpperCase()}]${COLORS.reset}`;
}

/**
 * Simple console logger with levels
 * - Respects LOG_LEVEL from environment
 * - Never logs sensitive data (API keys, tokens)
 * - Provides colored output for terminal
 */
export const logger = {
  /**
   * Debug level - verbose information for development
   */
  debug(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('debug')) return;
    const prefix = formatPrefix('debug');
    if (meta) {
      console.log(`${prefix} ${message}`, meta);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },

  /**
   * Info level - general operational information
   */
  info(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('info')) return;
    const prefix = formatPrefix('info');
    if (meta) {
      console.log(`${prefix} ${message}`, meta);
    } else {
      console.log(`${prefix} ${message}`);
    }
  },

  /**
   * Warn level - potential issues or unexpected states
   */
  warn(message: string, meta?: Record<string, unknown>): void {
    if (!shouldLog('warn')) return;
    const prefix = formatPrefix('warn');
    if (meta) {
      console.warn(`${prefix} ${message}`, meta);
    } else {
      console.warn(`${prefix} ${message}`);
    }
  },

  /**
   * Error level - errors and failures
   */
  error(message: string, error?: Error | unknown, meta?: Record<string, unknown>): void {
    if (!shouldLog('error')) return;
    const prefix = formatPrefix('error');

    if (error instanceof Error) {
      console.error(`${prefix} ${message}`, {
        name: error.name,
        message: error.message,
        stack: env.debug ? error.stack : undefined,
        ...meta,
      });
    } else if (error !== undefined) {
      console.error(`${prefix} ${message}`, { error, ...meta });
    } else if (meta) {
      console.error(`${prefix} ${message}`, meta);
    } else {
      console.error(`${prefix} ${message}`);
    }
  },

  /**
   * Log HTTP request (info level)
   */
  request(method: string, path: string, statusCode: number, durationMs: number): void {
    const statusColor = statusCode >= 400 ? COLORS.red : statusCode >= 300 ? COLORS.yellow : COLORS.green;
    this.info(
      `${COLORS.cyan}${method}${COLORS.reset} ${path} ${statusColor}${statusCode}${COLORS.reset} ${COLORS.dim}${durationMs}ms${COLORS.reset}`
    );
  },

  /**
   * Log server startup information
   */
  startup(port: number, nodeEnv: string): void {
    console.log('');
    console.log(`${COLORS.green}========================================${COLORS.reset}`);
    console.log(`${COLORS.green}  RSTA Server${COLORS.reset}`);
    console.log(`${COLORS.dim}  Port: ${port}${COLORS.reset}`);
    console.log(`${COLORS.dim}  Environment: ${nodeEnv}${COLORS.reset}`);
    console.log(`${COLORS.dim}  Log Level: ${env.logLevel}${COLORS.reset}`);
    console.log(`${COLORS.green}========================================${COLORS.reset}`);
    console.log('');
  },
};

export default logger;
