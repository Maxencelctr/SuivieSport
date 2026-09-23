'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Goal } from '@/lib/types';

export default function ObjectifsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('km');
  const [startValue, setStartValue] = useState(0);
  const [targetValue, setTargetValue] = useState(10);
  const [targetDate, setTargetDate] = useState('');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
    setGoals(data ?? []);
    setLoading(false);
  }

  async function addGoal() {
    if (!title.trim()) return;
    const { error } = await supabase.from('goals').insert({
      title: title.trim(),
      unit,
      start_value: startValue,
      target_value: targetValue,
      current_value: startValue,
      target_date: targetDate || null,
    });
    if (!error) {
      setTitle('');
      setStartValue(0);
      setTargetValue(10);
      setTargetDate('');
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

  function progress(g: Goal) {
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

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Objectifs</h2>

      <div className="card space-y-3">
        <div>
          <label className="text-sm text-neutral-400">Nouvel objectif</label>
          <p className="text-xs text-neutral-500 mt-0.5">
            Suis une progression entre une valeur de départ et une valeur à atteindre — ex: "Semi-marathon" de 0 à 21km,
            ou "Développé couché" de 60 à 100kg.
          </p>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Semi-marathon, Développé couché 100kg..." />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-neutral-500">Valeur de départ</label>
            <input type="number" value={startValue} onChange={(e) => setStartValue(Number(e.target.value))} />
            <p className="text-[10px] text-neutral-600 mt-0.5">Ton niveau actuel</p>
          </div>
          <div>
            <label className="text-xs text-neutral-500">Valeur cible</label>
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
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          <p className="text-[10px] text-neutral-600 mt-0.5">Pour afficher un compte à rebours (J-XX)</p>
        </div>
        <button onClick={addGoal} disabled={!title.trim()} className="btn-primary w-full">+ Ajouter l'objectif</button>
      </div>

      <div className="space-y-3">
        {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
        {!loading && goals.length === 0 && <p className="text-neutral-500 text-sm">Aucun objectif pour l'instant.</p>}

        {goals.map((g) => (
          <div key={g.id} className="card space-y-2">
            <div className="flex justify-between items-center">
              <div className="font-medium">{g.title}</div>
              <button onClick={() => deleteGoal(g.id)} className="text-neutral-500 text-sm">✕</button>
            </div>
            {g.target_date && (() => {
              const days = daysRemaining(g.target_date);
              return (
                <div className={`text-xs font-semibold ${days < 0 ? 'text-neutral-500' : days <= 7 ? 'text-red-500' : 'text-accent'}`}>
                  {days < 0 ? 'Date dépassée' : days === 0 ? "Aujourd'hui !" : `J-${days}`}
                </div>
              );
            })()}
            <div className="h-3 rounded-full bg-[#262626] overflow-hidden">
              <div className="h-full bg-accent transition-all" style={{ width: `${progress(g)}%` }} />
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
        ))}
      </div>
    </div>
  );
}
