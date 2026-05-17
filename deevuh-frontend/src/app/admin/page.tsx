'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminStats } from '@/lib/types';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<AdminStats>('/admin/stats')
      .then(res => setStats(res.data ?? null))
      .catch(err => {
        console.error(err);
        setError('Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading dashboard...</p>;
  if (error || !stats) return <p style={{ color: 'var(--error)' }}>{error || 'Failed to load dashboard data.'}</p>;

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: styles.statusPending,
      CONFIRMED: styles.statusConfirmed,
      PROCESSING: styles.statusProcessing,
      SHIPPED: styles.statusShipped,
      DELIVERED: styles.statusDelivered,
      CANCELLED: styles.statusCancelled,
    };
    return map[status] || '';
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 32 }}>Dashboard</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.label}>Total Revenue</p>
          <p className={styles.value}>{formatPrice(stats.totalRevenue ?? 0)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Total Orders</p>
          <p className={styles.value}>{stats.totalOrders ?? 0}</p>
          <p className={styles.sub}>{stats.pendingOrders ?? 0} pending</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Customers</p>
          <p className={styles.value}>{stats.totalCustomers ?? 0}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Products</p>
          <p className={styles.value}>{stats.totalProducts ?? 0}</p>
          <p className={styles.sub}>{stats.lowStockProducts ?? 0} low stock</p>
        </div>
      </div>

      <div className={styles.tableHeader}>
        <h2>Recent Orders</h2>
        <Link href="/admin/orders" style={{ fontSize: 14, color: 'var(--ruby)', fontWeight: 600 }}>View All →</Link>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {(stats.recentOrders ?? []).map((order) => (
              <tr key={order.id}>
                <td><strong>{order.orderNumber}</strong></td>
                <td>{order.user?.firstName ?? '—'} {order.user?.lastName ?? ''}</td>
                <td>{order.items?.length || 0}</td>
                <td>{formatPrice(order.total ?? 0)}</td>
                <td><span className={`${styles.statusBadge} ${statusClass(order.status)}`}>{order.status}</span></td>
                <td>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
