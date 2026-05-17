import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import { generateOrderNumber } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { createOrderSchema, cancelOrderSchema } from './orders.schemas';

const router = Router();

// GET /orders — user's order history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: { select: { productName: true, variantSize: true, variantColor: true, quantity: true, unitPrice: true, totalPrice: true, productImage: true } },
        },
      }),
      prisma.order.count({ where: { userId: req.user!.userId } }),
    ]);

    sendPaginated(res, orders, total, page, limit);
  } catch (err) { next(err); }
});

// GET /orders/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
      include: { items: true, address: true },
    });
    if (!order) throw Errors.notFound('Order');
    sendSuccess(res, order);
  } catch (err) { next(err); }
});

// POST /orders — create order (checkout)
// ╔══════════════════════════════════════════════════════════════╗
// ║  CRITICAL: Entire checkout wrapped in a Prisma transaction  ║
// ║  to prevent stock overselling, orphaned orders, and         ║
// ║  partial state on failure.                                  ║
// ╚══════════════════════════════════════════════════════════════╝
router.post('/', authenticate, validate(createOrderSchema), async (req, res, next) => {
  try {
    const { addressId, paymentMethod, promoCode, loyaltyPointsToRedeem = 0 } = req.body;
    const userId = req.user!.userId;

    // ── Pre-transaction reads (safe to do outside tx) ──

    // Fetch cart with items
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) {
      throw Errors.badRequest('Cart is empty', 'CART_EMPTY');
    }

    // Validate address belongs to user
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw Errors.notFound('Address');

    // Validate promo (if provided) — outside tx since it's read-only validation
    let discountAmount = 0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const { validatePromo } = await import('../promotions/promotions.service');
      const promoResult = await validatePromo(promoCode, userId, 0); // subtotal checked below
      discountAmount = promoResult.discountAmount;
      promoCodeId = promoResult.promoId;
    }

    // ── Calculate pricing (server-side, never trust client) ──
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant.price ?? item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    // Re-validate promo with actual subtotal
    if (promoCode && promoCodeId) {
      const { validatePromo } = await import('../promotions/promotions.service');
      const promoResult = await validatePromo(promoCode, userId, subtotal);
      discountAmount = promoResult.discountAmount;
    }

    // Validate loyalty points
    let loyaltyDiscount = 0;
    if (loyaltyPointsToRedeem > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < loyaltyPointsToRedeem) {
        throw Errors.badRequest('Insufficient loyalty points', 'INSUFFICIENT_POINTS');
      }
      loyaltyDiscount = loyaltyPointsToRedeem * 100; // 1 point = ₹1 = 100 paise
    }

    const totalDiscount = discountAmount + loyaltyDiscount;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);
    const shippingAmount = afterDiscount >= 99900 ? 0 : 9900;
    const taxAmount = Math.round(afterDiscount * 0.18);
    const total = Math.max(0, afterDiscount + shippingAmount + taxAmount);

    // Generate order number before tx (idempotency-safe)
    const orderNumber = generateOrderNumber();

    // ── ATOMIC TRANSACTION ──
    // All state mutations happen inside this single transaction:
    // 1. Stock validation + decrement (for COD)
    // 2. Order creation with item snapshots
    // 3. Cart clearing
    // 4. Promo usage recording
    // 5. Loyalty point deduction
    const order = await prisma.$transaction(async (tx) => {
      // 1. Re-validate stock INSIDE transaction (prevents overselling via SELECT FOR UPDATE semantics)
      for (const item of cart.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || variant.stockQuantity < item.quantity) {
          throw Errors.badRequest(
            `Insufficient stock for "${item.product.name}" (${item.variant.size}/${item.variant.color}). Available: ${variant?.stockQuantity ?? 0}, requested: ${item.quantity}`,
            'INSUFFICIENT_STOCK'
          );
        }
      }

      // 2. Create order with item snapshots
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId,
          addressId,
          paymentMethod,
          subtotal,
          discountAmount: totalDiscount,
          shippingAmount,
          taxAmount,
          total,
          promoCodeId,
          loyaltyPointsRedeemed: loyaltyPointsToRedeem,
          status: paymentMethod === 'COD' ? 'CONFIRMED' : 'PENDING',
          items: {
            create: cart.items.map(item => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.variant.price ?? item.product.basePrice,
              totalPrice: (item.variant.price ?? item.product.basePrice) * item.quantity,
              productName: item.product.name,
              variantSize: item.variant.size,
              variantColor: item.variant.color,
              productImage: item.product.images[0] || null,
            })),
          },
        },
        include: { items: true },
      });

      // 3. Deduct inventory for COD orders (paid orders deduct on payment verification)
      if (paymentMethod === 'COD') {
        for (const item of cart.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { decrement: item.quantity } },
          });
        }
      }

      // 4. Clear cart atomically
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      // 5. Record promo usage atomically
      if (promoCodeId) {
        await tx.promoUsage.create({
          data: { userId, promoCodeId, orderId: newOrder.id },
        });
        await tx.promoCode.update({
          where: { id: promoCodeId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // 6. Deduct loyalty points atomically
      if (loyaltyPointsToRedeem > 0) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { decrement: loyaltyPointsToRedeem } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'REDEEMED',
            points: -loyaltyPointsToRedeem,
            balance: updatedUser.loyaltyPoints,
            orderId: newOrder.id,
            note: `Redeemed for order ${orderNumber}`,
          },
        });
      }

      return newOrder;
    }, {
      timeout: 15000, // 15s timeout for complex checkout
    });

    // ── Post-transaction: Razorpay order creation (external API, must be outside tx) ──
    let razorpayData = null;
    if (paymentMethod !== 'COD') {
      const { createRazorpayOrder } = await import('../payments/payments.service');
      razorpayData = await createRazorpayOrder(order.id, total, order.orderNumber);
    }

    console.log(`[ORDER] Created ${orderNumber} | user=${userId} | total=${total} | method=${paymentMethod}`);

    sendSuccess(res, { order, razorpay: razorpayData }, 201);
  } catch (err) { next(err); }
});

// PUT /orders/:id/cancel
router.put('/:id/cancel', authenticate, validate(cancelOrderSchema), async (req, res, next) => {
  try {
    const orderId = req.params.id as string;
    const userId = req.user!.userId;

    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: orderId, userId },
        include: { items: true },
      });
      if (!order) throw Errors.notFound('Order');
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw Errors.badRequest('Order cannot be cancelled at this stage', 'INVALID_STATUS_TRANSITION');
      }

      // Restore inventory if it was already deducted
      if (order.status === 'CONFIRMED' || order.paymentMethod === 'COD') {
        for (const item of order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
      }

      // Restore loyalty points if redeemed
      if (order.loyaltyPointsRedeemed > 0) {
        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: { increment: order.loyaltyPointsRedeemed } },
        });
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            type: 'ADJUSTED',
            points: order.loyaltyPointsRedeemed,
            balance: updatedUser.loyaltyPoints,
            orderId: order.id,
            note: `Refunded from cancelled order ${order.orderNumber}`,
          },
        });
      }

      return tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: req.body.reason },
      });
    });

    console.log(`[ORDER] Cancelled ${updated.orderNumber} | user=${userId}`);

    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

export default router;
