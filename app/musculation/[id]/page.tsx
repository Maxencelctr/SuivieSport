'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Exercise, StrengthSet } from '@/lib/types';
import ExerciseBlockCard, { ExerciseBlockHandle } from '@/components/ExerciseBlockCard';

function genKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

interface BlockRow {
  reps: number;
  reps_right: number;
  weight_kg: number;
}

interface InitialBlock {
  key: string;
  exercise: Exercise | null;
  rows: BlockRow[];
  unilateral: boolean;
}

// Regroupe les séries existantes par exercice, et fusionne gauche/droit dans
// des lignes reps_gauche/reps_droit (un exercice unilatéral = un seul bloc,
// pas deux séparés par côté comme avant cette refonte).
function buildInitialBlocks(sets: StrengthSet[], exerciseById: Map<string, Exercise>): InitialBlock[] {
  const byExercise = new Map<string, StrengthSet[]>();
  sets.forEach((s) => {
    if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
    byExercise.get(s.exercise_id)!.push(s);
  });

  const blocks: InitialBlock[] = [];
  byExercise.forEach((exSets, exerciseId) => {
    const ex = exerciseById.get(exerciseId);
    if (!ex) return;
    const unilateral = exSets.some((s) => s.side);

    if (!unilateral) {
      const rows = [...exSets]
        .sort((a, b) => a.set_number - b.set_number)
        .map((s) => ({ reps: s.reps, reps_right: s.reps, weight_kg: Number(s.weight_kg) }));
      blocks.push({ key: genKey(), exercise: ex, rows, unilateral: false });
      return;
    }

    const left = exSets.filter((s) => s.side === 'gauche').sort((a, b) => a.set_number - b.set_number);
    const right = exSets.filter((s) => s.side === 'droit').sort((a, b) => a.set_number - b.set_number);
    const n = Math.max(left.length, right.length);
    const rows: BlockRow[] = [];
    for (let i = 0; i < n; i++) {
      rows.push({
        reps: left[i]?.reps ?? right[i]?.reps ?? 10,
        reps_right: right[i]?.reps ?? left[i]?.reps ?? 10,
        weight_kg: Number(left[i]?.weight_kg ?? right[i]?.weight_kg ?? 20),
      });
    }
    blocks.push({ key: genKey(), exercise: ex, rows, unilateral: true });
  });

  return blocks;
}

