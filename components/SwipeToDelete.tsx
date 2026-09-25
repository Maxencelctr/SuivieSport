'use client';

import { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { haptic } from '@/lib/haptics';

const REVEAL = 72;

// Glisser vers la gauche révèle un bouton supprimer (comme Mail/Gmail),
// au lieu de devoir viser une petite icône poubelle. Fonctionne aussi à la
// souris (pointer events) donc pas de régression desktop.
export default function SwipeToDelete({ children, onDelete }: { children: React.ReactNode; onDelete: () => void }) {
  const [dragX, setDragX] = useState(0);
  const revealedRef = useRef(false);
  const startX = useRef<number | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);

  function onPointerDown(e: React.PointerEvent) {
    startX.current = e.clientX;
    dragging.current = true;
    moved.current = false;
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current || startX.current === null) return;
    const delta = e.clientX - startX.current;
    if (Math.abs(delta) > 4) moved.current = true;
    const base = revealedRef.current ? -REVEAL : 0;
    setDragX(Math.min(0, Math.max(-REVEAL * 1.3, base + delta)));
  }

  function settle() {
    dragging.current = false;
    startX.current = null;
    if (dragX < -REVEAL / 2) {
      setDragX(-REVEAL);
      if (!revealedRef.current) haptic(8);
      revealedRef.current = true;
    } else {
      setDragX(0);
      revealedRef.current = false;
    }
  }

  return (
    <div className="relative overflow-hidden rounded-[0.6rem]">
      <button
        onClick={() => {
          haptic(15);
          onDelete();
          setDragX(0);
          revealedRef.current = false;
        }}
        aria-label="Supprimer"
        className="absolute inset-y-0 right-0 flex items-center justify-center bg-red-600 text-white"
        style={{ width: REVEAL }}
      >
        <Trash2 size={18} />
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={settle}
        onPointerCancel={settle}
        onClickCapture={(e) => {
          // Empêche un swipe (drag terminé) de déclencher aussi un clic/lien en dessous.
          if (moved.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        style={{ transform: `translateX(${dragX}px)`, touchAction: 'pan-y' }}
        className="relative bg-[#0a0a0b] transition-transform duration-150 ease-out"
      >
        {children}
      </div>
    </div>
  );
}
