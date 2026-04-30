import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as shippingService from './shipping.service';
import { sendSuccess } from '../../shared/utils/apiResponse';

const router = Router();

// GET /shipping/serviceability/:pincode
router.get('/serviceability/:pincode', async (req, res, next) => {
  try {
    const result = await shippingService.checkServiceability(req.params.pincode as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// POST /shipping/create/:orderId — create shipment (admin or after payment)
router.post('/create/:orderId', authenticate, async (req, res, next) => {
  try {
    const result = await shippingService.createShipment(req.params.orderId as string);
    sendSuccess(res, result, 201);
  } catch (err) { next(err); }
});

// GET /shipping/track/:orderId — get tracking info
router.get('/track/:orderId', authenticate, async (req, res, next) => {
  try {
    const result = await shippingService.getTrackingStatus(req.params.orderId as string);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

export default router;
