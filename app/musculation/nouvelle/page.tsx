'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PartyPopper, Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Exercise } from '@/lib/types';
import ExerciseBlockCard, { ExerciseBlockHandle } from '@/components/ExerciseBlockCard';
import RestTimerBar from '@/components/RestTimerBar';
import { useRestTimer } from '@/lib/useRestTimer';
import { queueSession } from '@/lib/offlineQueue';

interface PrefillBlock {
  key: string;
  initialExercise?: Exercise | null;
  initialRows?: { reps: number; reps_right: number; weight_kg: number }[];
  initialUnilateral?: boolean;
}

function genKey() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function nowTime() {
  return new Date().toTimeString().slice(0, 5);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function NouvelleSeancePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const repeatId = searchParams.get('repeat');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [muscleNamesByExercise, setMuscleNamesByExercise] = useState<Record<string, string[]>>({});
  const [blocks, setBlocks] = useState<PrefillBlock[]>(() =>
    repeatId ? [] : [{ key: genKey() }, { key: genKey() }, { key: genKey() }]
  );
  const [prefilling, setPrefilling] = useState(!!repeatId);
  const blockRefs = useRef<Record<string, ExerciseBlockHandle | null>>({});
  const restTimer = useRestTimer();

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowTime);
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(60);
  const [feeling, setFeeling] = useState(3);
  const [saving, setSaving] = useState(false);
  const [prList, setPrList] = useState<string[] | null>(null);

  // Charge la bibliothèque d'exercices une fois, tenue à jour ensuite par
  // ExercisePicker quand un nouvel exercice wger est ajouté à la volée.
  useEffect(() => {
    supabase
      .from('exercises')
      .select('*')
      .order('name')
      .then(({ data }) => setExercises(data ?? []));

    // Muscles précis (noms FR) déjà connus par exercice, pour affichage dans la recherche
    supabase
      .from('exercise_muscles')
      .select('exercise_id, muscles(name_fr)')
      .eq('role', 'primaire')
      .then(({ data }) => {
        const map: Record<string, string[]> = {};
        (data ?? []).forEach((row: any) => {
          const name = row.muscles?.name_fr;
          if (!name) return;
          (map[row.exercise_id] ??= []).push(name);
        });
        setMuscleNamesByExercise(map);
      });
  }, []);

  // "Répéter la dernière séance" : pré-remplit les blocs avec les mêmes
  // exercices (et le même nombre de séries) que la séance source, une fois
  // que la bibliothèque d'exercices est chargée (pour résoudre initialExercise).
  useEffect(() => {
    if (!repeatId || exercises.length === 0) return;

    supabase
      .from('strength_sets')
      .select('exercise_id, set_number, reps, weight_kg, side')
      .eq('session_id', repeatId)
      .order('set_number')
      .then(({ data: sets }) => {
        if (!sets || sets.length === 0) {
          setBlocks([{ key: genKey() }]);
          setPrefilling(false);
          return;
        }

        const byExercise = new Map<string, typeof sets>();
        sets.forEach((s) => {
          if (!byExercise.has(s.exercise_id)) byExercise.set(s.exercise_id, []);
          byExercise.get(s.exercise_id)!.push(s);
        });

        const newBlocks: PrefillBlock[] = Array.from(byExercise.entries()).map(([exerciseId, exSets]) => {
          const exercise = exercises.find((e) => e.id === exerciseId) ?? null;
          const unilateral = exSets.some((s) => s.side != null);

          let rows: { reps: number; reps_right: number; weight_kg: number }[];
          if (unilateral) {
            const bySetNum = new Map<number, { reps: number; reps_right: number; weight_kg: number }>();
            exSets.forEach((s) => {
              const row = bySetNum.get(s.set_number) ?? { reps: 0, reps_right: 0, weight_kg: Number(s.weight_kg) };
              if (s.side === 'droit') row.reps_right = s.reps;
              else row.reps = s.reps;
              row.weight_kg = Number(s.weight_kg);
              bySetNum.set(s.set_number, row);
            });
            rows = Array.from(bySetNum.values());
          } else {
            rows = exSets.map((s) => ({ reps: s.reps, reps_right: s.reps, weight_kg: Number(s.weight_kg) }));
          }

          return { key: genKey(), initialExercise: exercise, initialRows: rows, initialUnilateral: unilateral };
        });

        setBlocks(newBlocks.length > 0 ? newBlocks : [{ key: genKey() }]);
        setPrefilling(false);
      });
  }, [repeatId, exercises]);

  function addBlock() {
    setBlocks((prev) => [...prev, { key: genKey() }]);
  }

  function removeBlock(key: string) {
    setBlocks((prev) => prev.filter((b) => b.key !== key));
    delete blockRefs.current[key];
  }

  function onExerciseAdded(ex: Exercise) {
    setExercises((prev) => [...prev, ex].sort((a, b) => a.name.localeCompare(b.name)));
  }

  async function saveSession() {
    // Récupère l'état actuel de chaque bloc (exercice + séries) et construit
    // la liste plate des séries à insérer, avec une numérotation par
    // exercice+côté (comme avant, quand on ajoutait un exercice à la fois).
    const results = blocks.map((b) => blockRefs.current[b.key]?.getResult()).filter(Boolean) as NonNullable<
      ReturnType<NonNullable<ExerciseBlockHandle['getResult']>>
    >[];

    if (results.length === 0) {
      alert('Choisis au moins un exercice avant d\'enregistrer.');
      return;
    }
    setSaving(true);

    const countByKey: Record<string, number> = {};
    const flatSets = results.flatMap((r) =>
      r.sets.map((s) => {
        const key = `${r.exercise.id}__${s.side ?? ''}`;
        countByKey[key] = (countByKey[key] ?? 0) + 1;
        return {
          exercise_id: r.exercise.id,
          set_number: countByKey[key],
          reps: s.reps,
          weight_kg: s.weight_kg,
          side: s.side,
        };
      })
    );

    // Pas de réseau (typique en salle de sport) : on garde la séance en
    // local plutôt que de la perdre, elle sera synchronisée automatiquement
    // au retour de connexion (voir components/OfflineSync.tsx).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueSession({ date, time: time || null, notes: notes || null, duration_minutes: duration, feeling, sets: flatSets });
      setSaving(false);
      alert('Pas de réseau : séance enregistrée hors-ligne, elle sera synchronisée automatiquement dès que tu seras reconnecté.');
      router.push('/musculation');
      return;
    }

    // Détection de records : meilleur poids du jour vs meilleur poids déjà enregistré
    const exerciseIds = Array.from(new Set(flatSets.map((s) => s.exercise_id)));
    const { data: previousSets } = await supabase.from('strength_sets').select('exercise_id, weight_kg').in('exercise_id', exerciseIds);

    const previousMax: Record<string, number> = {};
    (previousSets ?? []).forEach((s: any) => {
      previousMax[s.exercise_id] = Math.max(previousMax[s.exercise_id] ?? 0, Number(s.weight_kg));
    });

    const exerciseNameById = new Map(results.map((r) => [r.exercise.id, r.exercise.name]));
    const newPRs: string[] = [];
    exerciseIds.forEach((exId) => {
      const todayMax = Math.max(...flatSets.filter((s) => s.exercise_id === exId).map((s) => s.weight_kg));
      const prevMax = previousMax[exId] ?? 0;
      if (todayMax > prevMax) {
        newPRs.push(`${exerciseNameById.get(exId)} : ${todayMax}kg${prevMax > 0 ? ` (précédent : ${prevMax}kg)` : ''}`);
      }
    });

    const { data: session, error } = await supabase
      .from('strength_sessions')
      .insert({ date, time: time || null, notes: notes || null, duration_minutes: duration, feeling })
      .select()
      .single();

    if (error || !session) {
      // Le réseau se dit "en ligne" mais la requête a quand même échoué
      // (signal instable, salle de sport) : on ne perd pas la séance.
      queueSession({ date, time: time || null, notes: notes || null, duration_minutes: duration, feeling, sets: flatSets });
      setSaving(false);
      alert("Connexion instable : séance enregistrée hors-ligne, elle sera synchronisée automatiquement.");
      router.push('/musculation');
      return;
    }

    const rows = flatSets.map((s) => ({ ...s, session_id: session.id }));
    const { error: setsError } = await supabase.from('strength_sets').insert(rows);

    if (setsError) {
      alert('Séance créée mais erreur sur les séries');
    }

    setSaving(false);

    if (newPRs.length > 0) {
      setPrList(newPRs);
    } else {
      router.push('/musculation');
    }
  }

  if (prList) {
    return (
      <div className="space-y-6 text-center pt-8">
        <PartyPopper className="mx-auto text-volt" size={48} />
        <h2 className="text-xl font-bold text-volt">
          Nouveau{prList.length > 1 ? 'x' : ''} record{prList.length > 1 ? 's' : ''} !
        </h2>
        <div className="card space-y-2 text-left">
          {prList.map((pr, i) => (
            <div key={i} className="text-sm flex items-center gap-2">
              <Trophy size={16} className="text-volt shrink-0" /> {pr}
            </div>
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
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Nouvelle séance de musculation</h2>
        <a href="/musculation/exercices" className="text-xs text-accent">
          + Exo manquant ?
        </a>
      </div>

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
      </div>

      {prefilling && <p className="text-neutral-500 text-sm">Reprise de la dernière séance...</p>}

      {blocks.map((b, i) => (
        <ExerciseBlockCard
          key={b.key}
          index={i}
          exercises={exercises}
          muscleNamesByExercise={muscleNamesByExercise}
          onExerciseAdded={onExerciseAdded}
          onRemove={() => removeBlock(b.key)}
          removable={blocks.length > 1}
          initialExercise={b.initialExercise}
          initialRows={b.initialRows}
          initialUnilateral={b.initialUnilateral}
          onStartRest={restTimer.start}
          ref={(el) => {
            blockRefs.current[b.key] = el;
          }}
        />
      ))}

      <button onClick={addBlock} className="w-full py-2 rounded-lg border border-dashed border-[#333] text-sm text-neutral-400 hover:text-accent hover:border-neutral-600">
        + Ajouter un exercice
      </button>

      <div className="card space-y-2">
        <label className="text-sm text-neutral-400">Ressenti de la séance</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setFeeling(n)}
              className={`flex-1 py-2 rounded text-sm ${feeling === n ? 'bg-accent text-white font-semibold' : 'border border-[#333] text-neutral-400'}`}
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

      <button onClick={saveSession} disabled={saving} className="btn-primary w-full">
        {saving ? 'Enregistrement...' : 'Enregistrer la séance'}
      </button>

      <RestTimerBar timer={restTimer} />
    </div>
  );
}
