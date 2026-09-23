'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { Run, StrengthSet, Exercise, FoodEntry, WaterEntry, Supplement, SupplementLog } from '@/lib/types';
import { RUN_TYPE_LABELS, WEATHER_LABELS, WEATHER_ICONS, formatPace } from '@/lib/running';
import { MEAL_ORDER, MEAL_LABELS } from '@/lib/meals';
import { Footprints, Dumbbell, Utensils } from 'lucide-react';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
}

// Renvoie la date (ISO) du lundi de la semaine contenant `dateStr`
function weekStartISO(dateStr: string) {
  const d = new Date(dateStr);
  const day = (d.getDay() + 6) % 7; // 0 = lundi
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

export default function StatsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [waterEntries, setWaterEntries] = useState<WaterEntry[]>([]);
  const [supplements, setSupplements] = useState<Supplement[]>([]);
  const [supplementLogs, setSupplementLogs] = useState<SupplementLog[]>([]);
  const [selectedExercise, setSelectedExercise] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const since = thirtyDaysAgo.toISOString().slice(0, 10);

      const [
        { data: runsData },
        { data: setsData },
        { data: exercisesData },
        { data: foodData },
        { data: waterData },
        { data: supplementsData },
        { data: supplementLogsData },
      ] = await Promise.all([
        supabase.from('runs').select('*').order('date'),
        supabase.from('strength_sets').select('*, strength_sessions(date)').order('created_at'),
        supabase.from('exercises').select('*').order('name'),
        supabase.from('food_entries').select('*').gte('date', since).order('date'),
        supabase.from('water_entries').select('*').gte('date', since).order('date'),
        supabase.from('supplements').select('*').order('name'),
        supabase.from('supplement_logs').select('*').gte('date', since),
      ]);
      setRuns(runsData ?? []);
      setSets((setsData as any) ?? []);
      setExercises(exercisesData ?? []);
      setFoodEntries(foodData ?? []);
      setWaterEntries(waterData ?? []);
      setSupplements(supplementsData ?? []);
      setSupplementLogs(supplementLogsData ?? []);
      if (exercisesData && exercisesData.length > 0) setSelectedExercise(exercisesData[0].id);
      setLoading(false);
    }
    load();
  }, []);

  // --- Course : distance par run ---
  const distanceData = useMemo(
    () => runs.map((r) => ({ date: fmtDate(r.date), distance: r.distance_km })),
    [runs]
  );

  // --- Course : cumul km par semaine ---
  const weeklyKmData = useMemo(() => {
    const byWeek: Record<string, number> = {};
    runs.forEach((r) => {
      const w = weekStartISO(r.date);
      byWeek[w] = (byWeek[w] || 0) + Number(r.distance_km);
    });
    return Object.entries(byWeek)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, km]) => ({ week: fmtDate(week), km: Math.round(km * 10) / 10 }));
  }, [runs]);

  // --- Course : allure moyenne par type de sortie ---
  const paceByType = useMemo(() => {
    const byType: Record<string, { totalPace: number; count: number }> = {};
    runs.forEach((r) => {
      const type = r.run_type ?? 'autre';
      if (!byType[type]) byType[type] = { totalPace: 0, count: 0 };
      byType[type].totalPace += r.avg_pace_seconds_per_km;
      byType[type].count += 1;
    });
    return Object.entries(byType).map(([type, { totalPace, count }]) => ({
      type,
      label: RUN_TYPE_LABELS[type] ?? type,
      avgPace: Math.round(totalPace / count),
      count,
    }));
  }, [runs]);

  // --- Course : allure moyenne par météo ---
  const paceByWeather = useMemo(() => {
    const byWeather: Record<string, { totalPace: number; count: number }> = {};
    runs.forEach((r) => {
      if (!r.weather) return;
      if (!byWeather[r.weather]) byWeather[r.weather] = { totalPace: 0, count: 0 };
      byWeather[r.weather].totalPace += r.avg_pace_seconds_per_km;
      byWeather[r.weather].count += 1;
    });
    return Object.entries(byWeather).map(([weather, { totalPace, count }]) => ({
      weather,
      label: WEATHER_LABELS[weather] ?? weather,
      avgPace: Math.round(totalPace / count),
      count,
    }));
  }, [runs]);

  // --- Muscu : progression poids max par exercice ---
  const maxWeightData = useMemo(() => {
    if (!selectedExercise) return [];
    const bySession: Record<string, number> = {};
    sets
      .filter((s: any) => s.exercise_id === selectedExercise && s.strength_sessions?.date)
      .forEach((s: any) => {
        const date = s.strength_sessions.date;
        bySession[date] = Math.max(bySession[date] || 0, Number(s.weight_kg));
      });
    return Object.entries(bySession)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, weight]) => ({ date: fmtDate(date), poids: weight }));
  }, [sets, selectedExercise]);

  // --- Muscu : répartition du volume par groupe musculaire ---
  const muscleGroupData = useMemo(() => {
    const exerciseGroup: Record<string, string> = {};
    exercises.forEach((e) => { exerciseGroup[e.id] = e.muscle_group; });
    const byGroup: Record<string, number> = {};
    sets.forEach((s: any) => {
      const group = exerciseGroup[s.exercise_id] ?? 'autre';
      byGroup[group] = (byGroup[group] || 0) + s.reps * Number(s.weight_kg);
    });
    return Object.entries(byGroup)
      .sort(([, a], [, b]) => b - a)
      .map(([group, volume]) => ({ group, volume: Math.round(volume) }));
  }, [sets, exercises]);

  // --- Nutrition : protéines + calories par jour (30 derniers jours) ---
  const proteinCalorieData = useMemo(() => {
    const byDay: Record<string, { protein: number; calories: number }> = {};
    foodEntries.forEach((f) => {
      if (!byDay[f.date]) byDay[f.date] = { protein: 0, calories: 0 };
      byDay[f.date].protein += Number(f.protein_g);
      byDay[f.date].calories += f.calories_kcal ? Number(f.calories_kcal) : 0;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: fmtDate(date), proteines: Math.round(v.protein), calories: Math.round(v.calories) }));
  }, [foodEntries]);

  // --- Nutrition : glucides + lipides par jour (30 derniers jours) ---
  const carbsFatData = useMemo(() => {
    const byDay: Record<string, { carbs: number; fat: number }> = {};
    foodEntries.forEach((f) => {
      if (!byDay[f.date]) byDay[f.date] = { carbs: 0, fat: 0 };
      byDay[f.date].carbs += f.carbs_g ? Number(f.carbs_g) : 0;
      byDay[f.date].fat += f.fat_g ? Number(f.fat_g) : 0;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date: fmtDate(date), glucides: Math.round(v.carbs), lipides: Math.round(v.fat) }));
  }, [foodEntries]);

  // --- Nutrition : répartition moyenne des calories par macro (30 derniers jours) ---
  const macroSplitData = useMemo(() => {
    const totals = foodEntries.reduce(
      (acc, f) => {
        acc.protein += Number(f.protein_g);
        acc.carbs += f.carbs_g ? Number(f.carbs_g) : 0;
        acc.fat += f.fat_g ? Number(f.fat_g) : 0;
        return acc;
      },
      { protein: 0, carbs: 0, fat: 0 }
    );
    const proteinKcal = totals.protein * 4;
    const carbsKcal = totals.carbs * 4;
    const fatKcal = totals.fat * 9;
    const sum = proteinKcal + carbsKcal + fatKcal;
    if (sum === 0) return [];
    return [
      { name: 'Protéines', value: Math.round((proteinKcal / sum) * 100), color: '#8B5CF6' },
      { name: 'Glucides', value: Math.round((carbsKcal / sum) * 100), color: '#3b82f6' },
      { name: 'Lipides', value: Math.round((fatKcal / sum) * 100), color: '#ec4899' },
    ];
  }, [foodEntries]);

  // --- Nutrition : hydratation par jour (30 derniers jours) ---
  const waterData = useMemo(() => {
    const byDay: Record<string, number> = {};
    waterEntries.forEach((w) => {
      byDay[w.date] = (byDay[w.date] || 0) + w.amount_ml;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, ml]) => ({ date: fmtDate(date), litres: Math.round((ml / 1000) * 100) / 100 }));
  }, [waterEntries]);

  // --- Nutrition : protéines totales par repas (30 derniers jours) ---
  const proteinByMealData = useMemo(() => {
    const byMeal: Record<string, number> = {};
    foodEntries.forEach((f) => {
      const key = f.meal ?? 'non_classe';
      byMeal[key] = (byMeal[key] ?? 0) + Number(f.protein_g);
    });
    return MEAL_ORDER.filter((m) => byMeal[m] > 0).map((m) => ({ meal: MEAL_LABELS[m], proteines: Math.round(byMeal[m]) }));
  }, [foodEntries]);

  // --- Nutrition : suivi des suppléments (30 derniers jours) ---
  const supplementAdherence = useMemo(() => {
    const periodDays = 30;
    return supplements.map((s) => {
      const count = supplementLogs.filter((l) => l.supplement_name === s.name).length;
      return { name: s.name, count, pct: Math.round((count / periodDays) * 100) };
    });
  }, [supplements, supplementLogs]);

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  const chartProps = { stroke: '#888', fontSize: 12 };
  const tooltipStyle = { backgroundColor: '#171717', border: '1px solid #262626', borderRadius: 8 };
  // Le curseur par défaut de Recharts au survol d'un BarChart est un gros
  // rectangle gris clair qui traverse tout le graphique — moche sur fond
  // sombre. On le remplace par une surbrillance discrète (LineChart : un
  // simple trait fin au lieu de l'épais trait par défaut).
  const barCursor = { fill: 'rgba(255,255,255,0.06)' };
  const lineCursor = { stroke: '#404040' };

  return (
    <div className="space-y-10">
      <h2 className="text-lg font-semibold">Statistiques</h2>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-400 uppercase tracking-wide">
          <Footprints size={16} /> Course
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="card">
            <div className="font-medium mb-3">Distance par sortie (km)</div>
            {distanceData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" {...chartProps} />
                  <YAxis {...chartProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={barCursor} formatter={(v: number) => [`${v} km`, 'Distance']} />
                  <Bar dataKey="distance" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-3">Kilomètres cumulés par semaine</div>
            {weeklyKmData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyKmData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="week" {...chartProps} />
                  <YAxis {...chartProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={barCursor} formatter={(v: number) => [`${v} km`, 'Cumul']} />
                  <Bar dataKey="km" fill="#ec4899" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {paceByType.length > 0 && (
            <div className="card">
              <div className="font-medium mb-3">Allure moyenne par type de sortie</div>
              <div className="space-y-2">
                {paceByType.map((t) => (
                  <div key={t.type} className="flex justify-between items-center text-sm">
                    <span>{t.label} <span className="text-neutral-500 text-xs">({t.count})</span></span>
                    <span className="text-pink-500">{formatPace(t.avgPace)} /km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {paceByWeather.length > 1 && (
            <div className="card">
              <div className="font-medium mb-3">Allure moyenne par météo</div>
              <div className="space-y-2">
                {paceByWeather.map((w) => {
                  const WIcon = WEATHER_ICONS[w.weather];
                  return (
                    <div key={w.weather} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-1.5">
                        {WIcon && <WIcon size={14} />} {w.label} <span className="text-neutral-500 text-xs">({w.count})</span>
                      </span>
                      <span className="text-pink-500">{formatPace(w.avgPace)} /km</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-400 uppercase tracking-wide">
          <Dumbbell size={16} /> Musculation
        </h3>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="card">
            <div className="flex justify-between items-center mb-3">
              <div className="font-medium">Progression poids max</div>
              <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} className="w-auto text-sm">
                {exercises.map((ex) => (
                  <option key={ex.id} value={ex.id}>{ex.name}</option>
                ))}
              </select>
            </div>
            {maxWeightData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de séries enregistrées pour cet exercice.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={maxWeightData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" {...chartProps} />
                  <YAxis {...chartProps} unit="kg" />
                  <Tooltip contentStyle={tooltipStyle} cursor={lineCursor} formatter={(v: number) => [`${v} kg`, 'Poids max']} />
                  <Line type="monotone" dataKey="poids" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium">Charge totale soulevée par groupe musculaire</div>
            <p className="text-xs text-neutral-500 mb-3">
              Répétitions × poids cumulés sur toutes les séances — plus la barre est longue, plus ce groupe a été sollicité.
            </p>
            {muscleGroupData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, muscleGroupData.length * 40)}>
                <BarChart data={muscleGroupData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" horizontal={false} />
                  <XAxis type="number" {...chartProps} unit="kg" />
                  <YAxis type="category" dataKey="group" {...chartProps} width={80} />
                  <Tooltip contentStyle={tooltipStyle} cursor={barCursor} formatter={(v: number) => [`${v} kg`, 'Charge totale']} />
                  <Bar dataKey="volume" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-neutral-400 uppercase tracking-wide">
          <Utensils size={16} /> Nutrition
        </h3>
        <div className="grid md:grid-cols-2 gap-4 items-start">
          <div className="card">
            <div className="font-medium mb-3">Protéines & calories par jour (30j)</div>
            {proteinCalorieData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={proteinCalorieData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" {...chartProps} />
                  <YAxis yAxisId="left" {...chartProps} unit="g" />
                  <YAxis yAxisId="right" orientation="right" {...chartProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={lineCursor} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line yAxisId="left" type="monotone" name="Protéines (g)" dataKey="proteines" stroke="#eab308" strokeWidth={2} dot={{ r: 3 }} />
                  <Line yAxisId="right" type="monotone" name="Calories" dataKey="calories" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-3">Glucides & lipides par jour (30j)</div>
            {carbsFatData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={carbsFatData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" {...chartProps} />
                  <YAxis {...chartProps} unit="g" />
                  <Tooltip contentStyle={tooltipStyle} cursor={lineCursor} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" name="Glucides (g)" dataKey="glucides" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" name="Lipides (g)" dataKey="lipides" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-3">Répartition moyenne des calories (30j)</div>
            {macroSplitData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={macroSplitData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name} ${value}%`}>
                    {macroSplitData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [`${v}%`, name]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-3">Hydratation par jour (30j)</div>
            {waterData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={waterData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" {...chartProps} />
                  <YAxis {...chartProps} unit="L" />
                  <Tooltip contentStyle={tooltipStyle} cursor={barCursor} formatter={(v: number) => [`${v} L`, 'Eau bue']} />
                  <Bar dataKey="litres" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card">
            <div className="font-medium mb-3">Protéines par repas (30j)</div>
            {proteinByMealData.length === 0 ? (
              <p className="text-neutral-500 text-sm">Pas encore de données.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={proteinByMealData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis type="number" {...chartProps} unit="g" />
                  <YAxis type="category" dataKey="meal" {...chartProps} width={130} />
                  <Tooltip contentStyle={tooltipStyle} cursor={barCursor} formatter={(v: number) => [`${v}g`, 'Protéines']} />
                  <Bar dataKey="proteines" fill="#eab308" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {supplementAdherence.length > 0 && (
            <div className="card">
              <div className="font-medium mb-3">Suivi des suppléments (30j)</div>
              <div className="space-y-3">
                {supplementAdherence.map((s) => (
                  <div key={s.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{s.name}</span>
                      <span className="text-neutral-400">{s.count}/30 jours</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-[#262626] overflow-hidden">
                      <div className="h-full bg-accent" style={{ width: `${Math.min(100, s.pct)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
