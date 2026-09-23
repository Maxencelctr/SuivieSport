import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'Volt',
  description: 'Suivi musculation et course à pied',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Volt',
  },
  icons: {
    icon: ['/icon-192.png', '/icon-512.png'],
    apple: '/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <RegisterSW />
        <Nav />
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-16 pt-6">{children}</div>
      </body>
    </html>
  );
}
