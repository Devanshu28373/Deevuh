'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useEffect } from 'react';
import styles from './account.module.css';

const NAV_LINKS = [
  { href: '/account', label: 'Dashboard' },
  { href: '/account/orders', label: 'My Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/wishlist', label: 'Wishlist' },
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) {
    return <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
  }

  return (
    <div className={styles.accountLayout}>
      <aside className={styles.sidebar}>
        <h2>Hi, {user?.firstName}</h2>
        <nav className={styles.sidebarLinks}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? styles.active : ''}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <button className={styles.logoutBtn} onClick={() => { logout(); router.push('/'); }}>
          Sign Out
        </button>
      </aside>
      <div>{children}</div>
    </div>
  );
}
