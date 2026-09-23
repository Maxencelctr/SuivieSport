'use client';

import { useEffect, useMemo, useState } from 'react';
import { Footprints, Dumbbell, Pencil, CheckCircle2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Exercise, Goal, GoalType, Run } from '@/lib/types';
import { RACE_DISTANCE_PRESETS, formatPace } from '@/lib/running';
import ExercisePicker from '@/components/ExercisePicker';

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.round(totalSeconds % 60);
  if (h > 0) return `${h}h${String(m).padStart(2, '0')}min${String(s).padStart(2, '0')}`;
  return `${m}min${String(s).padStart(2, '0')}`;
}

interface SetInfo {
  exercise_id: string;
  reps: number;
  weight_kg: number;
}

// Meilleure perf connue sur une distance proche de l'objectif (±10%), ramenée
// à la distance cible via l'allure — pas de saisie manuelle, ça se base sur
// les runs déjà enregistrés.
function bestRunForGoal(goal: Goal, runs: Run[]): { seconds: number; date: string } | null {
  if (!goal.distance_km) return null;
  const tolerance = goal.distance_km * 0.1;
  const matching = runs.filter((r) => Math.abs(Number(r.distance_km) - goal.distance_km!) <= tolerance);
  if (matching.length === 0) return null;
  let best: { seconds: number; date: string } | null = null;
  matching.forEach((r) => {
    const estSeconds = r.avg_pace_seconds_per_km * goal.distance_km!;
    if (!best || estSeconds < best.seconds) best = { seconds: Math.round(estSeconds), date: r.date };
  });
  return best;
}

