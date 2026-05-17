import http from 'http';
import env from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import redis from './config/redis';
import app from './app';
import { logger } from './config/logger';

let server: http.Server;

async function bootstrap(): Promise<void> {
  // 1. Connect database
  await connectDatabase();

  // 2. Redis connects automatically on import

  // 3. Start server
  server = app.listen(env.PORT, () => {
    logger.info(`Server started on port ${env.PORT}`, {
      environment: env.NODE_ENV,
      port: env.PORT,
      pid: process.pid,
    });
  });

  // 4. Configure keep-alive for long-running connections behind load balancers
  server.keepAliveTimeout = 65000; // Slightly higher than ALB's 60s default
  server.headersTimeout = 66000;
}

// ─── Graceful Shutdown ───
// Handles SIGTERM (Docker/Kubernetes), SIGINT (Ctrl+C), and uncaught exceptions.
// Ensures in-flight requests complete before closing connections.

async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // 1. Stop accepting new connections
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => {
        logger.info('HTTP server closed');
        resolve();
      });
    });
  }

  // 2. Close database pool
  try {
    await disconnectDatabase();
    logger.info('Database disconnected');
  } catch (err) {
    logger.error('Error disconnecting database', { error: err });
  }

  // 3. Close Redis
  try {
    await redis.quit();
    logger.info('Redis disconnected');
  } catch (err) {
    logger.error('Error disconnecting Redis', { error: err });
  }

  logger.info('Graceful shutdown complete');
  process.exit(0);
}

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Catch unhandled rejections — log and continue (don't crash)
process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason });
});

// Catch uncaught exceptions — log and exit (unsafe to continue)
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack });
  shutdown('uncaughtException').catch(() => process.exit(1));
});

bootstrap().catch((err) => {
  logger.error('Failed to start server', { error: err });
  process.exit(1);
});
