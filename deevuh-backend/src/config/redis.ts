import Redis from 'ioredis';
import env from './env';

const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times: number) {
    if (times > 3) return null;
    return Math.min(times * 200, 2000);
  },
});

redis.on('connect', () => console.log('✅ Redis connected'));
redis.on('error', (err) => console.error('❌ Redis error:', err.message));

// Redis key helpers
export const RedisKeys = {
  refreshToken: (userId: string) => `auth:refresh:${userId}`,
  rateLimitAuth: (ip: string) => `ratelimit:auth:${ip}`,
  rateLimitApi: (ip: string) => `ratelimit:api:${ip}`,
  guestCart: (sessionId: string) => `cart:guest:${sessionId}`,
  abandonedCart: (cartId: string) => `cart:abandoned:${cartId}`,
  categoryCache: () => 'cache:categories',
  productCache: (slug: string) => `cache:product:${slug}`,
  resetToken: (token: string) => `auth:reset:${token}`,
  emailOtp: (email: string) => `auth:otp:${email}`,
};

export const RedisTTL = {
  refreshToken: 7 * 24 * 60 * 60,    // 7 days
  guestCart: 30 * 24 * 60 * 60,       // 30 days
  categoryCache: 60 * 60,             // 1 hour
  productCache: 15 * 60,              // 15 minutes
  resetToken: 60 * 60,                // 1 hour
  emailOtp: 10 * 60,                  // 10 minutes
  rateLimitAuth: 15 * 60,             // 15 minutes
  abandonedCartDedup: 7 * 24 * 60 * 60, // 7 days
};

export default redis;