export default function SeanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [feeling, setFeeling] = useState(3);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleNamesByExercise, setMuscleNamesByExercise] = useState<Record<string, string[]>>({});
  const [blocks, setBlocks] = useState<InitialBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const blockRefs = useRef<Record<string, ExerciseBlockHandle | null>>({});

  useEffect(() => {
    async function load() {
      const [{ data: sessionData }, { data: setsData }, { data: exercisesData }, { data: emData }] = await Promise.all([
        supabase.from('strength_sessions').select('*').eq('id', id).single(),
        supabase.from('strength_sets').select('*').eq('session_id', id).order('set_number'),
        supabase.from('exercises').select('*').order('name'),
        supabase.from('exercise_muscles').select('exercise_id, muscles(name_fr)').eq('role', 'primaire'),
      ]);
      if (sessionData) {
        setDate(sessionData.date);
        setTime(sessionData.time ?? '');
        setNotes(sessionData.notes ?? '');
        setDuration(sessionData.duration_minutes ?? 60);
        setFeeling(sessionData.feeling ?? 3);
      }
      const allExercises: Exercise[] = exercisesData ?? [];
      setExercises(allExercises);

      const muscleMap: Record<string, string[]> = {};
      (emData ?? []).forEach((row: any) => {
        const name = row.muscles?.name_fr;
        if (!name) return;
        (muscleMap[row.exercise_id] ??= []).push(name);
      });
      setMuscleNamesByExercise(muscleMap);

      const exerciseById = new Map(allExercises.map((e) => [e.id, e]));
      const initialBlocks = buildInitialBlocks(setsData ?? [], exerciseById);
      setBlocks(initialBlocks.length > 0 ? initialBlocks : [{ key: genKey(), exercise: null, rows: [], unilateral: false }]);
      setLoading(false);
    }
    load();
  }, [id]);

  function addBlock() {
    setBlocks((prev) => [...prev, { key: genKey(), exercise: null, rows: [], unilateral: false }]);
  }

  function removeBlock(key: string) {
    setBlocks((prev) => prev.filter((b) => b.key !== key));
    delete blockRefs.current[key];
  }

  function onExerciseAdded(ex: Exercise) {
    setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function saveSession() {
    const results = blocks.map((b) => blockRefs.current[b.key]?.getResult()).filter(Boolean) as NonNullable<
      ReturnType<NonNullable<ExerciseBlockHandle['getResult']>>
    >[];

    if (results.length === 0) {
      alert('Choisis au moins un exercice avant d\'enregistrer.');
      return;
    }
    setSaving(true);

    await supabase
      .from('strength_sessions')
      .update({ date, time: time || null, notes: notes || null, duration_minutes: duration, feeling })
      .eq('id', id);

    const countByKey: Record<string, number> = {};
    const flatSets = results.flatMap((r) =>
      r.sets.map((s) => {
        const key = `${r.exercise.id}__${s.side ?? ''}`;
        countByKey[key] = (countByKey[key] ?? 0) + 1;
        return {
          session_id: id,
          exercise_id: r.exercise.id,
          set_number: countByKey[key],
          reps: s.reps,
          weight_kg: s.weight_kg,
          side: s.side,
        };
      })
    );

    // Remplace toutes les séries : supprime puis réinsère (simple et fiable)
    await supabase.from('strength_sets').delete().eq('session_id', id);
    if (flatSets.length > 0) {
      await supabase.from('strength_sets').insert(flatSets);
    }

    setSaving(false);
    router.push('/musculation');
  }

  async function deleteSession() {
    if (!confirm('Supprimer cette séance et toutes ses séries ?')) return;
    await supabase.from('strength_sessions').delete().eq('id', id);
    router.push('/musculation');
  }

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Modifier la séance</h2>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-neutral-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Heure</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <label className="text-xs text-neutral-500">Durée (min)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={5} step={5} />
        <label className="text-xs text-neutral-500">Ressenti (1 = très dur, 5 = très facile)</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n)}
              className={`flex-1 py-1.5 rounded text-sm ${feeling === n ? 'bg-accent text-white font-semibold' : 'border border-[#333] text-neutral-400'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <label className="text-xs text-neutral-500">Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      <div className="flex justify-between items-center">
        <span className="text-sm text-neutral-400">Exercices</span>
        <a href="/musculation/exercices" className="text-xs text-accent">
          + Exo manquant ?
        </a>
      </div>

      {blocks.map((b, i) => (
        <ExerciseBlockCard
          key={b.key}
          index={i}
          exercises={exercises}
          muscleNamesByExercise={muscleNamesByExercise}
          onExerciseAdded={onExerciseAdded}
          onRemove={() => removeBlock(b.key)}
          removable={blocks.length > 1}
          initialExercise={b.exercise}
          initialRows={b.rows.length > 0 ? b.rows : undefined}
          initialUnilateral={b.unilateral}
          ref={(el) => {
            blockRefs.current[b.key] = el;
          }}
        />
      ))}

      <button onClick={addBlock} className="w-full py-2 rounded-lg border border-dashed border-[#333] text-sm text-neutral-400 hover:text-accent hover:border-accent">
        + Ajouter un exercice
      </button>

      <div className="space-y-2">
        <button onClick={saveSession} disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
        <button onClick={deleteSession} className="w-full text-center text-red-500 text-sm py-2">
          Supprimer cette séance
        </button>
      </div>
    </div>
  );
}
