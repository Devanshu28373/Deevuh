'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import type { Address, CartData, CreateOrderResponse } from '@/lib/types';
import styles from './checkout.module.css';

const STEPS = ['Address', 'Shipping', 'Payment'];

export default function CheckoutPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth();
  const [step, setStep] = useState(0);
  const [cart, setCart] = useState<CartData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('RAZORPAY');
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    recipientName: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadData();
  }, [isAuthenticated]);

  async function loadData() {
    try {
      const [cartRes, addrRes] = await Promise.all([
        api.get<CartData>('/cart'),
        api.get<Address[]>('/users/me/addresses'),
      ]);
      setCart(cartRes.data ?? null);
      const addrs = Array.isArray(addrRes.data) ? addrRes.data : [];
      setAddresses(addrs);
      const defaultAddr = addrs.find(a => a.isDefault);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAddress() {
    try {
      const res = await api.post<Address>('/users/me/addresses', newAddress);
      if (res.data) {
        setAddresses(prev => [...prev, res.data]);
        setSelectedAddressId(res.data.id);
      }
      setShowNewAddress(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save address');
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddressId || !cart) return;
    setPlacing(true);

    try {
      const res = await api.post<CreateOrderResponse>(
        '/orders',
        { addressId: selectedAddressId, paymentMethod }
      );

      const orderData = res.data;
      if (!orderData?.order) {
        throw new Error('Invalid order response');
      }

      if (paymentMethod === 'COD') {
        router.push(`/order-confirmation/${orderData.order.id}`);
        return;
      }

      // Razorpay checkout
      if (orderData.razorpay) {
        const rzp = orderData.razorpay;
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.onload = () => {
          const options = {
            key: rzp.razorpayKeyId,
            amount: rzp.amount,
            currency: 'INR',
            name: 'Deevuh',
            description: `Order ${orderData.order.orderNumber}`,
            order_id: rzp.razorpayOrderId,
            handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
              try {
                await api.post('/payments/verify', response);
                router.push(`/order-confirmation/${orderData.order.id}`);
              } catch {
                alert('Payment verification failed. Please contact support.');
              }
            },
            prefill: { email: user?.email || '' },
            theme: { color: '#98111E' },
          };
          const rzpInstance = new (window as any).Razorpay(options);
          rzpInstance.open();
        };
        document.body.appendChild(script);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to place order');
    } finally {
      setPlacing(false);
    }
  }

  if (loading) {
    return <div className={styles.checkoutPage} style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  if (!cart || !cart.items || cart.items.length === 0) {
    router.push('/cart');
    return null;
  }

  const subtotal = cart.subtotal ?? 0;
  const shipping = subtotal >= 99900 ? 0 : 9900;
  const tax = Math.round(subtotal * 0.18);
  const total = subtotal + shipping + tax;

  return (
    <div className={styles.checkoutPage}>
      <h1>Checkout</h1>

      <div className={styles.checkoutLayout}>
        <div>
          {/* Stepper */}
          <div className={styles.stepper}>
            {STEPS.map((label, i) => (
              <div key={label} className={`${styles.step} ${i === step ? styles.active : ''} ${i < step ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>{i < step ? '✓' : i + 1}</div>
                <p className={styles.stepLabel}>{label}</p>
              </div>
            ))}
          </div>

          {/* Step 0: Address */}
          {step === 0 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 20 }}>Delivery Address</h2>
              <div className={styles.addressList}>
                {addresses.map(addr => (
                  <div
                    key={addr.id}
                    className={`${styles.addressCard} ${selectedAddressId === addr.id ? styles.selected : ''}`}
                    onClick={() => setSelectedAddressId(addr.id)}
                  >
                    <h4>{addr.label} — {addr.recipientName}</h4>
                    <p>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
                    <p>{addr.city}, {addr.state} — {addr.pincode}</p>
                    <p>Phone: {addr.phone}</p>
                  </div>
                ))}
              </div>

              {!showNewAddress ? (
                <button className={styles.addAddressBtn} onClick={() => setShowNewAddress(true)}>
                  + Add New Address
                </button>
              ) : (
                <div className={styles.addressForm}>
                  <input placeholder="Label (Home, Work)" value={newAddress.label} onChange={e => setNewAddress({ ...newAddress, label: e.target.value })} />
                  <input placeholder="Recipient Name" value={newAddress.recipientName} onChange={e => setNewAddress({ ...newAddress, recipientName: e.target.value })} />
                  <input className={styles.fullWidth} placeholder="Address Line 1" value={newAddress.addressLine1} onChange={e => setNewAddress({ ...newAddress, addressLine1: e.target.value })} />
                  <input className={styles.fullWidth} placeholder="Address Line 2 (Optional)" value={newAddress.addressLine2} onChange={e => setNewAddress({ ...newAddress, addressLine2: e.target.value })} />
                  <input placeholder="City" value={newAddress.city} onChange={e => setNewAddress({ ...newAddress, city: e.target.value })} />
                  <input placeholder="State" value={newAddress.state} onChange={e => setNewAddress({ ...newAddress, state: e.target.value })} />
                  <input placeholder="Pincode" value={newAddress.pincode} onChange={e => setNewAddress({ ...newAddress, pincode: e.target.value })} />
                  <input placeholder="Phone" value={newAddress.phone} onChange={e => setNewAddress({ ...newAddress, phone: e.target.value })} />
                  <div className={styles.fullWidth} style={{ display: 'flex', gap: 12 }}>
                    <button className={styles.nextBtn} style={{ flex: 1 }} onClick={handleSaveAddress}>Save Address</button>
                    <button className={styles.backBtn} onClick={() => setShowNewAddress(false)}>Cancel</button>
                  </div>
                </div>
              )}

              <div className={styles.stepNav}>
                <button className={styles.nextBtn} onClick={() => setStep(1)} disabled={!selectedAddressId}>
                  Continue to Shipping
                </button>
              </div>
            </div>
          )}

          {/* Step 1: Shipping */}
          {step === 1 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 20 }}>Shipping Method</h2>
              <div className={styles.paymentOptions}>
                <div className={`${styles.paymentOption} ${styles.selected}`}>
                  <input type="radio" checked readOnly />
                  <div className={styles.paymentLabel}>
                    <h4>{shipping === 0 ? 'Free Standard Shipping' : 'Standard Shipping — ' + formatPrice(shipping)}</h4>
                    <p>Estimated delivery: 5–7 business days</p>
                  </div>
                </div>
              </div>
              <div className={styles.stepNav}>
                <button className={styles.backBtn} onClick={() => setStep(0)}>← Back</button>
                <button className={styles.nextBtn} onClick={() => setStep(2)}>Continue to Payment</button>
              </div>
            </div>
          )}

          {/* Step 2: Payment */}
          {step === 2 && (
            <div>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 20 }}>Payment Method</h2>
              <div className={styles.paymentOptions}>
                <div
                  className={`${styles.paymentOption} ${paymentMethod === 'RAZORPAY' ? styles.selected : ''}`}
                  onClick={() => setPaymentMethod('RAZORPAY')}
                >
                  <input type="radio" checked={paymentMethod === 'RAZORPAY'} readOnly />
                  <div className={styles.paymentLabel}>
                    <h4>Pay Online</h4>
                    <p>Credit/Debit Card, UPI, Net Banking, Wallets</p>
                  </div>
                </div>
                <div
                  className={`${styles.paymentOption} ${paymentMethod === 'COD' ? styles.selected : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <input type="radio" checked={paymentMethod === 'COD'} readOnly />
                  <div className={styles.paymentLabel}>
                    <h4>Cash on Delivery</h4>
                    <p>Pay when your order arrives</p>
                  </div>
                </div>
              </div>
              <div className={styles.stepNav}>
                <button className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
                <button className={styles.nextBtn} onClick={handlePlaceOrder} disabled={placing}>
                  {placing ? 'Placing Order...' : `Place Order — ${formatPrice(total)}`}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className={styles.checkoutSummary}>
          <h3>Your Order</h3>
          {cart.items.map(item => (
            <div key={item.id} className={styles.summaryItem}>
              <img src={item.product?.images?.[0] || '/images/placeholder.png'} alt="" />
              <div className={styles.summaryItemInfo}>
                <p>{item.product?.name ?? 'Product'}</p>
                <p>{item.variant?.size ?? '—'} · {item.variant?.color ?? '—'} · Qty: {item.quantity}</p>
              </div>
              <span className={styles.summaryItemPrice}>{formatPrice(item.totalPrice)}</span>
            </div>
          ))}
          <div className={styles.summaryDivider} />
          <div className={styles.summaryRow}><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className={styles.summaryRow}><span>Shipping</span><span>{shipping === 0 ? 'FREE' : formatPrice(shipping)}</span></div>
          <div className={styles.summaryRow}><span>GST (18%)</span><span>{formatPrice(tax)}</span></div>
          <div className={styles.summaryTotal}><span>Total</span><span>{formatPrice(total)}</span></div>
        </div>
      </div>
    </div>
  );
}
