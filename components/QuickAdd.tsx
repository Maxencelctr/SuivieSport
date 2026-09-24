'use client';

import { useState } from 'react';
import { Footprints, Utensils } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { guessCurrentMeal } from '@/lib/meals';

type Mode = 'run' | 'repas' | null;

export default function QuickAdd({ onSaved }: { onSaved?: () => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [saving, setSaving] = useState(false);

  const [distance, setDistance] = useState(5);
  const [minutes, setMinutes] = useState(25);

  const [foodName, setFoodName] = useState('');
  const [foodProtein, setFoodProtein] = useState(20);

  async function saveRun() {
    setSaving(true);
    await supabase.from('runs').insert({
      distance_km: distance,
      duration_seconds: minutes * 60,
      run_type: 'footing',
    });
    setSaving(false);
    setMode(null);
    onSaved?.();
  }

  async function saveFood() {
    if (!foodName.trim()) return;
    setSaving(true);
    await supabase.from('food_entries').insert({
      name: foodName.trim(),
      quantity_g: 100,
      protein_g: foodProtein,
      meal: guessCurrentMeal(),
    });
    setSaving(false);
    setFoodName('');
    setMode(null);
    onSaved?.();
  }

  if (mode === null) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => setMode('run')} className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
          <Footprints size={18} className="text-accent shrink-0" />
          <div className="text-sm font-medium">Run rapide</div>
        </button>
        <button onClick={() => setMode('repas')} className="card flex items-center gap-2.5 hover:border-neutral-600 transition">
          <Utensils size={18} className="text-accent shrink-0" />
          <div className="text-sm font-medium">Repas rapide</div>
        </button>
      </div>
    );
  }

  if (mode === 'run') {
    return (
      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium">Run rapide (footing)</span>
          <button onClick={() => setMode(null)} className="text-neutral-500 text-sm">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Distance (km)</label>
            <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} min={0} step={0.1} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Minutes</label>
            <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} min={0} />
          </div>
        </div>
        <button onClick={saveRun} disabled={saving} className="btn-primary w-full">
          {saving ? '...' : 'Enregistrer'}
        </button>
      </div>
    );
  }

  return (
    <div className="card space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">Repas rapide</span>
        <button onClick={() => setMode(null)} className="text-neutral-500 text-sm">✕</button>
      </div>
      <input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Nom de l'aliment" />
      <div>
        <label className="text-xs text-neutral-500">Protéines (g)</label>
        <input type="number" value={foodProtein} onChange={(e) => setFoodProtein(Number(e.target.value))} min={0} step={0.5} />
      </div>
      <button onClick={saveFood} disabled={saving || !foodName.trim()} className="btn-primary w-full">
        {saving ? '...' : 'Enregistrer'}
      </button>
    </div>
  );
}
