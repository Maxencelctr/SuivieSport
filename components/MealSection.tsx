'use client';

import { useState } from 'react';
import { Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CustomFood, FoodEntry, Meal, MealPreset } from '@/lib/types';
import { MEAL_ICONS, MEAL_LABELS } from '@/lib/meals';
import FoodPicker from './FoodPicker';
import SwipeToDelete from './SwipeToDelete';

interface MealSectionProps {
  meal: Meal;
  date: string;
  entries: FoodEntry[];
  customFoods: CustomFood[];
  onChange: () => void;
  presets: MealPreset[];
  onSavePreset: (name: string) => void;
  onLogPreset: (preset: MealPreset) => void;
  onDeletePreset: (presetId: string) => void;
}

export default function MealSection({
  meal,
  date,
  entries,
  customFoods,
  onChange,
  presets,
  onSavePreset,
  onLogPreset,
  onDeletePreset,
}: MealSectionProps) {
  const [adding, setAdding] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const MealIcon = MEAL_ICONS[meal];

  const protein = entries.reduce((s, e) => s + Number(e.protein_g), 0);
  const calories = entries.reduce((s, e) => s + (e.calories_kcal ? Number(e.calories_kcal) : 0), 0);

  async function deleteEntry(id: string) {
    await supabase.from('food_entries').delete().eq('id', id);
    onChange();
  }

  function handleSavePreset() {
    const name = prompt(`Nom de ce ${MEAL_LABELS[meal].toLowerCase()} habituel ?`, MEAL_LABELS[meal]);
    if (!name?.trim()) return;
    setSavingPreset(true);
    onSavePreset(name.trim());
    setTimeout(() => setSavingPreset(false), 500);
  }

  return (
    <div className="card space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MealIcon size={16} className="text-accent" />
          <span className="font-medium text-sm">{MEAL_LABELS[meal]}</span>
        </div>
        {entries.length > 0 && (
          <span className="text-xs text-neutral-500">
            {Math.round(protein)}g prot{calories ? ` · ${Math.round(calories)} kcal` : ''}
          </span>
        )}
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {presets.map((p) => (
            <div key={p.id} className="flex items-center gap-1 text-xs bg-[#0a0a0b] border border-[#26262a] rounded-full pl-2.5 pr-1 py-1">
              <button onClick={() => onLogPreset(p)} className="text-accent font-medium">
                + {p.name}
              </button>
              <button
                onClick={() => confirm(`Supprimer le repas habituel "${p.name}" ?`) && onDeletePreset(p.id)}
                className="text-neutral-600 hover:text-red-500 p-0.5"
                aria-label="Supprimer"
              >
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e) => (
            <SwipeToDelete key={e.id} onDelete={() => deleteEntry(e.id)}>
              <div className="flex justify-between items-center text-sm border-b border-[#262626] py-1 last:border-0 px-0.5 gap-2">
                <div className="min-w-0">
                  <div className="truncate">{e.name}</div>
                  <div className="text-xs text-neutral-500">
                    {e.quantity_g}g — {e.protein_g}g prot{e.calories_kcal ? ` — ${e.calories_kcal} kcal` : ''}
                  </div>
                </div>
                <button
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Supprimer"
                  className="shrink-0 p-1.5 text-neutral-500 hover:text-red-500"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </SwipeToDelete>
          ))}
          <button
            onClick={handleSavePreset}
            disabled={savingPreset}
            className="flex items-center gap-1 text-xs text-neutral-500 hover:text-volt pt-1"
          >
            <Star size={12} /> Enregistrer comme repas habituel
          </button>
        </div>
      )}

      {adding ? (
        <div className="space-y-2">
          <FoodPicker date={date} meal={meal} customFoods={customFoods} onAdded={onChange} />
          <button onClick={() => setAdding(false)} className="text-xs text-neutral-500 hover:text-neutral-300">
            ✕ Fermer
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-1.5 rounded-lg border border-dashed border-[#333] text-xs text-neutral-400 hover:text-accent hover:border-accent"
        >
          + Ajouter
        </button>
      )}
    </div>
  );
}
