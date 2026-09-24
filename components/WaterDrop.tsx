'use client';

import { useId } from 'react';

// Goutte d'eau qui se remplit visuellement selon la progression vers
// l'objectif du jour (comme un niveau de liquide). Sa taille varie aussi
// légèrement avec l'objectif : un objectif plus élevé = une goutte plus
// grande, pour rendre l'objectif "visible" avant même de regarder le chiffre.
const DROP_PATH = 'M50 3 C50 3 12 45 12 68 C12 86 29 98 50 98 C71 98 88 86 88 68 C88 45 50 3 50 3 Z';

interface WaterDropProps {
  currentMl: number;
  goalMl: number;
}

export default function WaterDrop({ currentMl, goalMl }: WaterDropProps) {
  const uid = useId();
  const clipId = `drop-clip-${uid}`;
  const gradId = `drop-fill-${uid}`;

  const pct = goalMl > 0 ? Math.max(0, Math.min(100, (currentMl / goalMl) * 100)) : 0;
  const goalLiters = goalMl / 1000;
  const size = Math.round(Math.max(72, Math.min(180, 64 + goalLiters * 20)));
  const reached = pct >= 100;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        <defs>
          <clipPath id={clipId}>
            <path d={DROP_PATH} />
          </clipPath>
          <linearGradient id={gradId} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#7dd3fc" />
          </linearGradient>
        </defs>

        <path d={DROP_PATH} fill="#100c17" stroke="#2a2632" strokeWidth="2" />

        <g clipPath={`url(#${clipId})`}>
          <rect
            x="-10"
            y="0"
            width="120"
            height="100"
            fill={`url(#${gradId})`}
            style={{
              transform: `translateY(${100 - pct}%)`,
              transition: 'transform 0.8s cubic-bezier(.4,0,.2,1)',
            }}
          />
          {pct > 0 && (
            <g
              style={{
                transform: `translateY(${100 - pct}%)`,
                transition: 'transform 0.8s cubic-bezier(.4,0,.2,1)',
              }}
            >
              <path
                d="M-20,0 C-10,-3 0,3 10,0 C20,-3 30,3 40,0 C50,-3 60,3 70,0 C80,-3 90,3 100,0 C110,-3 120,3 130,0 L130,4 L-20,4 Z"
                fill="#bae6fd"
                opacity="0.55"
                className="animate-wave"
              />
            </g>
          )}
        </g>

        <path d={DROP_PATH} fill="none" stroke={reached ? '#A3E635' : '#38bdf8'} strokeWidth="2.5" opacity="0.8" />
      </svg>
      <div className="text-center">
        <div className={`text-lg font-bold ${reached ? 'text-volt' : 'text-sky-400'}`}>
          {(currentMl / 1000).toFixed(2).replace(/\.?0+$/, '') || '0'}L
        </div>
        <div className="text-xs text-neutral-500">objectif {goalLiters}L</div>
      </div>
    </div>
  );
}
