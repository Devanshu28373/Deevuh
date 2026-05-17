'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminOrder } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  useEffect(() => { fetchOrders(); }, [filter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : '';
      const res = await api.get<AdminOrder[]>(`/admin/orders${params}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      await fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to update');
    } finally {
      setUpdatingId('');
    }
  }

  const statusClass = (status: string) => {
    const map: Record<string, string> = {
      PENDING: styles.statusPending, CONFIRMED: styles.statusConfirmed,
      PROCESSING: styles.statusProcessing, SHIPPED: styles.statusShipped,
      DELIVERED: styles.statusDelivered, CANCELLED: styles.statusCancelled,
    };
    return map[status] || '';
  };

  const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Orders</h2>
        <select className={styles.statusSelect} value={filter} onChange={e => setFilter(e.target.value)}>
          {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
        </select>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Order #</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Action</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No orders found</td></tr>
            ) : orders.map((order) => (
              <tr key={order.id} style={{ opacity: updatingId === order.id ? 0.5 : 1 }}>
                <td><strong>{order.orderNumber}</strong></td>
                <td>{order.user?.firstName ?? '—'} {order.user?.lastName ?? ''}<br /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{order.user?.email ?? ''}</span></td>
                <td>{order.items?.length ?? 0}</td>
                <td>{formatPrice(order.total ?? 0)}</td>
                <td style={{ fontSize: 12 }}>{order.paymentMethod ?? '—'}</td>
                <td><span className={`${styles.statusBadge} ${statusClass(order.status)}`}>{order.status}</span></td>
                <td>
                  <select
                    className={styles.statusSelect}
                    value={order.status}
                    onChange={e => updateStatus(order.id, e.target.value)}
                    disabled={updatingId === order.id}
                  >
                    {STATUSES.filter(Boolean).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(order.createdAt).toLocaleDateString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
