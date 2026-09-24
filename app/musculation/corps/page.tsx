'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Plus, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import BodyHeatmapDetailed from '@/components/BodyHeatmapDetailed';
import BodyHeatmapWger from '@/components/BodyHeatmapWger';
import { Muscle } from '@/lib/types';

type Period = '30j' | 'tout';
type Style = 'wger' | 'schema';

interface MuscleSuggestion {
  wger_id: number;
  name: string;
  muscle_group: string;
  image_url: string | null;
}

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

  const untrainedMuscles = useMemo(
    () => muscles.filter((m) => !volumesByMuscle[m.wger_id]).sort((a, b) => a.name_fr.localeCompare(b.name_fr)),
    [muscles, volumesByMuscle]
  );

  const [suggestionsByMuscle, setSuggestionsByMuscle] = useState<Record<number, MuscleSuggestion[]>>({});
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [addingId, setAddingId] = useState<number | null>(null);

  // Va chercher quelques exercices pour chaque muscle non travaillé, dès
  // qu'on sait lesquels sont concernés (évite de le refaire à chaque render)
  useEffect(() => {
    if (loading || untrainedMuscles.length === 0) return;
    untrainedMuscles.forEach((m) => {
      if (suggestionsByMuscle[m.wger_id]) return;
      fetch(`/api/exercises/search?muscle=${m.wger_id}`)
        .then((res) => res.json())
        .then((json) => {
          setSuggestionsByMuscle((prev) => ({ ...prev, [m.wger_id]: json.results ?? [] }));
        })
        .catch(() => {
          setSuggestionsByMuscle((prev) => ({ ...prev, [m.wger_id]: [] }));
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, untrainedMuscles]);

  async function addSuggestion(s: MuscleSuggestion) {
    setAddingId(s.wger_id);
    const { data: inserted, error } = await supabase
      .from('exercises')
      .insert({ name: s.name, muscle_group: s.muscle_group, wger_id: s.wger_id, image_url: s.image_url })
      .select()
      .single();
    setAddingId(null);
    if (error || !inserted) return;

    setAddedIds((prev) => new Set(prev).add(s.wger_id));

    try {
      const res = await fetch(`/api/exercises/wger-details?wger_id=${s.wger_id}`);
      const json = await res.json();
      if (!json.error) {
        const { data: musclesData } = await supabase.from('muscles').select('*');
        const localByWgerId = new Map((musclesData ?? []).map((m: any) => [m.wger_id, m.id]));
        const primaryLocalIds: string[] = (json.primaryMuscles ?? []).map((id: number) => localByWgerId.get(id)).filter(Boolean);
        const secondaryLocalIds: string[] = (json.secondaryMuscles ?? []).map((id: number) => localByWgerId.get(id)).filter(Boolean);
        const rows = [
          ...primaryLocalIds.map((muscle_id) => ({ exercise_id: inserted.id, muscle_id, role: 'primaire' as const })),
          ...secondaryLocalIds.map((muscle_id) => ({ exercise_id: inserted.id, muscle_id, role: 'secondaire' as const })),
        ];
        if (rows.length > 0) await supabase.from('exercise_muscles').insert(rows);
        if (json.description) await supabase.from('exercises').update({ description: json.description }).eq('id', inserted.id);
      }
    } catch {
      // Pas grave : récupérable plus tard depuis la fiche de l'exercice
    }
  }

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

          {!untracked && untrainedMuscles.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm text-neutral-400">
                Pas travaillé{untrainedMuscles.length > 1 ? 's' : ''} {period === '30j' ? '(30 derniers jours)' : ''}
              </h3>
              <div className="space-y-2">
                {untrainedMuscles.map((m) => {
                  const suggestions = suggestionsByMuscle[m.wger_id];
                  return (
                    <div key={m.id} className="card space-y-2">
                      <div className="text-sm font-medium">{m.name_fr}</div>
                      {suggestions === undefined ? (
                        <p className="text-neutral-500 text-xs">Recherche de suggestions...</p>
                      ) : suggestions.length === 0 ? (
                        <p className="text-neutral-500 text-xs">Aucune suggestion trouvée.</p>
                      ) : (
                        <div className="flex gap-2 overflow-x-auto pb-1">
                          {suggestions.map((s) => {
                            const added = addedIds.has(s.wger_id);
                            return (
                              <button
                                key={s.wger_id}
                                onClick={() => !added && addSuggestion(s)}
                                disabled={added || addingId === s.wger_id}
                                className="shrink-0 text-left bg-[#0a0a0a] border border-[#262626] rounded-lg p-2 text-xs w-32 hover:border-accent transition"
                              >
                                <div className="font-medium truncate mb-1">{s.name}</div>
                                <div className="flex items-center gap-1 text-accent">
                                  {added ? (
                                    <>
                                      <Check size={12} /> Ajouté
                                    </>
                                  ) : addingId === s.wger_id ? (
                                    '...'
                                  ) : (
                                    <>
                                      <Plus size={12} /> Ajouter
                                    </>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
