'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Exercise, StrengthSet } from '@/lib/types';

interface SetRow {
  reps: number;
  weight_kg: number;
}

export default function SeanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [feeling, setFeeling] = useState(3);
  const [sets, setSets] = useState<StrengthSet[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const [selectedExercise, setSelectedExercise] = useState('');
  const [numSets, setNumSets] = useState(3);
  const [rows, setRows] = useState<SetRow[]>([]);
  const [unilateral, setUnilateral] = useState(false);
  const [side, setSide] = useState<'gauche' | 'droit'>('gauche');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: sessionData }, { data: setsData }, { data: exercisesData }] = await Promise.all([
        supabase.from('strength_sessions').select('*').eq('id', id).single(),
        supabase.from('strength_sets').select('*').eq('session_id', id).order('set_number'),
        supabase.from('exercises').select('*').order('name'),
      ]);
      if (sessionData) {
        setDate(sessionData.date);
        setNotes(sessionData.notes ?? '');
        setDuration(sessionData.duration_minutes ?? 60);
        setFeeling(sessionData.feeling ?? 3);
      }
      setSets(setsData ?? []);
      setExercises(exercisesData ?? []);
      if (exercisesData && exercisesData.length > 0) setSelectedExercise(exercisesData[0].id);
      setLoading(false);
    }
    load();
  }, [id]);

  // Génère les champs reps/poids selon le nombre de séries choisi
  useEffect(() => {
    setRows((prev) => {
      const next: SetRow[] = [];
      for (let i = 0; i < numSets; i++) {
        next.push(prev[i] ?? { reps: 10, weight_kg: 20 });
      }
      return next;
    });
  }, [numSets]);

  function exerciseName(id: string) {
    return exercises.find((e) => e.id === id)?.name ?? 'Exercice';
  }

  function updateRow(index: number, field: 'reps' | 'weight_kg', value: number) {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addAllRows() {
    if (!selectedExercise || rows.length === 0) return;
    const currentSide = unilateral ? side : null;
    const existingForExercise = sets.filter((s) => s.exercise_id === selectedExercise && s.side === currentSide).length;
    const newSets: StrengthSet[] = rows.map((r, i) => ({
      id: `new-${Date.now()}-${i}`,
      session_id: id,
      exercise_id: selectedExercise,
      set_number: existingForExercise + i + 1,
      reps: r.reps,
      weight_kg: r.weight_kg,
      side: currentSide,
      created_at: new Date().toISOString(),
    }));
    setSets([...sets, ...newSets]);
  }

  function removeSet(id: string) {
    setSets(sets.filter((s) => s.id !== id));
  }

  async function saveSession() {
    setSaving(true);
    // Met à jour la séance
    await supabase.from('strength_sessions').update({ date, notes: notes || null, duration_minutes: duration, feeling }).eq('id', id);

    // Remplace toutes les séries : supprime puis réinsère (simple et fiable)
    await supabase.from('strength_sets').delete().eq('session_id', id);
    if (sets.length > 0) {
      const rows = sets.map((s) => ({
        session_id: id,
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight_kg: s.weight_kg,
        side: s.side,
      }));
      await supabase.from('strength_sets').insert(rows);
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

      <div className="card space-y-2">
        <label className="text-xs text-neutral-500">Date</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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

      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-neutral-400">Ajouter une série</label>
          <a href="/musculation/exercices" className="text-xs text-accent">+ Exo manquant ?</a>
        </div>
        <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)}>
          {exercises.map((ex) => (
            <option key={ex.id} value={ex.id}>{ex.name} ({ex.muscle_group})</option>
          ))}
        </select>

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
          {rows.map((row, i) => (
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
          ))}
        </div>

        <label className="text-xs text-neutral-500 flex items-center gap-2">
          <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} className="w-auto" />
          Exercice unilatéral (un bras/une jambe à la fois)
        </label>
        {unilateral && (
          <div className="flex gap-2">
            <button
              onClick={() => setSide('gauche')}
              className={`flex-1 text-sm py-1.5 rounded ${side === 'gauche' ? 'bg-accent text-black font-semibold' : 'border border-[#333] text-neutral-300'}`}
            >
              Gauche
            </button>
            <button
              onClick={() => setSide('droit')}
              className={`flex-1 text-sm py-1.5 rounded ${side === 'droit' ? 'bg-accent text-black font-semibold' : 'border border-[#333] text-neutral-300'}`}
            >
              Droit
            </button>
          </div>
        )}
        <button onClick={addAllRows} className="btn-primary w-full">
          + Ajouter {rows.length > 1 ? `les ${rows.length} séries` : 'la série'}
        </button>
      </div>

      {sets.length > 0 && (
        <div className="card space-y-2">
          <div className="text-sm text-neutral-400 mb-1">Séries de la séance</div>
          {sets.map((s) => (
            <div key={s.id} className="flex justify-between items-center border-b border-[#262626] py-1 last:border-0">
              <span>{exerciseName(s.exercise_id)} — série {s.set_number}{s.side ? ` (${s.side})` : ''}</span>
              <span className="text-accent">{s.reps} x {s.weight_kg}kg</span>
              <button onClick={() => removeSet(s.id)} className="text-neutral-500 text-sm ml-2">✕</button>
            </div>
          ))}
        </div>
      )}

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
