'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Sex, ActivityLevel, NutritionGoal } from '@/lib/types';
import {
  computeBMR, computeTDEE, computeCalorieTarget, computeProteinTarget,
  ACTIVITY_LABELS, GOAL_LABELS,
} from '@/lib/nutrition';

export default function ProfilPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pseudo, setPseudo] = useState('');
  const [sex, setSex] = useState<Sex>('homme');
  const [age, setAge] = useState(20);
  const [height, setHeight] = useState(175);
  const [weight, setWeight] = useState(70);
  const [activity, setActivity] = useState<ActivityLevel>('modere');
  const [goal, setGoal] = useState<NutritionGoal>('maintien');

  useEffect(() => {
    supabase.from('profile').select('*').maybeSingle().then(({ data }) => {
      if (data) {
        if (data.pseudo) setPseudo(data.pseudo);
        if (data.sex) setSex(data.sex);
        if (data.age) setAge(data.age);
        if (data.height_cm) setHeight(Number(data.height_cm));
        if (data.weight_kg) setWeight(Number(data.weight_kg));
        if (data.activity_level) setActivity(data.activity_level);
        if (data.goal) setGoal(data.goal);
      }
      setLoading(false);
    });
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('profile').upsert({
      pseudo: pseudo.trim() || null,
      sex,
      age,
      height_cm: height,
      weight_kg: weight,
      activity_level: activity,
      goal,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (error) alert(error.message.includes('unique') ? 'Ce pseudo est déjà pris.' : "Erreur lors de l'enregistrement");
  }

  const bmr = computeBMR(sex, weight, height, age);
  const tdee = computeTDEE(bmr, activity);
  const calorieTarget = computeCalorieTarget(tdee, goal);
  const proteinTarget = computeProteinTarget(weight, goal);

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mon profil</h2>
        <Link href="/alimentation" className="text-sm text-neutral-400">← Alimentation</Link>
      </div>
      <p className="text-neutral-500 text-sm">
        Sert à calculer tes objectifs caloriques et protéiques (formule de Mifflin-St Jeor).
        Rien de médical, juste une base pour te situer.
      </p>

      <div className="card space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Pseudo</label>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} maxLength={24} placeholder="Affiché à tes amis" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Sexe</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as Sex)}>
              <option value="homme">Homme</option>
              <option value="femme">Femme</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Âge</label>
            <input type="number" value={age} onChange={(e) => setAge(Number(e.target.value))} min={10} max={100} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Taille (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} min={100} max={230} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Poids (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} min={30} max={250} step={0.5} />
            <Link href="/poids" className="text-xs text-accent">Suivre mon poids dans le temps →</Link>
            <div className="pt-1">
              <Link href="/sommeil" className="text-xs text-accent">Suivre mon sommeil →</Link>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Niveau d'activité</label>
          <select value={activity} onChange={(e) => setActivity(e.target.value as ActivityLevel)}>
            {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
              <option key={a} value={a}>{ACTIVITY_LABELS[a]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Objectif</label>
          <select value={goal} onChange={(e) => setGoal(e.target.value as NutritionGoal)}>
            {(Object.keys(GOAL_LABELS) as NutritionGoal[]).map((g) => (
              <option key={g} value={g}>{GOAL_LABELS[g]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="text-sm text-neutral-400 mb-1">Résultat calculé</div>
        <div className="flex justify-between"><span>Métabolisme de base</span><span>{Math.round(bmr)} kcal</span></div>
        <div className="flex justify-between"><span>Dépense totale/jour</span><span>{Math.round(tdee)} kcal</span></div>
        <div className="flex justify-between text-accent font-semibold"><span>Objectif calories/jour</span><span>{calorieTarget} kcal</span></div>
        <div className="flex justify-between text-accent font-semibold"><span>Objectif protéines/jour</span><span>{proteinTarget} g</span></div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? 'Enregistrement...' : 'Enregistrer mon profil'}
      </button>
    </div>
  );
}
