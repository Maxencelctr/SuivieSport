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

const PUBLIC_PATHS = ['/login'];

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
    if (user && isPublicPath) router.replace('/');
  }, [user, loading, isPublicPath, router]);

  // Évite un flash du contenu protégé pendant la vérification de session ou
  // la redirection vers /login.
  if (loading || (!user && !isPublicPath)) {
    return <div className="min-h-screen" />;
  }

  return <AuthContext.Provider value={{ user }}>{children}</AuthContext.Provider>;
}
