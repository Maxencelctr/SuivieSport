'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, Dumbbell, Footprints, Home, LogOut, Users, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { signOutAndClear } from '@/lib/auth';
import { haptic } from '@/lib/haptics';
import { useAuth } from './AuthProvider';
import Avatar from './Avatar';

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

// Les 5 sections les plus utilisées, en accès direct au pouce sur mobile
// (barre fixe en bas, façon Strava/Instagram). Le reste (Calendrier,
// Objectifs, Stats, Paramètres) est listé depuis /profil, accessible via
// l'avatar en haut à droite.
const BOTTOM_TABS = [
  { href: '/', label: 'Accueil', icon: Home },
  { href: '/musculation', label: 'Muscu', icon: Dumbbell },
  { href: '/course', label: 'Course', icon: Footprints },
  { href: '/alimentation', label: 'Manger', icon: Utensils },
  { href: '/amis', label: 'Amis', icon: Users },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [pendingChallenges, setPendingChallenges] = useState(0);
  const [profile, setProfile] = useState<{ pseudo: string | null; avatar_url: string | null } | null>(null);

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profile')
      .select('pseudo, avatar_url')
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [user, pathname]);

  const avatarLabel = profile?.pseudo ?? user?.email ?? null;

  // Pages hors des 5 onglets du bas (Calendrier, Objectifs, Stats, Profil,
  // Paramètres, fiches détail...) : ces pages n'ont pas toutes un lien retour
  // dans leur propre en-tête, donc un bouton retour générique dans la nav
  // évite l'impasse quand on y arrive depuis /profil.
  const isBottomTabRoot = BOTTOM_TABS.some((t) => (t.href === '/' ? pathname === '/' : pathname.startsWith(t.href)));

  return (
    <>
    <header className="sticky top-0 z-30 bg-[#0a0a0b]/95 backdrop-blur border-b border-[#1e1e21]">
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <div className="relative flex items-center h-14 gap-2">
          {!isBottomTabRoot && (
            <button
              onClick={() => router.back()}
              className="md:hidden -ml-1.5 p-1.5 text-neutral-300 shrink-0"
              aria-label="Retour"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <Link href="/" className="flex items-center shrink-0">
            <Image src="/logo-volt.png" alt="Volt" width={92} height={46} priority className="h-7 w-auto" />
          </Link>

          {/* Nav horizontale, uniquement à partir de md (assez de place pour
              les liens sans chevaucher le logo). En dessous, nav en bas +
              avatar (voir plus loin). */}
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

          {/* Mobile : avatar -> /profil, hub pour Calendrier/Objectifs/Stats/Paramètres. */}
          <Link href="/profil" className="md:hidden ml-auto" aria-label="Profil">
            <Avatar url={profile?.avatar_url} label={avatarLabel} size={32} className="border border-[#26262a]" />
          </Link>
        </div>
      </div>
    </header>

    {/* Barre de navigation fixe en bas, mobile uniquement. */}
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[#0a0a0b]/95 backdrop-blur border-t border-[#1e1e21] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {BOTTOM_TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => haptic(8)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
              active ? 'text-accent' : 'text-neutral-500'
            }`}
          >
            <Icon size={20} />
            {tab.label}
            {tab.href === '/amis' && pendingChallenges > 0 && (
              <span className="absolute top-1 right-[22%] min-w-[15px] h-[15px] px-0.5 rounded-full bg-accent text-white text-[9px] font-semibold flex items-center justify-center">
                {pendingChallenges}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
    </>
  );
}
