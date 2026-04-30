'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import styles from './admin.module.css';

const NAV = [
  { href: '/admin', label: '📊 Dashboard', icon: '' },
  { href: '/admin/orders', label: '📦 Orders', icon: '' },
  { href: '/admin/products', label: '👗 Products', icon: '' },
  { href: '/admin/customers', label: '👥 Customers', icon: '' },
  { href: '/admin/promos', label: '🎟️ Promos', icon: '' },
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

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.adminSidebar}>
        <div className={styles.adminBrand}>
          <h2>Deevuh Admin</h2>
          <p>{user?.email}</p>
        </div>
        <nav className={styles.adminNav}>
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? styles.active : ''}
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
