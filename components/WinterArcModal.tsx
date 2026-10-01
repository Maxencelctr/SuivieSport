'use client';

import { Snowflake, Flame } from 'lucide-react';

export default function WinterArcModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="card max-w-sm w-full space-y-4 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 20% 0%, #7dd3fc, transparent 55%), radial-gradient(circle at 90% 20%, #a78bfa, transparent 50%)' }}
        />
        <div className="relative space-y-4">
          <div className="flex items-center gap-2">
            <Snowflake className="text-sky-300 shrink-0" size={24} />
            <h3 className="font-semibold text-lg">Bon Winter Arc ❄️</h3>
          </div>

          <p className="text-sm text-neutral-400">
            D'ici au 1er janvier, c'est le moment de pousser plus fort que les autres pendant qu'ils lèvent le pied.
            Chaque séance, chaque run, chaque petit effort compte double — fais de ces derniers mois de l'année ceux
            qui changent tout.
          </p>

          <div className="flex items-center gap-2 text-xs text-accent bg-[#0a0a0b] border border-[#26262a] rounded-lg p-3">
            <Flame size={15} className="shrink-0" />
            Objectif simple : ne rien lâcher jusqu'au 31 décembre.
          </div>

          <button onClick={onClose} className="btn-primary w-full">
            Let's go 🔥
          </button>
        </div>
      </div>
    </div>
  );
}
