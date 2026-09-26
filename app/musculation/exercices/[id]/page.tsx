'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Exercise, Muscle } from '@/lib/types';
import ExerciseDemo from '@/components/ExerciseDemo';

interface SetRow {
  id: string;
  set_number: number;
  reps: number;
  weight_kg: number;
  side: 'gauche' | 'droit' | null;
  session_id: string;
  strength_sessions: { date: string } | null;
}

export default function ExerciseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [sets, setSets] = useState<SetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);

  const [allMuscles, setAllMuscles] = useState<Muscle[]>([]);
  const [primaryIds, setPrimaryIds] = useState<Set<string>>(new Set());
  const [secondaryIds, setSecondaryIds] = useState<Set<string>>(new Set());
  const [fetchingWger, setFetchingWger] = useState(false);
  const [wgerError, setWgerError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    const [{ data: exerciseData }, { data: setsData }, { data: musclesData }, { data: links }] = await Promise.all([
      supabase.from('exercises').select('*').eq('id', id).single(),
      supabase
        .from('strength_sets')
        .select('*, strength_sessions(date)')
        .eq('exercise_id', id)
        .order('created_at', { ascending: false }),
      supabase.from('muscles').select('*').order('name_fr'),
      supabase.from('exercise_muscles').select('*').eq('exercise_id', id),
    ]);
    setExercise(exerciseData);
    setDescription(exerciseData?.description ?? '');
    setSets((setsData as any) ?? []);
    setAllMuscles(musclesData ?? []);
    setPrimaryIds(new Set((links ?? []).filter((l) => l.role === 'primaire').map((l) => l.muscle_id)));
    setSecondaryIds(new Set((links ?? []).filter((l) => l.role === 'secondaire').map((l) => l.muscle_id)));
    setLoading(false);
  }

  async function saveDescription() {
    setSavingDesc(true);
    await supabase.from('exercises').update({ description: description || null }).eq('id', id);
    setSavingDesc(false);
  }

  async function toggleAssisted() {
    if (!exercise) return;
    await supabase.from('exercises').update({ is_assisted: !exercise.is_assisted }).eq('id', id);
    await load();
  }

  async function toggleMuscle(muscleId: string, role: 'primaire' | 'secondaire') {
    const isPrimary = primaryIds.has(muscleId);
    const isSecondary = secondaryIds.has(muscleId);
    const isActive = role === 'primaire' ? isPrimary : isSecondary;

    if (isActive) {
      await supabase.from('exercise_muscles').delete().eq('exercise_id', id).eq('muscle_id', muscleId);
    } else {
      // Retire l'autre rôle s'il existait, puis pose le nouveau (un muscle a un seul rôle par exercice)
      await supabase.from('exercise_muscles').delete().eq('exercise_id', id).eq('muscle_id', muscleId);
      await supabase.from('exercise_muscles').insert({ exercise_id: id, muscle_id: muscleId, role });
    }
    await load();
  }

  async function fetchFromWger() {
    if (!exercise?.wger_id) return;
    setFetchingWger(true);
    setWgerError(null);
    try {
      const res = await fetch(`/api/exercises/wger-details?wger_id=${exercise.wger_id}`);
      const json = await res.json();
      if (json.error) {
        setWgerError(json.error);
        setFetchingWger(false);
        return;
      }

      // Mappe les wger_id renvoyés vers nos muscles locaux
      const localByWgerId = new Map(allMuscles.map((m) => [m.wger_id, m.id]));
      const primaryLocalIds: string[] = (json.primaryMuscles ?? []).map((id: number) => localByWgerId.get(id)).filter(Boolean);
      const secondaryLocalIds: string[] = (json.secondaryMuscles ?? []).map((id: number) => localByWgerId.get(id)).filter(Boolean);

      // Remplace les liens existants
      await supabase.from('exercise_muscles').delete().eq('exercise_id', id);
      const rows = [
        ...primaryLocalIds.map((muscle_id) => ({ exercise_id: id, muscle_id, role: 'primaire' as const })),
        ...secondaryLocalIds.map((muscle_id) => ({ exercise_id: id, muscle_id, role: 'secondaire' as const })),
      ];
      if (rows.length > 0) await supabase.from('exercise_muscles').insert(rows);

      // Complète la description si elle est vide
      if (json.description && !description) {
        setDescription(json.description);
        await supabase.from('exercises').update({ description: json.description }).eq('id', id);
      }

      await load();
    } catch {
      setWgerError('Impossible de joindre wger.de');
    } finally {
      setFetchingWger(false);
    }
  }

  if (loading) return <p className="text-neutral-500">Chargement...</p>;
  if (!exercise) return <p className="text-neutral-500">Exercice introuvable.</p>;

  const bySession: Record<string, { date: string; sets: SetRow[] }> = {};
  sets.forEach((s) => {
    const date = s.strength_sessions?.date ?? 'inconnue';
    if (!bySession[s.session_id]) bySession[s.session_id] = { date, sets: [] };
    bySession[s.session_id].sets.push(s);
  });
  const sessions = Object.values(bySession).sort((a, b) => b.date.localeCompare(a.date));

  const weights = sets.map((s) => Number(s.weight_kg));
  const bestWeight = exercise.is_assisted
    ? weights.length > 0 ? Math.min(...weights) : 0
    : weights.reduce((max, w) => Math.max(max, w), 0);
  const totalSets = sets.length;
  const hasMuscles = primaryIds.size > 0 || secondaryIds.size > 0;

  const leftSets = sets.filter((s) => s.side === 'gauche');
  const rightSets = sets.filter((s) => s.side === 'droit');
  const isUnilateral = leftSets.length > 0 || rightSets.length > 0;
  const leftMax = leftSets.reduce((max, s) => Math.max(max, Number(s.weight_kg)), 0);
  const rightMax = rightSets.reduce((max, s) => Math.max(max, Number(s.weight_kg)), 0);
  const leftAvgReps = leftSets.length > 0 ? Math.round((leftSets.reduce((s, x) => s + x.reps, 0) / leftSets.length) * 10) / 10 : 0;
  const rightAvgReps = rightSets.length > 0 ? Math.round((rightSets.reduce((s, x) => s + x.reps, 0) / rightSets.length) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{exercise.name}</h2>
        <Link href="/musculation/exercices" className="text-sm text-neutral-400">← Exercices</Link>
      </div>

      <ExerciseDemo name={exercise.name} />

      <div className="card flex justify-around text-center">
        <div>
          <div className="text-xl font-bold text-accent">{bestWeight}kg</div>
          <div className="text-xs text-neutral-500">{exercise.is_assisted ? 'Assistance mini' : 'Charge max'}</div>
        </div>
        <div>
          <div className="text-xl font-bold">{totalSets}</div>
          <div className="text-xs text-neutral-500">Séries au total</div>
        </div>
        <div>
          <div className="text-xl font-bold capitalize">{exercise.muscle_group}</div>
          <div className="text-xs text-neutral-500">Catégorie</div>
        </div>
      </div>

      <div className="card space-y-2">
        <label className="flex items-center gap-2 text-sm text-neutral-400">
          <input type="checkbox" checked={exercise.is_assisted} onChange={toggleAssisted} className="w-auto" />
          Exercice assisté (moins de poids = mieux — tractions/dips assistés...)
        </label>
      </div>

      <div className="card space-y-2">
        <label className="text-sm text-neutral-400">Ce que travaille cet exercice</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={saveDescription}
          rows={3}
          placeholder="Ex: développe les pectoraux, sollicite les triceps et deltoïdes antérieurs en stabilisateurs..."
        />
        {savingDesc && <p className="text-xs text-neutral-500">Enregistrement...</p>}
      </div>

      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-neutral-400">Muscles travaillés</label>
          {exercise.wger_id && (
            <button onClick={fetchFromWger} disabled={fetchingWger} className="text-xs text-accent">
              {fetchingWger ? 'Récupération...' : '↻ Récupérer depuis wger'}
            </button>
          )}
        </div>
        {wgerError && <p className="text-amber-500 text-xs">{wgerError}</p>}
        {!hasMuscles && !exercise.wger_id && (
          <p className="text-neutral-500 text-xs">Sélectionne les muscles ci-dessous (primaire = principal, secondaire = assisté).</p>
        )}

        <div className="grid grid-cols-2 gap-x-3 gap-y-1 max-h-72 overflow-y-auto">
          {allMuscles.map((m) => {
            const isPrimary = primaryIds.has(m.id);
            const isSecondary = secondaryIds.has(m.id);
            return (
              <div key={m.id} className="flex items-center justify-between text-sm py-1 border-b border-[#262626]">
                <span className={isPrimary ? 'text-accent' : isSecondary ? 'text-yellow-500' : 'text-neutral-400'}>
                  {m.name_fr}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleMuscle(m.id, 'primaire')}
                    className={`text-xs px-1.5 py-0.5 rounded ${isPrimary ? 'bg-accent text-white' : 'text-neutral-600 border border-[#333]'}`}
                  >
                    P
                  </button>
                  <button
                    onClick={() => toggleMuscle(m.id, 'secondaire')}
                    className={`text-xs px-1.5 py-0.5 rounded ${isSecondary ? 'bg-yellow-500 text-black' : 'text-neutral-600 border border-[#333]'}`}
                  >
                    S
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {isUnilateral && (
        <div className="card space-y-2">
          <div className="text-sm text-neutral-400">Comparaison gauche / droite</div>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className={leftMax < rightMax ? 'opacity-70' : ''}>
              <div className="text-lg font-bold text-accent">{leftMax}kg</div>
              <div className="text-xs text-neutral-500">Gauche — {leftAvgReps} reps moy.</div>
            </div>
            <div className={rightMax < leftMax ? 'opacity-70' : ''}>
              <div className="text-lg font-bold text-accent">{rightMax}kg</div>
              <div className="text-xs text-neutral-500">Droit — {rightAvgReps} reps moy.</div>
            </div>
          </div>
          {leftMax !== rightMax && leftMax > 0 && rightMax > 0 && (
            <p className="text-xs text-amber-500 text-center">
              Écart de {Math.abs(leftMax - rightMax)}kg entre les deux côtés — {leftMax > rightMax ? 'gauche' : 'droit'} plus fort.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm text-neutral-400">Historique ({sessions.length} séance{sessions.length !== 1 ? 's' : ''})</h3>
        {sessions.length === 0 && <p className="text-neutral-500 text-sm">Aucune série enregistrée pour cet exercice.</p>}
        {sessions.map((s, i) => (
          <div key={i} className="card">
            <div className="font-medium text-sm mb-2">
              {s.date !== 'inconnue' ? new Date(s.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) : 'Date inconnue'}
            </div>
            <div className="space-y-1">
              {s.sets
                .sort((a, b) => a.set_number - b.set_number)
                .map((set) => (
                  <div key={set.id} className="flex justify-between text-sm text-neutral-300">
                    <span>Série {set.set_number}{set.side ? ` (${set.side})` : ''}</span>
                    <span>{set.reps} reps × {set.weight_kg} kg</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
