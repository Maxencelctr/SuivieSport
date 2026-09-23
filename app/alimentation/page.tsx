'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { FoodEntry, Profile, CustomFood, WaterEntry, Supplement, SupplementLog } from '@/lib/types';
import { computeBMR, computeTDEE, computeCalorieTarget, computeProteinTarget, computeMacroTargets } from '@/lib/nutrition';
import { COMMON_PROTEIN_FOODS, suggestedQuantity } from '@/lib/proteinSuggestions';
import { runningCalories, strengthCalories, DEFAULT_STRENGTH_DURATION_MIN } from '@/lib/calorieBurn';

interface SearchResult {
  off_code: string | null;
  name: string;
  brand: string | null;
  protein_100g: number;
  calories_100g: number | null;
  carbs_100g: number | null;
  fat_100g: number | null;
}

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AlimentationPage() {
  const [date, setDate] = useState(todayISO());
  const [entries, setEntries] = useState<FoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState(100);

  const [manualName, setManualName] = useState('');
  const [manualProtein, setManualProtein] = useState(0);
  const [manualQuantity, setManualQuantity] = useState(100);

  const [weekEntries, setWeekEntries] = useState<FoodEntry[]>([]);
  const [frequentFoods, setFrequentFoods] = useState<FoodEntry[]>([]);
  const [trainingBonus, setTrainingBonus] = useState(0);
  const [trainingLabel, setTrainingLabel] = useState<string | null>(null);

  const [customFoods, setCustomFoods] = useState<CustomFood[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [pickedCustom, setPickedCustom] = useState<CustomFood | null>(null);
  const [customQuantity, setCustomQuantity] = useState(0);

  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [customWater, setCustomWater] = useState(200);

  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);
  const [newSupplement, setNewSupplement] = useState('');

  useEffect(() => {
    loadEntries(date);
    loadSupplementLogs(date);
    // Détecte l'activité du jour pour ajuster l'objectif calorique, en se basant
    // sur le poids réel de la personne (formules ACSM) plutôt qu'un forfait fixe.
    Promise.all([
      supabase.from('strength_sessions').select('duration_minutes').eq('date', date),
      supabase.from('runs').select('distance_km, duration_seconds').eq('date', date),
      supabase.from('profile').select('weight_kg').eq('id', 1).maybeSingle(),
    ]).then(([{ data: sessions }, { data: runs }, { data: profileData }]) => {
      const weightKg = profileData?.weight_kg ? Number(profileData.weight_kg) : null;

      if (!weightKg) {
        setTrainingBonus(0);
        setTrainingLabel((sessions?.length || runs?.length) ? 'renseigne ton poids sur ton profil pour estimer les calories brûlées' : null);
        return;
      }

      let bonus = 0;
      (sessions ?? []).forEach((s) => {
        bonus += strengthCalories(weightKg, s.duration_minutes ?? DEFAULT_STRENGTH_DURATION_MIN);
      });
      (runs ?? []).forEach((r) => {
        bonus += runningCalories(weightKg, Number(r.distance_km), r.duration_seconds);
      });

      const muscuCount = sessions?.length ?? 0;
      const totalKm = (runs ?? []).reduce((s, r) => s + Number(r.distance_km), 0);
      const parts: string[] = [];
      if (muscuCount > 0) parts.push(`${muscuCount} séance${muscuCount > 1 ? 's' : ''} muscu`);
      if (totalKm > 0) parts.push(`${Math.round(totalKm * 10) / 10}km courus`);

      setTrainingBonus(Math.round(bonus));
      setTrainingLabel(parts.length > 0 ? parts.join(' + ') : null);
    });
  }, [date]);

  useEffect(() => {
    supabase.from('supplements').select('*').order('name').then(({ data }) => {
      setSupplements(data ?? []);
    });
  }, []);

  async function loadSupplementLogs(d: string) {
    const { data } = await supabase.from('supplement_logs').select('*').eq('date', d);
    setSupplementLogs(data ?? []);
  }

  async function toggleSupplement(name: string) {
    const existing = supplementLogs.find((l) => l.supplement_name === name);
    if (existing) {
      await supabase.from('supplement_logs').delete().eq('id', existing.id);
    } else {
      await supabase.from('supplement_logs').insert({ supplement_name: name, date });
    }
    await loadSupplementLogs(date);
  }

  async function addSupplement() {
    const name = newSupplement.trim();
    if (!name) return;
    const { error } = await supabase.from('supplements').insert({ name });
    if (!error) {
      setNewSupplement('');
      const { data } = await supabase.from('supplements').select('*').order('name');
      setSupplements(data ?? []);
    }
  }

  useEffect(() => {
    supabase.from('custom_foods').select('*').order('name').then(({ data }) => {
      setCustomFoods(data ?? []);
    });
  }, []);

  useEffect(() => {
    supabase.from('profile').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      setProfile(data);
    });
  }, []);

  useEffect(() => {
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceISO = since.toISOString().slice(0, 10);
    supabase.from('food_entries').select('*').gte('date', sinceISO).then(({ data }) => {
      setWeekEntries(data ?? []);
    });
  }, [entries]); // se rafraîchit aussi quand on ajoute/supprime une entrée du jour

  async function loadEntries(d: string) {
    setLoading(true);
    const { data } = await supabase.from('food_entries').select('*').eq('date', d).order('created_at');
    setEntries(data ?? []);
    const { data: waterData } = await supabase.from('water_entries').select('*').eq('date', d).order('created_at');
    setWaterEntries(waterData ?? []);
    setLoading(false);
  }

  async function addWater(ml: number) {
    if (ml <= 0) return;
    await supabase.from('water_entries').insert({ date, amount_ml: ml });
    await loadEntries(date);
  }

  async function deleteWater(id: string) {
    await supabase.from('water_entries').delete().eq('id', id);
    await loadEntries(date);
  }

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    setSearchError(null);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/food/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
        if (json.error) setSearchError(json.error);
      } catch {
        setSearchError('Recherche indisponible pour le moment.');
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [query]);

  async function addFromCustom() {
    if (!pickedCustom || customQuantity <= 0) return;
    const factor = customQuantity / pickedCustom.ref_quantity_g;
    await supabase.from('food_entries').insert({
      date,
      name: pickedCustom.name,
      quantity_g: customQuantity,
      protein_g: Math.round(pickedCustom.protein_g * factor * 10) / 10,
      calories_kcal: pickedCustom.calories_kcal ? Math.round(pickedCustom.calories_kcal * factor) : null,
      carbs_g: pickedCustom.carbs_g ? Math.round(pickedCustom.carbs_g * factor * 10) / 10 : null,
      fat_g: pickedCustom.fat_g ? Math.round(pickedCustom.fat_g * factor * 10) / 10 : null,
    });
    setPickedCustom(null);
    setCustomQuery('');
    setCustomQuantity(0);
    await loadEntries(date);
  }

  async function addFromSearch() {
    if (!picked || quantity <= 0) return;
    const factor = quantity / 100;
    const { error } = await supabase.from('food_entries').insert({
      date,
      name: picked.brand ? `${picked.name} (${picked.brand})` : picked.name,
      quantity_g: quantity,
      protein_g: Math.round(picked.protein_100g * factor * 10) / 10,
      calories_kcal: picked.calories_100g ? Math.round(picked.calories_100g * factor) : null,
      carbs_g: picked.carbs_100g ? Math.round(picked.carbs_100g * factor * 10) / 10 : null,
      fat_g: picked.fat_100g ? Math.round(picked.fat_100g * factor * 10) / 10 : null,
      off_code: picked.off_code,
    });
    if (!error) {
      setPicked(null);
      setQuery('');
      setResults([]);
      setQuantity(100);
      await loadEntries(date);
    }
  }

  async function addManual() {
    if (!manualName.trim() || manualQuantity <= 0) return;
    const { error } = await supabase.from('food_entries').insert({
      date,
      name: manualName.trim(),
      quantity_g: manualQuantity,
      protein_g: manualProtein,
    });
    if (!error) {
      setManualName('');
      setManualProtein(0);
      setManualQuantity(100);
      await loadEntries(date);
    }
  }

  useEffect(() => {
    // Aliments fréquents : les 200 dernières entrées, regroupées par nom, triées par fréquence
    supabase
      .from('food_entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        const byName = new Map<string, { entry: FoodEntry; count: number }>();
        (data ?? []).forEach((e) => {
          const existing = byName.get(e.name);
          if (existing) {
            existing.count += 1;
          } else {
            byName.set(e.name, { entry: e, count: 1 });
          }
        });
        const top = Array.from(byName.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map((x) => x.entry);
        setFrequentFoods(top);
      });
  }, []);

  async function addFrequent(food: FoodEntry) {
    await supabase.from('food_entries').insert({
      date,
      name: food.name,
      quantity_g: food.quantity_g,
      protein_g: food.protein_g,
      calories_kcal: food.calories_kcal,
      carbs_g: food.carbs_g,
      fat_g: food.fat_g,
      off_code: food.off_code,
    });
    await loadEntries(date);
  }

  async function addSuggestion(name: string, qty: number, protein: number, calories: number) {
    await supabase.from('food_entries').insert({
      date,
      name,
      quantity_g: qty,
      protein_g: protein,
      calories_kcal: calories,
    });
    await loadEntries(date);
  }

  async function deleteEntry(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    await supabase.from('food_entries').delete().eq('id', id);
    await loadEntries(date);
  }

  const totalProtein = entries.reduce((sum, e) => sum + Number(e.protein_g), 0);
  const totalCalories = entries.reduce((sum, e) => sum + (e.calories_kcal ? Number(e.calories_kcal) : 0), 0);
  const totalCarbs = entries.reduce((sum, e) => sum + (e.carbs_g ? Number(e.carbs_g) : 0), 0);
  const totalFat = entries.reduce((sum, e) => sum + (e.fat_g ? Number(e.fat_g) : 0), 0);

  let calorieTarget: number | null = null;
  let proteinTarget: number | null = null;
  let carbsTarget: number | null = null;
  let fatTarget: number | null = null;
  if (profile && profile.sex && profile.age && profile.height_cm && profile.weight_kg && profile.activity_level && profile.goal) {
    const bmr = computeBMR(profile.sex, profile.weight_kg, profile.height_cm, profile.age);
    const tdee = computeTDEE(bmr, profile.activity_level);
    calorieTarget = computeCalorieTarget(tdee, profile.goal) + trainingBonus;
    proteinTarget = computeProteinTarget(profile.weight_kg, profile.goal);
    const macros = computeMacroTargets(calorieTarget, proteinTarget);
    carbsTarget = macros.carbsG;
    fatTarget = macros.fatG;
  }

  // Résumé des 7 derniers jours (moyennes)
  const daysInWeek = new Set(weekEntries.map((e) => e.date)).size || 1;
  const weekAvgProtein = Math.round(weekEntries.reduce((s, e) => s + Number(e.protein_g), 0) / daysInWeek);
  const weekAvgCalories = Math.round(weekEntries.reduce((s, e) => s + (e.calories_kcal ? Number(e.calories_kcal) : 0), 0) / daysInWeek);

  const remainingProtein = proteinTarget ? Math.max(0, proteinTarget - totalProtein) : null;
  const totalWater = waterEntries.reduce((sum, w) => sum + w.amount_ml, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Alimentation</h2>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
      </div>

      {!calorieTarget && (
        <Link href="/profil" className="card block text-sm text-accent">
          Renseigne ton profil pour voir tes objectifs caloriques et protéiques personnalisés →
        </Link>
      )}

      <div className="card space-y-3">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-accent">{Math.round(totalProtein)}g</div>
            <div className="text-xs text-neutral-500">Protéines{proteinTarget ? ` / ${proteinTarget}g` : ''}</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{Math.round(totalCalories)}</div>
            <div className="text-xs text-neutral-500">kcal{calorieTarget ? ` / ${calorieTarget}` : ''}</div>
          </div>
        </div>
        {trainingLabel && trainingBonus > 0 && (
          <div className="text-xs text-amber-500 text-center">
            +{trainingBonus} kcal ajoutées aujourd'hui ({trainingLabel}) — estimation personnalisée à ton poids
          </div>
        )}
        {trainingLabel && trainingBonus === 0 && (
          <Link href="/profil" className="text-xs text-amber-500 text-center block">
            Activité détectée aujourd'hui — {trainingLabel} →
          </Link>
        )}
        {proteinTarget && (
          <div>
            <div className="h-2 rounded-full bg-[#262626] overflow-hidden">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.min(100, (totalProtein / proteinTarget) * 100)}%` }}
              />
            </div>
          </div>
        )}
        {calorieTarget && (
          <div>
            <div className="h-2 rounded-full bg-[#262626] overflow-hidden">
              <div
                className="h-full bg-yellow-500"
                style={{ width: `${Math.min(100, (totalCalories / calorieTarget) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {(carbsTarget || fatTarget) && (
          <div className="grid grid-cols-2 gap-3 pt-1">
            {carbsTarget && (
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Glucides</span><span>{Math.round(totalCarbs)}/{carbsTarget}g</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#262626] overflow-hidden">
                  <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (totalCarbs / carbsTarget) * 100)}%` }} />
                </div>
              </div>
            )}
            {fatTarget && (
              <div>
                <div className="flex justify-between text-xs text-neutral-500 mb-1">
                  <span>Lipides</span><span>{Math.round(totalFat)}/{fatTarget}g</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#262626] overflow-hidden">
                  <div className="h-full bg-pink-500" style={{ width: `${Math.min(100, (totalFat / fatTarget) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
        )}

        {calorieTarget && (
          <Link href="/profil" className="text-xs text-neutral-500 block text-right">Modifier mon profil</Link>
        )}
      </div>

      <div className="card">
        <div className="font-medium mb-2 text-sm">Moyenne des 7 derniers jours</div>
        <div className="flex justify-around text-center">
          <div>
            <div className="text-lg font-bold text-accent">{weekAvgProtein}g</div>
            <div className="text-xs text-neutral-500">Protéines/jour</div>
          </div>
          <div>
            <div className="text-lg font-bold">{weekAvgCalories}</div>
            <div className="text-xs text-neutral-500">kcal/jour</div>
          </div>
        </div>
      </div>

      {remainingProtein !== null && remainingProtein > 5 && (
        <div className="card space-y-2">
          <div className="text-sm text-neutral-400">
            Il te reste <span className="text-accent font-semibold">{Math.round(remainingProtein)}g</span> de protéines à manger aujourd'hui
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {COMMON_PROTEIN_FOODS.map((food) => {
              const qty = suggestedQuantity(food, remainingProtein);
              const protein = Math.round((food.proteinPer100g * qty) / 100 * 10) / 10;
              const calories = Math.round((food.caloriesPer100g * qty) / 100);
              return (
                <button
                  key={food.name}
                  onClick={() => addSuggestion(food.name, qty, protein, calories)}
                  className="shrink-0 text-left bg-[#0a0a0a] border border-[#262626] rounded-lg p-2 text-xs w-28"
                >
                  <div className="font-medium">{food.name}</div>
                  <div className="text-neutral-500">{qty}g</div>
                  <div className="text-accent">+{protein}g prot.</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {frequentFoods.length > 0 && (
        <div className="card space-y-2">
          <div className="text-sm text-neutral-400">Aliments fréquents</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {frequentFoods.map((food) => (
              <button
                key={food.id}
                onClick={() => addFrequent(food)}
                className="shrink-0 text-left bg-[#0a0a0a] border border-[#262626] rounded-lg p-2 text-xs w-32"
              >
                <div className="font-medium truncate">{food.name}</div>
                <div className="text-neutral-500">{food.quantity_g}g</div>
                <div className="text-accent">+{food.protein_g}g prot.</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-2">
        <div className="text-sm text-neutral-400">💊 Suppléments</div>
        <div className="space-y-1">
          {supplements.map((s) => {
            const taken = supplementLogs.some((l) => l.supplement_name === s.name);
            return (
              <button
                key={s.name}
                onClick={() => toggleSupplement(s.name)}
                className="w-full flex items-center justify-between py-1.5"
              >
                <span className={taken ? 'text-neutral-200' : 'text-neutral-500'}>{s.name}</span>
                <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${taken ? 'bg-accent border-accent text-black' : 'border-[#333]'}`}>
                  {taken ? '✓' : ''}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex gap-2 pt-1">
          <input
            value={newSupplement}
            onChange={(e) => setNewSupplement(e.target.value)}
            placeholder="Ajouter un supplément (ex: Oméga-3)"
            className="flex-1"
          />
          <button onClick={addSupplement} disabled={!newSupplement.trim()} className="px-3 rounded-lg border border-[#333] text-sm text-neutral-300">+</button>
        </div>
      </div>

      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <div className="text-sm text-neutral-400">💧 Hydratation</div>
          <div className="text-lg font-bold text-blue-400">{(totalWater / 1000).toFixed(2).replace(/\.?0+$/, '')}L</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => addWater(250)} className="flex-1 text-xs py-2 rounded border border-[#333] text-neutral-300">+25cl</button>
          <button onClick={() => addWater(500)} className="flex-1 text-xs py-2 rounded border border-[#333] text-neutral-300">+50cl</button>
          <button onClick={() => addWater(1000)} className="flex-1 text-xs py-2 rounded border border-[#333] text-neutral-300">+1L</button>
        </div>
        <div className="flex gap-2 items-center">
          <input type="number" value={customWater} onChange={(e) => setCustomWater(Number(e.target.value))} min={0} step={50} className="flex-1" />
          <button onClick={() => addWater(customWater)} className="px-3 py-1.5 rounded bg-accent text-black text-sm font-semibold">+ Ajouter</button>
        </div>
        {waterEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {waterEntries.map((w) => (
              <button
                key={w.id}
                onClick={() => deleteWater(w.id)}
                className="text-[10px] bg-[#0a0a0a] border border-[#262626] rounded-full px-2 py-0.5 text-neutral-400"
              >
                {w.amount_ml}ml ✕
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm text-neutral-400">Mes aliments</label>
          <Link href="/alimentation/aliments" className="text-xs text-accent">Gérer →</Link>
        </div>

        {customFoods.length === 0 ? (
          <p className="text-neutral-500 text-xs">
            Aucun aliment personnalisé. Ajoute tes produits habituels (marque précise) depuis "Gérer".
          </p>
        ) : (
          <>
            <input
              value={customQuery}
              onChange={(e) => { setCustomQuery(e.target.value); setPickedCustom(null); }}
              placeholder="Filtrer mes aliments..."
            />
            {!pickedCustom && (
              <div className="space-y-1 max-h-56 overflow-y-auto">
                {customFoods
                  .filter((f) => f.name.toLowerCase().includes(customQuery.toLowerCase()))
                  .map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setPickedCustom(f); setCustomQuantity(f.ref_quantity_g); }}
                      className="w-full text-left border-b border-[#262626] py-2 last:border-0"
                    >
                      <div className="font-medium text-sm">{f.name}</div>
                      <div className="text-xs text-neutral-500">{f.protein_g}g protéines / {f.ref_quantity_g}g</div>
                    </button>
                  ))}
              </div>
            )}
            {pickedCustom && (
              <div className="space-y-2 pt-2 border-t border-[#262626]">
                <div className="font-medium text-sm">{pickedCustom.name}</div>
                <label className="text-xs text-neutral-500">Quantité mangée (g)</label>
                <input type="number" value={customQuantity} onChange={(e) => setCustomQuantity(Number(e.target.value))} min={1} />
                <div className="text-sm text-accent">
                  = {Math.round(pickedCustom.protein_g * (customQuantity / pickedCustom.ref_quantity_g) * 10) / 10}g de protéines
                </div>
                <button onClick={addFromCustom} className="btn-primary w-full">+ Ajouter</button>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">Rechercher un aliment (Open Food Facts)</label>
        <input value={query} onChange={(e) => { setQuery(e.target.value); setPicked(null); }} placeholder="Ex: blanc de poulet, riz, whey..." />
        {searching && <p className="text-neutral-500 text-sm">Recherche...</p>}
        {searchError && <p className="text-amber-500 text-sm">{searchError} — utilise la saisie manuelle en bas.</p>}

        {!picked && results.length > 0 && (
          <div className="space-y-1 max-h-64 overflow-y-auto">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => setPicked(r)}
                className="w-full text-left border-b border-[#262626] py-2 last:border-0"
              >
                <div className="font-medium text-sm">{r.name}{r.brand ? ` — ${r.brand}` : ''}</div>
                <div className="text-xs text-neutral-500">{r.protein_100g}g protéines / 100g</div>
              </button>
            ))}
          </div>
        )}

        {picked && (
          <div className="space-y-2 pt-2 border-t border-[#262626]">
            <div className="font-medium text-sm">{picked.name}</div>
            <label className="text-xs text-neutral-500">Quantité (g)</label>
            <input type="number" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} min={1} />
            <div className="text-sm text-accent">
              = {Math.round(picked.protein_100g * (quantity / 100) * 10) / 10}g de protéines
            </div>
            <button onClick={addFromSearch} className="btn-primary w-full">+ Ajouter</button>
          </div>
        )}
      </div>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">Ou saisie manuelle</label>
        <input value={manualName} onChange={(e) => setManualName(e.target.value)} placeholder="Nom de l'aliment" />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Quantité (g)</label>
            <input type="number" value={manualQuantity} onChange={(e) => setManualQuantity(Number(e.target.value))} min={1} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Protéines (g) pour cette quantité</label>
            <input type="number" value={manualProtein} onChange={(e) => setManualProtein(Number(e.target.value))} min={0} step={0.5} />
          </div>
        </div>
        <button onClick={addManual} disabled={!manualName.trim()} className="btn-primary w-full">+ Ajouter manuellement</button>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm text-neutral-400">Repas du jour ({entries.length})</h3>
        {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
        {!loading && entries.length === 0 && <p className="text-neutral-500 text-sm">Rien enregistré pour cette date.</p>}
        {entries.map((e) => (
          <div key={e.id} className="card flex justify-between items-center py-2">
            <div>
              <div className="text-sm">{e.name}</div>
              <div className="text-xs text-neutral-500">{e.quantity_g}g — {e.protein_g}g protéines{e.calories_kcal ? ` — ${e.calories_kcal} kcal` : ''}</div>
            </div>
            <button onClick={() => deleteEntry(e.id)} className="text-neutral-500 text-sm">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}
