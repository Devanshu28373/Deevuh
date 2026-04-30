'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import styles from '../admin.module.css';

function formatPrice(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<any[]>('/admin/promos')
      .then(res => setPromos(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Promo Codes</h2>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Order</th>
              <th>Uses</th>
              <th>Limit</th>
              <th>Status</th>
              <th>Expires</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No promo codes</td></tr>
            ) : promos.map((promo: any) => {
              const isExpired = promo.expiresAt && new Date(promo.expiresAt) < new Date();
              return (
                <tr key={promo.id}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{promo.code}</strong></td>
                  <td style={{ textTransform: 'capitalize' }}>{promo.type?.toLowerCase()}</td>
                  <td>
                    {promo.type === 'PERCENTAGE' ? `${promo.value}%` :
                     promo.type === 'FREE_SHIPPING' ? 'Free Ship' :
                     formatPrice(promo.value)}
                  </td>
                  <td>{promo.minOrderAmount ? formatPrice(promo.minOrderAmount) : '—'}</td>
                  <td>{promo._count?.usages || 0}</td>
                  <td>{promo.maxUsageTotal || '∞'}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${isExpired ? styles.statusCancelled : promo.isActive ? styles.statusConfirmed : styles.statusPending}`}>
                      {isExpired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
