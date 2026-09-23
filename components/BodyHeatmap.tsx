'use client';

// Body heatmap simplifié : zones larges (pas muscle par muscle) colorées selon
// le volume relatif travaillé (reps × poids cumulés sur la période choisie).
// Échelle de couleur : gris (peu/pas travaillé) -> bleu -> orange -> rouge (beaucoup).

interface Props {
  intensities: Record<string, number>; // muscle_group -> 0..1
}

function colorFor(intensity: number) {
  if (intensity <= 0) return '#2a2a2a';
  // Interpolation gris-bleu -> orange -> rouge selon l'intensité
  if (intensity < 0.5) {
    // bleu (peu) -> jaune (moyen)
    const t = intensity / 0.5;
    return interpolate('#3b82f6', '#eab308', t);
  }
  const t = (intensity - 0.5) / 0.5;
  return interpolate('#eab308', '#ef4444', t);
}

function interpolate(hex1: string, hex2: string, t: number) {
  const c1 = hexToRgb(hex1);
  const c2 = hexToRgb(hex2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export default function BodyHeatmap({ intensities }: Props) {
  const get = (group: string) => colorFor(intensities[group] ?? 0);

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Vue de face */}
      <div className="text-center">
        <div className="text-xs text-neutral-500 mb-1">Face</div>
        <svg viewBox="0 0 200 380" className="w-full">
          {/* Tête */}
          <circle cx="100" cy="30" r="22" fill="#444" />
          {/* Épaules */}
          <rect x="55" y="55" width="35" height="30" rx="8" fill={get('epaules')} />
          <rect x="110" y="55" width="35" height="30" rx="8" fill={get('epaules')} />
          {/* Pecs */}
          <rect x="70" y="60" width="60" height="45" rx="10" fill={get('pecs')} />
          {/* Abdos */}
          <rect x="78" y="108" width="44" height="60" rx="8" fill={get('abdos')} />
          {/* Bras (biceps/avant-bras) */}
          <rect x="45" y="85" width="20" height="70" rx="8" fill={get('bras')} />
          <rect x="135" y="85" width="20" height="70" rx="8" fill={get('bras')} />
          {/* Jambes */}
          <rect x="72" y="170" width="26" height="110" rx="10" fill={get('jambes')} />
          <rect x="102" y="170" width="26" height="110" rx="10" fill={get('jambes')} />
        </svg>
      </div>

      {/* Vue de dos */}
      <div className="text-center">
        <div className="text-xs text-neutral-500 mb-1">Dos</div>
        <svg viewBox="0 0 200 380" className="w-full">
          <circle cx="100" cy="30" r="22" fill="#444" />
          <rect x="55" y="55" width="35" height="30" rx="8" fill={get('epaules')} />
          <rect x="110" y="55" width="35" height="30" rx="8" fill={get('epaules')} />
          {/* Dos */}
          <rect x="68" y="58" width="64" height="90" rx="10" fill={get('dos')} />
          {/* Bras (triceps) */}
          <rect x="45" y="85" width="20" height="70" rx="8" fill={get('bras')} />
          <rect x="135" y="85" width="20" height="70" rx="8" fill={get('bras')} />
          {/* Jambes (fessiers/ischios) */}
          <rect x="72" y="150" width="26" height="130" rx="10" fill={get('jambes')} />
          <rect x="102" y="150" width="26" height="130" rx="10" fill={get('jambes')} />
        </svg>
      </div>

      <div className="col-span-2 flex justify-center gap-1 text-[10px] text-neutral-500 items-center">
        <span>Peu</span>
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #2a2a2a, #3b82f6, #eab308, #ef4444)' }} />
        <span>Beaucoup</span>
      </div>
    </div>
  );
}
