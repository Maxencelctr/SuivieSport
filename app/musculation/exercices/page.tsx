'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/lib/types';

interface SearchResult {
  wger_id: number;
  name: string;
  muscle_group: string;
  muscles: string[];
  image_url: string | null;
}

const MUSCLE_GROUPS = ['pecs', 'dos', 'jambes', 'epaules', 'bras', 'abdos', 'cardio', 'autre'];

export default function ExercicesPage() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [addingId, setAddingId] = useState<number | null>(null);

  // Ajout manuel (fallback si l'API wger ne trouve rien ou est indisponible)
  const [manualName, setManualName] = useState('');
  const [manualGroup, setManualGroup] = useState('autre');

  useEffect(() => {
    loadExercises();
  }, []);

  async function loadExercises() {
    const { data } = await supabase.from('exercises').select('*').order('name');
    setExercises(data ?? []);
  }

  // Recherche avec un petit debounce pour ne pas spammer l'API à chaque frappe
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exercises/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
        if (json.error) setSearchError(json.error);
      } catch {
        setSearchError('Recherche indisponible pour le moment.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const alreadyAddedIds = new Set(exercises.map((e) => e.wger_id).filter(Boolean));

  async function addFromSearch(result: SearchResult) {
    setAddingId(result.wger_id);
    const { data: inserted, error } = await supabase
      .from('exercises')
      .insert({
        name: result.name,
        muscle_group: result.muscle_group,
        wger_id: result.wger_id,
        image_url: result.image_url,
      })
      .select()
      .single();

    if (!error && inserted) {
      await loadExercises();
      // Récupère aussitôt les muscles précis (primaire/secondaire) + description
      // depuis wger, en tâche de fond, pour éviter une étape manuelle en plus.
      try {
        const res = await fetch(`/api/exercises/wger-details?wger_id=${result.wger_id}`);
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
        // Pas grave : l'utilisateur pourra toujours récupérer les muscles manuellement sur la fiche de l'exercice
      }
    }
    setAddingId(null);
  }

  async function addManual() {
    if (!manualName.trim()) return;
    const { error } = await supabase.from('exercises').insert({
      name: manualName.trim(),
      muscle_group: manualGroup,
    });
    if (!error) {
      setManualName('');
      await loadExercises();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Exercices</h2>
        <Link href="/musculation" className="text-sm text-neutral-400">← Séances</Link>
      </div>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">Rechercher un exercice (base wger.de)</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ex: bench press, squat, curl..."
        />
        {searching && <p className="text-neutral-500 text-sm">Recherche...</p>}
        {searchError && <p className="text-amber-500 text-sm">{searchError} — tu peux l'ajouter manuellement en bas.</p>}

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((r) => {
              const already = alreadyAddedIds.has(r.wger_id);
              return (
                <div key={r.wger_id} className="flex justify-between items-center border-b border-[#262626] py-2 last:border-0">
                  <div>
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-neutral-500">{r.muscles.join(', ') || r.muscle_group}</div>
                  </div>
                  <button
                    onClick={() => addFromSearch(r)}
                    disabled={already || addingId === r.wger_id}
                    className="btn-primary text-sm py-1 px-3"
                  >
                    {already ? 'Ajouté ✓' : addingId === r.wger_id ? '...' : '+ Ajouter'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">Ou ajouter un exercice manuellement</label>
        <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nom de l'exercice" />
        <select value={manualGroup} onChange={(e) => setManualGroup(e.target.value)}>
          {MUSCLE_GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <button onClick={addManual} disabled={!manualName.trim()} className="btn-primary w-full">
          + Ajouter manuellement
        </button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm text-neutral-400">Mes exercices ({exercises.length})</h3>
        {exercises.map((ex) => (
          <Link key={ex.id} href={`/musculation/exercices/${ex.id}`} className="card flex justify-between items-center py-2 block hover:border-neutral-600 transition">
            <span>{ex.name}</span>
            <span className="text-xs text-neutral-500">{ex.muscle_group}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
