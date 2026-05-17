import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import prisma from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { updateProfileSchema, createAddressSchema } from '../../shared/schemas';

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
    if (!user) throw Errors.notFound('User');
    sendSuccess(res, user);
  } catch (err) { next(err); }
});

// PUT /users/me — update profile (validated)
router.put('/me', authenticate, validate(updateProfileSchema), async (req, res, next) => {
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

// POST /users/me/addresses (validated — prevents injection of arbitrary fields)
router.post('/me/addresses', authenticate, validate(createAddressSchema), async (req, res, next) => {
  try {
    const address = await prisma.address.create({
      data: { ...req.body, userId: req.user!.userId },
    });
    sendSuccess(res, address, 201);
  } catch (err) { next(err); }
});

// DELETE /users/me/addresses/:id
router.delete('/me/addresses/:id', authenticate, async (req, res, next) => {
  try {
    const address = await prisma.address.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    if (!address) throw Errors.notFound('Address');

    await prisma.address.delete({ where: { id: address.id } });
    sendSuccess(res, { message: 'Address deleted' });
  } catch (err) { next(err); }
});

export default router;
