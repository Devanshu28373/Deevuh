'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatPrice } from '@/lib/utils';
import type { OrderSummary, LoyaltyInfo } from '@/lib/types';
import styles from './account.module.css';

export default function AccountDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ orderCount: 0, wishlistCount: 0, loyaltyPoints: 0, loyaltyTier: 'BRONZE' });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<OrderSummary[]>('/orders?limit=3').catch(() => ({ data: [] as OrderSummary[] })),
      api.get<LoyaltyInfo>('/loyalty').catch(() => ({ data: { points: 0, tier: 'BRONZE' } })),
    ]).then(([ordersRes, loyaltyRes]) => {
      const orders = Array.isArray(ordersRes.data) ? ordersRes.data : [];
      setRecentOrders(orders);
      setStats({
        orderCount: orders.length,
        wishlistCount: 0,
        loyaltyPoints: loyaltyRes.data?.points ?? 0,
        loyaltyTier: loyaltyRes.data?.tier ?? 'BRONZE',
      });
    }).finally(() => setLoading(false));
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

  if (loading) {
    return <div style={{ minHeight: '40vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 32 }}>Dashboard</h1>

      <div className={styles.dashGrid}>
        <div className={styles.dashCard}>
          <h4>Orders</h4>
          <p className={styles.value}>{stats.orderCount}</p>
        </div>
        <div className={styles.dashCard}>
          <h4>Loyalty Points</h4>
          <p className={styles.value}>{stats.loyaltyPoints}</p>
          <p className={styles.sub}>{stats.loyaltyTier} Tier</p>
        </div>
        <div className={styles.dashCard}>
          <h4>Member Since</h4>
          <p className={styles.value} style={{ fontSize: 20 }}>{user?.email ?? '—'}</p>
        </div>
      </div>

      <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, marginBottom: 20 }}>Recent Orders</h2>
      {recentOrders.length === 0 ? (
        <p style={{ color: 'var(--gray-400)' }}>No orders yet. <Link href="/shop" style={{ color: 'var(--ruby)', fontWeight: 600 }}>Start shopping →</Link></p>
      ) : (
        <div className={styles.orderList}>
          {recentOrders.map((order) => (
            <Link key={order.id} href={`/account/orders/${order.id}`} className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <h4>{order.orderNumber}</h4>
                <span className={`${styles.orderStatus} ${statusClass(order.status)}`}>{order.status}</span>
              </div>
              <div className={styles.orderItems}>
                {order.items?.slice(0, 4).map((item, i) => (
                  <div key={i} className={styles.orderThumb}>
                    {item.productImage && <img src={item.productImage} alt="" />}
                  </div>
                ))}
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
