import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendNoContent } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';

const router = Router();

// GET /cart
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string;

    if (!userId && !sessionId) { sendSuccess(res, { items: [], subtotal: 0 }); return; }

    const where = userId ? { userId } : { sessionId };
    const cart = await prisma.cart.findFirst({
      where,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, slug: true, images: true, basePrice: true } },
            variant: { select: { id: true, sku: true, size: true, color: true, price: true, stockQuantity: true } },
          },
        },
      },
    });

    if (!cart) { sendSuccess(res, { items: [], subtotal: 0 }); return; }

    const items = cart.items.map(item => ({
      ...item,
      unitPrice: item.variant.price ?? item.product.basePrice,
      totalPrice: (item.variant.price ?? item.product.basePrice) * item.quantity,
    }));

    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

    sendSuccess(res, { id: cart.id, items, subtotal, itemCount: items.length });
  } catch (err) { next(err); }
});

// POST /cart/items
router.post('/items', optionalAuth, async (req, res, next) => {
  try {
    const { productId, variantId, quantity = 1 } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string;

    if (!userId && !sessionId) throw Errors.badRequest('Authentication or session ID required');

    // Validate stock
    const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
    if (!variant || variant.stockQuantity < quantity) {
      throw Errors.badRequest('Insufficient stock', 'INSUFFICIENT_STOCK');
    }

    // Find or create cart
    let cart = await prisma.cart.findFirst({ where: userId ? { userId } : { sessionId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: userId ? { userId } : { sessionId } });
    }

    // Upsert cart item
    const cartItem = await prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
      update: { quantity: { increment: quantity } },
      create: { cartId: cart.id, productId, variantId, quantity },
      include: {
        product: { select: { name: true, images: true, basePrice: true } },
        variant: { select: { size: true, color: true, price: true } },
      },
    });

    sendSuccess(res, cartItem, 201);
  } catch (err) { next(err); }
});

// PUT /cart/items/:id — update quantity
router.put('/items/:id', optionalAuth, async (req, res, next) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity < 1) throw Errors.badRequest('Quantity must be at least 1');

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: req.params.id as string },
      include: { variant: true },
    });
    if (!cartItem) throw Errors.notFound('Cart item');

    // Validate stock
    if (cartItem.variant.stockQuantity < quantity) {
      throw Errors.badRequest(`Only ${cartItem.variant.stockQuantity} units available`, 'INSUFFICIENT_STOCK');
    }

    const updated = await prisma.cartItem.update({
      where: { id: req.params.id as string },
      data: { quantity },
      include: {
        product: { select: { name: true, images: true, basePrice: true } },
        variant: { select: { size: true, color: true, price: true, stockQuantity: true } },
      },
    });

    sendSuccess(res, updated);
  } catch (err) { next(err); }
});

// DELETE /cart/items/:id
router.delete('/items/:id', optionalAuth, async (req, res, next) => {
  try {
    await prisma.cartItem.delete({ where: { id: req.params.id as string } });
    sendNoContent(res);
  } catch (err) { next(err); }
});

// POST /cart/merge — merge guest cart into authenticated cart on login
router.post('/merge', authenticate, async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) { sendSuccess(res, { merged: 0 }); return; }

    const guestCart = await prisma.cart.findFirst({
      where: { sessionId },
      include: { items: true },
    });
    if (!guestCart || guestCart.items.length === 0) {
      sendSuccess(res, { merged: 0 });
      return;
    }

    // Find or create user cart
    let userCart = await prisma.cart.findFirst({ where: { userId: req.user!.userId } });
    if (!userCart) {
      userCart = await prisma.cart.create({ data: { userId: req.user!.userId } });
    }

    // Merge items — upsert each guest item into user cart
    let mergedCount = 0;
    for (const item of guestCart.items) {
      await prisma.cartItem.upsert({
        where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
        update: { quantity: { increment: item.quantity } },
        create: {
          cartId: userCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        },
      });
      mergedCount++;
    }

    // Delete guest cart
    await prisma.cart.delete({ where: { id: guestCart.id } });

    sendSuccess(res, { merged: mergedCount });
  } catch (err) { next(err); }
});

export default router;
