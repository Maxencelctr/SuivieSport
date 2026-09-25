'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

type Mode = 'signin' | 'signup';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message);
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
      } else if (!data.session) {
        setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.');
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Image src="/logo-volt.png" alt="Volt" width={140} height={70} priority className="h-10 w-auto" />
        </div>

        <div className="card space-y-4">
          <div className="flex gap-1 p-1 rounded-lg bg-[#0a0a0b] border border-[#26262a]">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setInfo(null); }}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                mode === 'signin' ? 'bg-accent text-white' : 'text-neutral-400'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setInfo(null); }}
              className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                mode === 'signup' ? 'bg-accent text-white' : 'text-neutral-400'
              }`}
            >
              Créer un compte
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className="text-xs text-neutral-500">Mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-accent text-sm">{info}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '...' : mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
