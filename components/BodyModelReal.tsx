'use client';

import { useMemo } from 'react';
import Model, { IExerciseData, IMuscleStats, Muscle as LibMuscle } from 'react-body-highlighter';
import { WGER_TO_LIB_MUSCLE } from '@/lib/muscleMap';
import { Muscle } from '@/lib/types';

interface Props {
  muscles: Muscle[];
  intensities: Record<number, number>; // wger_id -> 0..1
  onSelect?: (wgerId: number) => void;
  selectedWgerId?: number | null;
}

// Muscle jamais travaillé : gris-bleu neutre mais visible. Puis échelle
// "chaleur" classique : bleu (léger) -> jaune -> orange -> rouge (beaucoup).
const UNTRAINED_COLOR = '#48435c';
const HIGHLIGHT_COLORS = ['#3b82f6', '#eab308', '#f97316', '#ef4444'];

function tierFor(intensity: number) {
  if (intensity <= 0) return 0;
  return Math.max(1, Math.ceil(intensity * HIGHLIGHT_COLORS.length));
}

function buildData(intensities: Record<number, number>): IExerciseData[] {
  // Fusionne les wger_id qui partagent une même zone du modèle (ex: mollet =
  // gastrocnémien + soléaire) en prenant l'intensité la plus forte.
  const tierByLibMuscle = new Map<LibMuscle, number>();
  Object.entries(WGER_TO_LIB_MUSCLE).forEach(([wgerIdStr, libMuscles]) => {
    const wgerId = Number(wgerIdStr);
    const tier = tierFor(intensities[wgerId] ?? 0);
    if (tier === 0) return;
    libMuscles.forEach((libMuscle) => {
      const current = tierByLibMuscle.get(libMuscle) ?? 0;
      if (tier > current) tierByLibMuscle.set(libMuscle, tier);
    });
  });

  return Array.from(tierByLibMuscle.entries()).map(([libMuscle, tier]) => ({
    name: libMuscle,
    muscles: [libMuscle],
    frequency: tier,
  }));
}

// Reverse map pour retrouver un wger_id à partir du muscle cliqué sur le
// modèle (utilisé pour synchroniser la sélection avec la liste en dessous).
function findWgerId(libMuscle: LibMuscle): number | undefined {
  for (const [wgerIdStr, libMuscles] of Object.entries(WGER_TO_LIB_MUSCLE)) {
    if (libMuscles.includes(libMuscle)) return Number(wgerIdStr);
  }
  return undefined;
}

export default function BodyModelReal({ muscles, intensities, onSelect, selectedWgerId }: Props) {
  const data = useMemo(() => buildData(intensities), [intensities]);

  function handleClick({ muscle }: IMuscleStats) {
    const wgerId = findWgerId(muscle);
    if (wgerId != null) onSelect?.(wgerId);
  }

  const selectedMuscle = muscles.find((m) => m.wger_id === selectedWgerId);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="text-center">
          <div className="text-xs text-neutral-500 mb-1">Face</div>
          <Model
            data={data}
            type="anterior"
            bodyColor={UNTRAINED_COLOR}
            highlightedColors={HIGHLIGHT_COLORS}
            onClick={handleClick}
            style={{ width: '100%' }}
            svgStyle={{ cursor: onSelect ? 'pointer' : 'default' }}
          />
        </div>
        <div className="text-center">
          <div className="text-xs text-neutral-500 mb-1">Dos</div>
          <Model
            data={data}
            type="posterior"
            bodyColor={UNTRAINED_COLOR}
            highlightedColors={HIGHLIGHT_COLORS}
            onClick={handleClick}
            style={{ width: '100%' }}
            svgStyle={{ cursor: onSelect ? 'pointer' : 'default' }}
          />
        </div>
      </div>

      {selectedMuscle && (
        <div className="text-center text-sm text-accent font-medium">{selectedMuscle.name_fr}</div>
      )}

      <div className="flex justify-center gap-2 text-[10px] text-neutral-500 items-center">
        <span className="flex items-center gap-1">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: UNTRAINED_COLOR }} /> Pas travaillé
        </span>
        <div className="w-24 h-2 rounded-full" style={{ background: 'linear-gradient(90deg, #3b82f6, #eab308, #f97316, #ef4444)' }} />
        <span>Beaucoup</span>
      </div>

      <p className="text-[10px] text-neutral-600 text-center">
        Dentelé antérieur et brachial suivis dans tes stats mais non représentés sur ce modèle (zones non disponibles).
      </p>
    </div>
  );
}
