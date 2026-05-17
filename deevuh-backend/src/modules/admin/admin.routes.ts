import { Router } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireAdmin, requireSuperAdmin } from '../../middleware/adminGuard';
import { sendSuccess, sendPaginated } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { adminStatusUpdateSchema } from '../../shared/schemas';
import { z } from 'zod';
import * as paymentService from '../payments/payments.service';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// ─── Dashboard Stats ───

router.get('/stats', async (_req, res, next) => {
  try {
    const [
      totalOrders, totalRevenue, totalCustomers, totalProducts,
      pendingOrders, lowStockProducts, recentOrders,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] } } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count({ where: { status: 'PENDING' } }),
      prisma.productVariant.count({ where: { stockQuantity: { lte: 5 } } }),
      prisma.order.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { user: { select: { firstName: true, lastName: true, email: true } }, items: true } }),
    ]);

    sendSuccess(res, {
      totalOrders,
      totalRevenue: totalRevenue._sum.total || 0,
      totalCustomers,
      totalProducts,
      pendingOrders,
      lowStockProducts,
      recentOrders,
    });
  } catch (err) { next(err); }
});

// ─── Analytics ───

router.get('/analytics', async (req, res, next) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [
      revenueByDay,
      ordersByStatus,
      topProducts,
      recentCustomers,
      lowStockVariants,
    ] = await Promise.all([
      // Revenue per day (last N days)
      prisma.$queryRaw`
        SELECT DATE("createdAt") as date, SUM(total) as revenue, COUNT(*) as orders
        FROM "Order"
        WHERE "createdAt" >= ${since}
          AND status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      ` as Promise<{ date: Date; revenue: bigint; orders: bigint }[]>,

      // Orders by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),

      // Top 10 products by order count
      prisma.$queryRaw`
        SELECT oi."productName" as name, oi."productId" as id,
               SUM(oi.quantity) as "unitsSold",
               SUM(oi."totalPrice") as revenue
        FROM "OrderItem" oi
        JOIN "Order" o ON o.id = oi."orderId"
        WHERE o.status IN ('CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED')
          AND o."createdAt" >= ${since}
        GROUP BY oi."productName", oi."productId"
        ORDER BY "unitsSold" DESC
        LIMIT 10
      ` as Promise<{ name: string; id: string; unitsSold: bigint; revenue: bigint }[]>,

      // New customers in period
      prisma.user.count({
        where: { role: 'CUSTOMER', createdAt: { gte: since } },
      }),

      // Low stock variants (≤5 units)
      prisma.productVariant.findMany({
        where: { stockQuantity: { lte: 5 }, isActive: true },
        include: { product: { select: { name: true, slug: true, images: true } } },
        orderBy: { stockQuantity: 'asc' },
        take: 20,
      }),
    ]);

    sendSuccess(res, {
      period: { days, since: since.toISOString() },
      revenueByDay: (revenueByDay as any[]).map(r => ({
        date: r.date,
        revenue: Number(r.revenue),
        orders: Number(r.orders),
      })),
      ordersByStatus: ordersByStatus.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
      topProducts: (topProducts as any[]).map(p => ({
        name: p.name,
        id: p.id,
        unitsSold: Number(p.unitsSold),
        revenue: Number(p.revenue),
      })),
      newCustomers: recentCustomers,
      lowStockVariants,
    });
  } catch (err) { next(err); }
});

// ─── Orders ───

router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;
    const search = req.query.search as string;

    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];
    const where: any = {};
    if (status && validStatuses.includes(status)) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          items: true,
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    sendPaginated(res, orders, total, page, limit);
  } catch (err) { next(err); }
});

// GET /admin/orders/:id — single order detail for admin
router.get('/orders/:id', async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id as string },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        items: true,
        address: true,
        promoCode: { select: { code: true, type: true, discountValue: true } },
      },
    });
    if (!order) throw Errors.notFound('Order');
    sendSuccess(res, order);
  } catch (err) { next(err); }
});

router.put('/orders/:id/status', validate(adminStatusUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const currentOrder = await prisma.order.findUnique({ where: { id: id as string } });
    if (!currentOrder) throw Errors.notFound('Order');

    const invalidTransitions: Record<string, string[]> = {
      DELIVERED: ['PENDING', 'CONFIRMED', 'PROCESSING'],
      CANCELLED: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'],
    };
    const cantGoTo = invalidTransitions[currentOrder.status];
    if (cantGoTo?.includes(status)) {
      throw Errors.badRequest(`Cannot transition from ${currentOrder.status} to ${status}`, 'INVALID_STATUS_TRANSITION');
    }

    if (status === 'CANCELLED' && currentOrder.status !== 'CANCELLED') {
      const items = await prisma.orderItem.findMany({ where: { orderId: id as string } });
      await prisma.$transaction(async (tx) => {
        for (const item of items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stockQuantity: { increment: item.quantity } },
          });
        }
        await tx.order.update({
          where: { id: id as string },
          data: { status, cancelledAt: new Date() },
        });
      });
      const updated = await prisma.order.findUnique({
        where: { id: id as string },
        include: { items: true, user: { select: { email: true, firstName: true } } },
      });
      console.log(`[ADMIN] Order ${currentOrder.orderNumber} cancelled by admin`);
      sendSuccess(res, updated);
      return;
    }

    const order = await prisma.order.update({
      where: { id: id as string },
      data: { status },
      include: { items: true, user: { select: { email: true, firstName: true } } },
    });

    console.log(`[ADMIN] Order ${order.orderNumber} status -> ${status}`);
    sendSuccess(res, order);
  } catch (err) { next(err); }
});

