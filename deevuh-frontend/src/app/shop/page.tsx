'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductCard from '@/components/ProductCard/ProductCard';
import api from '@/lib/api';
import styles from './shop.module.css';

interface Product {
  slug: string;
  name: string;
  basePrice: number;
  compareAtPrice: number | null;
  images: string[];
  avgRating: number;
  reviewCount: number;
  category: { name: string; slug: string };
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'bestsellers', label: 'Bestsellers' },
];

const CATEGORIES = ['dresses', 'coats', 'separates', 'ethnic', 'accessories'];
const SIZES = ['XS', 'S', 'M', 'L', 'XL'];


export default function ShopPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [selectedSize, setSelectedSize] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchProducts();
  }, [sort, selectedCategory, selectedSize, page]);

  async function fetchProducts() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '12');
      params.set('sort', sort);
      if (selectedCategory) params.set('category', selectedCategory);
      if (selectedSize) params.set('size', selectedSize);

      const res = await api.get<Product[]>(`/products?${params.toString()}`);
      if (page === 1) {
        setProducts(res.data);
      } else {
        setProducts(prev => [...prev, ...res.data]);
      }
      setTotal(res.meta?.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  }

  const hasMore = products.length < total;

  return (
    <div className={styles.shopPage}>
      <div className={styles.shopHeader}>
        <h1>{selectedCategory ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1) : 'Shop All'}</h1>
        <p>Discover our curated collection of premium fashion</p>
      </div>

      <div className={styles.shopLayout}>
        {/* Sidebar Filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterGroup}>
            <h3>Category</h3>
            <div
              className={`${styles.filterOption} ${!selectedCategory ? styles.active : ''}`}
              onClick={() => { setSelectedCategory(''); setPage(1); }}
            >
              All Categories
            </div>
            {CATEGORIES.map(cat => (
              <div
                key={cat}
                className={`${styles.filterOption} ${selectedCategory === cat ? styles.active : ''}`}
                onClick={() => { setSelectedCategory(cat); setPage(1); }}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </div>
            ))}
          </div>

          <div className={styles.filterGroup}>
            <h3>Size</h3>
            {SIZES.map(size => (
              <label key={size} className={styles.filterOption}>
                <input
                  type="checkbox"
                  checked={selectedSize === size}
                  onChange={() => { setSelectedSize(selectedSize === size ? '' : size); setPage(1); }}
                />
                {size}
              </label>
            ))}
          </div>
        </aside>

        {/* Product Grid */}
        <div>
          <div className={styles.toolbar}>
            <span className={styles.resultCount}>
              {loading ? 'Loading...' : `${total} products`}
            </span>
            <select
              className={styles.sortSelect}
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.productGrid}>
            {products.map(product => (
              <ProductCard
                key={product.slug}
                slug={product.slug}
                name={product.name}
                category={product.category?.name}
                image={product.images[0] || '/images/placeholder.png'}
                basePrice={product.basePrice}
                compareAtPrice={product.compareAtPrice}
                avgRating={product.avgRating}
                reviewCount={product.reviewCount}
              />
            ))}

            {!loading && products.length === 0 && (
              <div className={styles.emptyState}>
                <h3>No products found</h3>
                <p>Try adjusting your filters or browse all products.</p>
              </div>
            )}

            {hasMore && (
              <button
                className={styles.loadMore}
                onClick={() => setPage(p => p + 1)}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
