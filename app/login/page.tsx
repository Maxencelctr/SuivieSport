'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { ActivityLevel, NutritionGoal, Sex } from '@/lib/types';
import { ACTIVITY_LABELS, GOAL_LABELS } from '@/lib/nutrition';

type Mode = 'signin' | 'signup' | 'forgot';

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [sex, setSex] = useState<Sex>('homme');
  const [age, setAge] = useState(20);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState<ActivityLevel>('modere');
  const [goal, setGoal] = useState<NutritionGoal>('maintien');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function resetMessages() {
    setError(null);
    setInfo(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setInfo('Si un compte existe avec cet email, un lien de réinitialisation vient d\'être envoyé.');
      return;
    }

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : error.message);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (!data.session) {
      setInfo('Compte créé. Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.');
      setLoading(false);
      return;
    }

    // Session active tout de suite (confirmation email désactivée) : on
    // complète le profil créé automatiquement (email only) avec le reste.
    const { error: profileError } = await supabase.from('profile').upsert({
      pseudo: pseudo.trim(),
      sex,
      age,
      height_cm: height,
      weight_kg: weight,
      activity_level: activity,
      goal,
      updated_at: new Date().toISOString(),
    });
    if (profileError) {
      setError(
        profileError.message.includes('duplicate') || profileError.message.includes('unique')
          ? 'Ce pseudo est déjà pris.'
          : profileError.message
      );
      setLoading(false);
      return;
    }

    sessionStorage.setItem('volt_just_signed_up', '1');
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex justify-center">
          <Image src="/logo-volt.png" alt="Volt" width={140} height={70} priority className="h-10 w-auto" />
        </div>

        <div className="card space-y-4">
          {mode !== 'forgot' && (
            <div className="flex gap-1 p-1 rounded-lg bg-[#0a0a0b] border border-[#26262a]">
              <button
                type="button"
                onClick={() => { setMode('signin'); resetMessages(); }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  mode === 'signin' ? 'bg-accent text-white' : 'text-neutral-400'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); resetMessages(); }}
                className={`flex-1 text-sm py-1.5 rounded-md font-medium transition-colors ${
                  mode === 'signup' ? 'bg-accent text-white' : 'text-neutral-400'
                }`}
              >
                Créer un compte
              </button>
            </div>
          )}

          {mode === 'forgot' && (
            <div>
              <h3 className="font-medium text-sm">Mot de passe oublié</h3>
              <p className="text-xs text-neutral-500 mt-1">On t'envoie un lien par email pour en choisir un nouveau.</p>
            </div>
          )}

          <form onSubmit={submit} className="space-y-3">
            {mode === 'signup' && (
              <div>
                <label className="text-xs text-neutral-500">Pseudo</label>
                <input
                  value={pseudo}
                  onChange={(e) => setPseudo(e.target.value)}
                  autoComplete="nickname"
                  maxLength={24}
                  required
                />
                <p className="text-[11px] text-neutral-600 mt-0.5">Affiché à tes amis à la place de ton email.</p>
              </div>
            )}

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
            {mode !== 'forgot' && (
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
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); resetMessages(); }}
                    className="text-xs text-accent mt-1"
                  >
                    Mot de passe oublié ?
                  </button>
                )}
              </div>
            )}

            {mode === 'signup' && (
              <>
                <div className="pt-1 border-t border-[#26262a]">
                  <p className="text-xs text-neutral-500 pt-3 pb-1">
                    Pour calculer tes objectifs caloriques et protéiques (rien de médical, juste une base).
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-neutral-500">Sexe</label>
                    <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
                      <option value="homme">Homme</option>
                      <option value="femme">Femme</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Âge</label>
                    <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={10} max={100} required />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Taille (cm)</label>
                    <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={100} max={230} required />
                  </div>
                  <div>
                    <label className="text-xs text-neutral-500">Poids (kg)</label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                      min={30}
                      max={250}
                      step={0.5}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Niveau d'activité</label>
                  <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
                    {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
                      <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-500">Objectif</label>
                  <select value={goal} onChange={(e) => setGoal(e.target.value as NutritionGoal)}>
                    {(Object.keys(GOAL_LABELS) as NutritionGoal[]).map((g) => (
                      <option key={g} value={g}>{GOAL_LABELS[g]}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-accent text-sm">{info}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading
                ? '...'
                : mode === 'signin'
                  ? 'Se connecter'
                  : mode === 'forgot'
                    ? 'Envoyer le lien'
                    : 'Créer mon compte'}
            </button>

            {mode === 'forgot' && (
              <button
                type="button"
                onClick={() => { setMode('signin'); resetMessages(); }}
                className="w-full text-center text-xs text-neutral-500"
              >
                ← Retour à la connexion
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
