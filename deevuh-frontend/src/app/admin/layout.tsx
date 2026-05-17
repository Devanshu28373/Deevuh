'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import styles from './admin.module.css';

const NAV = [
  { href: '/admin', label: '📊 Dashboard' },
  { href: '/admin/orders', label: '📦 Orders' },
  { href: '/admin/products', label: '👗 Products' },
  { href: '/admin/inventory', label: '📋 Inventory' },
  { href: '/admin/customers', label: '👥 Customers' },
  { href: '/admin/promos', label: '🎟️ Promos' },
  { href: '/admin/analytics', label: '📈 Analytics' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(user?.role || ''))) {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname?.startsWith(href);
  };

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.adminSidebar}>
        <div className={styles.adminBrand}>
          <h2>Deevuh Admin</h2>
          <p>{user?.email}</p>
          <p style={{ fontSize: 11, color: 'var(--ruby)', marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>{user?.role}</p>
        </div>
        <nav className={styles.adminNav}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? styles.active : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className={styles.adminContent}>{children}</main>
    </div>
  );
}
