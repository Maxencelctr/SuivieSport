'use client';

import { Pause, Play, Plus, X } from 'lucide-react';
import type { RestTimer } from '@/lib/useRestTimer';

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

// Barre fixe en bas d'écran (au-dessus de la nav mobile) pendant le repos
// entre deux séries — reste visible pendant qu'on continue à remplir la
// séance, pas besoin de rester sur un écran dédié à regarder le chrono.
export default function RestTimerBar({ timer }: { timer: RestTimer }) {
  if (!timer.active) return null;

  const progress = timer.total > 0 ? timer.secondsLeft / timer.total : 0;

  return (
    <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-40 bg-[#141016] border-t border-accent/40">
      <div className="h-0.5 bg-[#262130]">
        <div className="h-full bg-accent transition-[width] duration-1000 linear" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
        <div className="text-xl font-bold tabular-nums text-accent w-14 shrink-0">{formatTime(timer.secondsLeft)}</div>
        <div className="text-xs text-neutral-400 flex-1">Repos</div>
        <button onClick={() => timer.addTime(15)} className="p-2 text-neutral-300 hover:text-accent" aria-label="+15s">
          <Plus size={16} />
        </button>
        <button
          onClick={() => (timer.running ? timer.pause() : timer.resume())}
          className="p-2 text-neutral-300 hover:text-accent"
          aria-label={timer.running ? 'Pause' : 'Reprendre'}
        >
          {timer.running ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button onClick={() => timer.stop()} className="p-2 text-neutral-500 hover:text-red-400" aria-label="Arrêter">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
