'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RUN_TYPE_LABELS, formatPace } from '@/lib/running';

export default function NouveauRunPage() {
  const router = useRouter();
  const [distance, setDistance] = useState(5);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [runType, setRunType] = useState('footing');
  const [elevation, setElevation] = useState<number | ''>('');
  const [weather, setWeather] = useState('');
  const [feeling, setFeeling] = useState('moyen');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastSameType, setLastSameType] = useState<{ distance_km: number; avg_pace_seconds_per_km: number; date: string } | null>(null);

  const totalSeconds = minutes * 60 + seconds;
  const paceSecondsPerKm = distance > 0 ? Math.round(totalSeconds / distance) : 0;
  const paceMin = Math.floor(paceSecondsPerKm / 60);
  const paceSec = paceSecondsPerKm % 60;

  // À chaque changement de type, va chercher la dernière sortie du même type pour comparaison
  useEffect(() => {
    supabase
      .from('runs')
      .select('distance_km, avg_pace_seconds_per_km, date')
      .eq('run_type', runType)
      .order('date', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        setLastSameType(data && data.length > 0 ? data[0] : null);
      });
  }, [runType]);

  const paceDelta = lastSameType ? paceSecondsPerKm - lastSameType.avg_pace_seconds_per_km : null;
  const distanceDelta = lastSameType ? Math.round((distance - lastSameType.distance_km) * 10) / 10 : null;

  async function saveRun() {
    setSaving(true);
    const { error } = await supabase.from('runs').insert({
      distance_km: distance,
      duration_seconds: totalSeconds,
      run_type: runType,
      elevation_gain_m: elevation === '' ? null : elevation,
      weather: weather || null,
      feeling,
      notes: notes || null,
    });
    setSaving(false);
    if (error) {
      alert("Erreur lors de l'enregistrement du run");
      return;
    }
    router.push('/course');
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Nouveau run</h2>

      <div className="card space-y-3">
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

        {lastSameType && (
          <div className="bg-[#0a0a0a] border border-[#262626] rounded-lg p-3 text-xs space-y-1">
            <div className="text-neutral-400">
              Dernier {RUN_TYPE_LABELS[runType].toLowerCase()} ({new Date(lastSameType.date).toLocaleDateString('fr-FR')}) :
              {' '}{lastSameType.distance_km}km à {formatPace(lastSameType.avg_pace_seconds_per_km)}/km
            </div>
            {paceDelta !== null && distanceDelta !== null && (
              <div className={paceDelta < 0 ? 'text-accent' : paceDelta > 0 ? 'text-amber-500' : 'text-neutral-400'}>
                {paceDelta < 0 ? `${Math.abs(paceDelta)}s/km plus rapide` : paceDelta > 0 ? `${paceDelta}s/km plus lent` : 'Même allure'}
                {distanceDelta !== 0 && `, ${distanceDelta > 0 ? '+' : ''}${distanceDelta}km`}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="text-xs text-neutral-500">Ressenti</label>
          <select value={feeling} onChange={(e) => setFeeling(e.target.value)}>
            <option value="facile">Facile</option>
            <option value="moyen">Moyen</option>
            <option value="dur">Dur</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-neutral-500">Notes (optionnel)</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Météo, parcours, sensations..." />
        </div>
      </div>

      <button onClick={saveRun} disabled={saving} className="btn-primary w-full">
        {saving ? 'Enregistrement...' : 'Enregistrer le run'}
      </button>
    </div>
  );
}
