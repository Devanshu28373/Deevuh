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
router.post('/webhooks/razorpay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    if (!signature) {
      res.status(400).json({ success: false, error: { message: 'Missing signature' } });
      return;
    }

    // Verify webhook signature
    const rawBody = JSON.stringify(req.body);
    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      res.status(400).json({ success: false, error: { message: 'Invalid signature' } });
      return;
    }

    const { event, payload } = req.body;

    switch (event) {
      case 'payment.captured':
        if (payload.payment?.entity) {
          await paymentService.handlePaymentCaptured(
            payload.payment.entity.id,
            payload.payment.entity.order_id
          );
        }
        break;

      case 'payment.failed':
        if (payload.payment?.entity) {
          await paymentService.handlePaymentFailed(
            payload.payment.entity.id,
            payload.payment.entity.order_id
          );
        }
        break;

      case 'refund.processed':
        if (payload.refund?.entity) {
          await paymentService.handleRefundProcessed(
            payload.refund.entity.payment_id,
            payload.refund.entity.amount
          );
        }
        break;

      default:
        console.log(`Unhandled Razorpay event: ${event}`);
    }

    // Always return 200 to acknowledge webhook
    res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook processing error:', err);
    // Still return 200 to prevent Razorpay from retrying
    res.status(200).json({ status: 'error_logged' });
  }
});

export default router;
