/**
 * Structured logger for production observability.
 * 
 * Outputs JSON in production (for log aggregation services like CloudWatch/Datadog),
 * human-readable format in development.
 * 
 * Designed to be lightweight with zero dependencies — swap for Pino/Winston
 * when you need log rotation, file transport, or advanced features.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const isProduction = process.env.NODE_ENV === 'production';
const minLevel = isProduction ? LOG_LEVELS.info : LOG_LEVELS.debug;

function formatLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();

  if (isProduction) {
    // JSON output for production log aggregation
    const entry: Record<string, unknown> = {
      timestamp,
      level,
      message,
      ...meta,
    };
    // Serialize errors properly
    if (meta?.error instanceof Error) {
      entry.error = {
        message: meta.error.message,
        stack: meta.error.stack,
        name: meta.error.name,
      };
    }
    return JSON.stringify(entry);
  }

  // Human-readable for development
  const prefix = {
    debug: '🔍',
    info: '✅',
    warn: '⚠️',
    error: '❌',
  }[level];

  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  return `${prefix} [${timestamp}] ${message}${metaStr}`;
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (LOG_LEVELS[level] < minLevel) return;

  const formatted = formatLog(level, message, meta);

  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    default:
      console.log(formatted);
  }
}

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
};
