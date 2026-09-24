'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { SleepEntry } from '@/lib/types';
import { ChartDefs, chartGridProps, chartTooltipStyle, chartLineCursor } from '@/components/ChartTheme';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function SommeilPage() {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(todayISO());
  const [hours, setHours] = useState(7.5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase.from('sleep_entries').select('*').order('date');
    setEntries(data ?? []);
    setLoading(false);
  }

  async function addEntry() {
    setSaving(true);
    const { error } = await supabase.from('sleep_entries').upsert(
      { date, hours },
      { onConflict: 'date' }
    );
    setSaving(false);
    if (!error) await load();
  }

  async function deleteEntry(id: string) {
    if (!confirm('Supprimer cette entrée ?')) return;
    await supabase.from('sleep_entries').delete().eq('id', id);
    await load();
  }

  const chartData = useMemo(
    () => entries.slice(-30).map((e) => ({
      date: new Date(e.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
      heures: Number(e.hours),
    })),
    [entries]
  );

  const avg7 = useMemo(() => {
    const last7 = entries.slice(-7);
    if (last7.length === 0) return null;
    return Math.round((last7.reduce((s, e) => s + Number(e.hours), 0) / last7.length) * 10) / 10;
  }, [entries]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Sommeil</h2>
        <Link href="/insights" className="text-sm text-neutral-400">Insights →</Link>
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Date (nuit du...)</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Heures dormies</label>
            <input type="number" value={hours} onChange={(e) => setHours(Number(e.target.value))} min={0} max={16} step={0.5} />
          </div>
        </div>
        <button onClick={addEntry} disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>

      {avg7 !== null && (
        <div className="card text-center">
          <div className="text-2xl font-bold text-accent">{avg7}h</div>
          <div className="text-xs text-neutral-500">Moyenne des 7 derniers jours</div>
        </div>
      )}

      <div className="card">
        <div className="font-medium mb-3">Évolution (30 derniers jours)</div>
        {loading ? (
          <p className="text-neutral-500 text-sm">Chargement...</p>
        ) : chartData.length === 0 ? (
          <p className="text-neutral-500 text-sm">Aucune donnée pour l'instant.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <ChartDefs />
              <CartesianGrid {...chartGridProps} />
              <XAxis dataKey="date" stroke="#726b7d" fontSize={12} />
              <YAxis stroke="#726b7d" fontSize={12} domain={[0, 12]} />
              <Tooltip contentStyle={chartTooltipStyle} cursor={chartLineCursor} formatter={(v: number) => [`${v} h`, 'Sommeil']} />
              <Area type="monotone" dataKey="heures" stroke="#A78BFA" strokeWidth={2.5} fill="url(#fadeViolet)" dot={{ r: 3, fill: '#A78BFA' }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm text-neutral-400">Historique</h3>
          {[...entries].reverse().slice(0, 14).map((e) => (
            <div key={e.id} className="card flex justify-between items-center py-2">
              <span>{new Date(e.date).toLocaleDateString('fr-FR')}</span>
              <span className="text-accent">{e.hours}h</span>
              <button onClick={() => deleteEntry(e.id)} className="text-red-400/80 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
