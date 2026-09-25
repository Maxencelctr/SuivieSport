'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudOff, Repeat } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { StrengthSession } from '@/lib/types';
import SwipeToDelete from '@/components/SwipeToDelete';
import Fab from '@/components/Fab';
import PullToRefresh from '@/components/PullToRefresh';
import { getQueue } from '@/lib/offlineQueue';

export default function MusculationPage() {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuedCount, setQueuedCount] = useState(0);

  useEffect(() => {
    load();
    setQueuedCount(getQueue().length);
  }, []);

  async function load() {
    const { data } = await supabase.from('strength_sessions').select('*').order('date', { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }

  async function deleteSession(id: string) {
    if (!confirm('Supprimer cette séance et toutes ses séries ?')) return;
    await supabase.from('strength_sessions').delete().eq('id', id);
    await load();
  }

  return (
    <PullToRefresh onRefresh={load}>
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-lg font-semibold">Séances de musculation</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/musculation/corps"
            className="text-sm px-3 py-1.5 rounded-lg border border-[#262626] text-neutral-300 hover:border-neutral-600 transition"
          >
            Vue corps
          </Link>
          <Link
            href="/musculation/exercices"
            className="text-sm px-3 py-1.5 rounded-lg border border-[#262626] text-neutral-300 hover:border-neutral-600 transition"
          >
            Exercices
          </Link>
          <Link href="/musculation/nouvelle" className="btn-primary text-sm px-3 py-1.5">+ Nouvelle</Link>
        </div>
      </div>

      {queuedCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
          <CloudOff size={14} className="shrink-0" />
          {queuedCount} séance{queuedCount > 1 ? 's' : ''} en attente de synchro (hors-ligne)
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <Link
          href={`/musculation/nouvelle?repeat=${sessions[0].id}`}
          className="flex items-center justify-center gap-2 text-sm py-2 rounded-lg border border-dashed border-[#333] text-neutral-400 hover:text-accent hover:border-accent transition"
        >
          <Repeat size={14} /> Répéter la dernière séance
        </Link>
      )}

      {loading && <p className="text-neutral-500">Chargement...</p>}
      {!loading && sessions.length === 0 && (
        <p className="text-neutral-500 text-sm">Aucune séance pour l'instant.</p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <SwipeToDelete key={s.id} onDelete={() => deleteSession(s.id)}>
            <Link href={`/musculation/${s.id}`} className="card block hover:border-neutral-600 transition">
              <div className="flex justify-between items-center">
                <div className="font-medium">
                  {new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {s.time && <span className="text-neutral-500 font-normal"> · {s.time.slice(0, 5)}</span>}
                </div>
              </div>
              {(s.notes || s.feeling) && (
                <div className="text-neutral-400 text-sm mt-1 flex justify-between">
                  <span>{s.notes}</span>
                  {s.feeling && <span>Ressenti: {s.feeling}/5</span>}
                </div>
              )}
            </Link>
          </SwipeToDelete>
        ))}
      </div>

      <Fab href="/musculation/nouvelle" label="Nouvelle séance" />
    </div>
    </PullToRefresh>
  );
}
