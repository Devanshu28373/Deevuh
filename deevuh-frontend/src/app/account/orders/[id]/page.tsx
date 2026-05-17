'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { Order } from '@/lib/types';

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      api.get<Order>(`/orders/${params.id}`)
        .then(res => setOrder(res.data ?? null))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <p>Loading order details...</p>;
  if (!order) return <p>Order not found.</p>;

  const statusColors: Record<string, string> = {
    PENDING: 'var(--warning)',
    CONFIRMED: 'var(--success)',
    PROCESSING: '#2196F3',
    SHIPPED: '#9C27B0',
    DELIVERED: 'var(--success)',
    CANCELLED: 'var(--error)',
  };

  const steps = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
  const currentStep = steps.indexOf(order.status);

  return (
    <div>
      <Link href="/account/orders" style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 16, display: 'inline-block' }}>← Back to Orders</Link>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 8 }}>Order {order.orderNumber}</h1>
      <p style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 32 }}>
        Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
        &nbsp;·&nbsp;
        <span style={{ color: statusColors[order.status] || 'var(--black)', fontWeight: 600 }}>{order.status}</span>
      </p>

      {/* Tracking Progress */}
      {order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 40 }}>
          {steps.map((step, i) => (
            <div key={step} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: i <= currentStep ? 'var(--success)' : 'var(--gray-200)',
                color: i <= currentStep ? '#fff' : 'var(--gray-400)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, marginBottom: 6,
              }}>
                {i <= currentStep ? '✓' : i + 1}
              </div>
              <p style={{ fontSize: 11, fontWeight: 600, color: i <= currentStep ? 'var(--black)' : 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 16 }}>Items</h3>
        {(order.items ?? []).map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ width: 60, height: 78, borderRadius: 8, overflow: 'hidden', background: 'var(--gray-200)', flexShrink: 0 }}>
              {item.productImage && <img src={item.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500 }}>{item.productName ?? 'Product'}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>{item.variantSize ?? '—'} · {item.variantColor ?? '—'} · Qty: {item.quantity}</p>
            </div>
            <p style={{ fontWeight: 600 }}>{formatPrice(item.totalPrice ?? 0)}</p>
          </div>
        ))}
      </div>

      {/* Price breakdown + Address */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Price Breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: 'var(--gray-500)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatPrice(order.subtotal ?? 0)}</span></div>
            {(order.discountAmount ?? 0) > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-{formatPrice(order.discountAmount)}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span>{order.shippingAmount === 0 ? 'FREE' : formatPrice(order.shippingAmount ?? 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>GST</span><span>{formatPrice(order.taxAmount ?? 0)}</span></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginTop: 8, borderTop: '1px solid var(--gray-200)', paddingTop: 12 }}><span>Total</span><span>{formatPrice(order.total ?? 0)}</span></div>
          </div>
        </div>

        {order.address && (
          <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 24 }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 12 }}>Shipping Address</h3>
            <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>
              {order.address.recipientName}<br />
              {order.address.addressLine1}<br />
              {order.address.city}, {order.address.state} — {order.address.pincode}<br />
              Phone: {order.address.phone ?? '—'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
