import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendNoContent } from '../../shared/utils/apiResponse';

const router = Router();

// GET /wishlist
router.get('/', authenticate, async (req, res, next) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.userId },
      include: {
        product: {
          select: { id: true, name: true, slug: true, images: true, basePrice: true, compareAtPrice: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    sendSuccess(res, items);
  } catch (err) { next(err); }
});

// POST /wishlist/:productId
router.post('/:productId', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.wishlistItem.create({
      data: { userId: req.user!.userId, productId: req.params.productId as string },
    });
    sendSuccess(res, item, 201);
  } catch (err) { next(err); }
});

// DELETE /wishlist/:productId
router.delete('/:productId', authenticate, async (req, res, next) => {
  try {
    await prisma.wishlistItem.delete({
      where: { userId_productId: { userId: req.user!.userId, productId: req.params.productId as string } },
    });
    sendNoContent(res);
  } catch (err) { next(err); }
});

export default router;
