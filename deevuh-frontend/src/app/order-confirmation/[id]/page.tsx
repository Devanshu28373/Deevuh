'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod: string;
  createdAt: string;
  items: { productName: string; variantSize: string; variantColor: string; quantity: number; unitPrice: number; productImage: string | null }[];
  address: { recipientName: string; addressLine1: string; city: string; state: string; pincode: string } | null;
}

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      api.get<Order>(`/orders/${params.id}`)
        .then(res => setOrder(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  if (!order) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Order not found</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 32, marginBottom: 8 }}>Order Confirmed!</h1>
      <p style={{ color: 'var(--gray-500)', fontSize: 16, marginBottom: 8 }}>Thank you for shopping with Deevuh</p>
      <p style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 40 }}>
        Order <strong style={{ color: 'var(--black)' }}>{order.orderNumber}</strong> · {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Paid Online'}
      </p>

      <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 32, textAlign: 'left', marginBottom: 32 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 18, marginBottom: 20 }}>Order Details</h3>
        {order.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ width: 60, height: 78, borderRadius: 8, overflow: 'hidden', background: 'var(--gray-200)', flexShrink: 0 }}>
              {item.productImage && <img src={item.productImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 500 }}>{item.productName}</p>
              <p style={{ fontSize: 13, color: 'var(--gray-400)' }}>{item.variantSize} · {item.variantColor} · Qty: {item.quantity}</p>
            </div>
            <p style={{ fontWeight: 600 }}>{formatPrice(item.unitPrice * item.quantity)}</p>
          </div>
        ))}

        <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 16, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-500)' }}><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          {order.discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--success)' }}><span>Discount</span><span>-{formatPrice(order.discountAmount)}</span></div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-500)' }}><span>Shipping</span><span>{order.shippingAmount === 0 ? 'FREE' : formatPrice(order.shippingAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--gray-500)' }}><span>GST</span><span>{formatPrice(order.taxAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 18, marginTop: 8 }}><span>Total</span><span>{formatPrice(order.total)}</span></div>
        </div>
      </div>

      {order.address && (
        <div style={{ background: 'var(--gray-100)', borderRadius: 12, padding: 24, textAlign: 'left', marginBottom: 32 }}>
          <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 8 }}>Shipping To</h4>
          <p style={{ fontSize: 14, color: 'var(--gray-500)', lineHeight: 1.6 }}>
            {order.address.recipientName}<br />
            {order.address.addressLine1}<br />
            {order.address.city}, {order.address.state} — {order.address.pincode}
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
        <Link href="/account/orders" style={{ padding: '14px 32px', border: '2px solid var(--gray-200)', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
          View Orders
        </Link>
        <Link href="/shop" style={{ padding: '14px 32px', background: 'var(--ruby)', color: 'var(--white)', borderRadius: 8, fontWeight: 600, fontSize: 14 }}>
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
