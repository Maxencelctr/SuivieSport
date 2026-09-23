'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { StrengthSession } from '@/lib/types';

export default function MusculationPage() {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('strength_sessions').select('*').order('date', { ascending: false });
    setSessions(data ?? []);
    setLoading(false);
  }

  async function deleteSession(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('Supprimer cette séance et toutes ses séries ?')) return;
    await supabase.from('strength_sessions').delete().eq('id', id);
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Séances de musculation</h2>
        <div className="flex gap-2">
          <Link href="/musculation/corps" className="text-sm text-neutral-400 self-center">Vue corps</Link>
          <Link href="/musculation/exercices" className="text-sm text-neutral-400 self-center">Exercices</Link>
          <Link href="/musculation/nouvelle" className="btn-primary">+ Nouvelle</Link>
        </div>
      </div>

      {loading && <p className="text-neutral-500">Chargement...</p>}
      {!loading && sessions.length === 0 && (
        <p className="text-neutral-500 text-sm">Aucune séance pour l'instant.</p>
      )}

      <div className="space-y-2">
        {sessions.map((s) => (
          <Link key={s.id} href={`/musculation/${s.id}`} className="card block hover:border-accent transition">
            <div className="flex justify-between items-center">
              <div className="font-medium">{new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
              <button onClick={(e) => deleteSession(s.id, e)} className="text-neutral-500 text-sm">Supprimer</button>
            </div>
            {(s.notes || s.feeling) && (
              <div className="text-neutral-400 text-sm mt-1 flex justify-between">
                <span>{s.notes}</span>
                {s.feeling && <span>Ressenti: {s.feeling}/5</span>}
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
