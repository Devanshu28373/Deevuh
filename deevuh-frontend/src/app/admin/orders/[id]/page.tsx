'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminOrder } from '@/lib/types';
import styles from '../../admin.module.css';

export default function AdminOrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (params.id) fetchOrder();
  }, [params.id]);

  async function fetchOrder() {
    try {
      const res = await api.get<AdminOrder>(`/admin/orders/${params.id}`);
      setOrder(res.data ?? null);
    } catch { setOrder(null); }
    finally { setLoading(false); }
  }

  async function updateStatus(status: string) {
    if (!order) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/admin/orders/${order.id}/status`, { status });
      showToast(`Status updated to ${status}`);
      await fetchOrder();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed', true);
    } finally { setUpdatingStatus(false); }
  }

  async function initiateRefund() {
    if (!order || !confirm(`Refund ${formatPrice(order.total ?? 0)} for order ${order.orderNumber}?`)) return;
    setRefunding(true);
    try {
      await api.post(`/admin/orders/${order.id}/refund`, {});
      showToast('Refund initiated');
      await fetchOrder();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Refund failed', true);
    } finally { setRefunding(false); }
  }

  function showToast(msg: string, _isError = false) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: styles.statusPending, CONFIRMED: styles.statusConfirmed,
      PROCESSING: styles.statusProcessing, SHIPPED: styles.statusShipped,
      DELIVERED: styles.statusDelivered, CANCELLED: styles.statusCancelled,
    };
    return map[status] || '';
  };

  if (loading) return <p>Loading order...</p>;
  if (!order) return <p>Order not found.</p>;

  const STATUSES = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
  const isTerminal = ['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(order.status);
  const canRefund = order.paymentStatus === 'PAID' && !['REFUNDED'].includes(order.paymentStatus || '');

  return (
    <div>
      <Link href="/admin/orders" style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 16, display: 'inline-block' }}>← Back to Orders</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 4 }}>Order {order.orderNumber}</h1>
          <p style={{ fontSize: 14, color: 'var(--gray-400)' }}>
            Placed {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {!isTerminal && (
            <select
              className={styles.statusSelect}
              value={order.status}
              onChange={e => updateStatus(e.target.value)}
              disabled={updatingStatus}
              style={{ fontSize: 14, padding: '8px 16px' }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {canRefund && (
            <button className={`${styles.btnDanger} ${styles.btnSmall}`} onClick={initiateRefund} disabled={refunding}>
              {refunding ? 'Processing...' : '💸 Refund'}
            </button>
          )}
        </div>
      </div>

      <div className={styles.detailGrid}>
        {/* Order Info */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Order Info</h3>
          <div className={styles.detailRow}><span className={styles.dlabel}>Status</span><span className={styles.dvalue}><span className={`${styles.statusBadge} ${statusClass(order.status)}`}>{order.status}</span></span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Payment</span><span className={styles.dvalue}>{order.paymentMethod} · {order.paymentStatus ?? 'PENDING'}</span></div>
          {order.razorpayPaymentId && <div className={styles.detailRow}><span className={styles.dlabel}>Razorpay ID</span><span className={styles.dvalue} style={{ fontFamily: 'monospace', fontSize: 12 }}>{order.razorpayPaymentId}</span></div>}
          {order.promoCode && <div className={styles.detailRow}><span className={styles.dlabel}>Promo</span><span className={styles.dvalue}>{order.promoCode.code}</span></div>}
          {(order.loyaltyPointsRedeemed ?? 0) > 0 && <div className={styles.detailRow}><span className={styles.dlabel}>Loyalty Redeemed</span><span className={styles.dvalue}>{order.loyaltyPointsRedeemed} pts</span></div>}
          {order.trackingNumber && <div className={styles.detailRow}><span className={styles.dlabel}>Tracking</span><span className={styles.dvalue} style={{ fontFamily: 'monospace' }}>{order.trackingNumber}</span></div>}
          {order.cancelReason && <div className={styles.detailRow}><span className={styles.dlabel}>Cancel Reason</span><span className={styles.dvalue}>{order.cancelReason}</span></div>}
        </div>

        {/* Customer + Address */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Customer</h3>
          {order.user && (
            <>
              <div className={styles.detailRow}><span className={styles.dlabel}>Name</span><span className={styles.dvalue}>{order.user.firstName} {order.user.lastName}</span></div>
              <div className={styles.detailRow}><span className={styles.dlabel}>Email</span><span className={styles.dvalue}>{order.user.email}</span></div>
              {order.user.phone && <div className={styles.detailRow}><span className={styles.dlabel}>Phone</span><span className={styles.dvalue}>{order.user.phone}</span></div>}
            </>
          )}
          {order.address && (
            <>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-400)', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shipping Address</h4>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>
                {order.address.fullName ?? order.address.recipientName}<br />
                {order.address.addressLine1}<br />
                {order.address.city}, {order.address.state} — {order.address.pincode}<br />
                {order.address.phone && `Phone: ${order.address.phone}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Items */}
      <div className={styles.detailPanel}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Items ({order.items?.length ?? 0})</h3>
        <div className={styles.adminTable}>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Variant</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {(order.items ?? []).map((item, i) => (
                <tr key={i}>
                  <td style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {item.productImage && <div style={{ width: 40, height: 50, borderRadius: 4, overflow: 'hidden', background: 'var(--gray-100)', flexShrink: 0 }}><img src={item.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                    <span style={{ fontWeight: 500 }}>{item.productName}</span>
                  </td>
                  <td>{item.variantSize} / {item.variantColor}</td>
                  <td>{item.quantity}</td>
                  <td>{formatPrice(item.unitPrice ?? 0)}</td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(item.totalPrice ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pricing */}
        <div style={{ maxWidth: 320, marginLeft: 'auto', marginTop: 20 }}>
          <div className={styles.detailRow}><span className={styles.dlabel}>Subtotal</span><span className={styles.dvalue}>{formatPrice(order.subtotal ?? 0)}</span></div>
          {(order.discountAmount ?? 0) > 0 && <div className={styles.detailRow}><span className={styles.dlabel}>Discount</span><span className={styles.dvalue} style={{ color: 'var(--success)' }}>-{formatPrice(order.discountAmount ?? 0)}</span></div>}
          <div className={styles.detailRow}><span className={styles.dlabel}>Shipping</span><span className={styles.dvalue}>{order.shippingAmount === 0 ? 'FREE' : formatPrice(order.shippingAmount ?? 0)}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>GST (18%)</span><span className={styles.dvalue}>{formatPrice(order.taxAmount ?? 0)}</span></div>
          <div className={styles.detailRow} style={{ borderBottom: 'none', fontWeight: 700, fontSize: 16, marginTop: 8 }}><span>Total</span><span>{formatPrice(order.total ?? 0)}</span></div>
        </div>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
