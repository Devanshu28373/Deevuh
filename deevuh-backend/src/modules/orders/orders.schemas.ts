import { z } from 'zod';

export const createOrderSchema = z.object({
  addressId: z.string().min(1, 'Address is required'),
  paymentMethod: z.enum(['RAZORPAY', 'COD'], { message: 'Invalid payment method' }),
  promoCode: z.string().optional(),
  loyaltyPointsToRedeem: z.number().int().min(0).default(0),
});

export const cancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
