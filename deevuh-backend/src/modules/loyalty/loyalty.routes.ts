import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();

// GET /loyalty — user's loyalty dashboard
router.get('/', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { loyaltyPoints: true, loyaltyTier: true, lastLoyaltyActivity: true },
    });

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Tier thresholds
    const tierInfo = {
      BRONZE: { name: 'Bronze', min: 0, next: 'Silver', nextMin: 500 },
      SILVER: { name: 'Silver', min: 500, next: 'Gold', nextMin: 2000 },
      GOLD: { name: 'Gold', min: 2000, next: 'Platinum', nextMin: 5000 },
      PLATINUM: { name: 'Platinum', min: 5000, next: 'Diamond', nextMin: 10000 },
      DIAMOND: { name: 'Diamond', min: 10000, next: null, nextMin: null },
    };

    const currentTier = tierInfo[user!.loyaltyTier];
    const pointsToNextTier = currentTier.nextMin
      ? Math.max(0, currentTier.nextMin - user!.loyaltyPoints)
      : 0;

    sendSuccess(res, {
      points: user!.loyaltyPoints,
      tier: user!.loyaltyTier,
      tierInfo: currentTier,
      pointsToNextTier,
      redemptionValue: `₹${user!.loyaltyPoints}`, // 1 point = ₹1
      transactions,
    });
  } catch (err) { next(err); }
});

export default router;
