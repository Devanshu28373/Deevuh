import { Router, Request, Response } from 'express';
import prisma from '../../config/database';
import redis, { RedisKeys, RedisTTL } from '../../config/redis';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { categoryCreateSchema } from '../../shared/schemas';

const router = Router();

// GET /categories — all categories (cached with Redis failure fallback)
router.get('/', async (req: Request, res: Response, next) => {
  try {
    // Try cache first, but fallback gracefully if Redis is down
    let cached: string | null = null;
    try {
      cached = await redis.get(RedisKeys.categoryCache());
    } catch {
      // Redis down — proceed without cache
    }

    if (cached) { sendSuccess(res, JSON.parse(cached)); return; }

    const categories = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { children: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } } },
    });

    // Best-effort cache write
    try {
      await redis.set(RedisKeys.categoryCache(), JSON.stringify(categories), 'EX', RedisTTL.categoryCache);
    } catch {
      // Redis down — skip cache write
    }

    sendSuccess(res, categories);
  } catch (err) { next(err); }
});

// GET /categories/:slug
router.get('/:slug', async (req: Request<{ slug: string }>, res: Response, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: { children: { where: { isActive: true } } },
    });
    if (!category) { res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Category not found' } }); return; }
    sendSuccess(res, category);
  } catch (err) { next(err); }
});

// Admin: POST /categories (validated)
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(categoryCreateSchema), async (req: Request, res: Response, next) => {
  try {
    const category = await prisma.category.create({ data: req.body });
    // Invalidate cache, best-effort
    try { await redis.del(RedisKeys.categoryCache()); } catch { /* ignore */ }
    sendSuccess(res, category, 201);
  } catch (err) { next(err); }
});

export default router;
