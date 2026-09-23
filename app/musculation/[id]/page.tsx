'use client';

import { useEffect, useRef, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Exercise, StrengthSet } from '@/lib/types';
import ExerciseBlockCard, { ExerciseBlockHandle } from '@/components/ExerciseBlockCard';

function genKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

interface InitialBlock {
  key: string;
  exercise: Exercise;
  sets: { reps: number; weight_kg: number }[];
  side: 'gauche' | 'droit' | null;
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
  const [blocks, setBlocks] = useState<InitialBlock[]>([]);
  const [saving, setSaving] = useState(false);
  const blockRefs = useRef<Record<string, ExerciseBlockHandle | null>>({});

  useEffect(() => {
    async function load() {
      const [{ data: sessionData }, { data: setsData }, { data: exercisesData }] = await Promise.all([
        supabase.from('strength_sessions').select('*').eq('id', id).single(),
        supabase.from('strength_sets').select('*').eq('session_id', id).order('set_number'),
        supabase.from('exercises').select('*').order('name'),
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

      const exerciseById = new Map(allExercises.map((e) => [e.id, e]));
      const grouped = new Map<string, InitialBlock>();
      (setsData ?? []).forEach((s: StrengthSet) => {
        const ex = exerciseById.get(s.exercise_id);
        if (!ex) return;
        const groupKey = `${s.exercise_id}__${s.side ?? ''}`;
        if (!grouped.has(groupKey)) {
          grouped.set(groupKey, { key: genKey(), exercise: ex, sets: [], side: s.side });
        }
        grouped.get(groupKey)!.sets.push({ reps: s.reps, weight_kg: Number(s.weight_kg) });
      });

      setBlocks(grouped.size > 0 ? Array.from(grouped.values()) : [{ key: genKey(), exercise: null as any, sets: [], side: null }]);
      setLoading(false);
    }
    load();
  }, [id]);

  function addBlock() {
    setBlocks((prev) => [...prev, { key: genKey(), exercise: null as any, sets: [], side: null }]);
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
    const flatSets = results.flatMap((r) => {
      const key = `${r.exercise.id}__${r.side ?? ''}`;
      return r.sets.map((s) => {
        countByKey[key] = (countByKey[key] ?? 0) + 1;
        return {
          session_id: id,
          exercise_id: r.exercise.id,
          set_number: countByKey[key],
          reps: s.reps,
          weight_kg: s.weight_kg,
          side: r.side,
        };
      });
    });

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
              className={`flex-1 py-1.5 rounded text-sm ${feeling === n ? 'bg-accent text-black font-semibold' : 'border border-[#333] text-neutral-400'}`}
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
          onExerciseAdded={onExerciseAdded}
          onRemove={() => removeBlock(b.key)}
          removable={blocks.length > 1}
          initialExercise={b.exercise}
          initialSets={b.sets.length > 0 ? b.sets : undefined}
          initialSide={b.side}
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
