import { Router, Request, Response } from 'express';
import prisma from './database';
import redis from './redis';

const router = Router();

/**
 * GET /health — Shallow health check for load balancers.
 * Returns 200 if the process is alive. Used by ALB/ECS health checks.
 */
router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
  });
});

/**
 * GET /health/ready — Deep readiness check.
 * Verifies database and Redis connectivity. Used for deployment gates.
 * Returns 503 if any dependency is down.
 */
router.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
  } catch (err: any) {
    checks.database = { status: 'error', latencyMs: Date.now() - dbStart, error: err.message };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    await redis.ping();
    checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
  } catch (err: any) {
    checks.redis = { status: 'error', latencyMs: Date.now() - redisStart, error: err.message };
  }

  const allHealthy = Object.values(checks).every(c => c.status === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: process.env.npm_package_version || '1.0.0',
    checks,
  });
});

export default router;
