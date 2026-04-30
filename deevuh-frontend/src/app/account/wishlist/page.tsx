'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import ProductCard from '@/components/ProductCard/ProductCard';
import styles from '../account.module.css';

interface WishlistItem {
  id: string;
  product: {
    slug: string;
    name: string;
    basePrice: number;
    compareAtPrice: number | null;
    images: string[];
    avgRating: number;
    reviewCount: number;
    category: { name: string };
  };
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<WishlistItem[]>('/wishlist')
      .then(res => setItems(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(id: string) {
    try {
      await api.delete(`/wishlist/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  }

  if (loading) return <p>Loading wishlist...</p>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 32 }}>My Wishlist</h1>

      {items.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>♡</p>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 8 }}>Your wishlist is empty</h3>
          <p style={{ color: 'var(--gray-400)' }}>Save items you love by tapping the heart icon.</p>
        </div>
      ) : (
        <div className={styles.wishlistGrid}>
          {items.map(item => (
            <div key={item.id} style={{ position: 'relative' }}>
              <ProductCard
                slug={item.product.slug}
                name={item.product.name}
                category={item.product.category?.name}
                image={item.product.images[0] || '/images/placeholder.png'}
                basePrice={item.product.basePrice}
                compareAtPrice={item.product.compareAtPrice}
                avgRating={item.product.avgRating}
                reviewCount={item.product.reviewCount}
              />
              <button
                onClick={() => handleRemove(item.id)}
                style={{ position: 'absolute', top: 12, right: 12, background: 'var(--white)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', zIndex: 2 }}
                aria-label="Remove from wishlist"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
