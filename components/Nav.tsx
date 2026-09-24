'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Dumbbell, Footprints, Calendar, Utensils, Target, BarChart3 } from 'lucide-react';

const links = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/musculation', label: 'Muscu', icon: Dumbbell },
  { href: '/course', label: 'Course', icon: Footprints },
  { href: '/calendrier', label: 'Calendrier', icon: Calendar },
  { href: '/alimentation', label: 'Manger', icon: Utensils },
  { href: '/objectifs', label: 'Objectifs', icon: Target },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 bg-[#0a0a0a]/90 backdrop-blur border-b border-[#1c1824]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo-volt.png" alt="Volt" width={92} height={46} priority className="h-8 w-auto" />
          </Link>

          <nav className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm shrink-0 transition-colors ${
                    active ? 'bg-accent/15 text-accent' : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Icon size={18} strokeWidth={2} />
                  <span className="hidden md:inline">{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
