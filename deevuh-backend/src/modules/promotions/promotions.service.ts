import prisma from '../../config/database';
import { Errors } from '../../middleware/errorHandler';

interface PromoValidationResult {
  isValid: boolean;
  promoId: string;
  discountAmount: number; // in paise
  message: string;
}

/**
 * Validate a promo code against all 6 rules per App Flow §7.3:
 * 1. Code exists and is active
 * 2. Not expired (startsAt ≤ now ≤ expiresAt)
 * 3. Global usage limit not reached
 * 4. Per-user limit not exceeded
 * 5. Minimum order amount met
 * 6. Not stackable (one promo per order — enforced at checkout)
 */
export async function validatePromo(
  code: string,
  userId: string,
  cartSubtotal: number // in paise
): Promise<PromoValidationResult> {
  // Rule 1: Code exists and is active
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!promo || !promo.isActive) {
    throw Errors.badRequest('Invalid promo code', 'INVALID_PROMO');
  }

  const now = new Date();

  // Rule 2: Not expired
  if (promo.startsAt > now) {
    throw Errors.badRequest('This promo code is not active yet', 'PROMO_NOT_STARTED');
  }
  if (promo.expiresAt && promo.expiresAt < now) {
    throw Errors.badRequest('This promo code has expired', 'PROMO_EXPIRED');
  }

  // Rule 3: Global usage limit
  if (promo.usageLimit !== null && promo.usageCount >= promo.usageLimit) {
    throw Errors.badRequest('This promo code has been fully redeemed', 'PROMO_LIMIT_REACHED');
  }

  // Rule 4: Per-user limit
  const userUsageCount = await prisma.promoUsage.count({
    where: { userId, promoCodeId: promo.id },
  });
  if (userUsageCount >= promo.perUserLimit) {
    throw Errors.badRequest('You have already used this promo code', 'PROMO_USER_LIMIT');
  }

  // Rule 5: Minimum order amount
  if (promo.minOrderAmount !== null && cartSubtotal < promo.minOrderAmount) {
    const minAmount = (promo.minOrderAmount / 100).toFixed(0);
    throw Errors.badRequest(
      `Minimum order of ₹${minAmount} required for this promo`,
      'PROMO_MIN_NOT_MET'
    );
  }

  // Calculate discount
  let discountAmount = 0;

  switch (promo.type) {
    case 'PERCENTAGE':
      discountAmount = Math.round(cartSubtotal * (promo.discountValue / 100));
      // Apply max discount cap
      if (promo.maxDiscountAmount !== null && discountAmount > promo.maxDiscountAmount) {
        discountAmount = promo.maxDiscountAmount;
      }
      break;

    case 'FIXED_AMOUNT':
      discountAmount = Math.round(promo.discountValue); // already in paise
      // Don't let discount exceed subtotal
      if (discountAmount > cartSubtotal) {
        discountAmount = cartSubtotal;
      }
      break;

    case 'FREE_SHIPPING':
      // Shipping discount is handled separately at checkout
      discountAmount = 0;
      break;
  }

  return {
    isValid: true,
    promoId: promo.id,
    discountAmount,
    message: promo.type === 'FREE_SHIPPING'
      ? 'Free shipping applied!'
      : `₹${(discountAmount / 100).toFixed(0)} discount applied!`,
  };
}

/**
 * Record promo usage after successful order creation.
 */
export async function recordPromoUsage(userId: string, promoCodeId: string, orderId: string) {
  await prisma.$transaction([
    prisma.promoUsage.create({
      data: { userId, promoCodeId, orderId },
    }),
    prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { usageCount: { increment: 1 } },
    }),
  ]);
}

/**
 * Admin: Create a new promo code.
 */
export async function createPromo(data: {
  code: string;
  description?: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'FREE_SHIPPING';
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt?: Date;
  expiresAt?: Date;
}) {
  return prisma.promoCode.create({
    data: {
      ...data,
      code: data.code.toUpperCase(),
      perUserLimit: data.perUserLimit ?? 1,
    },
  });
}

/**
 * Admin: List all promo codes with usage stats.
 */
export async function listPromos() {
  return prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { promoUsages: true } } },
  });
}
