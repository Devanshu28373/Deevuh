'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard/ProductCard';
import api from '@/lib/api';
import type { ProductSummary, Category } from '@/lib/types';
import styles from './page.module.css';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<ProductSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHomeData() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          api.get<ProductSummary[]>('/products?limit=4&sort=rating'),
          api.get<Category[]>('/categories'),
        ]);
        setFeaturedProducts(Array.isArray(productsRes.data) ? productsRes.data : []);
        setCategories(Array.isArray(categoriesRes.data) ? categoriesRes.data : []);
      } catch (err) {
        console.error('Failed to load homepage data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHomeData();
  }, []);

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
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={styles.categoryCard} style={{ background: 'var(--gray-100)' }} />
            ))
          ) : categories.length > 0 ? (
            categories.slice(0, 4).map((cat) => (
              <Link key={cat.slug} href={`/shop?category=${cat.slug}`} className={styles.categoryCard}>
                <img src={cat.image || '/images/placeholder.png'} alt={cat.name} loading="lazy" />
                <div className={styles.categoryOverlay}>
                  <h3>{cat.name}</h3>
                </div>
              </Link>
            ))
          ) : null}
        </div>
      </section>

      {/* ─── Featured Products ─── */}
      <section className={styles.products}>
        <h2 className={styles.sectionTitle}>Curated For You</h2>
        <p className={styles.sectionSubtitle}>Handpicked pieces from our latest collection</p>
        <div className={styles.productGrid}>
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ aspectRatio: '3/4', background: 'var(--gray-100)', borderRadius: 'var(--radius-lg)' }} />
            ))
          ) : featuredProducts.length > 0 ? (
            featuredProducts.map((product) => (
              <ProductCard
                key={product.slug}
                slug={product.slug}
                name={product.name}
                category={product.category?.name}
                image={product.images?.[0] || '/images/placeholder.png'}
                basePrice={product.basePrice}
                compareAtPrice={product.compareAtPrice}
                avgRating={product.avgRating}
                reviewCount={product.reviewCount}
              />
            ))
          ) : (
            <p style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--gray-400)', padding: '40px 0' }}>
              No products available yet.
            </p>
          )}
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
