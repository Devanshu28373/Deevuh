'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminProduct, PaginationMeta } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [updatingId, setUpdatingId] = useState('');
  const [toast, setToast] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search) params.set('search', search);
      const res = await api.get<AdminProduct[]>(`/admin/products?${params}`);
      setProducts(Array.isArray(res.data) ? res.data : []);
      setPagination((res as any).meta?.pagination ?? null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { setPage(1); }, [search]);

  async function toggleActive(product: AdminProduct) {
    setUpdatingId(product.id);
    try {
      await api.put(`/admin/products/${product.id}`, { isActive: !product.isActive });
      showToast(`${product.name} ${product.isActive ? 'deactivated' : 'activated'}`);
      await fetchProducts();
    } catch (err: any) {
      showToast('Failed to update product', true);
    } finally { setUpdatingId(''); }
  }

  async function toggleFeatured(product: AdminProduct) {
    setUpdatingId(product.id);
    try {
      await api.put(`/admin/products/${product.id}`, { isFeatured: !product.isFeatured });
      showToast(`${product.name} ${product.isFeatured ? 'unfeatured' : 'featured'}`);
      await fetchProducts();
    } catch { showToast('Failed to update', true); }
    finally { setUpdatingId(''); }
  }

  function showToast(msg: string, _isError = false) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Products</h2>
        <div className={styles.toolbar}>
          <input
            className={styles.tableSearch}
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
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
              <th>Total Stock</th>
              <th>Rating</th>
              <th>Featured</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No products found</td></tr>
            ) : products.map((product) => {
              const totalStock = (product.variants ?? []).reduce((sum, v) => sum + (v.stockQuantity ?? 0), 0);
              const isLowStock = totalStock <= 5;
              return (
                <tr key={product.id} style={{ opacity: updatingId === product.id ? 0.5 : 1 }}>
                  <td>
                    <div style={{ width: 48, height: 60, borderRadius: 6, overflow: 'hidden', background: 'var(--gray-100)' }}>
                      {product.images?.[0] && <img src={product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                  </td>
                  <td><strong>{product.name}</strong><br /><span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{product.slug}</span></td>
                  <td>{product.category?.name || '—'}</td>
                  <td>
                    {formatPrice(product.basePrice ?? 0)}
                    {product.compareAtPrice && <><br /><span style={{ fontSize: 12, color: 'var(--gray-400)', textDecoration: 'line-through' }}>{formatPrice(product.compareAtPrice)}</span></>}
                  </td>
                  <td>{product.variants?.length || 0}</td>
                  <td>
                    <span style={{ color: isLowStock ? 'var(--error)' : 'var(--success)', fontWeight: 700 }}>
                      {totalStock}
                    </span>
                    {isLowStock && totalStock > 0 && <span style={{ fontSize: 10, color: 'var(--error)', display: 'block' }}>LOW</span>}
                    {totalStock === 0 && <span style={{ fontSize: 10, color: 'var(--error)', display: 'block' }}>OUT</span>}
                  </td>
                  <td>
                    {product.avgRating ? `⭐ ${product.avgRating.toFixed(1)}` : '—'}
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', display: 'block' }}>{product.reviewCount ?? 0} reviews</span>
                  </td>
                  <td>
                    <button
                      onClick={() => toggleFeatured(product)}
                      disabled={updatingId === product.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}
                      title={product.isFeatured ? 'Remove from featured' : 'Add to featured'}
                    >
                      {product.isFeatured ? '⭐' : '☆'}
                    </button>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${product.isActive ? styles.statusConfirmed : styles.statusCancelled}`}>
                      {product.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => toggleActive(product)}
                      disabled={updatingId === product.id}
                    >
                      {product.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className={styles.pagination}>
          <button disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span>Page {pagination.page} of {pagination.totalPages} ({pagination.total} products)</span>
          <button disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
