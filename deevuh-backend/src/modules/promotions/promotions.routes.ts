import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as promoService from './promotions.service';
import { sendSuccess, sendCreated } from '../../shared/utils/apiResponse';

const router = Router();

// POST /promos/validate — validate a promo code
router.post('/validate', authenticate, async (req, res, next) => {
  try {
    const { code, cartSubtotal } = req.body;
    const result = await promoService.validatePromo(code, req.user!.userId, cartSubtotal);
    sendSuccess(res, result);
  } catch (err) { next(err); }
});

// Admin: GET /promos — list all promos
router.get('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const promos = await promoService.listPromos();
    sendSuccess(res, promos);
  } catch (err) { next(err); }
});

// Admin: POST /promos — create promo
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const promo = await promoService.createPromo(req.body);
    sendCreated(res, promo);
  } catch (err) { next(err); }
});

export default router;
