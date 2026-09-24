'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Settings, Dumbbell, Footprints, Utensils, Target, Angry, Frown, Meh, Smile, Laugh } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StrengthSession, Run } from '@/lib/types';
import { RUN_TYPE_LABELS } from '@/lib/running';
import Resume from '@/components/Resume';
import QuickAdd from '@/components/QuickAdd';

const FEELING_ICONS: Record<number, { icon: typeof Meh; className: string }> = {
  1: { icon: Angry, className: 'text-red-500' },
  2: { icon: Frown, className: 'text-orange-500' },
  3: { icon: Meh, className: 'text-neutral-400' },
  4: { icon: Smile, className: 'text-accent-light' },
  5: { icon: Laugh, className: 'text-volt' },
};

export default function HomePage() {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sessionStats, setSessionStats] = useState<Record<string, { exercises: number; sets: number }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [{ data: sessionsData }, { data: runsData }] = await Promise.all([
      supabase.from('strength_sessions').select('*').order('date', { ascending: false }).order('time', { ascending: false }).limit(5),
      supabase.from('runs').select('*').order('date', { ascending: false }).limit(5),
    ]);
    setSessions(sessionsData ?? []);
    setRuns(runsData ?? []);

    const sessionIds = (sessionsData ?? []).map((s) => s.id);
    if (sessionIds.length > 0) {
      const { data: setsData } = await supabase.from('strength_sets').select('session_id, exercise_id').in('session_id', sessionIds);
      const stats: Record<string, { exercises: Set<string>; sets: number }> = {};
      (setsData ?? []).forEach((s: any) => {
        if (!stats[s.session_id]) stats[s.session_id] = { exercises: new Set(), sets: 0 };
        stats[s.session_id].exercises.add(s.exercise_id);
        stats[s.session_id].sets += 1;
      });
      const flat: Record<string, { exercises: number; sets: number }> = {};
      Object.entries(stats).forEach(([id, v]) => (flat[id] = { exercises: v.exercises.size, sets: v.sets }));
      setSessionStats(flat);
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Link href="/parametres" className="flex items-center gap-1.5 text-sm text-neutral-400 hover:text-neutral-200">
          <Settings size={16} /> Paramètres
        </Link>
        <div className="flex gap-3">
          <Link href="/insights" className="text-sm text-accent">Insights</Link>
          <Link href="/bilan" className="text-sm text-accent">Bilan →</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 items-start">
        <Resume />
        <QuickAdd onSaved={load} />
      </div>

      <div>
        <div className="eyebrow mb-2">Actions rapides</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/musculation/nouvelle" className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
            <Dumbbell className="text-accent shrink-0" size={18} />
            <div className="font-medium text-sm">Nouvelle séance</div>
          </Link>
          <Link href="/course/nouvelle" className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
            <Footprints className="text-accent shrink-0" size={18} />
            <div className="font-medium text-sm">Nouveau run</div>
          </Link>
          <Link href="/alimentation" className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
            <Utensils className="text-accent shrink-0" size={18} />
            <div className="font-medium text-sm">Alimentation</div>
          </Link>
          <Link href="/objectifs" className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
            <Target className="text-accent shrink-0" size={18} />
            <div className="font-medium text-sm">Objectifs</div>
          </Link>
        </div>
      </div>

      {loading && <p className="text-neutral-500">Chargement...</p>}

      {!loading && (
        <div className="grid md:grid-cols-2 gap-4">
          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className="eyebrow">Dernières séances muscu</h2>
              <Link href="/musculation" className="text-xs text-accent">Tout voir →</Link>
            </div>
            {sessions.length === 0 && <p className="text-neutral-500 text-sm">Aucune séance enregistrée.</p>}
            <div className="space-y-2">
              {sessions.map((s) => {
                const stats = sessionStats[s.id];
                return (
                  <Link key={s.id} href={`/musculation/${s.id}`} className="card block hover:border-neutral-600 transition">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                        {s.time && <span className="text-neutral-500 font-normal"> · {s.time.slice(0, 5)}</span>}
                      </span>
                      {s.feeling &&
                        (() => {
                          const F = FEELING_ICONS[s.feeling];
                          return <F.icon size={18} className={F.className} />;
                        })()}
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {stats ? `${stats.exercises} exercice${stats.exercises > 1 ? 's' : ''} · ${stats.sets} série${stats.sets > 1 ? 's' : ''}` : '—'}
                      {s.duration_minutes ? ` · ${s.duration_minutes}min` : ''}
                    </div>
                    {s.notes && <div className="text-xs text-neutral-400 mt-1 truncate">{s.notes}</div>}
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <div className="flex justify-between items-center mb-2">
              <h2 className="eyebrow">Derniers runs</h2>
              <Link href="/course" className="text-xs text-accent">Tout voir →</Link>
            </div>
            {runs.length === 0 && <p className="text-neutral-500 text-sm">Aucun run enregistré.</p>}
            <div className="space-y-2">
              {runs.map((r) => {
                const paceMin = Math.floor(r.avg_pace_seconds_per_km / 60);
                const paceSec = r.avg_pace_seconds_per_km % 60;
                return (
                  <Link key={r.id} href={`/course/${r.id}`} className="card block hover:border-neutral-600 transition">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">
                        {new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <span className="text-accent">
                        {paceMin}:{paceSec.toString().padStart(2, '0')} /km
                      </span>
                    </div>
                    <div className="text-xs text-neutral-500 mt-1">
                      {r.distance_km} km · {RUN_TYPE_LABELS[r.run_type] ?? r.run_type}
                      {r.elevation_gain_m ? ` · D+${r.elevation_gain_m}m` : ''}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
