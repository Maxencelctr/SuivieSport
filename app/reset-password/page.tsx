'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Le lien reçu par email établit une session "recovery" ; supabase-js la
    // détecte automatiquement dans l'URL au chargement de la page.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setReady(true);
    });

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setExpired(true);
        return r;
      });
    }, 4000);

    return () => {
      sub.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('6 caractères minimum.');
      return;
    }
    if (password !== confirm) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace('/'), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Image src="/logo-volt.png" alt="Volt" width={140} height={70} priority className="h-10 w-auto" />
        </div>

        <div className="card space-y-4">
          <h3 className="font-medium text-sm">Nouveau mot de passe</h3>

          {expired && (
            <p className="text-red-400 text-sm">
              Lien invalide ou expiré. Retourne sur la page de connexion et redemande un lien.
            </p>
          )}

          {!expired && !ready && <p className="text-neutral-500 text-sm">Vérification du lien...</p>}

          {ready && !done && (
            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="text-xs text-neutral-500">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Confirmer</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? '...' : 'Changer le mot de passe'}
              </button>
            </form>
          )}

          {done && <p className="text-accent text-sm">Mot de passe changé. Redirection...</p>}
        </div>
      </div>
    </div>
  );
}
