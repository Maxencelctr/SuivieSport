'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/lib/types';

interface WgerResult {
  wger_id: number;
  name: string;
  muscle_group: string;
  image_url: string | null;
}

interface ExercisePickerProps {
  // Bibliothèque locale déjà chargée par le parent (tenue à jour via onExerciseAdded)
  exercises: Exercise[];
  // Appelé quand un exercice wger encore inconnu est ajouté à la bibliothèque
  onExerciseAdded: (exercise: Exercise) => void;
  onSelect: (exercise: Exercise) => void;
  placeholder?: string;
}

// Champ de recherche d'exercice : cherche d'abord dans la bibliothèque déjà
// constituée (instantané), puis dans les +900 exercices de wger.de (réseau,
// débounce). Sélectionner un résultat wger encore jamais utilisé l'ajoute
// automatiquement à la bibliothèque (comme sur /musculation/exercices),
// muscles et description récupérés en tâche de fond.
export default function ExercisePicker({ exercises, onExerciseAdded, onSelect, placeholder }: ExercisePickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [wgerResults, setWgerResults] = useState<WgerResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [addingWgerId, setAddingWgerId] = useState<number | null>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setWgerResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/exercises/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setWgerResults(json.results ?? []);
      } catch {
        setWgerResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const needle = query.trim().toLowerCase();
  const localMatches = needle.length >= 1 ? exercises.filter((e) => e.name.toLowerCase().includes(needle)) : [];
  const localWgerIds = new Set(exercises.map((e) => e.wger_id).filter(Boolean));
  const newWgerResults = wgerResults.filter((r) => !localWgerIds.has(r.wger_id));

  function selectLocal(ex: Exercise) {
    onSelect(ex);
    setQuery('');
    setOpen(false);
  }

  async function selectWger(r: WgerResult) {
    setAddingWgerId(r.wger_id);
    const { data: inserted, error } = await supabase
      .from('exercises')
      .insert({ name: r.name, muscle_group: r.muscle_group, wger_id: r.wger_id, image_url: r.image_url })
      .select()
      .single();

    setAddingWgerId(null);
    if (error || !inserted) return;

    onExerciseAdded(inserted);
    onSelect(inserted);
    setQuery('');
    setOpen(false);

    try {
      const res = await fetch(`/api/exercises/wger-details?wger_id=${r.wger_id}`);
      const json = await res.json();
      if (!json.error) {
        const { data: musclesData } = await supabase.from('muscles').select('*');
        const localByWgerId = new Map((musclesData ?? []).map((m: any) => [m.wger_id, m.id]));
        const primaryLocalIds: string[] = (json.primaryMuscles ?? [])
          .map((id: number) => localByWgerId.get(id))
          .filter(Boolean);
        const secondaryLocalIds: string[] = (json.secondaryMuscles ?? [])
          .map((id: number) => localByWgerId.get(id))
          .filter(Boolean);
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

  const showDropdown = open && needle.length >= 1 && (localMatches.length > 0 || newWgerResults.length > 0 || searching);

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? 'Rechercher un exercice (bench press, squat...)'}
      />
      {showDropdown && (
        <div className="absolute z-10 mt-1 w-full bg-[#141414] border border-[#333] rounded-lg max-h-64 overflow-y-auto">
          {localMatches.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase text-neutral-500">Ta bibliothèque</div>
              {localMatches.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onMouseDown={() => selectLocal(ex)}
                  className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] flex justify-between items-center"
                >
                  <span>{ex.name}</span>
                  <span className="text-xs text-neutral-500">{ex.muscle_group}</span>
                </button>
              ))}
            </div>
          )}
          {newWgerResults.length > 0 && (
            <div>
              <div className="px-3 pt-2 pb-1 text-[10px] uppercase text-neutral-500">Base wger.de (+900 exercices)</div>
              {newWgerResults.map((r) => (
                <button
                  key={r.wger_id}
                  type="button"
                  onMouseDown={() => selectWger(r)}
                  disabled={addingWgerId === r.wger_id}
                  className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] flex justify-between items-center"
                >
                  <span>{r.name}</span>
                  <span className="text-xs text-accent">{addingWgerId === r.wger_id ? '...' : `+ ${r.muscle_group}`}</span>
                </button>
              ))}
            </div>
          )}
          {searching && <div className="px-3 py-2 text-xs text-neutral-500">Recherche...</div>}
        </div>
      )}
    </div>
  );
}
