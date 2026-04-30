'use client';

import Link from 'next/link';
import styles from './ProductCard.module.css';

interface ProductCardProps {
  slug: string;
  name: string;
  category?: string;
  image: string;
  basePrice: number;
  compareAtPrice?: number | null;
  avgRating?: number;
  reviewCount?: number;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function ProductCard({
  slug, name, category, image, basePrice, compareAtPrice, avgRating, reviewCount,
}: ProductCardProps) {
  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - basePrice) / compareAtPrice) * 100)
    : 0;

  return (
    <article className={styles.card}>
      <Link href={`/shop/${slug}`}>
        <div className={styles.imageWrap}>
          <img src={image} alt={name} loading="lazy" />
          {discount > 0 && <span className={styles.saleBadge}>{discount}% OFF</span>}

          <button className={styles.wishlistBtn} aria-label="Add to wishlist" onClick={(e) => e.preventDefault()}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>

          <div className={styles.quickAdd}>Quick View</div>
        </div>
      </Link>

      <div className={styles.info}>
        {category && <p className={styles.category}>{category}</p>}
        <h3 className={styles.name}>{name}</h3>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formatPrice(basePrice)}</span>
          {compareAtPrice && <span className={styles.comparePrice}>{formatPrice(compareAtPrice)}</span>}
        </div>
        {avgRating !== undefined && avgRating > 0 && (
          <div className={styles.rating}>
            <span className={styles.stars}>{'★'.repeat(Math.round(avgRating))}</span>
            <span>({reviewCount})</span>
          </div>
        )}
      </div>
    </article>
  );
}
