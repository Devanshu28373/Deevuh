'use client';

import Link from 'next/link';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBrand}>
          <img src="/images/Deevuh logo.PNG" alt="Deevuh" className={styles.logo} />
          <p>Where divine meets contemporary. Premium women&apos;s fashion for the modern, style-conscious woman.</p>
        </div>

        <div className={styles.footerCol}>
          <h4>Shop</h4>
          <ul>
            <li><Link href="/shop?category=dresses">Dresses</Link></li>
            <li><Link href="/shop?category=coats">Coats</Link></li>
            <li><Link href="/shop?category=separates">Separates</Link></li>
            <li><Link href="/shop?category=ethnic">Ethnic</Link></li>
            <li><Link href="/shop?category=accessories">Accessories</Link></li>
          </ul>
        </div>

        <div className={styles.footerCol}>
          <h4>Help</h4>
          <ul>
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/shipping-policy">Shipping</Link></li>
            <li><Link href="/returns">Returns & Exchange</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
            <li><Link href="/size-guide">Size Guide</Link></li>
          </ul>
        </div>

        <div className={`${styles.footerCol} ${styles.newsletter}`}>
          <h4>Stay Connected</h4>
          <p>Be the first to know about new arrivals, exclusive offers, and curated style tips.</p>
          <form className={styles.emailForm} onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="Your email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>&copy; {new Date().getFullYear()} Deevuh. All rights reserved.</p>
        <div className={styles.socialLinks}>
          <a href="#" aria-label="Instagram">Instagram</a>
          <a href="#" aria-label="Facebook">Facebook</a>
          <a href="#" aria-label="Pinterest">Pinterest</a>
        </div>
      </div>
    </footer>
  );
}
