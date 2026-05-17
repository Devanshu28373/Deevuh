import { Router } from 'express';
import prisma from '../../config/database';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireAdmin } from '../../middleware/adminGuard';
import { sendSuccess } from '../../shared/utils/apiResponse';
import { Errors } from '../../middleware/errorHandler';
import { adminStatusUpdateSchema } from '../../shared/schemas';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate, requireAdmin);

// GET /admin/stats — Dashboard overview stats
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

// GET /admin/orders — All orders with pagination
router.get('/orders', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const status = req.query.status as string;

    // Validate status if provided
    const validStatuses = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURN_REQUESTED', 'RETURNED', 'REFUNDED'];
    const where = status && validStatuses.includes(status) ? { status: status as any } : {};

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

    sendSuccess(res, orders, 200, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

// PUT /admin/orders/:id/status — Update order status (validated)
router.put('/orders/:id/status', validate(adminStatusUpdateSchema), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Fetch current order to validate transition
    const currentOrder = await prisma.order.findUnique({ where: { id: id as string } });
    if (!currentOrder) throw Errors.notFound('Order');

    // Prevent invalid transitions
    const invalidTransitions: Record<string, string[]> = {
      DELIVERED: ['PENDING', 'CONFIRMED', 'PROCESSING'],
      CANCELLED: ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'],
    };
    const cantGoTo = invalidTransitions[currentOrder.status];
    if (cantGoTo?.includes(status)) {
      throw Errors.badRequest(`Cannot transition from ${currentOrder.status} to ${status}`, 'INVALID_STATUS_TRANSITION');
    }

    // Handle inventory restoration on cancellation
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

// GET /admin/products — All products
router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { category: { select: { name: true } }, variants: true },
      }),
      prisma.product.count(),
    ]);

    sendSuccess(res, products, 200, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

// GET /admin/customers — All customers
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
          id: true, email: true, firstName: true, lastName: true,
          loyaltyPoints: true, loyaltyTier: true, createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, customers, 200, {
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit), hasNext: page * limit < total, hasPrev: page > 1 },
    });
  } catch (err) { next(err); }
});

// GET /admin/promos — All promo codes
router.get('/promos', async (_req, res, next) => {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { promoUsages: true } } },
    });
    sendSuccess(res, promos);
  } catch (err) { next(err); }
});

export default router;
