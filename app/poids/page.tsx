'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { WeightEntry } from '@/lib/types';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function PoidsPage() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState(70);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('weight_entries').select('*').order('date');
    setEntries(data ?? []);
    if (data && data.length > 0) setWeight(Number(data[data.length - 1].weight_kg));
    setLoading(false);
  }

  async function addEntry() {
    setSaving(true);
    // On upsert sur la date pour éviter les doublons si on corrige la pesée du jour
    const { error } = await supabase.from('weight_entries').upsert(
      { date, weight_kg: weight },
      { onConflict: 'date' }
    );

    if (!error) {
      // Synchronise automatiquement le profil avec le dernier poids connu,
      // pour que les objectifs caloriques/protéines restent à jour sans ressaisie.
      await supabase.from('profile').upsert({ id: 1, weight_kg: weight, updated_at: new Date().toISOString() });
      await load();
    }
    setSaving(false);
  }

  async function deleteEntry(id: string) {
    if (!confirm('Supprimer cette pesée ?')) return;
    await supabase.from('weight_entries').delete().eq('id', id);
    await load();
  }

  const chartData = useMemo(
    () => entries.map((e) => ({
      date: new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      poids: Number(e.weight_kg),
    })),
    [entries]
  );

  const latest = entries[entries.length - 1];
  const first = entries[0];
  const diff = latest && first ? Math.round((Number(latest.weight_kg) - Number(first.weight_kg)) * 10) / 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Poids de corps</h2>
        <Link href="/profil" className="text-sm text-neutral-400">Profil →</Link>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Poids (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(Number(e.target.value))} min={30} max={250} step={0.1} />
          </div>
        </div>
        <button onClick={addEntry} disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement...' : 'Enregistrer la pesée'}
        </button>
        <p className="text-xs text-neutral-500">
          Ton profil (objectifs caloriques/protéines) se met à jour automatiquement avec cette valeur.
        </p>
      </div>

      {!loading && entries.length > 0 && (
        <div className="card flex justify-around text-center">
          <div>
            <div className="text-xl font-bold text-accent">{latest ? Number(latest.weight_kg) : '—'}kg</div>
            <div className="text-xs text-neutral-500">Dernier relevé</div>
          </div>
          <div>
            <div className={`text-xl font-bold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-accent' : ''}`}>
              {diff > 0 ? '+' : ''}{diff}kg
            </div>
            <div className="text-xs text-neutral-500">Depuis le premier relevé</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="font-medium mb-3">Évolution</div>
        {loading ? (
          <p className="text-neutral-500 text-sm">Chargement...</p>
        ) : chartData.length === 0 ? (
          <p className="text-neutral-500 text-sm">Aucune pesée enregistrée pour l'instant.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis dataKey="date" stroke="#888" fontSize={12} />
              <YAxis stroke="#888" fontSize={12} domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #262626' }} />
              <Line type="monotone" dataKey="poids" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-neutral-400">Historique</h3>
          {[...entries].reverse().map((e) => (
            <div key={e.id} className="card flex justify-between items-center py-2">
              <span>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
              <span className="text-accent">{Number(e.weight_kg)}kg</span>
              <button onClick={() => deleteEntry(e.id)} className="text-neutral-500 text-sm">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
