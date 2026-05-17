'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import type { ProductVariant } from '@/lib/types';
import styles from '../admin.module.css';

interface LowStockVariant extends ProductVariant {
  product: { id: string; name: string; slug: string; images: string[] };
}

export default function AdminInventoryPage() {
  const [variants, setVariants] = useState<LowStockVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);
  const [editingId, setEditingId] = useState('');
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<LowStockVariant[]>(`/admin/inventory/low-stock?threshold=${threshold}`);
      setVariants(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [threshold]);

  useEffect(() => { fetchInventory(); }, [fetchInventory]);

  function startEdit(variant: LowStockVariant) {
    setEditingId(variant.id);
    setEditValue(String(variant.stockQuantity));
  }

  function cancelEdit() {
    setEditingId('');
    setEditValue('');
  }

  async function saveStock(variantId: string) {
    const qty = parseInt(editValue);
    if (isNaN(qty) || qty < 0) {
      showToast('Invalid stock value', true);
      return;
    }
    setSaving(true);
    try {
      await api.put(`/admin/inventory/${variantId}`, { stockQuantity: qty });
      showToast('Stock updated');
      setEditingId('');
      await fetchInventory();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to update', true);
    } finally { setSaving(false); }
  }

  function showToast(msg: string, _isError = false) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  const outOfStock = variants.filter(v => v.stockQuantity === 0).length;
  const criticalLow = variants.filter(v => v.stockQuantity > 0 && v.stockQuantity <= 3).length;

  return (
    <div>
      <div className={styles.tableHeader}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28, marginBottom: 4 }}>Inventory</h2>
          <p style={{ fontSize: 14, color: 'var(--gray-400)' }}>Manage stock levels for product variants</p>
        </div>
        <div className={styles.toolbar}>
          <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--gray-500)' }}>
            Show stock ≤
            <input
              type="number"
              className={styles.inlineInput}
              value={threshold}
              onChange={e => setThreshold(Math.max(1, parseInt(e.target.value) || 5))}
              style={{ marginLeft: 8, width: 60 }}
              min={1}
              max={100}
            />
          </label>
        </div>
      </div>

      {/* Summary cards */}
      <div className={styles.statsGrid} style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
        <div className={styles.statCard}>
          <p className={styles.label}>Low Stock Items</p>
          <p className={styles.value} style={{ color: 'var(--ruby)' }}>{variants.length}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Out of Stock</p>
          <p className={styles.value} style={{ color: 'var(--error)' }}>{outOfStock}</p>
        </div>
        <div className={styles.statCard}>
          <p className={styles.label}>Critical (≤3)</p>
          <p className={styles.value} style={{ color: '#F59E0B' }}>{criticalLow}</p>
        </div>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Size</th>
              <th>Color</th>
              <th>Current Stock</th>
              <th>Update</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : variants.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'var(--success)' }}>✅ All variants have stock above threshold</td></tr>
            ) : variants.map((variant) => {
              const isEditing = editingId === variant.id;
              return (
                <tr key={variant.id} style={{ background: variant.stockQuantity === 0 ? 'rgba(211, 47, 47, 0.04)' : undefined }}>
                  <td style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {variant.product?.images?.[0] && (
                      <div style={{ width: 40, height: 50, borderRadius: 4, overflow: 'hidden', background: 'var(--gray-100)', flexShrink: 0 }}>
                        <img src={variant.product.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <span style={{ fontWeight: 500 }}>{variant.product?.name ?? 'Unknown'}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{variant.sku ?? '—'}</td>
                  <td>{variant.size}</td>
                  <td>
                    <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: variant.colorHex || '#ccc', marginRight: 6, verticalAlign: 'middle', border: '1px solid var(--gray-200)' }} />
                    {variant.color}
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 700, fontSize: 16,
                      color: variant.stockQuantity === 0 ? 'var(--error)' : variant.stockQuantity <= 3 ? '#F59E0B' : 'var(--gray-600)',
                    }}>
                      {variant.stockQuantity}
                    </span>
                  </td>
                  <td>
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <input
                          className={styles.inlineInput}
                          type="number"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          min={0}
                          autoFocus
                          onKeyDown={e => { if (e.key === 'Enter') saveStock(variant.id); if (e.key === 'Escape') cancelEdit(); }}
                        />
                        <button className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={() => saveStock(variant.id)} disabled={saving}>
                          {saving ? '...' : '✓'}
                        </button>
                        <button className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={cancelEdit}>✕</button>
                      </div>
                    ) : (
                      <button className={`${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => startEdit(variant)}>
                        Edit Stock
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
