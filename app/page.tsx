'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { StrengthSession, Run } from '@/lib/types';
import Resume from '@/components/Resume';
import QuickAdd from '@/components/QuickAdd';

export default function HomePage() {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: sessionsData }, { data: runsData }] = await Promise.all([
      supabase.from('strength_sessions').select('*').order('date', { ascending: false }).limit(5),
      supabase.from('runs').select('*').order('date', { ascending: false }).limit(5),
    ]);
    setSessions(sessionsData ?? []);
    setRuns(runsData ?? []);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/parametres" className="text-sm text-neutral-400">⚙️ Paramètres</Link>
        <div className="flex gap-3">
          <Link href="/insights" className="text-sm text-accent">Insights</Link>
          <Link href="/bilan" className="text-sm text-accent">Bilan →</Link>
        </div>
      </div>

      <Resume />

      <QuickAdd onSaved={load} />

      <div className="grid grid-cols-2 gap-3">
        <Link href="/musculation/nouvelle" className="card text-center hover:border-accent transition">
          <div className="text-3xl mb-1">🏋️</div>
          <div className="font-semibold">Nouvelle séance</div>
        </Link>
        <Link href="/course/nouvelle" className="card text-center hover:border-accent transition">
          <div className="text-3xl mb-1">🏃</div>
          <div className="font-semibold">Nouveau run</div>
        </Link>
      </div>

      {loading && <p className="text-neutral-500">Chargement...</p>}

      {!loading && (
        <>
          <section>
            <h2 className="text-lg font-semibold mb-2">Dernières séances muscu</h2>
            {sessions.length === 0 && <p className="text-neutral-500 text-sm">Aucune séance enregistrée.</p>}
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="card flex justify-between items-center">
                  <span>{new Date(s.date).toLocaleDateString('fr-FR')}</span>
                  {s.notes && <span className="text-neutral-400 text-sm">{s.notes}</span>}
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-2">Derniers runs</h2>
            {runs.length === 0 && <p className="text-neutral-500 text-sm">Aucun run enregistré.</p>}
            <div className="space-y-2">
              {runs.map((r) => {
                const paceMin = Math.floor(r.avg_pace_seconds_per_km / 60);
                const paceSec = r.avg_pace_seconds_per_km % 60;
                return (
                  <div key={r.id} className="card flex justify-between items-center">
                    <span>{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                    <span>{r.distance_km} km</span>
                    <span className="text-accent">
                      {paceMin}:{paceSec.toString().padStart(2, '0')} /km
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
