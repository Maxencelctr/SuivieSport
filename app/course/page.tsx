'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Run } from '@/lib/types';
import { RUN_TYPE_LABELS, WEATHER_ICONS } from '@/lib/running';
import SwipeToDelete from '@/components/SwipeToDelete';
import Fab from '@/components/Fab';
import PullToRefresh from '@/components/PullToRefresh';

function formatPace(secondsPerKm: number) {
  const min = Math.floor(secondsPerKm / 60);
  const sec = secondsPerKm % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min${s.toString().padStart(2, '0')}`;
}

export default function CoursePage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('runs').select('*').order('date', { ascending: false });
    setRuns(data ?? []);
    setLoading(false);
  }

  async function deleteRun(id: string) {
    if (!confirm('Supprimer ce run ?')) return;
    await supabase.from('runs').delete().eq('id', id);
    await load();
  }

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-lg font-semibold">Sorties course à pied</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/course/zones"
            className="text-sm px-3 py-1.5 rounded-lg border border-[#262626] text-neutral-300 hover:border-neutral-600 transition"
          >
            VMA
          </Link>
          <Link href="/course/nouvelle" className="btn-primary text-sm px-3 py-1.5">+ Nouveau run</Link>
        </div>
      </div>

      {loading && <p className="text-neutral-500">Chargement...</p>}
      {!loading && runs.length === 0 && <p className="text-neutral-500 text-sm">Aucun run enregistré.</p>}

      <div className="space-y-2">
        {runs.map((r) => (
          <SwipeToDelete key={r.id} onDelete={() => deleteRun(r.id)}>
            <div className="card">
              <div className="flex justify-between items-center">
                <span className="font-medium">{new Date(r.date).toLocaleDateString('fr-FR')}</span>
                <span className="text-xs text-neutral-500 bg-[#0a0a0a] border border-[#262626] rounded-full px-2 py-0.5">{RUN_TYPE_LABELS[r.run_type] ?? r.run_type}</span>
                <span className="text-accent flex items-center gap-1">
                  {r.weather && WEATHER_ICONS[r.weather] && (() => { const WIcon = WEATHER_ICONS[r.weather]; return <WIcon size={14} />; })()}
                  {formatPace(r.avg_pace_seconds_per_km)} /km
                </span>
              </div>
              <div className="flex justify-between items-center text-sm text-neutral-400 mt-1">
                <span>{r.distance_km} km — {formatDuration(r.duration_seconds)}{r.elevation_gain_m ? ` — D+${r.elevation_gain_m}m` : ''}{r.feeling ? ` — ${r.feeling}` : ''}</span>
                <Link href={`/course/${r.id}`} className="flex items-center gap-1 text-accent shrink-0">
                  <Pencil size={14} /> Modifier
                </Link>
              </div>
            </div>
          </SwipeToDelete>
        ))}
      </div>

      <Fab href="/course/nouvelle" label="Nouveau run" />
    </div>
    </PullToRefresh>
  );
}
