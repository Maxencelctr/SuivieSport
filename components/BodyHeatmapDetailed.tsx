'use client';

import { MUSCLE_SHAPES } from '@/lib/muscleShapes';
import { Muscle } from '@/lib/types';

interface Props {
  muscles: Muscle[];
  intensities: Record<number, number>; // wger_id -> 0..1
  onSelect?: (wgerId: number) => void;
  selectedWgerId?: number | null;
}

function colorFor(intensity: number) {
  if (intensity <= 0) return '#2a2a2a';
  if (intensity < 0.5) return interpolate('#3b82f6', '#eab308', intensity / 0.5);
  return interpolate('#eab308', '#ef4444', (intensity - 0.5) / 0.5);
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

function Silhouette({
  view, muscles, intensities, onSelect, selectedWgerId,
}: {
  view: 'face' | 'dos';
} & Props) {
  const shapes = MUSCLE_SHAPES.filter((m) => m.view === view);

  return (
    <svg viewBox="0 0 200 380" className="w-full">
      {/* Silhouette de base */}
      <circle cx="100" cy="30" r="22" fill="#3a3a3a" />
      <rect x="60" y="50" width="80" height="130" rx="20" fill="#242424" />
      <rect x="40" y="80" width="20" height="90" rx="10" fill="#242424" />
      <rect x="140" y="80" width="20" height="90" rx="10" fill="#242424" />
      <rect x="70" y="165" width="26" height="145" rx="12" fill="#242424" />
      <rect x="104" y="165" width="26" height="145" rx="12" fill="#242424" />

      {/* Muscles colorés */}
      {shapes.map((shape) => {
        const intensity = intensities[shape.wgerId] ?? 0;
        const muscle = muscles.find((m) => m.wger_id === shape.wgerId);
        const isSelected = selectedWgerId === shape.wgerId;
        return (
          <g
            key={shape.wgerId}
            onClick={() => onSelect?.(shape.wgerId)}
            style={{ cursor: onSelect ? 'pointer' : 'default' }}
          >
            {shape.rects.map((r, i) => (
              <rect
                key={i}
                x={r.x} y={r.y} width={r.w} height={r.h} rx={r.rx ?? 4}
                fill={colorFor(intensity)}
                stroke={isSelected ? '#fff' : 'none'}
                strokeWidth={isSelected ? 2 : 0}
              />
            ))}
            <title>{muscle?.name_fr ?? ''}</title>
          </g>
        );
      })}
    </svg>
  );
}

export default function BodyHeatmapDetailed(props: Props) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-xs text-neutral-500 mb-1">Face</div>
          <Silhouette view="face" {...props} />
        </div>
        <div className="text-center">
          <div className="text-xs text-neutral-500 mb-1">Dos</div>
          <Silhouette view="dos" {...props} />
        </div>
      </div>
      <div className="flex justify-center gap-1 text-[10px] text-neutral-500 items-center">
        <span>Peu</span>
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #2a2a2a, #3b82f6, #eab308, #ef4444)' }} />
        <span>Beaucoup</span>
      </div>
    </div>
  );
}
