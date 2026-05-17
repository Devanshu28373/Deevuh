import prisma from '../../config/database';
import redis, { RedisKeys, RedisTTL } from '../../config/redis';
import { Errors } from '../../middleware/errorHandler';
import type { ProductQuery, CreateProductInput } from './products.schemas';
import { Prisma } from '@prisma/client';

export async function getProducts(query: ProductQuery) {
  const { page, limit, category, minPrice, maxPrice, size, color, occasion, sort, search, featured } = query;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (category) {
    where.category = { slug: category };
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.basePrice = {};
    if (minPrice !== undefined) where.basePrice.gte = minPrice;
    if (maxPrice !== undefined) where.basePrice.lte = maxPrice;
  }
  if (size) {
    where.variants = { some: { size, isActive: true, stockQuantity: { gt: 0 } } };
  }
  if (color) {
    where.variants = { ...where.variants as any, some: { ...((where.variants as any)?.some || {}), color } };
  }
  if (occasion) {
    where.occasion = occasion;
  }
  if (featured !== undefined) {
    where.isFeatured = featured;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { tags: { hasSome: [search] } },
    ];
  }

  // Sort order
  let orderBy: Prisma.ProductOrderByWithRelationInput = {};
  switch (sort) {
    case 'newest': orderBy = { createdAt: 'desc' }; break;
    case 'price_asc': orderBy = { basePrice: 'asc' }; break;
    case 'price_desc': orderBy = { basePrice: 'desc' }; break;
    case 'bestsellers': orderBy = { reviewCount: 'desc' }; break;
    case 'rating': orderBy = { avgRating: 'desc' }; break;
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        variants: {
          where: { isActive: true },
          select: { id: true, sku: true, size: true, color: true, colorHex: true, price: true, stockQuantity: true },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, page, limit };
}

export async function getProductBySlug(slug: string) {
  // Check cache (graceful fallback if Redis is down)
  try {
    const cached = await redis.get(RedisKeys.productCache(slug));
    if (cached) return JSON.parse(cached);
  } catch { /* Redis down — proceed without cache */ }

  const product = await prisma.product.findUnique({
    where: { slug, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { isActive: true },
        orderBy: [{ size: 'asc' }, { color: 'asc' }],
      },
      reviews: {
        where: { isApproved: true },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!product) throw Errors.notFound('Product');

  // Best-effort cache write
  try {
    await redis.set(RedisKeys.productCache(slug), JSON.stringify(product), 'EX', RedisTTL.productCache);
  } catch { /* Redis down — skip cache write */ }

  return product;
}

export async function createProduct(input: CreateProductInput) {
  const { variants, ...productData } = input;

  const product = await prisma.product.create({
    data: {
      ...productData,
      variants: {
        create: variants,
      },
    },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
    },
  });

  return product;
}

export async function updateProduct(id: string, data: Partial<CreateProductInput>) {
  const { variants, ...productData } = data;

  const product = await prisma.product.update({
    where: { id },
    data: productData,
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: true,
    },
  });

  // Invalidate cache
  await redis.del(RedisKeys.productCache(product.slug));

  return product;
}

export async function deleteProduct(id: string) {
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  await redis.del(RedisKeys.productCache(product.slug));
}

export async function getFeaturedProducts(limit = 6) {
  return prisma.product.findMany({
    where: { isActive: true, isFeatured: true },
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        where: { isActive: true },
        select: { id: true, size: true, color: true, colorHex: true, price: true, stockQuantity: true },
      },
    },
  });
}
