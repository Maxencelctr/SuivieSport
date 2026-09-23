'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { StrengthSession, Run, FoodEntry, WeightEntry } from '@/lib/types';
import { RUN_TYPE_LABELS, formatPace } from '@/lib/running';

function daysAgoISO(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function BilanPage() {
  const [sessions, setSessions] = useState<StrengthSession[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [food, setFood] = useState<FoodEntry[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const since = daysAgoISO(6);

  useEffect(() => {
    async function load() {
      const [{ data: s }, { data: r }, { data: f }, { data: w }] = await Promise.all([
        supabase.from('strength_sessions').select('*').gte('date', since).order('date'),
        supabase.from('runs').select('*').gte('date', since).order('date'),
        supabase.from('food_entries').select('*').gte('date', since),
        supabase.from('weight_entries').select('*').gte('date', since).order('date'),
      ]);
      setSessions(s ?? []);
      setRuns(r ?? []);
      setFood(f ?? []);
      setWeights(w ?? []);
      setLoading(false);
    }
    load();
  }, []);

  const totalKm = useMemo(() => Math.round(runs.reduce((s, r) => s + Number(r.distance_km), 0) * 10) / 10, [runs]);
  const daysWithFood = new Set(food.map((f) => f.date)).size || 1;
  const avgProtein = Math.round(food.reduce((s, f) => s + Number(f.protein_g), 0) / daysWithFood);
  const avgCalories = Math.round(food.reduce((s, f) => s + (f.calories_kcal ? Number(f.calories_kcal) : 0), 0) / daysWithFood);
  const weightChange = weights.length >= 2
    ? Math.round((Number(weights[weights.length - 1].weight_kg) - Number(weights[0].weight_kg)) * 10) / 10
    : null;

  // Construit les 7 jours pour la timeline muscu/course
  const days = Array.from({ length: 7 }, (_, i) => daysAgoISO(6 - i));
  const sessionsByDay = new Set(sessions.map((s) => s.date));
  const runsByDay: Record<string, Run[]> = {};
  runs.forEach((r) => { (runsByDay[r.date] ??= []).push(r); });

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Bilan de la semaine</h2>

      <div className="card">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const hasMuscu = sessionsByDay.has(d);
            const dayRuns = runsByDay[d] ?? [];
            return (
              <div key={d} className="text-center">
                <div className="text-[10px] text-neutral-500 mb-1">
                  {new Date(d).toLocaleDateString('fr-FR', { weekday: 'short' })}
                </div>
                <div
                  className="aspect-square rounded flex items-center justify-center text-xs"
                  style={{
                    background: hasMuscu && dayRuns.length > 0
                      ? 'linear-gradient(135deg, #8B5CF6 50%, #ec4899 50%)'
                      : hasMuscu ? '#8B5CF6' : dayRuns.length > 0 ? '#ec4899' : '#171717',
                  }}
                >
                  {new Date(d).getDate()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-sm">Entraînements</div>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-accent">{sessions.length}</div>
            <div className="text-xs text-neutral-500">Séances muscu</div>
          </div>
          <div>
            <div className="text-xl font-bold text-pink-500">{totalKm}km</div>
            <div className="text-xs text-neutral-500">{runs.length} run{runs.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
        {runs.length > 0 && (
          <div className="pt-2 space-y-1 border-t border-[#262626]">
            {runs.map((r) => (
              <div key={r.id} className="flex justify-between text-xs text-neutral-400">
                <span>{new Date(r.date).toLocaleDateString('fr-FR', { weekday: 'short' })} — {RUN_TYPE_LABELS[r.run_type] ?? r.run_type}</span>
                <span>{r.distance_km}km à {formatPace(r.avg_pace_seconds_per_km)}/km</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-sm">Alimentation (moyenne/jour)</div>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-accent">{avgProtein}g</div>
            <div className="text-xs text-neutral-500">Protéines</div>
          </div>
          <div>
            <div className="text-xl font-bold">{avgCalories}</div>
            <div className="text-xs text-neutral-500">kcal</div>
          </div>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="font-medium text-sm">Poids</div>
        {weightChange === null ? (
          <p className="text-neutral-500 text-sm text-center">Pas assez de pesées cette semaine.</p>
        ) : (
          <div className="text-center">
            <div className={`text-xl font-bold ${weightChange > 0 ? 'text-red-500' : weightChange < 0 ? 'text-accent' : ''}`}>
              {weightChange > 0 ? '+' : ''}{weightChange}kg
            </div>
            <div className="text-xs text-neutral-500">Sur la semaine</div>
          </div>
        )}
      </div>
    </div>
  );
}
