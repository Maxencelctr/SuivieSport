'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CustomFood } from '@/lib/types';

export default function AlimentsPage() {
  const [foods, setFoods] = useState<CustomFood[]>([]);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [refQuantity, setRefQuantity] = useState(50);
  const [protein, setProtein] = useState(10);
  const [calories, setCalories] = useState<number | ''>(200);
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('custom_foods').select('*').order('name');
    setFoods(data ?? []);
    setLoading(false);
  }

  function resetForm() {
    setName('');
    setRefQuantity(50);
    setProtein(10);
    setCalories(200);
    setCarbs('');
    setFat('');
    setEditingId(null);
  }

  function editFood(f: CustomFood) {
    setEditingId(f.id);
    setName(f.name);
    setRefQuantity(f.ref_quantity_g);
    setProtein(f.protein_g);
    setCalories(f.calories_kcal ?? '');
    setCarbs(f.carbs_g ?? '');
    setFat(f.fat_g ?? '');
  }

  async function save() {
    if (!name.trim() || refQuantity <= 0) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      ref_quantity_g: refQuantity,
      protein_g: protein,
      calories_kcal: calories === '' ? null : calories,
      carbs_g: carbs === '' ? null : carbs,
      fat_g: fat === '' ? null : fat,
    };

    const { error } = editingId
      ? await supabase.from('custom_foods').update(payload).eq('id', editingId)
      : await supabase.from('custom_foods').insert(payload);

    setSaving(false);
    if (!error) {
      resetForm();
      await load();
    }
  }

  async function deleteFood(id: string) {
    if (!confirm('Supprimer cet aliment de ta bibliothèque ?')) return;
    await supabase.from('custom_foods').delete().eq('id', id);
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Mes aliments</h2>
        <Link href="/alimentation" className="text-sm text-neutral-400">← Alimentation</Link>
      </div>
      <p className="text-neutral-500 text-sm">
        Saisis une fois les valeurs exactes de tes produits habituels (marque précise, barre
        protéinée, plat préparé...), tu les retrouveras ensuite en sélection rapide sur la page
        alimentation.
      </p>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">{editingId ? "Modifier l'aliment" : 'Ajouter un aliment'}</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Barre Myprotein chocolat" />
        <div>
          <label className="text-xs text-neutral-500">Pour cette quantité (g)</label>
          <input type="number" value={refQuantity} onChange={(e) => setRefQuantity(Number(e.target.value))} min={1} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Protéines (g)</label>
            <input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} min={0} step={0.1} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Calories (kcal)</label>
            <input type="number" value={calories} onChange={(e) => setCalories(e.target.value === '' ? '' : Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Glucides (g, optionnel)</label>
            <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Lipides (g, optionnel)</label>
            <input type="number" value={fat} onChange={(e) => setFat(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={!name.trim() || saving} className="btn-primary flex-1">
            {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : '+ Ajouter à ma bibliothèque'}
          </button>
          {editingId && (
            <button onClick={resetForm} className="px-4 rounded-lg border border-[#333] text-neutral-300 text-sm">
              Annuler
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm text-neutral-400">Ma bibliothèque ({foods.length})</h3>
        {loading && <p className="text-neutral-500 text-sm">Chargement...</p>}
        {!loading && foods.length === 0 && <p className="text-neutral-500 text-sm">Aucun aliment personnalisé pour l'instant.</p>}
        {foods.map((f) => (
          <div key={f.id} className="card flex justify-between items-center py-2">
            <div>
              <div className="text-sm">{f.name}</div>
              <div className="text-xs text-neutral-500">
                {f.ref_quantity_g}g — {f.protein_g}g protéines{f.calories_kcal ? ` — ${f.calories_kcal} kcal` : ''}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => editFood(f)} className="text-accent text-sm">Modifier</button>
              <button onClick={() => deleteFood(f.id)} className="text-red-400/80 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
