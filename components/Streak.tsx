'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { computeStreak, toLocalISO } from '@/lib/streak';

export default function Streak() {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    const since = toLocalISO(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
    Promise.all([
      supabase.from('strength_sessions').select('date').gte('date', since),
      supabase.from('runs').select('date').gte('date', since),
    ]).then(([{ data: sessions }, { data: runs }]) => {
      const dates = new Set<string>([...(sessions ?? []).map((s) => s.date), ...(runs ?? []).map((r) => r.date)]);
      setStreak(computeStreak(dates));
    });
  }, []);

  if (streak === null || streak === 0) return null;

  return (
    <div className="card flex items-center gap-3">
      <Flame className="text-orange-500 shrink-0" size={28} />
      <div>
        <div className="stat-number text-xl text-white">{streak} jour{streak > 1 ? 's' : ''}</div>
        <div className="text-xs text-neutral-500">d'affilée avec une activité</div>
      </div>
    </div>
  );
}
