'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RUN_TYPE_LABELS } from '@/lib/running';

export default function EditRunPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [distance, setDistance] = useState(5);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [runType, setRunType] = useState('footing');
  const [elevation, setElevation] = useState<number | ''>('');
  const [weather, setWeather] = useState('');
  const [feeling, setFeeling] = useState('moyen');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('runs').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        setDate(data.date);
        setDistance(Number(data.distance_km));
        setMinutes(Math.floor(data.duration_seconds / 60));
        setSeconds(data.duration_seconds % 60);
        setRunType(data.run_type ?? 'footing');
        setElevation(data.elevation_gain_m ?? '');
        setWeather(data.weather ?? '');
        setFeeling(data.feeling ?? 'moyen');
        setNotes(data.notes ?? '');
      }
      setLoading(false);
    });
  }, [id]);

  const totalSeconds = minutes * 60 + seconds;
  const paceSecondsPerKm = distance > 0 ? Math.round(totalSeconds / distance) : 0;
  const paceMin = Math.floor(paceSecondsPerKm / 60);
  const paceSec = paceSecondsPerKm % 60;

  async function saveRun() {
    setSaving(true);
    const { error } = await supabase.from('runs').update({
      date,
      distance_km: distance,
      duration_seconds: totalSeconds,
      run_type: runType,
      elevation_gain_m: elevation === '' ? null : elevation,
      weather: weather || null,
      feeling,
      notes: notes || null,
    }).eq('id', id);
    setSaving(false);
    if (error) {
      alert('Erreur lors de la mise à jour');
      return;
    }
    router.push('/course');
  }

  async function deleteRun() {
    if (!confirm('Supprimer ce run ?')) return;
    await supabase.from('runs').delete().eq('id', id);
    router.push('/course');
  }

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Modifier le run</h2>

      <div className="card space-y-3">
        <div>
          <label className="text-xs text-neutral-500">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Type de sortie</label>
          <select value={runType} onChange={(e) => setRunType(e.target.value)}>
            {Object.entries(RUN_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Distance (km)</label>
          <input type="number" value={distance} onChange={(e) => setDistance(Number(e.target.value))} min={0} step={0.1} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Dénivelé D+ (m, optionnel)</label>
          <input type="number" value={elevation} onChange={(e) => setElevation(e.target.value === '' ? '' : Number(e.target.value))} min={0} />
        </div>
        <div>
          <label className="text-xs text-neutral-500">Météo (optionnel)</label>
          <select value={weather} onChange={(e) => setWeather(e.target.value)}>
            <option value="">Non renseignée</option>
            <option value="soleil">☀️ Soleil</option>
            <option value="pluie">🌧️ Pluie</option>
            <option value="froid">🥶 Froid</option>
            <option value="chaud">🥵 Chaud</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Minutes</label>
            <input type="number" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Secondes</label>
            <input type="number" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} min={0} max={59} />
          </div>
        </div>
        <div className="text-center text-accent font-medium">
          Allure : {paceMin}:{paceSec.toString().padStart(2, '0')} /km
        </div>
        <div>
          <label className="text-xs text-neutral-500">Ressenti</label>
          <select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="dur">Dur</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </div>

      <div className="space-y-2">
        <button onClick={saveRun} disabled={saving} className="btn-primary w-full">
          {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
        </button>
        <button onClick={deleteRun} className="w-full text-center text-red-500 text-sm py-2">
          Supprimer ce run
        </button>
      </div>
    </div>
  );
}