// POST /admin/orders/:id/refund — initiate refund
router.post('/orders/:id/refund', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount } = req.body; // optional partial refund amount in paise

    const order = await prisma.order.findUnique({ where: { id: id as string }, include: { items: true } });
    if (!order) throw Errors.notFound('Order');

    if (order.paymentMethod === 'COD') {
      // COD refund — just update status, manual handling
      await prisma.order.update({
        where: { id: id as string },
        data: { status: 'REFUNDED', paymentStatus: 'REFUNDED' },
      });
      console.log(`[ADMIN] COD refund for ${order.orderNumber}`);
      sendSuccess(res, { message: 'COD order marked as refunded. Process refund manually.' });
      return;
    }

    if (!order.razorpayPaymentId) {
      throw Errors.badRequest('No payment found to refund');
    }

    const refund = await paymentService.initiateRefund(id as string, amount);

    // Restore inventory
    await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { increment: item.quantity } },
        });
      }
    });

    console.log(`[ADMIN] Refund initiated for ${order.orderNumber} | amount=${amount || order.total}`);
    sendSuccess(res, { refund, message: 'Refund initiated successfully' });
  } catch (err) { next(err); }
});

// ─── Products ───

router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } }, variants: true },
      }),
      prisma.product.count({ where }),
    ]);

    sendPaginated(res, products, total, page, limit);
  } catch (err) { next(err); }
});

// PUT /admin/products/:id — update product
router.put('/products/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, basePrice, compareAtPrice, isActive, isFeatured, description, shortDescription } = req.body;

    const product = await prisma.product.update({
      where: { id: id as string },
      data: {
        ...(name !== undefined && { name }),
        ...(basePrice !== undefined && { basePrice }),
        ...(compareAtPrice !== undefined && { compareAtPrice }),
        ...(isActive !== undefined && { isActive }),
        ...(isFeatured !== undefined && { isFeatured }),
        ...(description !== undefined && { description }),
        ...(shortDescription !== undefined && { shortDescription }),
      },
      include: { category: { select: { name: true } }, variants: true },
    });

    console.log(`[ADMIN] Product ${product.name} updated`);
    sendSuccess(res, product);
  } catch (err) { next(err); }
});

// DELETE /admin/products/:id — soft delete
router.delete('/products/:id', async (req, res, next) => {
  try {
    const product = await prisma.product.update({
      where: { id: req.params.id as string },
      data: { isActive: false },
    });
    console.log(`[ADMIN] Product ${product.name} deactivated`);
    sendSuccess(res, { message: 'Product deactivated' });
  } catch (err) { next(err); }
});

// ─── Inventory ───

// PUT /admin/inventory/:variantId — update stock for a single variant
const updateStockSchema = z.object({
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative'),
});

router.put('/inventory/:variantId', validate(updateStockSchema), async (req, res, next) => {
  try {
    const variant = await prisma.productVariant.update({
      where: { id: req.params.variantId as string },
      data: { stockQuantity: req.body.stockQuantity },
      include: { product: { select: { name: true } } },
    });
    console.log(`[ADMIN] Stock updated: ${variant.product.name} ${variant.size}/${variant.color} -> ${variant.stockQuantity}`);
    sendSuccess(res, variant);
  } catch (err) { next(err); }
});

// GET /admin/inventory/low-stock — variants with low stock
router.get('/inventory/low-stock', async (req, res, next) => {
  try {
    const threshold = Math.max(1, parseInt(req.query.threshold as string) || 5);
    const variants = await prisma.productVariant.findMany({
      where: { stockQuantity: { lte: threshold }, isActive: true },
      include: { product: { select: { id: true, name: true, slug: true, images: true } } },
      orderBy: { stockQuantity: 'asc' },
    });
    sendSuccess(res, variants);
  } catch (err) { next(err); }
});

// ─── Customers ───

router.get('/customers', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;

    const where = search ? {
      OR: [
        { email: { contains: search, mode: 'insensitive' as const } },
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
      ],
      role: 'CUSTOMER' as const,
    } : { role: 'CUSTOMER' as const };

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, email: true, firstName: true, lastName: true, phone: true,
          loyaltyPoints: true, loyaltyTier: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendPaginated(res, customers, total, page, limit);
  } catch (err) { next(err); }
});

// GET /admin/customers/:id — single customer detail
router.get('/customers/:id', async (req, res, next) => {
  try {
    const customer = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true, email: true, firstName: true, lastName: true, phone: true,
        loyaltyPoints: true, loyaltyTier: true, createdAt: true,
        addresses: true,
        _count: { select: { orders: true, reviews: true } },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, status: true, total: true, createdAt: true },
        },
      },
    });
    if (!customer) throw Errors.notFound('Customer');
    sendSuccess(res, customer);
  } catch (err) { next(err); }
});

// ─── Promos ───

router.get('/promos', async (_req, res, next) => {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { promoUsages: true } } },
    });
    sendSuccess(res, promos);
  } catch (err) { next(err); }
});

// PUT /admin/promos/:id — update promo
router.put('/promos/:id', async (req, res, next) => {
  try {
    const { isActive, expiresAt, usageLimit, discountValue, minOrderAmount, maxDiscountAmount } = req.body;
    const promo = await prisma.promoCode.update({
      where: { id: req.params.id as string },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(expiresAt !== undefined && { expiresAt: new Date(expiresAt) }),
        ...(usageLimit !== undefined && { usageLimit }),
        ...(discountValue !== undefined && { discountValue }),
        ...(minOrderAmount !== undefined && { minOrderAmount }),
        ...(maxDiscountAmount !== undefined && { maxDiscountAmount }),
      },
    });
    console.log(`[ADMIN] Promo ${promo.code} updated`);
    sendSuccess(res, promo);
  } catch (err) { next(err); }
});

export default router;
