'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import {
  VMA_TEST_LABELS, computeVMA, TRAINING_ZONES, speedToPaceSeconds, formatPace,
} from '@/lib/running';

export default function ZonesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vma, setVma] = useState<number | null>(null);

  const [testType, setTestType] = useState('5km');
  const [testDistance, setTestDistance] = useState(5);
  const [testMinutes, setTestMinutes] = useState(25);
  const [testSeconds, setTestSeconds] = useState(0);

  useEffect(() => {
    supabase.from('profile').select('vma_kmh').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data?.vma_kmh) setVma(Number(data.vma_kmh));
      setLoading(false);
    });
  }, []);

  async function computeAndSave() {
    setSaving(true);
    const durationSeconds = testMinutes * 60 + testSeconds;
    const estimated = computeVMA(testDistance, durationSeconds, testType);
    setVma(Math.round(estimated * 10) / 10);
    await supabase.from('profile').upsert({
      id: 1,
      vma_kmh: Math.round(estimated * 10) / 10,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  }

  if (loading) return <p className="text-neutral-500">Chargement...</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">VMA & zones d'allure</h2>
        <Link href="/course" className="text-sm text-neutral-400">← Course</Link>
      </div>
      <p className="text-neutral-500 text-sm">
        Estimation à partir d'une performance récente (pas un vrai test labo, mais une bonne
        approximation utilisée en préparation course à pied).
      </p>

      <div className="card space-y-3">
        <label className="text-sm text-neutral-400">Ta meilleure performance récente</label>
        <select value={testType} onChange={(e) => setTestType(e.target.value)}>
          {Object.entries(VMA_TEST_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <div>
          <label className="text-xs text-neutral-500">Distance parcourue (km)</label>
          <input type="number" value={testDistance} onChange={(e) => setTestDistance(Number(e.target.value))} min={0.1} step={0.1} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">Minutes</label>
            <input type="number" value={testMinutes} onChange={(e) => setTestMinutes(Number(e.target.value))} min={0} />
          </div>
          <div>
            <label className="text-xs text-neutral-500">Secondes</label>
            <input type="number" value={testSeconds} onChange={(e) => setTestSeconds(Number(e.target.value))} min={0} max={59} />
          </div>
        </div>
        <button onClick={computeAndSave} disabled={saving} className="btn-primary w-full">
          {saving ? 'Calcul...' : 'Calculer ma VMA'}
        </button>
      </div>

      {vma && (
        <>
          <div className="card text-center">
            <div className="text-3xl font-bold text-accent">{vma} km/h</div>
            <div className="text-xs text-neutral-500">VMA estimée</div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm text-neutral-400">Zones d'allure d'entraînement</h3>
            {TRAINING_ZONES.map((zone) => {
              const minSpeed = vma * zone.minPercent;
              const maxSpeed = vma * zone.maxPercent;
              const minPace = speedToPaceSeconds(maxSpeed); // vitesse max = allure la plus rapide (secondes/km les plus basses)
              const maxPace = speedToPaceSeconds(minSpeed);
              return (
                <div key={zone.label} className="card flex justify-between items-center py-2">
                  <div>
                    <div className="text-sm">{zone.label}</div>
                    <div className="text-xs text-neutral-500">{Math.round(zone.minPercent * 100)}-{Math.round(zone.maxPercent * 100)}% VMA</div>
                  </div>
                  <span className="text-accent text-sm">{formatPace(minPace)} - {formatPace(maxPace)} /km</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
