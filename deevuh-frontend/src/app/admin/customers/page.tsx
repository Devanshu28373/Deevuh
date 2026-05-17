'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import type { AdminCustomer, PaginationMeta } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      const res = await api.get<AdminCustomer[]>(`/admin/customers?${params}`);
      setCustomers(Array.isArray(res.data) ? res.data : []);
      setPagination((res as any).meta?.pagination ?? null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);
  useEffect(() => { setPage(1); }, [search]);

  const tierColor = (tier: string) => {
    const map: Record<string, string> = {
      BRONZE: '#CD7F32', SILVER: '#C0C0C0', GOLD: '#FFD700',
      PLATINUM: '#E5E4E2', DIAMOND: '#B9F2FF',
    };
    return map[tier] || 'var(--gray-400)';
  };

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Customers</h2>
        <input
          className={styles.tableSearch}
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Orders</th>
              <th>Loyalty Points</th>
              <th>Tier</th>
              <th>Joined</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No customers found</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.firstName ?? '—'} {c.lastName ?? ''}</strong></td>
                <td style={{ color: 'var(--gray-500)', fontSize: 13 }}>{c.email ?? '—'}</td>
                <td style={{ fontSize: 13 }}>{c.phone ?? '—'}</td>
                <td style={{ fontWeight: 600 }}>{c._count?.orders ?? 0}</td>
                <td>{c.loyaltyPoints ?? 0}</td>
                <td>
                  <span className={styles.statusBadge} style={{ background: `${tierColor(c.loyaltyTier)}22`, color: tierColor(c.loyaltyTier) }}>
                    {c.loyaltyTier ?? 'BRONZE'}
                  </span>
                </td>
                <td style={{ fontSize: 12 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <Link href={`/admin/customers/${c.id}`}>
                    <button className={`${styles.btnSecondary} ${styles.btnSmall}`}>View</button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} customers)</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}
    </div>
  );
}
