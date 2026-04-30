import { z } from 'zod';

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
  category: z.string().optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
  size: z.string().optional(),
  color: z.string().optional(),
  occasion: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'bestsellers', 'rating']).default('newest'),
  search: z.string().optional(),
  featured: z.coerce.boolean().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200),
  description: z.string().min(1),
  shortDescription: z.string().optional(),
  basePrice: z.number().int().positive(),
  compareAtPrice: z.number().int().positive().optional(),
  categoryId: z.string().min(1),
  images: z.array(z.string().url()).min(1),
  tags: z.array(z.string()).default([]),
  occasion: z.string().optional(),
  fabric: z.string().optional(),
  careInstructions: z.string().optional(),
  isFeatured: z.boolean().default(false),
  variants: z.array(z.object({
    sku: z.string().min(1),
    size: z.string().min(1),
    color: z.string().min(1),
    colorHex: z.string().optional(),
    price: z.number().int().positive().optional(),
    stockQuantity: z.number().int().min(0).default(0),
  })).min(1),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
