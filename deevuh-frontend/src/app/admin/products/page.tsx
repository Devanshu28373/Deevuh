'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminProduct } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<AdminProduct[]>('/admin/products')
      .then(res => setProducts(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Products</h2>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Variants</th>
              <th>Stock</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : products.map((product) => {
              const totalStock = (product.variants ?? []).reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0);
              return (
                <tr key={product.id}>
                  <td>
                    <div style={{ width: 48, height: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--gray-100)' }}>
                      {product.images?.[0] && <img src={product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td><strong>{product.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{product.slug}</span></td>
                  <td>{product.category?.name || '—'}</td>
                  <td>{formatPrice(product.basePrice ?? 0)}</td>
                  <td>{product.variants?.length || 0}</td>
                  <td>
                    <span style={{ color: totalStock <= 5 ? 'var(--error)' : 'var(--success)', fontWeight: 600 }}>
                      {totalStock}
                    </span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${product.isActive ? styles.statusConfirmed : styles.statusCancelled}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
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
