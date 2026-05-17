'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Address } from '@/lib/types';
import styles from '../account.module.css';

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Address[]>('/users/me/addresses')
      .then(res => setAddresses(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id: string) {
    if (!confirm('Delete this address?')) return;
    try {
      await api.delete(`/users/me/addresses/${id}`);
      setAddresses(prev => prev.filter(a => a.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete address');
    }
  }

  if (loading) return <p>Loading addresses...</p>;

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 32 }}>Saved Addresses</h1>

      {addresses.length === 0 ? (
        <p style={{ color: 'var(--gray-400)' }}>No saved addresses. Add one during checkout.</p>
      ) : (
        <div className={styles.addressGrid}>
          {addresses.map(addr => (
            <div key={addr.id} className={styles.addressCard}>
              {addr.isDefault && <span className={styles.defaultBadge}>Default</span>}
              <h4>{addr.label} — {addr.recipientName}</h4>
              <p>{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}</p>
              <p>{addr.city}, {addr.state} — {addr.pincode}</p>
              <p>Phone: {addr.phone}</p>
              <div style={{ marginTop: 12, display: 'flex', gap: 12 }}>
                <button style={{ fontSize: 12, color: 'var(--error)', textDecoration: 'underline' }} onClick={() => handleDelete(addr.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
