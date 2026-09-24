'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dumbbell, Footprints, Drumstick } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Period = 'semaine' | 'mois' | 'annee';

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date();
  const end = toISO(now);

  if (period === 'semaine') {
    const day = (now.getDay() + 6) % 7; // 0 = lundi
    const monday = new Date(now);
    monday.setDate(now.getDate() - day);
    return { start: toISO(monday), end, label: 'Cette semaine' };
  }
  if (period === 'mois') {
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: toISO(firstOfMonth), end, label: 'Ce mois-ci' };
  }
  const firstOfYear = new Date(now.getFullYear(), 0, 1);
  return { start: toISO(firstOfYear), end, label: 'Cette année' };
}

export default function Resume() {
  const [period, setPeriod] = useState<Period>('semaine');
  const [muscuCount, setMuscuCount] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [totalKm, setTotalKm] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [daysWithFood, setDaysWithFood] = useState(0);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [{ data: sessions }, { data: runs }, { data: food }] = await Promise.all([
        supabase.from('strength_sessions').select('date').gte('date', range.start).lte('date', range.end),
        supabase.from('runs').select('distance_km, date').gte('date', range.start).lte('date', range.end),
        supabase.from('food_entries').select('protein_g, date').gte('date', range.start).lte('date', range.end),
      ]);

      setMuscuCount(sessions?.length ?? 0);
      setRunCount(runs?.length ?? 0);
      setTotalKm((runs ?? []).reduce((sum, r) => sum + Number(r.distance_km), 0));
      setTotalProtein((food ?? []).reduce((sum, f) => sum + Number(f.protein_g), 0));
      setDaysWithFood(new Set((food ?? []).map((f) => f.date)).size);
      setLoading(false);
    }
    load();
  }, [range.start, range.end]);

  const avgProtein = daysWithFood > 0 ? Math.round(totalProtein / daysWithFood) : 0;

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-center">
        <div className="eyebrow">{range.label}</div>
        <div className="flex gap-1 text-xs">
          {(['semaine', 'mois', 'annee'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2 py-1 rounded ${period === p ? 'bg-accent text-white font-semibold' : 'text-neutral-500 hover:text-neutral-300'}`}
            >
              {p === 'semaine' ? 'Semaine' : p === 'mois' ? 'Mois' : 'Année'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm">Chargement...</p>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="stat-number text-2xl text-white">{muscuCount}</div>
            <div className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
              <Dumbbell size={12} className="text-accent" /> séance{muscuCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <div className="stat-number text-2xl text-white">{Math.round(totalKm * 10) / 10}km</div>
            <div className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
              <Footprints size={12} className="text-accent" /> {runCount} run{runCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div>
            <div className="stat-number text-2xl text-white">{avgProtein}g</div>
            <div className="text-xs text-neutral-500 flex items-center justify-center gap-1 mt-0.5">
              <Drumstick size={12} className="text-accent" /> protéines/jour
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
