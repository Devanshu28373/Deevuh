import * as dotenv from 'dotenv';
dotenv.config();
import prisma from '../src/config/database';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Admin User ───
  const adminPassword = await bcrypt.hash('admin123456', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@deevuh.com' },
    update: {},
    create: {
      email: 'admin@deevuh.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'Deevuh',
      role: 'SUPER_ADMIN',
      isEmailVerified: true,
    },
  });
  console.log('  ✅ Admin user created:', admin.email);

  // ─── Categories ───
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'dresses' },
      update: {},
      create: { name: 'Dresses', slug: 'dresses', description: 'Elegant dresses for every occasion', sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { slug: 'coats' },
      update: {},
      create: { name: 'Coats', slug: 'coats', description: 'Premium outerwear and coats', sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { slug: 'separates' },
      update: {},
      create: { name: 'Separates', slug: 'separates', description: 'Blouses, tops and bottoms', sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { slug: 'ethnic' },
      update: {},
      create: { name: 'Ethnic', slug: 'ethnic', description: 'Traditional Indian wear', sortOrder: 4 },
    }),
    prisma.category.upsert({
      where: { slug: 'accessories' },
      update: {},
      create: { name: 'Accessories', slug: 'accessories', description: 'Bags, jewelry and more', sortOrder: 5 },
    }),
  ]);
  console.log(`  ✅ ${categories.length} categories created`);

  // ─── Products (matching homepage) ───
  const [dresses, coats, separates, ethnic] = categories;

  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'baby-blue-coordset' },
      update: {},
      create: {
        name: 'Baby Blue Coordset',
        slug: 'baby-blue-coordset',
        description: 'A beautiful baby blue coordset perfect for casual outings.',
        shortDescription: 'Baby blue casual coordset',
        basePrice: 199900, // ₹1,999
        categoryId: separates.id,
        images: ['/images/products/baby_blue.jpg'],
        tags: ['coordset', 'blue', 'casual'],
        occasion: 'Casual',
        fabric: 'Cotton Blend',
        careInstructions: 'Machine wash',
        isFeatured: true,
        avgRating: 4.8,
        reviewCount: 24,
        variants: {
          create: [
            { sku: 'BBC-S', size: 'S', color: 'Baby Blue', colorHex: '#89CFF0', stockQuantity: 15, price: 199900 },
            { sku: 'BBC-M', size: 'M', color: 'Baby Blue', colorHex: '#89CFF0', stockQuantity: 12 },
            { sku: 'BBC-L', size: 'L', color: 'Baby Blue', colorHex: '#89CFF0', stockQuantity: 8 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'beige-outfit' },
      update: {},
      create: {
        name: 'Beige Outfit',
        slug: 'beige-outfit',
        description: 'An elegant beige outfit for formal and casual wear.',
        shortDescription: 'Elegant beige outfit',
        basePrice: 269900, // ₹2,699
        categoryId: dresses.id,
        images: ['/images/products/beige_outfit.jpg'],
        tags: ['beige', 'outfit', 'elegant'],
        occasion: 'Formal',
        fabric: 'Linen Blend',
        careInstructions: 'Dry clean recommended',
        isFeatured: true,
        avgRating: 4.5,
        reviewCount: 18,
        variants: {
          create: [
            { sku: 'BO-S', size: 'S', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 10, price: 269900 },
            { sku: 'BO-M', size: 'M', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 14 },
            { sku: 'BO-L', size: 'L', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 6 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'brown-coordsets' },
      update: {},
      create: {
        name: 'Brown Coordsets',
        slug: 'brown-coordsets',
        description: 'A stylish brown coordset that is comfortable and chic.',
        shortDescription: 'Stylish brown coordset',
        basePrice: 219900, // ₹2,199
        categoryId: separates.id,
        images: ['/images/products/brown_coordsets.jpg'],
        tags: ['brown', 'coordset', 'chic'],
        occasion: 'Casual',
        fabric: 'Cotton',
        careInstructions: 'Machine wash cold',
        isFeatured: true,
        avgRating: 4.9,
        reviewCount: 31,
        variants: {
          create: [
            { sku: 'BC-S', size: 'S', color: 'Brown', colorHex: '#964B00', stockQuantity: 8, price: 219900 },
            { sku: 'BC-M', size: 'M', color: 'Brown', colorHex: '#964B00', stockQuantity: 10 },
            { sku: 'BC-L', size: 'L', color: 'Brown', colorHex: '#964B00', stockQuantity: 5 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'dupatta-beige-outfit' },
      update: {},
      create: {
        name: 'Dupatta Beige Outfit',
        slug: 'dupatta-beige-outfit',
        description: 'A traditional beige outfit complete with a beautifully crafted dupatta.',
        shortDescription: 'Traditional outfit with dupatta',
        basePrice: 219900, // ₹2,199
        categoryId: ethnic.id,
        images: ['/images/products/dupatta_beige.jpg'],
        tags: ['ethnic', 'beige', 'dupatta'],
        occasion: 'Festive',
        fabric: 'Silk Blend',
        careInstructions: 'Dry clean only',
        isFeatured: true,
        avgRating: 4.3,
        reviewCount: 12,
        variants: {
          create: [
            { sku: 'DBO-S', size: 'S', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 5, price: 219900 },
            { sku: 'DBO-M', size: 'M', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 8 },
            { sku: 'DBO-L', size: 'L', color: 'Beige', colorHex: '#F5F5DC', stockQuantity: 4 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'combo-outfit' },
      update: {},
      create: {
        name: 'Combo Outfit',
        slug: 'combo-outfit',
        description: 'A perfect combo outfit for your daily wardrobe needs.',
        shortDescription: 'Versatile combo outfit',
        basePrice: 349900, // ₹3,499
        categoryId: separates.id,
        images: ['/images/products/combo.jpg'],
        tags: ['combo', 'versatile', 'daily'],
        occasion: 'Everyday',
        fabric: 'Cotton Blend',
        careInstructions: 'Machine wash',
        isFeatured: true,
        avgRating: 4.7,
        reviewCount: 45,
        variants: {
          create: [
            { sku: 'CO-S', size: 'S', color: 'Multicolor', colorHex: '#FFFFFF', stockQuantity: 15, price: 349900 },
            { sku: 'CO-M', size: 'M', color: 'Multicolor', colorHex: '#FFFFFF', stockQuantity: 20 },
            { sku: 'CO-L', size: 'L', color: 'Multicolor', colorHex: '#FFFFFF', stockQuantity: 10 },
          ],
        },
      },
    }),
  ]);
  console.log(`  ✅ ${products.length} products created with variants`);

  // ─── Promo Code ───
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      description: 'Welcome offer - 10% off your first order',
      type: 'PERCENTAGE',
      discountValue: 10,
      maxDiscountAmount: 200000, // ₹2,000 cap
      minOrderAmount: 99900,    // ₹999 minimum
      usageLimit: 1000,
      perUserLimit: 1,
    },
  });
  console.log('  ✅ Promo code WELCOME10 created');

  console.log('\n✨ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