// Meilleur poids soulevé à ce nombre de reps ou plus, sur les séries déjà enregistrées.
function bestWeightForGoal(goal: Goal, sets: SetInfo[]): number | null {
  if (!goal.exercise_id) return null;
  const matching = sets.filter((s) => s.exercise_id === goal.exercise_id && s.reps >= (goal.target_reps ?? 1));
  if (matching.length === 0) return null;
  return Math.max(...matching.map((s) => s.weight_kg));
}

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [sets, setSets] = useState<SetInfo[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleNamesByExercise, setMuscleNamesByExercise] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState<GoalType>('course');

  // Objectif course
  const [distancePreset, setDistancePreset] = useState<string>('5km');
  const [customDistance, setCustomDistance] = useState(5);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(25);
  const [secondsInput, setSecondsInput] = useState(0);
  const [courseTargetDate, setCourseTargetDate] = useState('');

  // Objectif musculation
  const [muscuExercise, setMuscuExercise] = useState<Exercise | null>(null);
  const [targetReps, setTargetReps] = useState(5);
  const [targetWeight, setTargetWeight] = useState(100);
  const [muscuTargetDate, setMuscuTargetDate] = useState('');

  // Objectif générique (libre)
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('km');
  const [startValue, setStartValue] = useState(0);
  const [targetValue, setTargetValue] = useState(10);
  const [genericTargetDate, setGenericTargetDate] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [{ data: goalsData }, { data: runsData }, { data: exercisesData }, { data: emData }] = await Promise.all([
      supabase.from('goals').select('*').order('created_at', { ascending: false }),
      supabase.from('runs').select('*'),
      supabase.from('exercises').select('*').order('name'),
      supabase.from('exercise_muscles').select('exercise_id, muscles(name_fr)').eq('role', 'primaire'),
    ]);
    const goalsList: Goal[] = goalsData ?? [];
    setGoals(goalsList);
    setRuns(runsData ?? []);
    setExercises(exercisesData ?? []);

    const muscleMap: Record<string, string[]> = {};
    (emData ?? []).forEach((row: any) => {
      const name = row.muscles?.name_fr;
      if (!name) return;
      (muscleMap[row.exercise_id] ??= []).push(name);
    });
    setMuscleNamesByExercise(muscleMap);

    const musculationExerciseIds = Array.from(
      new Set(goalsList.filter((g) => g.goal_type === 'musculation' && g.exercise_id).map((g) => g.exercise_id as string))
    );
    if (musculationExerciseIds.length > 0) {
      const { data: setsData } = await supabase
        .from('strength_sets')
        .select('exercise_id, reps, weight_kg')
        .in('exercise_id', musculationExerciseIds);
      setSets((setsData ?? []).map((s: any) => ({ exercise_id: s.exercise_id, reps: s.reps, weight_kg: Number(s.weight_kg) })));
    } else {
      setSets([]);
    }
    setLoading(false);
  }

  function onExerciseAdded(ex: Exercise) {
    setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
  }

  const distanceKm = useMemo(() => {
    if (distancePreset === 'custom') return customDistance;
    return RACE_DISTANCE_PRESETS.find((p) => p.key === distancePreset)?.km ?? customDistance;
  }, [distancePreset, customDistance]);

  const courseTargetSeconds = hours * 3600 + minutes * 60 + secondsInput;

  async function addCourseGoal() {
    if (courseTargetSeconds <= 0 || distanceKm <= 0) return;
    const preset = RACE_DISTANCE_PRESETS.find((p) => p.key === distancePreset);
    const title = preset ? preset.label : `${distanceKm}km`;
    const { error } = await supabase.from('goals').insert({
      title,
      unit: 's',
      start_value: 0,
      target_value: courseTargetSeconds,
      current_value: 0,
      target_date: courseTargetDate || null,
      goal_type: 'course',
      distance_km: distanceKm,
    });
    if (!error) {
      setHours(0);
      setMinutes(25);
      setSecondsInput(0);
      setCourseTargetDate('');
      await load();
    }
  }

  async function addMusculationGoal() {
    if (!muscuExercise || targetReps <= 0 || targetWeight <= 0) return;
    const { error } = await supabase.from('goals').insert({
      title: muscuExercise.name,
      unit: 'kg',
      start_value: 0,
      target_value: targetWeight,
      current_value: 0,
      target_date: muscuTargetDate || null,
      goal_type: 'musculation',
      exercise_id: muscuExercise.id,
      target_reps: targetReps,
    });
    if (!error) {
      setMuscuExercise(null);
      setTargetReps(5);
      setTargetWeight(100);
      setMuscuTargetDate('');
      await load();
    }
  }

  async function addGenericGoal() {
    if (!title.trim()) return;
    const { error } = await supabase.from('goals').insert({
      title: title.trim(),
      unit,
      start_value: startValue,
      target_value: targetValue,
      current_value: startValue,
      target_date: genericTargetDate || null,
      goal_type: 'generique',
    });
    if (!error) {
      setTitle('');
      setStartValue(0);
      setTargetValue(10);
      setGenericTargetDate('');
      await load();
    }
  }

  async function updateCurrent(id: string, value: number) {
    await supabase.from('goals').update({ current_value: value }).eq('id', id);
    await load();
  }

  async function deleteGoal(id: string) {
    if (!confirm('Supprimer cet objectif ?')) return;
    await supabase.from('goals').delete().eq('id', id);
    await load();
  }

  function genericProgress(g: Goal) {
    const range = g.target_value - g.start_value;
    if (range === 0) return 100;
    const pct = ((g.current_value - g.start_value) / range) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  function daysRemaining(targetDate: string) {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }

  function DateBadge({ targetDate }: { targetDate: string }) {
    const days = daysRemaining(targetDate);
    return (
      <div className={`text-xs font-semibold ${days < 0 ? 'text-neutral-500' : days <= 7 ? 'text-red-500' : 'text-accent'}`}>
        {days < 0 ? 'Date dépassée' : days === 0 ? "Aujourd'hui !" : `J-${days}`}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Objectifs</h2>

      <div className="card space-y-4">
        <label className="text-sm text-neutral-400">Nouvel objectif</label>
        <div className="flex gap-2">
          {([
            { key: 'course', label: 'Course', icon: Footprints },
            { key: 'musculation', label: 'Musculation', icon: Dumbbell },
            { key: 'generique', label: 'Autre', icon: Pencil },
          ] as { key: GoalType; label: string; icon: typeof Footprints }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 text-sm py-2 rounded-lg ${tab === t.key ? 'bg-accent text-white font-semibold' : 'border border-[#2a2632] text-neutral-400'}`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'course' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Distance</label>
              <div className="flex gap-2 flex-wrap mt-1">
                {RACE_DISTANCE_PRESETS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setDistancePreset(p.key)}
                    className={`text-sm px-3 py-1.5 rounded-lg ${distancePreset === p.key ? 'bg-accent text-white font-semibold' : 'border border-[#333] text-neutral-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
                <button
                  onClick={() => setDistancePreset('custom')}
                  className={`text-sm px-3 py-1.5 rounded-lg ${distancePreset === 'custom' ? 'bg-accent text-white font-semibold' : 'border border-[#333] text-neutral-300'}`}
                >
                  Autre
                </button>
              </div>
              {distancePreset === 'custom' && (
                <input
                  type="number"
                  value={customDistance}
                  onChange={(e) => setCustomDistance(Number(e.target.value))}
                  min={0.1}
                  step={0.1}
                  className="mt-2"
                  placeholder="Distance en km"
                />
              )}
            </div>

            <div>
              <label className="text-xs text-neutral-500">Temps cible</label>
              <div className="grid grid-cols-3 gap-2 mt-1">
                <div>
                  <input type="number" value={hours} onChange={(e) => setHours(Math.max(0, Number(e.target.value)))} min={0} />
                  <p className="text-[10px] text-neutral-600 mt-0.5">heures</p>
                </div>
                <div>
                  <input type="number" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value)))} min={0} max={59} />
                  <p className="text-[10px] text-neutral-600 mt-0.5">minutes</p>
                </div>
                <div>
                  <input type="number" value={secondsInput} onChange={(e) => setSecondsInput(Math.max(0, Number(e.target.value)))} min={0} max={59} />
                  <p className="text-[10px] text-neutral-600 mt-0.5">secondes</p>
                </div>
              </div>
              {courseTargetSeconds > 0 && distanceKm > 0 && (
                <p className="text-xs text-accent mt-1">≈ {formatPace(Math.round(courseTargetSeconds / distanceKm))} /km</p>
              )}
            </div>

            <div>
              <label className="text-xs text-neutral-500">Date cible (optionnel)</label>
              <input type="date" value={courseTargetDate} onChange={(e) => setCourseTargetDate(e.target.value)} />
            </div>

            <p className="text-[10px] text-neutral-600">
              La progression se calcule automatiquement à partir de tes runs enregistrés sur une distance proche — pas de
              mise à jour manuelle à faire.
            </p>

            <button onClick={addCourseGoal} disabled={courseTargetSeconds <= 0} className="btn-primary w-full">
              + Ajouter l'objectif
            </button>
          </div>
        )}

        {tab === 'musculation' && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-neutral-500">Exercice</label>
              {muscuExercise ? (
                <div className="flex justify-between items-center bg-[#0a0a0a] border border-[#262626] rounded-lg px-3 py-2 mt-1">
                  <div className="font-medium">{muscuExercise.name}</div>
                  <button onClick={() => setMuscuExercise(null)} className="text-xs text-accent">
                    Changer
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <ExercisePicker
                    exercises={exercises}
                    muscleNamesByExercise={muscleNamesByExercise}
                    onExerciseAdded={onExerciseAdded}
                    onSelect={(ex) => setMuscuExercise(ex)}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-neutral-500">Reps cible</label>
                <input type="number" value={targetReps} onChange={(e) => setTargetReps(Number(e.target.value))} min={1} />
              </div>
              <div>
                <label className="text-xs text-neutral-500">Poids cible (kg)</label>
                <input type="number" value={targetWeight} onChange={(e) => setTargetWeight(Number(e.target.value))} min={0} step={0.5} />
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Date cible (optionnel)</label>
              <input type="date" value={muscuTargetDate} onChange={(e) => setMuscuTargetDate(e.target.value)} />
            </div>

            <p className="text-[10px] text-neutral-600">
              La progression se calcule automatiquement à partir de tes séries enregistrées (meilleur poids soulevé à ce
              nombre de reps ou plus) — pas de mise à jour manuelle à faire.
            </p>

            <button onClick={addMusculationGoal} disabled={!muscuExercise || targetReps <= 0 || targetWeight <= 0} className="btn-primary w-full">
              + Ajouter l'objectif
            </button>
          </div>
        )}

        {tab === 'generique' && (
          <div className="space-y-3">
            <p className="text-xs text-neutral-500">
              Pour tout ce qui n'est ni une distance de course ni un exercice précis — ex: poids de corps, nombre de séances
              par semaine...
            </p>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Poids de forme, 4 séances/semaine..." />
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-xs text-neutral-500">Valeur actuelle</label>
                <input type="number" value={startValue} onChange={(e) => setStartValue(Number(e.target.value))} />
                <p className="text-[10px] text-neutral-600 mt-0.5">Où tu en es aujourd'hui</p>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Objectif</label>
                <input type="number" value={targetValue} onChange={(e) => setTargetValue(Number(e.target.value))} />
                <p className="text-[10px] text-neutral-600 mt-0.5">Ce que tu veux atteindre</p>
              </div>
              <div>
                <label className="text-xs text-neutral-500">Unité</label>
                <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="km, kg, min" />
                <p className="text-[10px] text-neutral-600 mt-0.5">km, kg, min, reps...</p>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-500">Date cible (optionnel)</label>
              <input type="date" value={genericTargetDate} onChange={(e) => setGenericTargetDate(e.target.value)} />
              <p className="text-[10px] text-neutral-600 mt-0.5">Pour afficher un compte à rebours (J-XX)</p>
            </div>
            <button onClick={addGenericGoal} disabled={!title.trim()} className="btn-primary w-full">
              + Ajouter l'objectif
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
        {!loading && goals.length === 0 && <p className="text-neutral-500 text-sm">Aucun objectif pour l'instant.</p>}

        {!loading &&
          goals.map((g) => {
            if (g.goal_type === 'course') {
              const best = bestRunForGoal(g, runs);
              const progress = best ? Math.max(0, Math.min(100, (g.target_value / best.seconds) * 100)) : 0;
              const achieved = best ? best.seconds <= g.target_value : false;
              return (
                <div key={g.id} className="card space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium flex items-center gap-2">
                      <Footprints size={16} className="text-neutral-500" /> {g.title}
                      {g.distance_km ? ` (${g.distance_km}km)` : ''}
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-neutral-500 text-sm">
                      <X size={16} />
                    </button>
                  </div>
                  {g.target_date && <DateBadge targetDate={g.target_date} />}
                  <div className="h-3 rounded-full bg-[#262626] overflow-hidden">
                    <div className={`h-full transition-all ${achieved ? 'bg-volt' : 'bg-pink-500'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-sm text-neutral-400">
                    <span>Objectif : {formatDuration(g.target_value)}</span>
                    {g.target_date && <span>{new Date(g.target_date).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <div className="text-xs">
                    {best ? (
                      <span className={`flex items-center gap-1 ${achieved ? 'text-volt' : 'text-neutral-400'}`}>
                        {achieved && <CheckCircle2 size={14} />} {achieved ? 'Objectif atteint' : 'Meilleure perf actuelle'} : ~
                        {formatDuration(best.seconds)} (
                        {new Date(best.date).toLocaleDateString('fr-FR')})
                      </span>
                    ) : (
                      <span className="text-neutral-500">Aucun run proche de cette distance pour l'instant.</span>
                    )}
                  </div>
                </div>
              );
            }

            if (g.goal_type === 'musculation') {
              const bestWeight = bestWeightForGoal(g, sets);
              const progress = bestWeight ? Math.max(0, Math.min(100, (bestWeight / g.target_value) * 100)) : 0;
              const achieved = bestWeight ? bestWeight >= g.target_value : false;
              return (
                <div key={g.id} className="card space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="font-medium flex items-center gap-2">
                      <Dumbbell size={16} className="text-neutral-500" /> {g.title}
                    </div>
                    <button onClick={() => deleteGoal(g.id)} className="text-neutral-500 text-sm">
                      <X size={16} />
                    </button>
                  </div>
                  {g.target_date && <DateBadge targetDate={g.target_date} />}
                  <div className="h-3 rounded-full bg-[#262626] overflow-hidden">
                    <div className={`h-full transition-all ${achieved ? 'bg-volt' : 'bg-accent'}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center text-sm text-neutral-400">
                    <span>Objectif : {g.target_reps} reps à {g.target_value}kg</span>
                    {g.target_date && <span>{new Date(g.target_date).toLocaleDateString('fr-FR')}</span>}
                  </div>
                  <div className="text-xs">
                    {bestWeight ? (
                      <span className={`flex items-center gap-1 ${achieved ? 'text-volt' : 'text-neutral-400'}`}>
                        {achieved && <CheckCircle2 size={14} />} {achieved ? 'Objectif atteint' : 'Meilleure perf actuelle'} : {bestWeight}kg à {g.target_reps}+ reps
                      </span>
                    ) : (
                      <span className="text-neutral-500">Aucune série à {g.target_reps}+ reps enregistrée pour l'instant.</span>
                    )}
                  </div>
                </div>
              );
            }

            const progress = genericProgress(g);
            return (
              <div key={g.id} className="card space-y-2">
                <div className="flex justify-between items-center">
                  <div className="font-medium">{g.title}</div>
                  <button onClick={() => deleteGoal(g.id)} className="text-neutral-500 text-sm">
                    <X size={16} />
                  </button>
                </div>
                {g.target_date && <DateBadge targetDate={g.target_date} />}
                <div className="h-3 rounded-full bg-[#262626] overflow-hidden">
                  <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
                </div>
                <div className="flex justify-between items-center text-sm text-neutral-400">
                  <span>{g.current_value}{g.unit} / {g.target_value}{g.unit}</span>
                  {g.target_date && <span>{new Date(g.target_date).toLocaleDateString('fr-FR')}</span>}
                </div>
                <div className="flex gap-2 items-center pt-1">
                  <label className="text-xs text-neutral-500">Mettre à jour :</label>
                  <input
                    type="number"
                    defaultValue={g.current_value}
                    onBlur={(e) => updateCurrent(g.id, Number(e.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
