'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminCustomer } from '@/lib/types';
import styles from '../../admin.module.css';

export default function AdminCustomerDetailPage() {
  const params = useParams();
  const [customer, setCustomer] = useState<AdminCustomer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      api.get<AdminCustomer>(`/admin/customers/${params.id}`)
        .then(res => setCustomer(res.data ?? null))
        .catch(() => setCustomer(null))
        .finally(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) return <p>Loading customer...</p>;
  if (!customer) return <p>Customer not found.</p>;

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
      <Link href="/admin/customers" style={{ fontSize: 14, color: 'var(--gray-400)', marginBottom: 16, display: 'inline-block' }}>← Back to Customers</Link>

      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 24 }}>
        {customer.firstName} {customer.lastName}
      </h1>

      <div className={styles.detailGrid}>
        {/* Info */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Profile</h3>
          <div className={styles.detailRow}><span className={styles.dlabel}>Email</span><span className={styles.dvalue}>{customer.email}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Phone</span><span className={styles.dvalue}>{customer.phone || '—'}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Joined</span><span className={styles.dvalue}>{new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Total Orders</span><span className={styles.dvalue}>{customer._count?.orders ?? 0}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Reviews</span><span className={styles.dvalue}>{customer._count?.reviews ?? 0}</span></div>
        </div>

        {/* Loyalty */}
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Loyalty</h3>
          <div className={styles.detailRow}><span className={styles.dlabel}>Points</span><span className={styles.dvalue} style={{ fontSize: 24, fontFamily: 'var(--font-heading)' }}>{customer.loyaltyPoints ?? 0}</span></div>
          <div className={styles.detailRow}><span className={styles.dlabel}>Tier</span><span className={styles.dvalue}>{customer.loyaltyTier ?? 'BRONZE'}</span></div>
        </div>
      </div>

      {/* Addresses */}
      {customer.addresses && customer.addresses.length > 0 && (
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Addresses ({customer.addresses.length})</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {customer.addresses.map(addr => (
              <div key={addr.id} style={{ padding: 16, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', fontSize: 14, lineHeight: 1.6 }}>
                <strong>{addr.label}</strong>{addr.isDefault && <span style={{ fontSize: 11, color: 'var(--ruby)', marginLeft: 8 }}>DEFAULT</span>}
                <p style={{ marginTop: 8 }}>
                  {addr.fullName ?? addr.recipientName}<br />
                  {addr.addressLine1}<br />
                  {addr.city}, {addr.state} — {addr.pincode}<br />
                  📞 {addr.phone}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {customer.orders && customer.orders.length > 0 && (
        <div className={styles.detailPanel}>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, marginBottom: 16 }}>Recent Orders</h3>
          <div className={styles.adminTable}>
            <table>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 600, color: 'var(--ruby)' }}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td><span className={`${styles.statusBadge} ${statusClass(order.status)}`}>{order.status}</span></td>
                    <td>{formatPrice(order.total)}</td>
                    <td style={{ fontSize: 12 }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
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
