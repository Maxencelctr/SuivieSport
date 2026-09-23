'use client';

import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/lib/types';
import ExercisePicker from './ExercisePicker';

interface SetRow {
  reps: number; // reps bilatéral, ou côté gauche si unilatéral
  reps_right: number; // utilisé seulement si unilatéral
  weight_kg: number;
}

export interface ExerciseBlockResult {
  exercise: Exercise;
  sets: { reps: number; weight_kg: number; side: 'gauche' | 'droit' | null }[];
}

export interface ExerciseBlockHandle {
  getResult: () => ExerciseBlockResult | null;
}

interface ExerciseBlockCardProps {
  index: number;
  exercises: Exercise[];
  muscleNamesByExercise: Record<string, string[]>;
  onExerciseAdded: (ex: Exercise) => void;
  onRemove: () => void;
  removable: boolean;
  initialExercise?: Exercise | null;
  initialRows?: SetRow[];
  initialUnilateral?: boolean;
}

// Un bloc = un exercice de la séance (recherche + séries). Une séance en
// contient plusieurs (voir /musculation/nouvelle et /musculation/[id]).
// Expose getResult() via ref pour que le parent récupère l'état actuel de
// tous les blocs au moment d'enregistrer, sans re-render à chaque frappe.
const ExerciseBlockCard = forwardRef<ExerciseBlockHandle, ExerciseBlockCardProps>(function ExerciseBlockCard(
  {
    index,
    exercises,
    muscleNamesByExercise,
    onExerciseAdded,
    onRemove,
    removable,
    initialExercise,
    initialRows,
    initialUnilateral,
  },
  ref
) {
  const [exercise, setExercise] = useState<Exercise | null>(initialExercise ?? null);
  const [muscleNames, setMuscleNames] = useState<string[]>(
    initialExercise ? muscleNamesByExercise[initialExercise.id] ?? [] : []
  );
  const [numSets, setNumSets] = useState(initialRows?.length || 3);
  const [rows, setRows] = useState<SetRow[]>(initialRows ?? []);
  const [unilateral, setUnilateral] = useState(!!initialUnilateral);
  const [suggestion, setSuggestion] = useState<{ reps: number; weight: number; date: string } | null>(null);

  useEffect(() => {
    const defaultReps = suggestion?.reps ?? 10;
    const defaultWeight = suggestion?.weight ?? 20;
    setRows((prev) => {
      const next: SetRow[] = [];
      for (let i = 0; i < numSets; i++) {
        next.push(prev[i] ?? { reps: defaultReps, reps_right: defaultReps, weight_kg: defaultWeight });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numSets, exercise?.id]);

  // Suggestion de progression basée sur la dernière perf enregistrée sur cet exercice
  useEffect(() => {
    if (!exercise) {
      setSuggestion(null);
      return;
    }
    supabase
      .from('strength_sets')
      .select('reps, weight_kg, strength_sessions(date)')
      .eq('exercise_id', exercise.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setSuggestion(null);
          return;
        }
        const lastDate = (data as any[])
          .map((s) => s.strength_sessions?.date)
          .filter(Boolean)
          .sort()
          .reverse()[0];
        if (!lastDate) {
          setSuggestion(null);
          return;
        }
        const lastSets = (data as any[]).filter((s) => s.strength_sessions?.date === lastDate);
        const bestSet = lastSets.reduce((best, s) => (s.weight_kg > best.weight_kg ? s : best), lastSets[0]);
        setSuggestion({ reps: bestSet.reps, weight: Number(bestSet.weight_kg), date: lastDate });
      });
  }, [exercise?.id]);

  useImperativeHandle(
    ref,
    () => ({
      getResult() {
        if (!exercise || rows.length === 0) return null;
        const sets = unilateral
          ? rows.flatMap((r) => [
              { reps: r.reps, weight_kg: r.weight_kg, side: 'gauche' as const },
              { reps: r.reps_right, weight_kg: r.weight_kg, side: 'droit' as const },
            ])
          : rows.map((r) => ({ reps: r.reps, weight_kg: r.weight_kg, side: null }));
        return { exercise, sets };
      },
    }),
    [exercise, rows, unilateral]
  );

  function selectExercise(ex: Exercise, names: string[]) {
    setExercise(ex);
    setMuscleNames(names);
  }

  function updateRow(i: number, field: 'reps' | 'reps_right' | 'weight_kg', value: number) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  }

  function applySuggestion(type: 'weight' | 'reps') {
    if (!suggestion) return;
    const newReps = type === 'reps' ? suggestion.reps + 1 : suggestion.reps;
    const newWeight = type === 'weight' ? Math.round((suggestion.weight + 2.5) * 2) / 2 : suggestion.weight;
    setRows(rows.map(() => ({ reps: newReps, reps_right: newReps, weight_kg: newWeight })));
  }

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-center">
        <label className="text-sm text-neutral-400">Exercice {index + 1}</label>
        {removable && (
          <button onClick={onRemove} className="text-xs text-neutral-500 hover:text-red-500">
            ✕ Retirer
          </button>
        )}
      </div>

      {exercise ? (
        <div className="flex justify-between items-center bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 gap-3">
          <div>
            <div className="font-medium">{exercise.name}</div>
            <div className="text-xs text-neutral-500">{muscleNames.join(', ') || exercise.muscle_group}</div>
          </div>
          <button
            onClick={() => {
              setExercise(null);
              setMuscleNames([]);
            }}
            className="text-xs text-accent shrink-0"
          >
            Changer
          </button>
        </div>
      ) : (
        <ExercisePicker
          exercises={exercises}
          muscleNamesByExercise={muscleNamesByExercise}
          onExerciseAdded={onExerciseAdded}
          onSelect={selectExercise}
        />
      )}

      {exercise && (
        <>
          {suggestion && (
            <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-sm space-y-2">
              <div className="text-neutral-400 text-xs">
                Dernière fois ({new Date(suggestion.date).toLocaleDateString('fr-FR')}) : {suggestion.reps} reps à{' '}
                {suggestion.weight}kg
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => applySuggestion('weight')}
                  className="flex-1 text-xs py-1.5 rounded bg-accent text-white font-semibold"
                >
                  +2.5kg → {Math.round((suggestion.weight + 2.5) * 2) / 2}kg x{suggestion.reps}
                </button>
                <button
                  onClick={() => applySuggestion('reps')}
                  className="flex-1 text-xs py-1.5 rounded border border-[#333] text-neutral-300"
                >
                  Même poids, +1 rep → x{suggestion.reps + 1}
                </button>
              </div>
            </div>
          )}

          <label className="text-xs text-neutral-500 flex items-center gap-2">
            <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} className="w-auto" />
            Exercice unilatéral (un bras/une jambe à la fois)
          </label>

          <div>
            <label className="text-xs text-neutral-500">Nombre de séries</label>
            <input
              type="number"
              value={numSets}
              onChange={(e) => setNumSets(Math.max(1, Math.min(15, Number(e.target.value))))}
              min={1}
              max={15}
            />
          </div>

          <div className="space-y-2">
            {unilateral && (
              <div className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 text-[10px] text-neutral-500 px-0">
                <span className="w-14" />
                <span>Reps gauche</span>
                <span>Reps droit</span>
                <span>Poids (kg)</span>
              </div>
            )}
            {rows.map((row, i) =>
              unilateral ? (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr_1fr] gap-2 items-center">
                  <span className="text-xs text-neutral-500 w-14">Série {i + 1}</span>
                  <input
                    type="number"
                    value={row.reps}
                    onChange={(e) => updateRow(i, 'reps', Number(e.target.value))}
                    min={1}
                  />
                  <input
                    type="number"
                    value={row.reps_right}
                    onChange={(e) => updateRow(i, 'reps_right', Number(e.target.value))}
                    min={1}
                  />
                  <input
                    type="number"
                    value={row.weight_kg}
                    onChange={(e) => updateRow(i, 'weight_kg', Number(e.target.value))}
                    min={0}
                    step={0.5}
                  />
                </div>
              ) : (
                <div key={i} className="grid grid-cols-[auto_1fr_1fr] gap-2 items-center">
                  <span className="text-xs text-neutral-500 w-14">Série {i + 1}</span>
                  <div>
                    <label className="text-[10px] text-neutral-500">Reps</label>
                    <input
                      type="number"
                      value={row.reps}
                      onChange={(e) => updateRow(i, 'reps', Number(e.target.value))}
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-neutral-500">Poids (kg)</label>
                    <input
                      type="number"
                      value={row.weight_kg}
                      onChange={(e) => updateRow(i, 'weight_kg', Number(e.target.value))}
                      min={0}
                      step={0.5}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
});

export default ExerciseBlockCard;
