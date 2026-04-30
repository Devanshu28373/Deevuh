import Razorpay from 'razorpay';
import crypto from 'crypto';
import env from '../../config/env';
import prisma from '../../config/database';
import { Errors } from '../../middleware/errorHandler';
import type { VerifyPaymentInput } from './payments.schemas';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: env.RAZORPAY_KEY_ID,
  key_secret: env.RAZORPAY_KEY_SECRET,
});

/**
 * Create a Razorpay order for a given Deevuh order.
 * Called during POST /orders when paymentMethod !== COD
 */
export async function createRazorpayOrder(orderId: string, amountPaise: number, orderNumber: string) {
  const rzpOrder = await razorpay.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: orderNumber,
    notes: { deevuh_order_id: orderId },
  });

  // Store Razorpay order ID on our order
  await prisma.order.update({
    where: { id: orderId },
    data: { razorpayOrderId: rzpOrder.id },
  });

  return {
    razorpayOrderId: rzpOrder.id,
    razorpayKeyId: env.RAZORPAY_KEY_ID,
    amount: amountPaise,
    currency: 'INR',
  };
}

/**
 * Verify Razorpay payment signature using HMAC-SHA256.
 * Called from POST /payments/verify after frontend checkout completes.
 */
export async function verifyPayment(input: VerifyPaymentInput) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;

  // Verify signature
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (expectedSignature !== razorpay_signature) {
    throw Errors.badRequest('Invalid payment signature', 'INVALID_SIGNATURE');
  }

  // Find our order by Razorpay order ID
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: razorpay_order_id },
    include: { items: true },
  });

  if (!order) throw Errors.notFound('Order');

  // Update order with payment details in a transaction
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 1. Update order status
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    });

    // 2. Deduct inventory for each item
    for (const item of order.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || variant.stockQuantity < item.quantity) {
        throw Errors.badRequest(`Stock depleted for ${item.productName}`, 'STOCK_DEPLETED');
      }

      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stockQuantity: { decrement: item.quantity } },
      });
    }

    // 3. Award loyalty points (1 point per ₹100 spent)
    const pointsEarned = Math.floor(order.total / 10000); // total is in paise, 10000 paise = ₹100
    if (pointsEarned > 0) {
      const user = await tx.user.update({
        where: { id: order.userId },
        data: {
          loyaltyPoints: { increment: pointsEarned },
          lastLoyaltyActivity: new Date(),
        },
      });

      await tx.loyaltyTransaction.create({
        data: {
          userId: order.userId,
          type: 'EARNED',
          points: pointsEarned,
          balance: user.loyaltyPoints,
          orderId: order.id,
          note: `Earned from order ${order.orderNumber}`,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { loyaltyPointsEarned: pointsEarned },
      });
    }

    return updated;
  });

  return updatedOrder;
}

/**
 * Verify Razorpay webhook signature.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature)
  );
}

/**
 * Handle payment.captured webhook event.
 * Idempotent — safe to call multiple times.
 */
export async function handlePaymentCaptured(paymentId: string, rzpOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: rzpOrderId },
  });
  if (!order) return; // Unknown order, ignore

  // Only process if not already confirmed (idempotent)
  if (order.paymentStatus === 'PAID') return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      razorpayPaymentId: paymentId,
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
    },
  });
}

/**
 * Handle payment.failed webhook event.
 */
export async function handlePaymentFailed(paymentId: string, rzpOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: rzpOrderId },
  });
  if (!order) return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      razorpayPaymentId: paymentId,
      paymentStatus: 'FAILED',
    },
  });
}

/**
 * Handle refund.processed webhook event.
 */
export async function handleRefundProcessed(paymentId: string, amountPaise: number) {
  const order = await prisma.order.findFirst({
    where: { razorpayPaymentId: paymentId },
  });
  if (!order) return;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: 'REFUNDED',
      status: 'REFUNDED',
    },
  });
}

/**
 * Initiate a refund via Razorpay.
 */
export async function initiateRefund(orderId: string, amountPaise?: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.razorpayPaymentId) {
    throw Errors.badRequest('Order has no payment to refund');
  }

  const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
    amount: amountPaise || order.total, // full refund by default
    notes: { deevuh_order_id: orderId, reason: 'Customer requested' },
  });

  return refund;
}
