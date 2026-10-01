'use client';

import { useEffect, useState } from 'react';
import { Footprints } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/useToast';
import Toast from '@/components/Toast';
import { ChartDefs, chartAxisProps, chartTooltipStyle, chartBarCursor } from '@/components/ChartTheme';
import { StepEntry } from '@/lib/types';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PasPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepInput, setStepInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [goal, setGoal] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState('8000');
  const [history, setHistory] = useState<StepEntry[]>([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const since = new Date();
    since.setDate(since.getDate() - 6);
    const sinceStr = since.toISOString().slice(0, 10);

    const [{ data: entries }, { data: profile }] = await Promise.all([
      supabase.from('step_entries').select('*').gte('date', sinceStr).order('date'),
      supabase.from('profile').select('step_goal').maybeSingle(),
    ]);

    setHistory(entries ?? []);
    const today = (entries ?? []).find((e) => e.date === todayStr());
    setTodaySteps(today?.steps ?? 0);
    setStepInput(today?.steps ? String(today.steps) : '');
    if (profile?.step_goal) {
      setGoal(profile.step_goal);
      setGoalInput(String(profile.step_goal));
    }
    setLoading(false);
  }

  async function saveSteps() {
    const steps = Number(stepInput);
    if (!Number.isFinite(steps) || steps < 0) return;
    setSaving(true);
    const { error } = await supabase
      .from('step_entries')
      .upsert({ date: todayStr(), steps, source: 'manual' }, { onConflict: 'user_id,date' });
    setSaving(false);
    if (error) {
      alert(`Erreur : ${error.message}`);
      return;
    }
    setTodaySteps(steps);
    toast.trigger('Pas enregistrés');
    await load();
  }

  async function saveGoal() {
    const g = Number(goalInput);
    if (!Number.isFinite(g) || g <= 0) return;
    await supabase.from('profile').upsert({ step_goal: g });
    setGoal(g);
    toast.trigger('Objectif mis à jour');
  }

  const pct = goal ? Math.min(100, Math.round((todaySteps / goal) * 100)) : null;

  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().slice(0, 10);
    const entry = history.find((e) => e.date === dateStr);
    return { date: d.toLocaleDateString('fr-FR', { weekday: 'short' }), steps: entry?.steps ?? 0 };
  });

  if (loading) return <p className="text-neutral-500 text-sm">Chargement...</p>;

  return (
    <div className="space-y-6">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <ChartDefs />
      </svg>
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Footprints size={20} className="text-accent" /> Pas
      </h2>

      <div className="card space-y-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-neutral-500">Aujourd&apos;hui</div>
            <div className="stat-number text-3xl">{todaySteps.toLocaleString('fr-FR')}</div>
          </div>
          {goal && (
            <div className="text-right text-xs text-neutral-500">
              objectif {goal.toLocaleString('fr-FR')}
              <div className="stat-number text-accent text-sm">{pct}%</div>
            </div>
          )}
        </div>
        {goal && (
          <div className="h-2 rounded-full bg-[#262626] overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={stepInput}
            onChange={(e) => setStepInput(e.target.value)}
            placeholder="Nombre de pas aujourd'hui"
            className="flex-1"
          />
          <button onClick={saveSteps} disabled={saving || !stepInput} className="btn-primary px-4 shrink-0">
            {saving ? '...' : 'Enregistrer'}
          </button>
        </div>
        <p className="text-[11px] text-neutral-600">
          Saisie manuelle pour l&apos;instant (copie le total depuis l&apos;app Santé/Google Fit de ton téléphone).
        </p>
      </div>

      <div className="card space-y-3">
        <div className="font-medium text-sm">Objectif quotidien</div>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="numeric"
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
            className="flex-1"
          />
          <button onClick={saveGoal} disabled={!goalInput} className="btn-primary px-4 shrink-0">
            Définir
          </button>
        </div>
      </div>

      <div className="card">
        <div className="font-medium mb-3">7 derniers jours</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData}>
            <XAxis dataKey="date" {...chartAxisProps} />
            <YAxis {...chartAxisProps} />
            <Tooltip contentStyle={chartTooltipStyle} cursor={chartBarCursor} formatter={(v: number) => [`${v} pas`, 'Pas']} />
            <Bar dataKey="steps" fill="url(#gradLime)" radius={[6, 6, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <Toast message={toast.message} show={toast.show} />
    </div>
  );
}
