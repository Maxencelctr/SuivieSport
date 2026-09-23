'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/', label: 'Accueil', icon: '🏠' },
  { href: '/musculation', label: 'Muscu', icon: '🏋️' },
  { href: '/course', label: 'Course', icon: '🏃' },
  { href: '/calendrier', label: 'Calendrier', icon: '📅' },
  { href: '/alimentation', label: 'Manger', icon: '🍗' },
  { href: '/objectifs', label: 'Objectifs', icon: '🎯' },
  { href: '/stats', label: 'Stats', icon: '📈' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#111] border-t border-[#262626]">
      <div className="max-w-3xl mx-auto flex justify-around py-2 overflow-x-auto">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center px-2 py-1 text-xs shrink-0 ${
                active ? 'text-accent' : 'text-neutral-400'
              }`}
            >
              <span className="text-lg">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
