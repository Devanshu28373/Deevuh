'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import type { CartData, PromoValidationResult } from '@/lib/types';
import styles from './cart.module.css';

const FREE_SHIPPING_THRESHOLD = 99900; // ₹999

export default function CartPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<PromoValidationResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    setError('');
    try {
      const res = await api.get<CartData>('/cart');
      setCart(res.data ?? null);
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      setError('Failed to load your cart. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  async function updateQuantity(itemId: string, quantity: number) {
    setUpdatingId(itemId);
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      await fetchCart();
    } catch (err: any) {
      alert(err?.message || 'Failed to update');
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeItem(itemId: string) {
    setUpdatingId(itemId);
    try {
      await api.delete(`/cart/items/${itemId}`);
      await fetchCart();
    } catch (err: any) {
      alert(err?.message || 'Failed to remove');
    } finally {
      setUpdatingId(null);
    }
  }

  async function applyPromo() {
    if (!promoCode.trim()) return;
    setPromoError('');
    setPromoResult(null);
    try {
      const res = await api.post<PromoValidationResult>('/promos/validate', {
        code: promoCode,
        cartSubtotal: cart?.subtotal || 0,
      });
      setPromoResult(res.data ?? null);
    } catch (err: any) {
      setPromoError(err?.message || 'Invalid promo code');
    }
  }

  if (loading) {
    return <div className={styles.cartPage} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading cart...</div>;
  }

  if (error) {
    return (
      <div className={styles.cartPage} style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <p style={{ color: 'var(--error)' }}>{error}</p>
        <button onClick={() => { setLoading(true); fetchCart(); }} style={{ padding: '12px 32px', background: 'var(--ruby)', color: 'var(--white)', borderRadius: 8, fontWeight: 600 }}>
          Retry
        </button>
      </div>
    );
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className={styles.cartPage}>
        <div className={styles.emptyCart}>
          <h2>Your Bag is Empty</h2>
          <p>Looks like you haven&apos;t added anything yet. Explore our collections and find something you love.</p>
          <Link href="/shop" className={styles.emptyCartBtn}>Start Shopping</Link>
        </div>
      </div>
    );
  }

  const subtotal = cart.subtotal ?? 0;
  const discount = promoResult?.discountAmount || 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const shipping = afterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : 9900;
  const tax = Math.round(afterDiscount * 0.18);
  const total = afterDiscount + shipping + tax;
  const shippingProgress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const amountToFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return (
    <div className={styles.cartPage}>
      <h1>Shopping Bag ({cart.items.length})</h1>

      <div className={styles.cartLayout}>
        {/* Items */}
        <div>
          {cart.items.map(item => (
            <div key={item.id} className={styles.cartItem} style={{ opacity: updatingId === item.id ? 0.5 : 1 }}>
              <Link href={`/shop/${item.product?.slug ?? ''}`} className={styles.itemImage}>
                <img src={item.product?.images?.[0] || '/images/placeholder.png'} alt={item.product?.name ?? 'Product'} />
              </Link>

              <div className={styles.itemDetails}>
                <h3>{item.product?.name ?? 'Product'}</h3>
                <p className={styles.itemMeta}>
                  Size: {item.variant?.size ?? '—'} &middot; Color: {item.variant?.color ?? '—'}
                </p>

                <div className={styles.quantityControl}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || updatingId === item.id}
                  >−</button>
                  <span className={styles.qtyValue}>{item.quantity}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={item.quantity >= (item.variant?.stockQuantity ?? 0) || updatingId === item.id}
                  >+</button>
                </div>

                <div className={styles.itemActions}>
                  <button onClick={() => removeItem(item.id)}>Remove</button>
                  <button>Save to Wishlist</button>
                </div>
              </div>

              <div className={styles.itemPriceCol}>
                <p className={styles.itemPrice}>{formatPrice(item.totalPrice)}</p>
                {item.quantity > 1 && (
                  <p className={styles.itemUnitPrice}>{formatPrice(item.unitPrice)} each</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={styles.summary}>
          <h2>Order Summary</h2>

          {/* Free Shipping Progress */}
          <div className={styles.shippingBar}>
            {shipping === 0 ? (
              <p className={styles.shippingBarLabel}>🎉 <span>You qualify for free shipping!</span></p>
            ) : (
              <p className={styles.shippingBarLabel}>
                Add {formatPrice(amountToFreeShipping)} more for <span>free shipping</span>
              </p>
            )}
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${shippingProgress}%` }} />
            </div>
          </div>

          {/* Promo Code */}
          <div className={styles.promoRow}>
            <input
              type="text"
              placeholder="Promo code"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
            />
            <button onClick={applyPromo}>Apply</button>
          </div>
          {promoResult && <p className={styles.promoSuccess}>✓ {promoResult.message}</p>}
          {promoError && <p className={styles.promoError}>✕ {promoError}</p>}

          {/* Lines */}
          <div className={styles.summaryLines}>
            <div className={styles.summaryLine}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            {discount > 0 && (
              <div className={`${styles.summaryLine} ${styles.discount}`}><span>Discount</span><span>-{formatPrice(discount)}</span></div>
            )}
            <div className={styles.summaryLine}><span>Shipping</span><span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
            <div className={styles.summaryLine}><span>GST (18%)</span><span>{formatPrice(tax)}</span></div>
          </div>

          <div className={styles.totalLine}><span>Total</span><span>{formatPrice(total)}</span></div>

          <Link href={isAuthenticated ? '/checkout' : '/login'} className={styles.checkoutBtn} style={{ display: 'block', textAlign: 'center' }}>
            {isAuthenticated ? 'Proceed to Checkout' : 'Sign in to Checkout'}
          </Link>

          <Link href="/shop" className={styles.continueShopping}>← Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
}
