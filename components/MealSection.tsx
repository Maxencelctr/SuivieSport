'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomFood, FoodEntry, Meal } from '@/lib/types';
import { MEAL_ICONS, MEAL_LABELS } from '@/lib/meals';
import FoodPicker from './FoodPicker';

interface MealSectionProps {
  meal: Meal;
  date: string;
  entries: FoodEntry[];
  customFoods: CustomFood[];
  onChange: () => void;
}

export default function MealSection({ meal, date, entries, customFoods, onChange }: MealSectionProps) {
  const [adding, setAdding] = useState(false);
  const MealIcon = MEAL_ICONS[meal];

  const protein = entries.reduce((s, e) => s + Number(e.protein_g), 0);
  const calories = entries.reduce((s, e) => s + (e.calories_kcal ? Number(e.calories_kcal) : 0), 0);

  async function deleteEntry(id: string) {
    await supabase.from('food_entries').delete().eq('id', id);
    onChange();
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

      {entries.length > 0 && (
        <div className="space-y-1">
          {entries.map((e) => (
            <div key={e.id} className="flex justify-between items-center text-sm border-b border-[#262626] py-1 last:border-0">
              <div>
                <div>{e.name}</div>
                <div className="text-xs text-neutral-500">
                  {e.quantity_g}g — {e.protein_g}g prot{e.calories_kcal ? ` — ${e.calories_kcal} kcal` : ''}
                </div>
              </div>
              <button onClick={() => deleteEntry(e.id)} className="text-neutral-500 text-sm shrink-0 ml-2">
                ✕
              </button>
            </div>
          ))}
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
