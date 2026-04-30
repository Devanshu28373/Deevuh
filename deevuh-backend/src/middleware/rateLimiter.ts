import { Request, Response, NextFunction } from 'express';
import redis from '../config/redis';
import { RedisKeys, RedisTTL } from '../config/redis';
import { Errors } from './errorHandler';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

/**
 * Redis-backed rate limiter — works correctly across multiple server instances.
 */
export function rateLimiter(options: RateLimitOptions) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${options.keyPrefix}:${ip}`;

    try {
      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, Math.ceil(options.windowMs / 1000));
      }

      if (current > options.max) {
        next(Errors.tooMany(`Too many requests. Try again in ${Math.ceil(options.windowMs / 60000)} minutes.`));
        return;
      }

      next();
    } catch {
      // If Redis is down, allow the request (fail open)
      next();
    }
  };
}

// Pre-configured limiters
export const authLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  keyPrefix: 'ratelimit:auth',
});

export const apiLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyPrefix: 'ratelimit:api',
});
