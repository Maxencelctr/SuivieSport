'use client';

import { MUSCLE_SHAPES, ShapePiece } from '@/lib/muscleShapes';
import { Muscle } from '@/lib/types';

interface Props {
  muscles: Muscle[];
  intensities: Record<number, number>; // wger_id -> 0..1
  onSelect?: (wgerId: number) => void;
  selectedWgerId?: number | null;
}

function colorFor(intensity: number) {
  if (intensity <= 0) return '#332e40';
  if (intensity < 0.5) return interpolate('#8B5CF6', '#38bdf8', intensity / 0.5);
  return interpolate('#38bdf8', '#A3E635', (intensity - 0.5) / 0.5);
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

// Silhouette de base : quelques formes lissées (pas un tracé médical) qui
// donnent une impression de corps plutôt que des rectangles bruts.
function BaseSilhouette() {
  return (
    <g fill="#211d29" stroke="#332e40" strokeWidth="1.5">
      {/* Tête + cou */}
      <ellipse cx="100" cy="26" rx="16" ry="19" />
      <path d="M91,42 L91,54 L109,54 L109,42 Z" />

      {/* Torse (épaules -> taille -> légère évasure des hanches) */}
      <path d="
        M58,56
        C58,48 68,44 80,45
        C90,41 110,41 120,45
        C132,44 142,48 142,56
        L140,116
        C142,142 137,166 128,184
        C118,192 82,192 72,184
        C63,166 58,142 60,116
        Z
      " />

      {/* Bras gauche + main */}
      <path d="M57,58 C48,62 42,74 39,92 C36,112 34,132 33,150 C32,163 33,172 37,180 L49,180 C46,166 46,150 48,128 C50,104 54,80 61,60 Z" />
      <ellipse cx="35" cy="188" rx="7" ry="9" />

      {/* Bras droit + main */}
      <path d="M143,58 C152,62 158,74 161,92 C164,112 166,132 167,150 C168,163 167,172 163,180 L151,180 C154,166 154,150 152,128 C150,104 146,80 139,60 Z" />
      <ellipse cx="165" cy="188" rx="7" ry="9" />

      {/* Jambe gauche + pied */}
      <path d="M64,188 C61,220 62,254 66,286 C67,308 69,326 72,342 C74,350 82,352 88,350 C90,330 89,310 87,290 C89,256 90,222 88,190 Z" />
      <ellipse cx="80" cy="358" rx="11" ry="7" />

      {/* Jambe droite + pied */}
      <path d="M136,188 C139,220 138,254 134,286 C133,308 131,326 128,342 C126,350 118,352 112,350 C110,330 111,310 113,290 C111,256 110,222 112,190 Z" />
      <ellipse cx="120" cy="358" rx="11" ry="7" />
    </g>
  );
}

function ShapePath({ shape, fill, stroke, strokeWidth }: { shape: ShapePiece; fill: string; stroke: string; strokeWidth: number }) {
  if (shape.type === 'ellipse') {
    return (
      <ellipse
        cx={shape.cx}
        cy={shape.cy}
        rx={shape.rx}
        ry={shape.ry}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        transform={shape.rotate ? `rotate(${shape.rotate} ${shape.cx} ${shape.cy})` : undefined}
      />
    );
  }
  return <path d={shape.d} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />;
}

function Silhouette({
  view, muscles, intensities, onSelect, selectedWgerId,
}: {
  view: 'face' | 'dos';
} & Props) {
  const shapes = MUSCLE_SHAPES.filter((m) => m.view === view);

  return (
    <svg viewBox="0 0 200 380" className="w-full">
      <BaseSilhouette />

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
            {shape.shapes.map((piece, i) => (
              <ShapePath
                key={i}
                shape={piece}
                fill={colorFor(intensity)}
                stroke={isSelected ? '#fff' : 'rgba(0,0,0,0.25)'}
                strokeWidth={isSelected ? 2 : 0.75}
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
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #332e40, #8B5CF6, #38bdf8, #A3E635)' }} />
        <span>Beaucoup</span>
      </div>
    </div>
  );
}
