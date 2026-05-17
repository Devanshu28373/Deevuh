import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import prisma from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { createReviewSchema } from '../../shared/schemas';

const router = Router();

// GET /reviews/:productId
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

// POST /reviews (validated)
router.post('/', authenticate, validate(createReviewSchema), async (req, res, next) => {
  try {
    const { productId, rating, title, body } = req.body;

    // Verify user has purchased this product (prevent fake reviews)
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: { userId: req.user!.userId, status: 'DELIVERED' },
      },
    });
    if (!hasPurchased) {
      throw Errors.forbidden('You can only review products you have purchased');
    }

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
