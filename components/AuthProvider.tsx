'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextValue {
  user: User | null;
}

const AuthContext = createContext<AuthContextValue>({ user: null });

export function useAuth() {
  return useContext(AuthContext);
}

// Pages accessibles sans session active.
const PUBLIC_PATHS = ['/login', '/reset-password'];
// Parmi elles, celles qu'on ne quitte pas automatiquement même une fois
// connecté : /reset-password établit une session "recovery" temporaire le
// temps de choisir un nouveau mot de passe, il ne faut pas en être éjecté.
const STAY_EVEN_IF_AUTHENTICATED = ['/reset-password'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPath) router.replace('/login');
    if (user && isPublicPath && !STAY_EVEN_IF_AUTHENTICATED.includes(pathname)) router.replace('/');
  }, [user, loading, isPublicPath, pathname, router]);

  // Évite un flash du contenu protégé pendant la vérification de session ou
  // la redirection vers /login.
  if (loading || (!user && !isPublicPath)) {
    return <div className="min-h-screen" />;
  }

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
