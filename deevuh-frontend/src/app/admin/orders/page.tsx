'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminOrder, PaginationMeta } from '@/lib/types';
import styles from '../admin.module.css';

const STATUSES = ['', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [updatingId, setUpdatingId] = useState('');
  const [toast, setToast] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (filter) params.set('status', filter);
      if (search) params.set('search', search);
      const res = await api.get<AdminOrder[]>(`/admin/orders?${params}`);
      setOrders(Array.isArray(res.data) ? res.data : []);
      setPagination((res as any).meta?.pagination ?? null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, filter, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Debounce search
  useEffect(() => {
    setPage(1);
  }, [search, filter]);

  async function updateStatus(orderId: string, newStatus: string) {
    setUpdatingId(orderId);
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      showToast(`Order status updated to ${newStatus}`);
      await fetchOrders();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to update status', true);
    } finally {
      setUpdatingId('');
    }
  }

  function showToast(msg: string, isError = false) {
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

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Orders</h2>
        <div className={styles.toolbar}>
          <input
            className={styles.tableSearch}
            type="text"
            placeholder="Search order # or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select className={styles.statusSelect} value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}>
            {STATUSES.map(s => <option key={s} value={s}>{s || 'All Statuses'}</option>)}
          </select>
        </div>
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
                <td>
                  <Link href={`/admin/orders/${order.id}`} style={{ fontWeight: 600, color: 'var(--ruby)' }}>
                    {order.orderNumber}
                  </Link>
                </td>
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
                    disabled={updatingId === order.id || order.status === 'DELIVERED' || order.status === 'CANCELLED'}
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

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} orders)</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
