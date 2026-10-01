'use client';

import { useEffect, useState } from 'react';
import { Megaphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppEvent } from '@/lib/types';

function fmtRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const end = new Date(endsAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  return `${start} → ${end}`;
}

export default function ActualitesPage() {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AppEvent[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('app_events').select('*').order('starts_at', { ascending: false });
    setEvents(data ?? []);
    setLoading(false);
    await supabase.from('profile').upsert({ news_last_seen_at: new Date().toISOString() });
  }

  const now = Date.now();

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Megaphone size={20} className="text-accent" /> Actualités
      </h2>

      {loading ? (
        <p className="text-neutral-500 text-sm">Chargement...</p>
      ) : events.length === 0 ? (
        <p className="text-neutral-500 text-sm">Rien pour l&apos;instant.</p>
      ) : (
        <div className="space-y-3">
          {events.map((e) => {
            const active = new Date(e.starts_at).getTime() <= now && now <= new Date(e.ends_at).getTime();
            return (
              <div key={e.id} className="card space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium flex items-center gap-2">
                    {e.emoji && <span>{e.emoji}</span>}
                    {e.title}
                  </div>
                  {active && (
                    <span className="text-[10px] uppercase tracking-wide text-accent font-semibold shrink-0">En cours</span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 whitespace-pre-line">{e.body}</p>
                <p className="text-[11px] text-neutral-600">{fmtRange(e.starts_at, e.ends_at)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
