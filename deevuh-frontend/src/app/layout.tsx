import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';

export const metadata: Metadata = {
  title: 'Deevuh — Premium Women\'s Fashion',
  description: 'Discover curated premium fashion for the modern woman. Elegant dresses, coats, separates, and ethnic wear with free shipping on orders above ₹999.',
  keywords: ['women fashion', 'premium dresses', 'ethnic wear', 'coats', 'online shopping India'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
