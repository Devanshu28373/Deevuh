import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { verifyPaymentSchema } from './payments.schemas';
import * as paymentService from './payments.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();

// POST /payments/verify — verify Razorpay payment after checkout
router.post('/verify', authenticate, validate(verifyPaymentSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const order = await paymentService.verifyPayment(req.body);
    sendSuccess(res, { order, message: 'Payment verified successfully' });
  } catch (err) { next(err); }
});

// POST /webhooks/razorpay — Razorpay webhook handler
// NOTE: This endpoint must NOT have authentication middleware.
// Razorpay sends webhooks from their servers, not from user browsers.
router.post('/webhooks/razorpay', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      console.warn('[WEBHOOK] Missing x-razorpay-signature header');
      res.status(400).json({ success: false, error: { message: 'Missing signature' } });
      return;
    }

    // Verify webhook signature using the raw JSON body
    // IMPORTANT: express.json() has already parsed the body, so we re-stringify.
    // For production, consider using express.raw() on this route for true raw body access.
    const rawBody = JSON.stringify(req.body);
    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn('[WEBHOOK] Invalid signature — possible replay/forgery attempt');
      res.status(400).json({ success: false, error: { message: 'Invalid signature' } });
      return;
    }

    const { event, payload } = req.body;
    console.log(`[WEBHOOK] Received event: ${event}`);

    switch (event) {
      case 'payment.captured':
        if (payload?.payment?.entity) {
          await paymentService.handlePaymentCaptured(
            payload.payment.entity.id,
            payload.payment.entity.order_id
          );
        }
        break;

      case 'payment.failed':
        if (payload?.payment?.entity) {
          await paymentService.handlePaymentFailed(
            payload.payment.entity.id,
            payload.payment.entity.order_id
          );
        }
        break;

      case 'refund.processed':
        if (payload?.refund?.entity) {
          await paymentService.handleRefundProcessed(
            payload.refund.entity.payment_id,
            payload.refund.entity.amount
          );
        }
        break;

      default:
        console.log(`[WEBHOOK] Unhandled event: ${event}`);
    }

    // Always return 200 to acknowledge webhook (prevents Razorpay retries)
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('[WEBHOOK] Processing error:', err);
    // Still return 200 to prevent infinite retries from Razorpay
    res.status(200).json({ status: 'error_logged' });
  }
});

export default router;
