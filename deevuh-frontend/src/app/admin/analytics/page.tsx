'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminAnalytics } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  useEffect(() => {
    setLoading(true);
    api.get<AdminAnalytics>(`/admin/analytics?days=${days}`)
      .then(res => setAnalytics(res.data ?? null))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [days]);

  if (loading) return <p>Loading analytics...</p>;
  if (!analytics) return <p style={{ color: 'var(--error)' }}>Failed to load analytics.</p>;

  const totalRevenue = analytics.revenueByDay.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = analytics.revenueByDay.reduce((sum, d) => sum + d.orders, 0);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const maxDayRevenue = Math.max(...analytics.revenueByDay.map(d => d.revenue), 1);

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: styles.statusPending, CONFIRMED: styles.statusConfirmed,
      PROCESSING: styles.statusProcessing, SHIPPED: styles.statusShipped,
      DELIVERED: styles.statusDelivered, CANCELLED: styles.statusCancelled,
    };
    return map[status] || '';
  };

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Analytics</h2>
        <div className={styles.toolbar}>
          {[7, 14, 30, 60, 90].map(d => (
            <button
              key={d}
              className={d === days ? styles.btnPrimary : styles.btnSecondary}
              style={{ padding: '6px 14px', fontSize: 13 }}
              onClick={() => setDays(d)}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <p className={styles.label}>Revenue ({days}d)</p>
          <p className={styles.value}>{formatPrice(totalRevenue)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Orders ({days}d)</p>
          <p className={styles.value}>{totalOrders}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Avg Order Value</p>
          <p className={styles.value}>{formatPrice(avgOrderValue)}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>New Customers ({days}d)</p>
          <p className={styles.value}>{analytics.newCustomers}</p>
        </div>
      </div>

      {/* Revenue Chart */}
      <div className={styles.chartCard}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Daily Revenue</h3>
        {analytics.revenueByDay.length === 0 ? (
          <p style={{ color: 'var(--gray-400)', textAlign: 'center', padding: 24 }}>No revenue data for this period</p>
        ) : (
          <div>
            <div className={styles.chartBar}>
              {analytics.revenueByDay.map((day, i) => (
                <div
                  key={i}
                  className={styles.chartBarItem}
                  style={{ height: `${Math.max(4, (day.revenue / maxDayRevenue) * 100)}%` }}
                  title={`${new Date(day.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}: ${formatPrice(day.revenue)} (${day.orders} orders)`}
                />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'var(--gray-400)' }}>
              <span>{analytics.revenueByDay.length > 0 ? new Date(analytics.revenueByDay[0].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
              <span>{analytics.revenueByDay.length > 0 ? new Date(analytics.revenueByDay[analytics.revenueByDay.length - 1].date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}</span>
            </div>
          </div>
        )}
      </div>

      <div className={styles.detailGrid}>
        {/* Orders by Status */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Orders by Status</h3>
          {analytics.ordersByStatus.length === 0 ? (
            <p style={{ color: 'var(--gray-400)' }}>No orders yet</p>
          ) : (
            analytics.ordersByStatus.map(item => (
              <div key={item.status} className={styles.detailRow}>
                <span><span className={`${styles.statusBadge} ${statusClass(item.status)}`}>{item.status}</span></span>
                <span className={styles.dvalue}>{item.count}</span>
              </div>
            ))
          )}
        </div>

        {/* Top Products */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Top Products ({days}d)</h3>
          {analytics.topProducts.length === 0 ? (
            <p style={{ color: 'var(--gray-400)' }}>No sales data yet</p>
          ) : (
            analytics.topProducts.map((product, i) => (
              <div key={product.id} className={styles.detailRow}>
                <span>
                  <span style={{ color: 'var(--gray-400)', marginRight: 8, fontSize: 12 }}>#{i + 1}</span>
                  <span style={{ fontWeight: 500 }}>{product.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>{product.unitsSold} sold</span>
                </span>
                <span className={styles.dvalue}>{formatPrice(product.revenue)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {analytics.lowStockVariants.length > 0 && (
        <div className={styles.detailPanel} style={{ borderLeft: '4px solid var(--error)' }}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16, color: 'var(--error)' }}>⚠ Low Stock Alert ({analytics.lowStockVariants.length} variants)</h3>
          <div className={styles.adminTable}>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Size</th>
                  <th>Color</th>
                  <th>Stock</th>
                </tr>
              </thead>
              <tbody>
                {analytics.lowStockVariants.slice(0, 10).map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 500 }}>{v.product?.name ?? 'Unknown'}</td>
                    <td>{v.size}</td>
                    <td>{v.color}</td>
                    <td style={{ fontWeight: 700, color: v.stockQuantity === 0 ? 'var(--error)' : '#F59E0B' }}>{v.stockQuantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
