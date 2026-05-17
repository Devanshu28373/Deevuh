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
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw Errors.internal('Payment gateway is not configured');
  }

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

  console.log(`[PAYMENT] Created Razorpay order ${rzpOrder.id} for ${orderNumber} | amount=${amountPaise}`);

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
 *
 * IDEMPOTENCY: If the order is already PAID/CONFIRMED, returns it without
 * re-processing. This handles duplicate verify calls safely.
 */
export async function verifyPayment(input: VerifyPaymentInput) {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = input;

  // 1. Verify cryptographic signature (prevents forged payment confirmations)
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');

  if (!timingSafeCompare(expectedSignature, razorpay_signature)) {
    console.error(`[PAYMENT] Invalid signature for razorpay_order=${razorpay_order_id}`);
    throw Errors.badRequest('Invalid payment signature', 'INVALID_SIGNATURE');
  }

  // 2. Find our order by Razorpay order ID
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: razorpay_order_id },
    include: { items: true },
  });
  if (!order) throw Errors.notFound('Order');

  // 3. IDEMPOTENCY CHECK — if already paid, return without re-processing
  if (order.paymentStatus === 'PAID') {
    console.log(`[PAYMENT] Idempotent verify for already-paid order ${order.orderNumber}`);
    return order;
  }

  // 4. Guard against processing orders that aren't in PENDING state
  if (order.status !== 'PENDING') {
    console.error(`[PAYMENT] Verify called on non-PENDING order ${order.orderNumber} (status=${order.status})`);
    throw Errors.badRequest('Order is not in a payable state', 'INVALID_ORDER_STATE');
  }

  // 5. Atomic transaction: payment confirmation + stock deduction + loyalty
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // 5a. Update order with payment details
    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
      },
    });

    // 5b. Deduct inventory with oversell protection
    for (const item of order.items) {
      const variant = await tx.productVariant.findUnique({ where: { id: item.variantId } });
      if (!variant || variant.stockQuantity < item.quantity) {
        // This is a serious edge case — payment succeeded but stock depleted.
        // Log it loudly but don't throw (payment already captured).
        console.error(`[PAYMENT][CRITICAL] Stock depleted for variant=${item.variantId} on paid order ${order.orderNumber}. Need manual resolution.`);
        // Still decrement to reflect reality; negative stock = oversold
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      } else {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQuantity: { decrement: item.quantity } },
        });
      }
    }

    // 5c. Award loyalty points (1 point per ₹100 spent)
    const pointsEarned = Math.floor(order.total / 10000);
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
  }, {
    timeout: 15000,
  });

  console.log(`[PAYMENT] Verified payment for ${order.orderNumber} | payment_id=${razorpay_payment_id}`);

  return updatedOrder;
}

/**
 * Verify Razorpay webhook signature using constant-time comparison.
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    console.error('[WEBHOOK] RAZORPAY_WEBHOOK_SECRET is not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  return timingSafeCompare(expectedSignature, signature);
}

/**
 * Constant-time string comparison to prevent timing attacks.
 * Handles different-length strings safely (crypto.timingSafeEqual throws on length mismatch).
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

/**
 * Handle payment.captured webhook event.
 * Idempotent — safe to call multiple times.
 */
export async function handlePaymentCaptured(paymentId: string, rzpOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: rzpOrderId },
  });
  if (!order) {
    console.warn(`[WEBHOOK] payment.captured for unknown razorpay_order=${rzpOrderId}`);
    return;
  }

  // Idempotent: skip if already paid
  if (order.paymentStatus === 'PAID') {
    console.log(`[WEBHOOK] Idempotent payment.captured for already-paid order ${order.orderNumber}`);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      razorpayPaymentId: paymentId,
      paymentStatus: 'PAID',
      status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
    },
  });

  console.log(`[WEBHOOK] payment.captured for ${order.orderNumber}`);
}

/**
 * Handle payment.failed webhook event.
 */
export async function handlePaymentFailed(paymentId: string, rzpOrderId: string) {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: rzpOrderId },
  });
  if (!order) return;

  // Don't override already-paid status
  if (order.paymentStatus === 'PAID') {
    console.warn(`[WEBHOOK] payment.failed received for already-paid order ${order.orderNumber}. Ignoring.`);
    return;
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      razorpayPaymentId: paymentId,
      paymentStatus: 'FAILED',
    },
  });

  console.log(`[WEBHOOK] payment.failed for ${order.orderNumber}`);
}

/**
 * Handle refund.processed webhook event.
 */
export async function handleRefundProcessed(paymentId: string, _amountPaise: number) {
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

  console.log(`[WEBHOOK] refund.processed for ${order.orderNumber}`);
}

/**
 * Initiate a refund via Razorpay.
 */
export async function initiateRefund(orderId: string, amountPaise?: number) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || !order.razorpayPaymentId) {
    throw Errors.badRequest('Order has no payment to refund');
  }

  if (order.paymentStatus === 'REFUNDED') {
    throw Errors.badRequest('Order has already been refunded', 'ALREADY_REFUNDED');
  }

  const refund = await razorpay.payments.refund(order.razorpayPaymentId, {
    amount: amountPaise || order.total,
    notes: { deevuh_order_id: orderId, reason: 'Customer requested' },
  });

  console.log(`[PAYMENT] Initiated refund for ${order.orderNumber} | amount=${amountPaise || order.total}`);

  return refund;
}
