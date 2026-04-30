import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import { generateOrderNumber } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';

const router = Router();

// GET /orders — user's order history
router.get('/', authenticate, async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId: req.user!.userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          items: { select: { productName: true, variantSize: true, variantColor: true, quantity: true, unitPrice: true, productImage: true } },
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
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { addressId, paymentMethod, promoCode, loyaltyPointsToRedeem = 0 } = req.body;
    const userId = req.user!.userId;

    // Fetch cart
    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true, variant: true } } },
    });
    if (!cart || cart.items.length === 0) throw Errors.badRequest('Cart is empty', 'CART_EMPTY');

    // Validate stock
    for (const item of cart.items) {
      if (item.variant.stockQuantity < item.quantity) {
        throw Errors.badRequest(`Insufficient stock for ${item.product.name}`, 'INSUFFICIENT_STOCK');
      }
    }

    // Validate address
    const address = await prisma.address.findFirst({ where: { id: addressId, userId } });
    if (!address) throw Errors.notFound('Address');

    // Calculate pricing (server-side per App Flow §4.2)
    const subtotal = cart.items.reduce((sum, item) => {
      const price = item.variant.price ?? item.product.basePrice;
      return sum + (price * item.quantity);
    }, 0);

    // Promo discount
    let discountAmount = 0;
    let promoCodeId: string | null = null;
    if (promoCode) {
      const { validatePromo, recordPromoUsage } = await import('../promotions/promotions.service');
      const promoResult = await validatePromo(promoCode, userId, subtotal);
      discountAmount = promoResult.discountAmount;
      promoCodeId = promoResult.promoId;
    }

    // Loyalty points redemption (1 point = ₹1 = 100 paise)
    let loyaltyDiscount = 0;
    if (loyaltyPointsToRedeem > 0) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.loyaltyPoints < loyaltyPointsToRedeem) {
        throw Errors.badRequest('Insufficient loyalty points', 'INSUFFICIENT_POINTS');
      }
      loyaltyDiscount = loyaltyPointsToRedeem * 100; // convert to paise
    }

    const totalDiscount = discountAmount + loyaltyDiscount;
    const afterDiscount = Math.max(0, subtotal - totalDiscount);
    const shippingAmount = afterDiscount >= 99900 ? 0 : 9900; // ₹999 threshold
    const taxAmount = Math.round(afterDiscount * 0.18);
    const total = Math.max(0, afterDiscount + shippingAmount + taxAmount);

    // Create order with item snapshots
    const order = await prisma.order.create({
      data: {
        orderNumber: generateOrderNumber(),
        userId,
        addressId,
        paymentMethod,
        subtotal,
        discountAmount: discountAmount + loyaltyDiscount,
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

    // Clear cart
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Record promo usage
    if (promoCodeId) {
      const { recordPromoUsage } = await import('../promotions/promotions.service');
      await recordPromoUsage(userId, promoCodeId, order.id);
    }

    // Deduct loyalty points
    if (loyaltyPointsToRedeem > 0) {
      const user = await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: { decrement: loyaltyPointsToRedeem } },
      });
      await prisma.loyaltyTransaction.create({
        data: {
          userId,
          type: 'REDEEMED',
          points: -loyaltyPointsToRedeem,
          balance: user.loyaltyPoints,
          orderId: order.id,
          note: `Redeemed for order ${order.orderNumber}`,
        },
      });
    }

    // For COD: deduct inventory immediately
    if (paymentMethod === 'COD') {
      for (const item of cart.items) {
        await prisma.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    // For non-COD: create Razorpay order
    let razorpayData = null;
    if (paymentMethod !== 'COD') {
      const { createRazorpayOrder } = await import('../payments/payments.service');
      razorpayData = await createRazorpayOrder(order.id, total, order.orderNumber);
    }

    sendSuccess(res, { order, razorpay: razorpayData }, 201);
  } catch (err) { next(err); }
});

// PUT /orders/:id/cancel
router.put('/:id/cancel', authenticate, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id as string, userId: req.user!.userId },
    });
    if (!order) throw Errors.notFound('Order');
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
      throw Errors.badRequest('Order cannot be cancelled at this stage', 'INVALID_STATUS_TRANSITION');
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id as string },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: req.body.reason },
    });

    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

export default router;
