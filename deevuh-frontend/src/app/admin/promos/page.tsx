'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { PromoCode } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState('');
  const [updatingId, setUpdatingId] = useState('');

  // Create form state
  const [form, setForm] = useState({
    code: '', description: '', type: 'PERCENTAGE' as string,
    discountValue: '', minOrderAmount: '', maxDiscountAmount: '',
    usageLimit: '', perUserLimit: '1', expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchPromos(); }, []);

  async function fetchPromos() {
    setLoading(true);
    try {
      const res = await api.get<PromoCode[]>('/admin/promos');
      setPromos(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function toggleActive(promo: PromoCode) {
    setUpdatingId(promo.id);
    try {
      await api.put(`/admin/promos/${promo.id}`, { isActive: !promo.isActive });
      showToast(`${promo.code} ${promo.isActive ? 'deactivated' : 'activated'}`);
      await fetchPromos();
    } catch { showToast('Failed to update', true); }
    finally { setUpdatingId(''); }
  }

  async function createPromo(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const payload: any = {
        code: form.code.toUpperCase(),
        type: form.type,
        discountValue: parseFloat(form.discountValue),
      };
      if (form.description) payload.description = form.description;
      if (form.minOrderAmount) payload.minOrderAmount = parseInt(form.minOrderAmount);
      if (form.maxDiscountAmount) payload.maxDiscountAmount = parseInt(form.maxDiscountAmount);
      if (form.usageLimit) payload.usageLimit = parseInt(form.usageLimit);
      if (form.perUserLimit) payload.perUserLimit = parseInt(form.perUserLimit);
      if (form.expiresAt) payload.expiresAt = form.expiresAt;

      await api.post('/promos', payload);
      showToast(`Promo ${form.code.toUpperCase()} created`);
      setShowCreate(false);
      setForm({ code: '', description: '', type: 'PERCENTAGE', discountValue: '', minOrderAmount: '', maxDiscountAmount: '', usageLimit: '', perUserLimit: '1', expiresAt: '' });
      await fetchPromos();
    } catch (err: any) {
      showToast(err?.response?.data?.error?.message || 'Failed to create', true);
    } finally { setCreating(false); }
  }

  function showToast(msg: string, _isError = false) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  return (
    <div>
      <div className={styles.tableHeader}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 28 }}>Promo Codes</h2>
        <button className={styles.btnPrimary} onClick={() => setShowCreate(true)}>+ Create Promo</button>
      </div>

      <div className={styles.adminTable}>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
              <th>Type</th>
              <th>Value</th>
              <th>Min Order</th>
              <th>Uses / Limit</th>
              <th>Status</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40 }}>Loading...</td></tr>
            ) : promos.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--gray-400)' }}>No promo codes</td></tr>
            ) : promos.map((promo) => {
              const isExpired = promo.expiresAt ? new Date(promo.expiresAt) < new Date() : false;
              return (
                <tr key={promo.id} style={{ opacity: updatingId === promo.id ? 0.5 : 1 }}>
                  <td><strong style={{ fontFamily: 'monospace' }}>{promo.code}</strong></td>
                  <td style={{ fontSize: 13, color: 'var(--gray-500)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{promo.description || '—'}</td>
                  <td style={{ textTransform: 'capitalize', fontSize: 12 }}>{promo.type?.toLowerCase().replace('_', ' ') ?? '—'}</td>
                  <td>
                    {promo.type === 'PERCENTAGE' ? `${promo.discountValue ?? 0}%` :
                     promo.type === 'FREE_SHIPPING' ? 'Free Ship' :
                     formatPrice(promo.discountValue ?? 0)}
                    {promo.maxDiscountAmount && promo.type === 'PERCENTAGE' && (
                      <span style={{ fontSize: 11, color: 'var(--gray-400)', display: 'block' }}>max {formatPrice(promo.maxDiscountAmount)}</span>
                    )}
                  </td>
                  <td>{promo.minOrderAmount ? formatPrice(promo.minOrderAmount) : '—'}</td>
                  <td>
                    <strong>{promo.usageCount ?? promo._count?.promoUsages ?? 0}</strong>
                    <span style={{ color: 'var(--gray-400)' }}> / {promo.usageLimit ?? '∞'}</span>
                  </td>
                  <td>
                    <span className={`${styles.statusBadge} ${isExpired ? styles.statusCancelled : promo.isActive ? styles.statusConfirmed : styles.statusPending}`}>
                      {isExpired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString('en-IN') : '—'}
                  </td>
                  <td>
                    <button
                      className={`${styles.btnSecondary} ${styles.btnSmall}`}
                      onClick={() => toggleActive(promo)}
                      disabled={updatingId === promo.id || isExpired}
                    >
                      {promo.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className={styles.modalOverlay} onClick={() => setShowCreate(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3>Create Promo Code</h3>
            <form onSubmit={createPromo}>
              <div className={styles.formGroup}>
                <label>Code</label>
                <input className={styles.formInput} value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="e.g. WELCOME20" />
              </div>
              <div className={styles.formGroup}>
                <label>Description</label>
                <input className={styles.formInput} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Optional description" />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Type</label>
                  <select className={styles.formInput} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="PERCENTAGE">Percentage</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                    <option value="FREE_SHIPPING">Free Shipping</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>{form.type === 'PERCENTAGE' ? 'Discount %' : form.type === 'FIXED_AMOUNT' ? 'Amount (paise)' : 'N/A'}</label>
                  <input className={styles.formInput} type="number" value={form.discountValue} onChange={e => setForm({ ...form, discountValue: e.target.value })} required disabled={form.type === 'FREE_SHIPPING'} min={0} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Min Order (paise)</label>
                  <input className={styles.formInput} type="number" value={form.minOrderAmount} onChange={e => setForm({ ...form, minOrderAmount: e.target.value })} placeholder="Optional" min={0} />
                </div>
                <div className={styles.formGroup}>
                  <label>Max Discount (paise)</label>
                  <input className={styles.formInput} type="number" value={form.maxDiscountAmount} onChange={e => setForm({ ...form, maxDiscountAmount: e.target.value })} placeholder="For % type" min={0} />
                </div>
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label>Usage Limit</label>
                  <input className={styles.formInput} type="number" value={form.usageLimit} onChange={e => setForm({ ...form, usageLimit: e.target.value })} placeholder="Unlimited" min={1} />
                </div>
                <div className={styles.formGroup}>
                  <label>Per User Limit</label>
                  <input className={styles.formInput} type="number" value={form.perUserLimit} onChange={e => setForm({ ...form, perUserLimit: e.target.value })} min={1} />
                </div>
              </div>
              <div className={styles.formGroup}>
                <label>Expiry Date</label>
                <input className={styles.formInput} type="date" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })} />
              </div>
              <div className={styles.formActions}>
                <button type="button" className={styles.btnSecondary} onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className={styles.btnPrimary} disabled={creating}>{creating ? 'Creating...' : 'Create Promo'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
