'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LogOut, Menu, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutAndClear } from '@/lib/auth';
import { useAuth } from './AuthProvider';

const links = [
  { href: '/', label: 'Accueil' },
  { href: '/musculation', label: 'Muscu' },
  { href: '/course', label: 'Course' },
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/alimentation', label: 'Manger' },
  { href: '/objectifs', label: 'Objectifs' },
  { href: '/amis', label: 'Amis' },
  { href: '/stats', label: 'Stats' },
  { href: '/profil', label: 'Profil' },
];

export default function Nav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [pendingChallenges, setPendingChallenges] = useState(0);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase
        .from('challenges')
        .select('id', { count: 'exact', head: true })
        .eq('to_user_id', user.id)
        .eq('status', 'pending'),
      supabase.rpc('get_friend_requests'),
    ]).then(([{ count }, { data: requests }]) => {
      setPendingChallenges((count ?? 0) + (requests?.length ?? 0));
    });
  }, [user, pathname]);

  // Ferme le menu mobile à chaque changement de page.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Empêche le scroll de la page derrière le panneau mobile ouvert.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur border-b border-[#1e1e21]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="relative flex items-center h-14 gap-2">
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo-volt.png" alt="Volt" width={92} height={46} priority className="h-7 w-auto" />
          </Link>

          {/* Nav horizontale, uniquement à partir de md (assez de place pour
              les 8 liens sans chevaucher le logo). En dessous, menu burger. */}
          <nav className="hidden md:flex items-center gap-1 md:absolute md:left-1/2 md:-translate-x-1/2 h-full">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative h-full flex items-center px-2.5 text-[13px] font-medium whitespace-nowrap shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  {link.label}
                  {link.href === '/amis' && pendingChallenges > 0 && (
                    <span className="ml-1 min-w-[16px] h-4 px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
                      {pendingChallenges}
                    </span>
                  )}
                  <span
                    className={`absolute left-2.5 right-2.5 bottom-0 h-[2px] rounded-full transition-colors ${
                      active ? 'bg-accent' : 'bg-transparent'
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <button
            onClick={() => signOutAndClear()}
            className="hidden md:flex ml-auto items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
            title={user?.email ?? undefined}
          >
            <LogOut size={15} /> Déconnexion
          </button>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={open}
            className="md:hidden ml-auto -mr-2 p-2 text-neutral-300"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Panneau mobile : liste verticale, pleine largeur, sous le header. */}
      {open && (
        <div className="md:hidden border-t border-[#1e1e21] bg-[#0a0a0b] max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <nav className="flex flex-col px-4">
            {links.map((link) => {
              const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 py-3.5 text-[15px] font-medium border-b border-[#18181b] last:border-b-0 ${
                    active ? 'text-white' : 'text-neutral-400'
                  }`}
                >
                  {link.label}
                  {link.href === '/amis' && pendingChallenges > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[11px] font-semibold flex items-center justify-center">
                      {pendingChallenges}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              onClick={() => signOutAndClear()}
              className="flex items-center gap-1.5 py-3.5 text-[15px] font-medium text-red-400/80"
            >
              <LogOut size={16} /> Déconnexion
              {user?.email && <span className="text-neutral-600 font-normal truncate">· {user.email}</span>}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
