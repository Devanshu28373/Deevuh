'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { AdminCustomer } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => fetchCustomers(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get<AdminCustomer[]>(`/admin/customers${params}`);
      setCustomers(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

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
              <th>Orders</th>
              <th>Loyalty Points</th>
              <th>Tier</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : customers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No customers found</td></tr>
            ) : customers.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.firstName ?? '—'} {c.lastName ?? ''}</strong></td>
                <td style={{ color: 'var(--gray-500)' }}>{c.email ?? '—'}</td>
                <td>{c._count?.orders ?? 0}</td>
                <td>{c.loyaltyPoints ?? 0}</td>
                <td><span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>{c.loyaltyTier ?? 'BRONZE'}</span></td>
                <td style={{ fontSize: 12 }}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
