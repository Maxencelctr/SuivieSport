'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import BodyHeatmapDetailed from '@/components/BodyHeatmapDetailed';
import BodyHeatmapWger from '@/components/BodyHeatmapWger';
import { Muscle } from '@/lib/types';

type Period = '30j' | 'tout';
type Style = 'wger' | 'schema';

export default function CorpsPage() {
  const [period, setPeriod] = useState<Period>('30j');
  const [style, setStyle] = useState<Style>('wger');
  const [muscles, setMuscles] = useState<Muscle[]>([]);
  const [volumesByMuscle, setVolumesByMuscle] = useState<Record<number, number>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [{ data: musclesData }, { data: rows }] = await Promise.all([
        supabase.from('muscles').select('*'),
        supabase
          .from('strength_sets')
          .select('reps, weight_kg, exercise_id, strength_sessions(date), exercises(exercise_muscles(muscle_id, role))'),
      ]);

      setMuscles(musclesData ?? []);

      const muscleByLocalId = new Map((musclesData ?? []).map((m: any) => [m.id, m.wger_id]));
      const since = new Date();
      since.setDate(since.getDate() - 30);

      const byWgerId: Record<number, number> = {};
      (rows ?? []).forEach((row: any) => {
        const date = row.strength_sessions?.date;
        if (!date) return;
        if (period === '30j' && new Date(date) < since) return;

        const volume = row.reps * Number(row.weight_kg);
        const links: any[] = row.exercises?.exercise_muscles ?? [];
        links.forEach((link) => {
          const wgerId = muscleByLocalId.get(link.muscle_id);
          if (!wgerId) return;
          const weight = link.role === 'primaire' ? 1 : 0.5;
          byWgerId[wgerId] = (byWgerId[wgerId] || 0) + volume * weight;
        });
      });

      setVolumesByMuscle(byWgerId);
      setLoading(false);
    }
    load();
  }, [period]);

  const intensities = useMemo(() => {
    const max = Math.max(1, ...Object.values(volumesByMuscle));
    const result: Record<number, number> = {};
    Object.entries(volumesByMuscle).forEach(([id, vol]) => {
      result[Number(id)] = vol / max;
    });
    return result;
  }, [volumesByMuscle]);

  const sortedMuscles = useMemo(() => {
    return muscles
      .map((m) => ({ muscle: m, volume: volumesByMuscle[m.wger_id] ?? 0 }))
      .filter((x) => x.volume > 0)
      .sort((a, b) => b.volume - a.volume);
  }, [muscles, volumesByMuscle]);

  const untracked = useMemo(() => {
    // Détecte si des séries existent mais qu'aucun muscle n'a pu être calculé
    // (utile pour prévenir si des exercices n'ont pas encore de muscles liés)
    return Object.keys(volumesByMuscle).length === 0;
  }, [volumesByMuscle]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Vue corporelle</h2>
        <Link href="/musculation" className="text-sm text-neutral-400">← Muscu</Link>
      </div>

      <div className="flex gap-2 justify-center text-sm">
        {(['30j', 'tout'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-full ${period === p ? 'bg-accent text-white font-semibold' : 'text-neutral-400 border border-[#262626]'}`}
          >
            {p === '30j' ? '30 derniers jours' : 'Tout le temps'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 justify-center text-xs">
        <button
          onClick={() => setStyle('wger')}
          className={`px-3 py-1 rounded-full ${style === 'wger' ? 'bg-accent text-white font-semibold' : 'text-neutral-400 border border-[#262626]'}`}
        >
          Illustrations anatomiques
        </button>
        <button
          onClick={() => setStyle('schema')}
          className={`px-3 py-1 rounded-full ${style === 'schema' ? 'bg-accent text-white font-semibold' : 'text-neutral-400 border border-[#262626]'}`}
        >
          Dessin schématique
        </button>
      </div>

      {loading ? (
        <p className="text-neutral-500 text-sm text-center">Chargement...</p>
      ) : (
        <>
          <div className="card">
            {style === 'wger' ? (
              <BodyHeatmapWger intensities={intensities} />
            ) : (
              <BodyHeatmapDetailed
                muscles={muscles}
                intensities={intensities}
                selectedWgerId={selected}
                onSelect={(id) => setSelected(id === selected ? null : id)}
              />
            )}
          </div>

          {untracked && (
            <p className="text-amber-500 text-xs text-center">
              Aucun muscle lié à tes séries pour l'instant. Ouvre tes exercices (dans /musculation/exercices)
              pour récupérer leurs muscles depuis wger ou les choisir manuellement.
            </p>
          )}

          <div className="space-y-2">
            <h3 className="text-sm text-neutral-400">Détail par muscle</h3>
            {sortedMuscles.length === 0 && <p className="text-neutral-500 text-sm">Pas encore de données pour cette période.</p>}
            {sortedMuscles.map(({ muscle, volume }) => (
              <button
                key={muscle.id}
                onClick={() => setSelected(muscle.wger_id === selected ? null : muscle.wger_id)}
                className={`card flex justify-between items-center py-2 w-full text-left ${selected === muscle.wger_id ? 'border-accent' : ''}`}
              >
                <span>{muscle.name_fr}</span>
                <span className="text-accent">{Math.round(volume)}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
