'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/musculation', label: 'Muscu' },
  { href: '/course', label: 'Course' },
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/alimentation', label: 'Manger' },
  { href: '/objectifs', label: 'Objectifs' },
  { href: '/stats', label: 'Stats' },
  { href: '/profil', label: 'Profil' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1c1824]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="relative flex items-center h-16 gap-2">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo-volt.png" alt="Volt" width={92} height={46} priority className="h-8 w-auto" />
          </Link>

          {/* Centrée dans tout le header à partir de lg (assez de place pour les
              8 liens sans chevaucher le logo) ; sur mobile/tablette, reste dans
              le flux normal juste après le logo, avec défilement horizontal. */}
          <nav className="flex items-center gap-0.5 overflow-x-auto lg:absolute lg:left-1/2 lg:-translate-x-1/2 lg:overflow-visible">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'bg-accent/15 text-accent' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
