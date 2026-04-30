import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();

// GET /products/:productId/reviews (mounted as /reviews/:productId)
router.get('/:productId', async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId as string, isApproved: true },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    // Calculate star distribution
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => distribution[r.rating - 1]++);

    sendSuccess(res, { reviews, distribution, total: reviews.length });
  } catch (err) { next(err); }
});

// POST /reviews
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { productId, rating, title, body } = req.body;

    const review = await prisma.review.create({
      data: {
        userId: req.user!.userId,
        productId,
        rating,
        title,
        body,
      },
    });

    // Update product avgRating
    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: productId },
      data: {
        avgRating: agg._avg.rating || 0,
        reviewCount: agg._count.rating,
      },
    });

    sendSuccess(res, review, 201);
  } catch (err) { next(err); }
});

export default router;
