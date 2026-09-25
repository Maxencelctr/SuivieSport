'use client';

import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';

function toLocalISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Série de jours consécutifs avec au moins une séance ou un run. Le jour en
// cours compte encore comme "en cours" tant qu'hier était actif, même si
// rien n'est encore loggé aujourd'hui (pas cassée avant minuit).
function computeStreak(activeDates: Set<string>): number {
  let streak = 0;
  const cursor = new Date();
  if (!activeDates.has(toLocalISO(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (activeDates.has(toLocalISO(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

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
