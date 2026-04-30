'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import styles from '../account.module.css';

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/orders')
      .then(res => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const statusClass = (status: string) => {
    switch (status) {
      case 'PENDING': return styles.statusPending;
      case 'CONFIRMED': case 'PROCESSING': case 'SHIPPED': return styles.statusConfirmed;
      case 'DELIVERED': return styles.statusDelivered;
      case 'CANCELLED': return styles.statusCancelled;
      default: return '';
    }
  };

  if (loading) return <p>Loading orders...</p>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 32 }}>My Orders</h1>

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>📦</p>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 8 }}>No orders yet</h3>
          <p style={{ color: 'var(--gray-400)', marginBottom: 24 }}>Your order history will appear here once you make a purchase.</p>
          <Link href="/shop" style={{ padding: '12px 32px', background: 'var(--ruby)', color: 'var(--white)', borderRadius: 8, fontWeight: 600 }}>Browse Collection</Link>
        </div>
      ) : (
        <div className={styles.orderList}>
          {orders.map((order: any) => (
            <Link key={order.id} href={`/account/orders/${order.id}`} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <h4>{order.orderNumber}</h4>
                <span className={`${styles.orderStatus} ${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <div className={styles.orderItems}>
                {order.items?.slice(0, 6).map((item: any, i: number) => (
                  <div key={i} className={styles.orderThumb}>
                    {item.productImage && <img src={item.productImage} alt="" />}
                  </div>
                ))}
                {order.items?.length > 6 && <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--gray-400)' }}>+{order.items.length - 6} more</span>}
              </div>
              <div className={styles.orderFooter}>
                <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                <span className={styles.orderTotal}>{formatPrice(order.total)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
