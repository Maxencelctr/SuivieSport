'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

function weekStartISO(dateStr: string) {
  const d = new Date(dateStr);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

interface Insight {
  emoji: string;
  text: string;
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [notEnoughData, setNotEnoughData] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: runs }, { data: sets }, { data: sleep }] = await Promise.all([
        supabase.from('runs').select('weather, avg_pace_seconds_per_km'),
        supabase.from('strength_sets').select('reps, weight_kg, session_id, strength_sessions(date)'),
        supabase.from('sleep_entries').select('date, hours'),
      ]);

      const found: Insight[] = [];

      // --- Insight 1 : météo vs allure ---
      const rainRuns = (runs ?? []).filter((r) => r.weather === 'pluie');
      const otherRuns = (runs ?? []).filter((r) => r.weather && r.weather !== 'pluie');
      if (rainRuns.length >= 2 && otherRuns.length >= 2) {
        const rainAvg = rainRuns.reduce((s, r) => s + r.avg_pace_seconds_per_km, 0) / rainRuns.length;
        const otherAvg = otherRuns.reduce((s, r) => s + r.avg_pace_seconds_per_km, 0) / otherRuns.length;
        const diff = Math.round(rainAvg - otherAvg);
        if (Math.abs(diff) >= 3) {
          found.push({
            emoji: '🌧️',
            text: diff > 0
              ? `Tes runs sous la pluie sont ${diff}s/km plus lents en moyenne que le reste (sur ${rainRuns.length} sortie${rainRuns.length > 1 ? 's' : ''}).`
              : `Tes runs sous la pluie sont ${Math.abs(diff)}s/km plus rapides en moyenne que le reste — la pluie ne te ralentit pas.`,
          });
        }
      }

      // --- Insight 2 : tendance du volume muscu (3 dernières semaines) ---
      const byWeek: Record<string, number> = {};
      (sets ?? []).forEach((s: any) => {
        const date = s.strength_sessions?.date;
        if (!date) return;
        const week = weekStartISO(date);
        byWeek[week] = (byWeek[week] || 0) + s.reps * Number(s.weight_kg);
      });
      const weeks = Object.entries(byWeek).sort(([a], [b]) => a.localeCompare(b));
      if (weeks.length >= 3) {
        const lastThree = weeks.slice(-3).map(([, v]) => v);
        if (lastThree[0] > lastThree[1] && lastThree[1] > lastThree[2]) {
          const dropPct = Math.round(((lastThree[0] - lastThree[2]) / lastThree[0]) * 100);
          found.push({
            emoji: '📉',
            text: `Ton volume musculation baisse depuis 3 semaines (-${dropPct}% entre la première et la dernière) — signe possible de fatigue ou de baisse de motivation.`,
          });
        } else if (lastThree[0] < lastThree[1] && lastThree[1] < lastThree[2]) {
          found.push({
            emoji: '📈',
            text: `Ton volume musculation augmente depuis 3 semaines d'affilée — belle progression continue.`,
          });
        }
      }

      // --- Insight 3 : sommeil vs volume de séance ---
      const sleepByDate = new Map((sleep ?? []).map((s) => [s.date, Number(s.hours)]));
      const volumeBySession: Record<string, { date: string; volume: number }> = {};
      (sets ?? []).forEach((s: any) => {
        const date = s.strength_sessions?.date;
        if (!date) return;
        if (!volumeBySession[s.session_id]) volumeBySession[s.session_id] = { date, volume: 0 };
        volumeBySession[s.session_id].volume += s.reps * Number(s.weight_kg);
      });
      const sessionsWithSleep = Object.values(volumeBySession)
        .map((v) => ({ ...v, sleepHours: sleepByDate.get(v.date) }))
        .filter((v) => v.sleepHours !== undefined) as { date: string; volume: number; sleepHours: number }[];

      const wellRested = sessionsWithSleep.filter((v) => v.sleepHours >= 7);
      const underSlept = sessionsWithSleep.filter((v) => v.sleepHours < 7);
      if (wellRested.length >= 2 && underSlept.length >= 2) {
        const avgWell = wellRested.reduce((s, v) => s + v.volume, 0) / wellRested.length;
        const avgUnder = underSlept.reduce((s, v) => s + v.volume, 0) / underSlept.length;
        const diffPct = Math.round(((avgWell - avgUnder) / avgUnder) * 100);
        if (Math.abs(diffPct) >= 8) {
          found.push({
            emoji: '😴',
            text: diffPct > 0
              ? `Tes séances après une nuit de 7h+ ont un volume ${diffPct}% plus élevé en moyenne que celles après une nuit plus courte.`
              : `Tes séances après une nuit courte (<7h) ont un volume ${Math.abs(diffPct)}% plus élevé en moyenne — à prendre avec précaution, la corrélation n'est pas forcément la cause.`,
          });
        }
      }

      setInsights(found);
      setNotEnoughData(found.length === 0);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Insights</h2>
        <Link href="/bilan" className="text-sm text-neutral-400">Bilan →</Link>
      </div>
      <p className="text-neutral-500 text-sm">
        Observations calculées automatiquement à partir de tes données. Ce sont des corrélations,
        pas forcément des causes — à prendre comme des pistes à surveiller, pas des vérités.
      </p>

      {loading ? (
        <p className="text-neutral-500 text-sm">Analyse en cours...</p>
      ) : notEnoughData ? (
        <div className="card text-center text-sm text-neutral-500 py-8">
          Pas encore assez de données pour en tirer quelque chose d'utile.
          <br />Reviens dans quelques semaines d'utilisation régulière (course avec météo renseignée,
          séances muscu, sommeil).
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight, i) => (
            <div key={i} className="card flex gap-3 items-start">
              <span className="text-2xl">{insight.emoji}</span>
              <span className="text-sm">{insight.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
