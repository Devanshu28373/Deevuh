import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();

// GET /users/me — current user profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        phone: true, avatar: true, role: true,
        loyaltyPoints: true, loyaltyTier: true,
        createdAt: true,
      },
    });
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// PUT /users/me — update profile
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { firstName, lastName, phone },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true },
    });
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// GET /users/me/addresses
router.get('/me/addresses', authenticate, async (req, res, next) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.userId },
      orderBy: { isDefault: 'desc' },
    });
    sendSuccess(res, addresses);
  } catch (err) { next(err); }
});

// POST /users/me/addresses
router.post('/me/addresses', authenticate, async (req, res, next) => {
  try {
    const address = await prisma.address.create({
      data: { ...req.body, userId: req.user!.userId },
    });
    sendSuccess(res, address, 201);
  } catch (err) { next(err); }
});

export default router;
