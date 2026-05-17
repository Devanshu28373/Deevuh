import { Router } from 'express';
import { authenticate, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import prisma from '../../config/database';
import { sendSuccess, sendNoContent } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { addToCartSchema, updateCartItemSchema, mergeCartSchema } from './cart.schemas';

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

// POST /cart/items — add item to cart
router.post('/items', optionalAuth, validate(addToCartSchema), async (req, res, next) => {
  try {
    const { productId, variantId, quantity } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string;

    if (!userId && !sessionId) throw Errors.badRequest('Authentication or session ID required');

    // Validate product exists and is active
    const product = await prisma.product.findFirst({
      where: { id: productId, isActive: true },
    });
    if (!product) throw Errors.notFound('Product');

    // Validate variant exists, belongs to this product, and has stock
    const variant = await prisma.productVariant.findFirst({
      where: { id: variantId, productId, isActive: true },
    });
    if (!variant) throw Errors.notFound('Product variant');
    if (variant.stockQuantity < quantity) {
      throw Errors.badRequest(`Only ${variant.stockQuantity} units available`, 'INSUFFICIENT_STOCK');
    }

    // Find or create cart
    let cart = await prisma.cart.findFirst({ where: userId ? { userId } : { sessionId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: userId ? { userId } : { sessionId } });
    }

    // Check if adding would exceed stock when combined with existing cart quantity
    const existingItem = await prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId } },
    });
    const totalQuantity = (existingItem?.quantity || 0) + quantity;
    if (totalQuantity > variant.stockQuantity) {
      throw Errors.badRequest(`Only ${variant.stockQuantity} units available (${existingItem?.quantity || 0} already in cart)`, 'INSUFFICIENT_STOCK');
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
router.put('/items/:id', optionalAuth, validate(updateCartItemSchema), async (req, res, next) => {
  try {
    const { quantity } = req.body;
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: req.params.id as string },
      include: { variant: true, cart: true },
    });
    if (!cartItem) throw Errors.notFound('Cart item');

    // Ownership check — ensure this cart item belongs to the current user/session
    if (userId && cartItem.cart.userId !== userId) throw Errors.forbidden('Access denied');
    if (!userId && cartItem.cart.sessionId !== sessionId) throw Errors.forbidden('Access denied');

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
    const userId = req.user?.userId;
    const sessionId = req.headers['x-session-id'] as string;

    // Ownership check before deletion
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: req.params.id as string },
      include: { cart: true },
    });
    if (!cartItem) throw Errors.notFound('Cart item');
    if (userId && cartItem.cart.userId !== userId) throw Errors.forbidden('Access denied');
    if (!userId && cartItem.cart.sessionId !== sessionId) throw Errors.forbidden('Access denied');

    await prisma.cartItem.delete({ where: { id: req.params.id as string } });
    sendNoContent(res);
  } catch (err) { next(err); }
});

// POST /cart/merge — merge guest cart into authenticated cart on login
router.post('/merge', authenticate, validate(mergeCartSchema), async (req, res, next) => {
  try {
    const { sessionId } = req.body;

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

    // Merge items in a transaction
    let mergedCount = 0;
    await prisma.$transaction(async (tx) => {
      for (const item of guestCart.items) {
        // Check stock before merging
        const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
        if (!variant || variant.stockQuantity < item.quantity) continue; // skip unavailable

        await tx.cartItem.upsert({
          where: { cartId_variantId: { cartId: userCart!.id, variantId: item.variantId } },
          update: { quantity: { increment: item.quantity } },
          create: {
            cartId: userCart!.id,
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
          },
        });
        mergedCount++;
      }

      // Delete guest cart
      await tx.cart.delete({ where: { id: guestCart.id } });
    });

    sendSuccess(res, { merged: mergedCount });
  } catch (err) { next(err); }
});

export default router;
