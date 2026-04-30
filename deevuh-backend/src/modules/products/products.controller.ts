import { Request, Response, NextFunction } from 'express';
import * as productService from './products.service';
import { sendSuccess, sendCreated, sendPaginated, sendNoContent } from '../../shared/utils/apiResponse';

export async function getProducts(req: Request, res: Response, next: NextFunction) {
  try {
    const { products, total, page, limit } = await productService.getProducts(req.query as any);
    sendPaginated(res, products, total, page, limit);
  } catch (err) { next(err); }
}

export async function getProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.getProductBySlug(req.params.slug as string);
    sendSuccess(res, product);
  } catch (err) { next(err); }
}

export async function getFeatured(req: Request, res: Response, next: NextFunction) {
  try {
    const products = await productService.getFeaturedProducts();
    sendSuccess(res, products);
  } catch (err) { next(err); }
}

export async function createProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.createProduct(req.body);
    sendCreated(res, product);
  } catch (err) { next(err); }
}

export async function updateProduct(req: Request, res: Response, next: NextFunction) {
  try {
    const product = await productService.updateProduct(req.params.id as string, req.body);
    sendSuccess(res, product);
  } catch (err) { next(err); }
}

export async function deleteProduct(req: Request, res: Response, next: NextFunction) {
  try {
    await productService.deleteProduct(req.params.id as string);
    sendNoContent(res);
  } catch (err) { next(err); }
}
