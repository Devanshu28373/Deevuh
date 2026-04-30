import { z } from 'zod';

export const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

export const razorpayWebhookPayloadSchema = z.object({
  event: z.string(),
  payload: z.object({
    payment: z.object({
      entity: z.object({
        id: z.string(),
        order_id: z.string(),
        amount: z.number(),
        currency: z.string(),
        status: z.string(),
        method: z.string().optional(),
        notes: z.record(z.string(), z.string()).optional(),
      }),
    }).optional(),
    refund: z.object({
      entity: z.object({
        id: z.string(),
        payment_id: z.string(),
        amount: z.number(),
        status: z.string(),
      }),
    }).optional(),
  }),
});

export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
