'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import type { ProductDetail } from '@/lib/types';
import styles from './pdp.module.css';

export default function ProductDetailPage() {
  const params = useParams();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('details');
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedMessage, setAddedMessage] = useState('');

  useEffect(() => {
    if (params.slug) {
      fetchProduct(params.slug as string);
    }
  }, [params.slug]);

  async function fetchProduct(slug: string) {
    setError('');
    try {
      const res = await api.get<ProductDetail>(`/products/${slug}`);
      const data = res.data;
      if (!data) {
        setError('Product not found');
        return;
      }
      setProduct(data);
      // Auto-select first available variant
      const availableVariants = (data.variants ?? []).filter(v => v.stockQuantity > 0);
      if (availableVariants.length > 0) {
        setSelectedSize(availableVariants[0].size);
        setSelectedColor(availableVariants[0].color);
      }
    } catch (err) {
      console.error('Failed to fetch product:', err);
      setError('Failed to load product. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (error || !product) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p>{error || 'Product not found'}</p>
        <Link href="/shop" style={{ padding: '12px 32px', background: 'var(--ruby)', color: 'var(--white)', borderRadius: 8, fontWeight: 600 }}>
          Browse Collection
        </Link>
      </div>
    );
  }

  const variants = product.variants ?? [];
  const images = product.images ?? [];
  const sizes = [...new Set(variants.map(v => v.size))];
  const colors = [...new Set(variants.map(v => v.color))];
  const selectedVariant = variants.find(v => v.size === selectedSize && v.color === selectedColor);
  const displayPrice = selectedVariant?.price || product.basePrice;
  const discount = product.compareAtPrice
    ? Math.round(((product.compareAtPrice - displayPrice) / product.compareAtPrice) * 100)
    : 0;

  async function handleAddToCart() {
    if (!selectedVariant || !product) return;
    setAddingToCart(true);
    try {
      await api.post('/cart/items', {
        productId: product.id,
        variantId: selectedVariant.id,
        quantity: 1,
      });
      setAddedMessage('Added to bag!');
      setTimeout(() => setAddedMessage(''), 3000);
    } catch (err: any) {
      setAddedMessage(err?.message || 'Failed to add');
    } finally {
      setAddingToCart(false);
    }
  }

  const getStockForSize = (size: string) => {
    return variants
      .filter(v => v.size === size && (selectedColor ? v.color === selectedColor : true))
      .reduce((sum, v) => sum + v.stockQuantity, 0);
  };

  return (
    <div className={styles.pdp}>
      {/* Gallery */}
      <div className={styles.gallery}>
        <div className={styles.mainImage}>
          <img src={images[selectedImage] || '/images/placeholder.png'} alt={product.name} />
        </div>
        {images.length > 1 && (
          <div className={styles.thumbnails}>
            {images.map((img, i) => (
              <div
                key={i}
                className={`${styles.thumb} ${i === selectedImage ? styles.active : ''}`}
                onClick={() => setSelectedImage(i)}
              >
                <img src={img} alt={`${product.name} view ${i + 1}`} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className={styles.details}>
        <p className={styles.breadcrumb}>
          <Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / <Link href={`/shop?category=${product.category?.slug ?? ''}`}>{product.category?.name ?? 'Category'}</Link> / {product.name}
        </p>

        <h1 className={styles.productName}>{product.name}</h1>

        {product.avgRating > 0 && (
          <div className={styles.ratingRow}>
            <span className={styles.stars}>{'★'.repeat(Math.round(product.avgRating))}</span>
            <span>{product.avgRating.toFixed(1)} ({product.reviewCount ?? 0} reviews)</span>
          </div>
        )}

        <div className={styles.priceRow}>
          <span className={styles.currentPrice}>{formatPrice(displayPrice)}</span>
          {product.compareAtPrice && (
            <>
              <span className={styles.originalPrice}>{formatPrice(product.compareAtPrice)}</span>
              <span className={styles.discount}>{discount}% OFF</span>
            </>
          )}
        </div>

        <p className={styles.description}>{product.shortDescription || product.description}</p>

        {/* Stock Info */}
        {selectedVariant && (
          <p className={styles.stockInfo}>
            {selectedVariant.stockQuantity > 5 ? (
              <span className={styles.inStock}>✓ In Stock</span>
            ) : selectedVariant.stockQuantity > 0 ? (
              <span className={styles.lowStock}>⚡ Only {selectedVariant.stockQuantity} left</span>
            ) : (
              <span style={{ color: 'var(--error)', fontWeight: 600 }}>✕ Out of Stock</span>
            )}
          </p>
        )}

        {/* Size Selector */}
        <div className={styles.selectorGroup}>
          <p className={styles.selectorLabel}>Size: {selectedSize}</p>
          <div className={styles.sizeOptions}>
            {sizes.map(size => {
              const stock = getStockForSize(size);
              return (
                <button
                  key={size}
                  className={`${styles.sizeBtn} ${selectedSize === size ? styles.active : ''} ${stock === 0 ? styles.outOfStock : ''}`}
                  onClick={() => stock > 0 && setSelectedSize(size)}
                  disabled={stock === 0}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Selector */}
        {colors.length > 1 && (
          <div className={styles.selectorGroup}>
            <p className={styles.selectorLabel}>Color: {selectedColor}</p>
            <div className={styles.colorOptions}>
              {colors.map(color => {
                const variant = variants.find(v => v.color === color);
                return (
                  <button
                    key={color}
                    className={`${styles.colorSwatch} ${selectedColor === color ? styles.active : ''}`}
                    style={{ background: variant?.colorHex || '#ccc' }}
                    onClick={() => setSelectedColor(color)}
                    title={color}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className={styles.ctaRow}>
          <button
            className={styles.addToCart}
            onClick={handleAddToCart}
            disabled={!selectedVariant || selectedVariant.stockQuantity === 0 || addingToCart}
          >
            {addedMessage || (addingToCart ? 'Adding...' : 'Add to Bag')}
          </button>
          <button className={styles.wishlistBtn} aria-label="Add to wishlist">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <div className={styles.tabList}>
            {['details', 'fabric', 'care', 'shipping'].map(tab => (
              <button
                key={tab}
                className={`${styles.tab} ${activeTab === tab ? styles.active : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'details' ? 'Details' : tab === 'fabric' ? 'Fabric' : tab === 'care' ? 'Care' : 'Shipping'}
              </button>
            ))}
          </div>
          <div className={styles.tabContent}>
            {activeTab === 'details' && <p>{product.description}</p>}
            {activeTab === 'fabric' && <p>{product.fabric || 'Premium quality fabric. Contact us for specific details.'}</p>}
            {activeTab === 'care' && <p>{product.careInstructions || 'Please refer to the garment label for care instructions.'}</p>}
            {activeTab === 'shipping' && (
              <div>
                <p>• Free shipping on orders above ₹999</p>
                <p>• Standard delivery: 5–7 business days</p>
                <p>• Express delivery: 2–3 business days</p>
                <p>• 7-day easy return policy</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
