'use client';

import { usePathname } from 'next/navigation';
import Nav from './Nav';
import OfflineSync from './OfflineSync';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login';

  if (isAuthPage) return <>{children}</>;

  return (
    <>
      <Nav />
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 pb-24 md:pb-16">{children}</div>
      <OfflineSync />
    </>
  );
}
