import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import Navbar from '@/components/Navbar/Navbar';
import Footer from '@/components/Footer/Footer';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#1A1A1A',
};

export const metadata: Metadata = {
  title: {
    template: '%s | Deevuh',
    default: 'Deevuh — Premium Women\'s Fashion',
  },
  description: 'Discover curated premium fashion for the modern woman. Elegant dresses, coats, separates, and ethnic wear with free shipping on orders above ₹999.',
  keywords: ['women fashion', 'premium dresses', 'ethnic wear', 'coats', 'online shopping India', 'coordsets', 'designer wear'],
  authors: [{ name: 'Deevuh' }],
  creator: 'Deevuh',
  publisher: 'Deevuh',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://deevuh.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: '/',
    siteName: 'Deevuh',
    title: 'Deevuh — Premium Women\'s Fashion',
    description: 'Discover curated premium fashion for the modern woman. Elegant dresses, coats, separates, and ethnic wear.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Deevuh — Premium Women\'s Fashion',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Deevuh — Premium Women\'s Fashion',
    description: 'Curated premium fashion for the modern woman.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
};

// ─── JSON-LD Structured Data ───
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Deevuh',
  url: process.env.NEXT_PUBLIC_SITE_URL || 'https://deevuh.com',
  logo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://deevuh.com'}/logo.png`,
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@deevuh.com',
    contactType: 'customer service',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
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
