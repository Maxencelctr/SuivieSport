import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'Suivi Sport',
  description: 'Suivi musculation et course à pied',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Suivi Sport',
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
        <div className="max-w-3xl mx-auto px-4 pb-24 pt-6">
          <h1 className="text-2xl font-bold mb-6">🏋️ Suivi Sport</h1>
          {children}
        </div>
        <Nav />
      </body>
    </html>
  );
}
