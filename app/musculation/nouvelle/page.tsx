'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/lib/types';

interface DraftSet {
  exercise_id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  side: 'gauche' | 'droit' | null;
}

interface SetRow {
  reps: number;
  weight_kg: number;
}

export default function NouvelleSeancePage() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [feeling, setFeeling] = useState(3);
  const [sets, setSets] = useState<DraftSet[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [numSets, setNumSets] = useState(3);
  const [rows, setRows] = useState<SetRow[]>([]);
  const [unilateral, setUnilateral] = useState(false);
  const [side, setSide] = useState<'gauche' | 'droit'>('gauche');
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<{ reps: number; weight: number; date: string } | null>(null);
  const [prList, setPrList] = useState<string[] | null>(null);

  useEffect(() => {
    supabase.from('exercises').select('*').order('name').then(({ data }) => {
      setExercises(data ?? []);
      if (data && data.length > 0) setSelectedExercise(data[0].id);
    });
  }, []);

  // Génère (ou régénère) les champs reps/poids selon le nombre de séries choisi,
  // préremplis avec la suggestion de la dernière fois si dispo, sinon des valeurs par défaut.
  useEffect(() => {
    const defaultReps = suggestion?.reps ?? 10;
    const defaultWeight = suggestion?.weight ?? 20;
    setRows((prev) => {
      const next: SetRow[] = [];
      for (let i = 0; i < numSets; i++) {
        next.push(prev[i] ?? { reps: defaultReps, weight_kg: defaultWeight });
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numSets, selectedExercise]);

  // À chaque changement d'exercice, va chercher la dernière performance enregistrée
  // pour suggérer une progression (poids légèrement supérieur, ou une rep de plus).
  useEffect(() => {
    if (!selectedExercise) {
      setSuggestion(null);
      return;
    }
    supabase
      .from('strength_sets')
      .select('reps, weight_kg, strength_sessions(date)')
      .eq('exercise_id', selectedExercise)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data || data.length === 0) {
          setSuggestion(null);
          return;
        }
        // Dernière séance = date la plus récente parmi les séries récupérées
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
  }, [selectedExercise]);

  function applySuggestion(type: 'weight' | 'reps') {
    if (!suggestion) return;
    const newReps = type === 'reps' ? suggestion.reps + 1 : suggestion.reps;
    const newWeight = type === 'weight' ? Math.round((suggestion.weight + 2.5) * 2) / 2 : suggestion.weight;
    setRows(rows.map(() => ({ reps: newReps, weight_kg: newWeight })));
  }

  function updateRow(index: number, field: 'reps' | 'weight_kg', value: number) {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  }

  function addAllRows() {
    if (!selectedExercise || rows.length === 0) return;
    const currentSide = unilateral ? side : null;
    const existingForExercise = sets.filter((s) => s.exercise_id === selectedExercise && s.side === currentSide).length;
    const newSets: DraftSet[] = rows.map((r, i) => ({
      exercise_id: selectedExercise,
      set_number: existingForExercise + i + 1,
      reps: r.reps,
      weight_kg: r.weight_kg,
      side: currentSide,
    }));
    setSets([...sets, ...newSets]);
  }

  function removeSet(index: number) {
    setSets(sets.filter((_, i) => i !== index));
  }

  function exerciseName(id: string) {
    return exercises.find((e) => e.id === id)?.name ?? '';
  }

  async function saveSession() {
    if (sets.length === 0) return;
    setSaving(true);

    // Détection de records : pour chaque exercice de la séance, compare le
    // meilleur poids du jour au meilleur poids déjà enregistré avant cette séance.
    const exerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)));
    const { data: previousSets } = await supabase
      .from('strength_sets')
      .select('exercise_id, weight_kg')
      .in('exercise_id', exerciseIds);

    const previousMax: Record<string, number> = {};
    (previousSets ?? []).forEach((s: any) => {
      previousMax[s.exercise_id] = Math.max(previousMax[s.exercise_id] ?? 0, Number(s.weight_kg));
    });

    const newPRs: string[] = [];
    exerciseIds.forEach((exId) => {
      const todayMax = Math.max(...sets.filter((s) => s.exercise_id === exId).map((s) => s.weight_kg));
      const prevMax = previousMax[exId] ?? 0;
      if (todayMax > prevMax) {
        newPRs.push(`${exerciseName(exId)} : ${todayMax}kg${prevMax > 0 ? ` (précédent : ${prevMax}kg)` : ''}`);
      }
    });

    const { data: session, error } = await supabase
      .from('strength_sessions')
      .insert({ notes: notes || null, duration_minutes: duration, feeling })
      .select()
      .single();

    if (error || !session) {
      alert("Erreur lors de l'enregistrement de la séance");
      setSaving(false);
      return;
    }

    const rows = sets.map((s) => ({ ...s, session_id: session.id }));
    const { error: setsError } = await supabase.from('strength_sets').insert(rows);

    if (setsError) {
      alert('Séance créée mais erreur sur les séries');
    }

    setSaving(false);

    if (newPRs.length > 0) {
      setPrList(newPRs); // affiche l'écran de félicitations, redirige au clic
    } else {
      router.push('/musculation');
    }
  }

  if (prList) {
    return (
      <div className="space-y-6 text-center pt-8">
        <div className="text-5xl">🎉</div>
        <h2 className="text-xl font-bold text-accent">Nouveau{prList.length > 1 ? 'x' : ''} record{prList.length > 1 ? 's' : ''} !</h2>
        <div className="card space-y-2 text-left">
          {prList.map((pr, i) => (
            <div key={i} className="text-sm">🏆 {pr}</div>
          ))}
        </div>
        <button onClick={() => router.push('/musculation')} className="btn-primary w-full">
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Nouvelle séance de musculation</h2>

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

        {suggestion && (
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-sm space-y-2">
            <div className="text-neutral-400 text-xs">
              Dernière fois ({new Date(suggestion.date).toLocaleDateString('fr-FR')}) : {suggestion.reps} reps à {suggestion.weight}kg
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applySuggestion('weight')}
                className="flex-1 text-xs py-1.5 rounded bg-accent text-black font-semibold"
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

        <div className="flex items-center justify-between">
          <label className="text-xs text-neutral-500 flex items-center gap-2">
            <input type="checkbox" checked={unilateral} onChange={(e) => setUnilateral(e.target.checked)} className="w-auto" />
            Exercice unilatéral (un bras/une jambe à la fois)
          </label>
        </div>
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
          {sets.map((s, i) => (
            <div key={i} className="flex justify-between items-center border-b border-[#262626] py-1 last:border-0">
              <span>{exerciseName(s.exercise_id)} — série {s.set_number}{s.side ? ` (${s.side})` : ''}</span>
              <span className="text-accent">{s.reps} x {s.weight_kg}kg</span>
              <button onClick={() => removeSet(i)} className="text-neutral-500 text-sm ml-2">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="card space-y-2">
        <label className="text-sm text-neutral-400">Ressenti de la séance</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n)}
              className={`flex-1 py-2 rounded text-sm ${feeling === n ? 'bg-accent text-black font-semibold' : 'border border-[#333] text-neutral-400'}`}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-neutral-500">1 = très dur, 5 = très facile</p>
      </div>

      <div className="card space-y-2">
        <label className="text-sm text-neutral-400">Durée de la séance (min)</label>
        <input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} min={5} step={5} />
        <p className="text-xs text-neutral-500">Sert à estimer les calories brûlées, personnalisé à ton poids.</p>
      </div>

      <div className="card space-y-2">
        <label className="text-sm text-neutral-400">Notes (optionnel)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Ressenti, fatigue, etc." />
      </div>

      <button
        onClick={saveSession}
        disabled={sets.length === 0 || saving}
        className="btn-primary w-full"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer la séance'}
      </button>
    </div>
  );
}
