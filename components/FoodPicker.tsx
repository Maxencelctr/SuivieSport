'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CustomFood, Meal } from '@/lib/types';

interface OffResult {
  off_code: string | null;
  name: string;
  brand: string | null;
  protein_100g: number;
  calories_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
}

type Picked = { kind: 'custom'; food: CustomFood } | { kind: 'off'; food: OffResult };

interface FoodPickerProps {
  date: string;
  meal: Meal;
  customFoods: CustomFood[];
  onAdded: () => void;
}

// Recherche d'aliment pour un créneau de repas donné : cherche à la fois
// dans "mes aliments" (bibliothèque perso, instantané) et sur Open Food
// Facts (réseau, débounce), sur le même principe que ExercisePicker. Une
// fois un résultat choisi, ajuste la quantité puis enregistre directement
// dans food_entries avec le repas et la date passés en props.
export default function FoodPicker({ date, meal, customFoods, onAdded }: FoodPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [offResults, setOffResults] = useState<OffResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [picked, setPicked] = useState<Picked | null>(null);
  const [quantity, setQuantity] = useState(100);
  const [saving, setSaving] = useState(false);

  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState(100);
  const [manualProtein, setManualProtein] = useState(0);

  useEffect(() => {
    if (query.trim().length < 2) {
      setOffResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setOffResults(json.results ?? []);
        if (json.error) setSearchError(json.error);
      } catch {
        setSearchError('Recherche indisponible.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  const needle = query.trim().toLowerCase();
  const customMatches = needle.length >= 1 ? customFoods.filter((f) => f.name.toLowerCase().includes(needle)) : [];

  function selectCustom(food: CustomFood) {
    setPicked({ kind: 'custom', food });
    setQuantity(food.ref_quantity_g);
    setOpen(false);
  }

  function selectOff(food: OffResult) {
    setPicked({ kind: 'off', food });
    setQuantity(100);
    setOpen(false);
  }

  function preview() {
    if (!picked) return null;
    if (picked.kind === 'custom') {
      const factor = quantity / picked.food.ref_quantity_g;
      return {
        protein: Math.round(picked.food.protein_g * factor * 10) / 10,
        calories: picked.food.calories_kcal ? Math.round(picked.food.calories_kcal * factor) : null,
        carbs: picked.food.carbs_g ? Math.round(picked.food.carbs_g * factor * 10) / 10 : null,
        fat: picked.food.fat_g ? Math.round(picked.food.fat_g * factor * 10) / 10 : null,
      };
    }
    const factor = quantity / 100;
    return {
      protein: Math.round(picked.food.protein_100g * factor * 10) / 10,
      calories: picked.food.calories_100g ? Math.round(picked.food.calories_100g * factor) : null,
      carbs: picked.food.carbs_100g ? Math.round(picked.food.carbs_100g * factor * 10) / 10 : null,
      fat: picked.food.fat_100g ? Math.round(picked.food.fat_100g * factor * 10) / 10 : null,
    };
  }

  async function confirmAdd() {
    if (!picked || quantity <= 0) return;
    const p = preview();
    if (!p) return;
    setSaving(true);
    const name =
      picked.kind === 'custom' ? picked.food.name : picked.food.brand ? `${picked.food.name} (${picked.food.brand})` : picked.food.name;
    await supabase.from('food_entries').insert({
      date,
      meal,
      name,
      quantity_g: quantity,
      protein_g: p.protein,
      calories_kcal: p.calories,
      carbs_g: p.carbs,
      fat_g: p.fat,
      off_code: picked.kind === 'off' ? picked.food.off_code : null,
    });
    setSaving(false);
    setPicked(null);
    setQuery('');
    setQuantity(100);
    onAdded();
  }

  async function confirmManual() {
    if (!manualName.trim() || manualQuantity <= 0) return;
    setSaving(true);
    await supabase.from('food_entries').insert({
      date,
      meal,
      name: manualName.trim(),
      quantity_g: manualQuantity,
      protein_g: manualProtein,
    });
    setSaving(false);
    setManualName('');
    setManualQuantity(100);
    setManualProtein(0);
    setManualOpen(false);
    onAdded();
  }

  const showDropdown = open && needle.length >= 1 && (customMatches.length > 0 || offResults.length > 0 || searching);

  if (picked) {
    const p = preview()!;
    return (
      <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div className="font-medium text-sm">{picked.kind === 'custom' ? picked.food.name : picked.food.name}</div>
          <button onClick={() => setPicked(null)} className="text-xs text-neutral-500 shrink-0">
            Annuler
          </button>
        </div>
        <label className="text-xs text-neutral-500">Quantité (g)</label>
        <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
        <div className="text-xs text-accent">
          = {p.protein}g protéines{p.calories ? ` · ${p.calories} kcal` : ''}
          {p.carbs ? ` · ${p.carbs}g glucides` : ''}
          {p.fat ? ` · ${p.fat}g lipides` : ''}
        </div>
        <button onClick={confirmAdd} disabled={saving} className="btn-primary w-full">
          {saving ? 'Ajout...' : '+ Ajouter'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Rechercher un aliment (poulet, riz, whey...)"
        />
        {searchError && <p className="text-amber-500 text-xs mt-1">{searchError}</p>}
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-[#141414] border border-[#333] rounded-lg max-h-64 overflow-y-auto">
            {customMatches.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase text-neutral-500">Tes aliments</div>
                {customMatches.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onMouseDown={() => selectCustom(f)}
                    className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] flex justify-between items-center gap-3"
                  >
                    <span>{f.name}</span>
                    <span className="text-xs text-neutral-500 shrink-0">{f.protein_g}g prot / {f.ref_quantity_g}g</span>
                  </button>
                ))}
              </div>
            )}
            {offResults.length > 0 && (
              <div>
                <div className="px-3 pt-2 pb-1 text-[10px] uppercase text-neutral-500">Open Food Facts</div>
                {offResults.map((r, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => selectOff(r)}
                    className="w-full text-left px-3 py-2 hover:bg-[#1f1f1f] flex justify-between items-center gap-3"
                  >
                    <span>
                      {r.name}
                      {r.brand ? <span className="text-neutral-500"> — {r.brand}</span> : ''}
                    </span>
                    <span className="text-xs text-accent shrink-0">{r.protein_100g}g/100g</span>
                  </button>
                ))}
              </div>
            )}
            {searching && <div className="px-3 py-2 text-xs text-neutral-500">Recherche...</div>}
          </div>
        )}
      </div>

      {!manualOpen ? (
        <button onClick={() => setManualOpen(true)} className="text-xs text-neutral-500 hover:text-accent">
          Aliment introuvable ? Ajouter manuellement
        </button>
      ) : (
        <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 space-y-2">
          <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nom de l'aliment" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-500">Quantité (g)</label>
              <input type="number" value={manualQuantity} onChange={(e) => setManualQuantity(Number(e.target.value))} min={1} />
            </div>
            <div>
              <label className="text-[10px] text-neutral-500">Protéines (g)</label>
              <input type="number" value={manualProtein} onChange={(e) => setManualProtein(Number(e.target.value))} min={0} step={0.5} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setManualOpen(false)} className="flex-1 text-xs py-1.5 rounded border border-[#333] text-neutral-300">
              Annuler
            </button>
            <button onClick={confirmManual} disabled={!manualName.trim() || saving} className="flex-1 btn-primary text-sm py-1.5">
              {saving ? 'Ajout...' : '+ Ajouter'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
