import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

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
  const [dresses, coats, separates] = categories;

  const products = await Promise.all([
    prisma.product.upsert({
      where: { slug: 'amelia-satin-dress' },
      update: {},
      create: {
        name: 'Amelia Satin Dress',
        slug: 'amelia-satin-dress',
        description: 'A luxurious satin dress with a cowl neckline and flowing silhouette. Perfect for evening events and special occasions.',
        shortDescription: 'Luxurious satin with cowl neckline',
        basePrice: 2450000, // ₹24,500
        categoryId: dresses.id,
        images: ['/images/amelia.png'],
        tags: ['satin', 'evening', 'premium'],
        occasion: 'Evening',
        fabric: '100% Mulberry Silk Satin',
        careInstructions: 'Dry clean only',
        isFeatured: true,
        avgRating: 4.8,
        reviewCount: 24,
        variants: {
          create: [
            { sku: 'ASD-DR-XS', size: 'XS', color: 'Deep Red', colorHex: '#98111E', stockQuantity: 5, price: 2450000 },
            { sku: 'ASD-DR-S', size: 'S', color: 'Deep Red', colorHex: '#98111E', stockQuantity: 12 },
            { sku: 'ASD-DR-M', size: 'M', color: 'Deep Red', colorHex: '#98111E', stockQuantity: 8 },
            { sku: 'ASD-DR-L', size: 'L', color: 'Deep Red', colorHex: '#98111E', stockQuantity: 6 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'cassian-wool-coat' },
      update: {},
      create: {
        name: 'Cassian Wool Coat',
        slug: 'cassian-wool-coat',
        description: 'A double-breasted wool coat with military-inspired buttons and a structured silhouette. Timeless outerwear for the modern woman.',
        shortDescription: 'Double-breasted wool with military buttons',
        basePrice: 3480000, // ₹34,800
        compareAtPrice: 3900000, // ₹39,000
        categoryId: coats.id,
        images: ['/images/cassian.png'],
        tags: ['wool', 'winter', 'coat', 'premium'],
        occasion: 'Casual',
        fabric: '80% Wool, 20% Cashmere',
        careInstructions: 'Professional dry clean recommended',
        isFeatured: true,
        avgRating: 4.5,
        reviewCount: 18,
        variants: {
          create: [
            { sku: 'CWC-CR-S', size: 'S', color: 'Cream', colorHex: '#FDF0D5', stockQuantity: 4 },
            { sku: 'CWC-CR-M', size: 'M', color: 'Cream', colorHex: '#FDF0D5', stockQuantity: 7 },
            { sku: 'CWC-CR-L', size: 'L', color: 'Cream', colorHex: '#FDF0D5', stockQuantity: 3 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'skylar-blouse' },
      update: {},
      create: {
        name: 'Skylar Blouse',
        slug: 'skylar-blouse',
        description: 'A relaxed-fit silk blouse with French cuffs and a subtle sheen. Versatile enough for office to evening.',
        shortDescription: 'Relaxed silk with French cuffs',
        basePrice: 1490000, // ₹14,900
        categoryId: separates.id,
        images: ['/images/skylar.png'],
        tags: ['silk', 'blouse', 'office'],
        occasion: 'Work',
        fabric: '100% Silk Crepe',
        careInstructions: 'Hand wash cold, lay flat to dry',
        isFeatured: true,
        avgRating: 4.9,
        reviewCount: 31,
        variants: {
          create: [
            { sku: 'SKB-OW-XS', size: 'XS', color: 'Off-White', colorHex: '#FAF9F6', stockQuantity: 10 },
            { sku: 'SKB-OW-S', size: 'S', color: 'Off-White', colorHex: '#FAF9F6', stockQuantity: 15 },
            { sku: 'SKB-OW-M', size: 'M', color: 'Off-White', colorHex: '#FAF9F6', stockQuantity: 12 },
            { sku: 'SKB-OW-L', size: 'L', color: 'Off-White', colorHex: '#FAF9F6', stockQuantity: 8 },
          ],
        },
      },
    }),
    prisma.product.upsert({
      where: { slug: 'valentina-wrap-dress' },
      update: {},
      create: {
        name: 'Valentina Wrap Dress',
        slug: 'valentina-wrap-dress',
        description: 'A classic wrap dress in rich burgundy with a flattering V-neckline and tie waist.',
        shortDescription: 'Classic wrap with tie waist',
        basePrice: 1920000, // ₹19,200
        categoryId: dresses.id,
        images: ['/images/valentina.png'],
        tags: ['wrap', 'burgundy', 'classic'],
        occasion: 'Date Night',
        fabric: 'Viscose Blend',
        careInstructions: 'Machine wash gentle, hang dry',
        isFeatured: true,
        avgRating: 4.3,
        reviewCount: 12,
        variants: {
          create: [
            { sku: 'VWD-BG-S', size: 'S', color: 'Burgundy', colorHex: '#800020', stockQuantity: 9 },
            { sku: 'VWD-BG-M', size: 'M', color: 'Burgundy', colorHex: '#800020', stockQuantity: 11 },
            { sku: 'VWD-BG-L', size: 'L', color: 'Burgundy', colorHex: '#800020', stockQuantity: 6 },
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
