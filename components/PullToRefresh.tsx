'use client';

import { useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { haptic } from '@/lib/haptics';

const THRESHOLD = 70;

// Tire vers le bas en haut d'une page pour la recharger, comme dans la
// plupart des apps mobiles. Ne se déclenche que si la page est déjà tout en
// haut (sinon on laisse le scroll normal faire son travail).
export default function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
}) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const armed = useRef(false);

  function onTouchStart(e: React.TouchEvent) {
    if (window.scrollY > 0 || refreshing) {
      armed.current = false;
      return;
    }
    startY.current = e.touches[0].clientY;
    armed.current = true;
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!armed.current || startY.current === null) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(110, delta * 0.5));
  }

  async function onTouchEnd() {
    if (!armed.current) return;
    armed.current = false;
    startY.current = null;
    if (pull > THRESHOLD) {
      setRefreshing(true);
      haptic(12);
      setPull(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: pull }}
      >
        <RefreshCw
          size={18}
          className={`text-accent ${refreshing ? 'animate-spin' : ''}`}
          style={{ transform: refreshing ? undefined : `rotate(${pull * 3}deg)`, opacity: Math.min(1, pull / THRESHOLD) }}
        />
      </div>
      {children}
    </div>
  );
}
