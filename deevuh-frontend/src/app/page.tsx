import Link from 'next/link';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from './page.module.css';

// Static data matching the seed — will be replaced by API calls when backend is live
const featuredProducts = [
  { slug: 'baby-blue-coordset', name: 'Baby Blue Coordset', category: 'Separates', image: '/images/products/baby_blue.jpg', basePrice: 199900, avgRating: 4.8, reviewCount: 24 },
  { slug: 'beige-outfit', name: 'Beige Outfit', category: 'Dresses', image: '/images/products/beige_outfit.jpg', basePrice: 269900, avgRating: 4.5, reviewCount: 18 },
  { slug: 'brown-coordsets', name: 'Brown Coordsets', category: 'Separates', image: '/images/products/brown_coordsets.jpg', basePrice: 219900, avgRating: 4.9, reviewCount: 31 },
  { slug: 'dupatta-beige-outfit', name: 'Dupatta Beige Outfit', category: 'Ethnic', image: '/images/products/dupatta_beige.jpg', basePrice: 219900, avgRating: 4.3, reviewCount: 12 },
];

const categories = [
  { name: 'Dresses', slug: 'dresses', image: '/images/products/beige_outfit.jpg' },
  { name: 'Coats', slug: 'coats', image: '/images/swatch_coats.png' },
  { name: 'Separates', slug: 'separates', image: '/images/products/baby_blue.jpg' },
  { name: 'Ethnic', slug: 'ethnic', image: '/images/products/dupatta_beige.jpg' },
];

export default function HomePage() {
  return (
    <>
      {/* ─── Hero ─── */}
      <section className={styles.hero}>
        <div className={styles.heroBg}>
          <img src="/images/hero.png" alt="" />
        </div>
        <div className={styles.heroContent}>
          <p className={styles.heroSubtitle}>New Season Collection</p>
          <h1 className={styles.heroTitle}>Where Divine Meets Contemporary</h1>
          <p className={styles.heroDesc}>Discover curated fashion that celebrates the modern woman. Every piece tells a story of elegance and confidence.</p>
          <Link href="/shop" className={styles.heroCta}>
            Explore Collection →
          </Link>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <div className={styles.trustBar}>
        <div className={styles.trustItem}><span>🚚</span> Free Shipping Above ₹999</div>
        <div className={styles.trustItem}><span>↩️</span> 7-Day Easy Returns</div>
        <div className={styles.trustItem}><span>🔒</span> Secure Payments</div>
        <div className={styles.trustItem}><span>✨</span> Premium Quality</div>
      </div>

      {/* ─── Categories ─── */}
      <section className={styles.categories}>
        <h2 className={styles.sectionTitle}>Shop by Category</h2>
        <p className={styles.sectionSubtitle}>Explore our curated collections for every occasion</p>
        <div className={styles.categoryGrid}>
          {categories.map((cat) => (
            <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className={styles.categoryCard}>
              <img src={cat.image} alt={cat.name} loading="lazy" />
              <div className={styles.categoryOverlay}>
                <h3>{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Featured Products ─── */}
      <section className={styles.products}>
        <h2 className={styles.sectionTitle}>Curated For You</h2>
        <p className={styles.sectionSubtitle}>Handpicked pieces from our latest collection</p>
        <div className={styles.productGrid}>
          {featuredProducts.map((product) => (
            <ProductCard key={product.slug} {...product} />
          ))}
        </div>
        <Link href="/shop" className={styles.shopAllBtn}>Shop All →</Link>
      </section>

      {/* ─── Editorial ─── */}
      <section className={styles.editorial}>
        <div className={styles.editorialInner}>
          <div className={styles.editorialImage}>
            <img src="/images/products/combo.jpg" alt="Editorial" loading="lazy" />
          </div>
          <div className={styles.editorialContent}>
            <h2>The Art of Everyday Elegance</h2>
            <p>Our design philosophy is rooted in the belief that luxury should be lived in, not just admired. Each piece in our collection is crafted with attention to detail, from the hand-finished seams to the carefully selected fabrics.</p>
            <Link href="/shop" className={styles.heroCta}>Discover More →</Link>
          </div>
        </div>
      </section>
    </>
  );
}
