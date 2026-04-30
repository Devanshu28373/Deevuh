import { Router } from 'express';
import * as productsController from './products.controller';
import { validate } from '../../middleware/validate';
import { authenticate, authorize } from '../../middleware/auth';
import { productQuerySchema, createProductSchema } from './products.schemas';

const router = Router();

// Public routes
router.get('/', validate(productQuerySchema, 'query'), productsController.getProducts);
router.get('/featured', productsController.getFeatured);
router.get('/:slug', productsController.getProduct);

// Admin routes
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(createProductSchema), productsController.createProduct);
router.put('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productsController.updateProduct);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), productsController.deleteProduct);

export default router;
