import { useCallback, useEffect, useRef, useState } from 'react';
import { haptic } from './haptics';

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const [total, setTotal] = useState(90);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          haptic([40, 60, 40, 60, 80]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  const start = useCallback((seconds: number) => {
    setTotal(seconds);
    setSecondsLeft(seconds);
    setRunning(true);
    haptic(10);
  }, []);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning((r) => (secondsLeft > 0 ? true : r)), [secondsLeft]);
  const addTime = useCallback((delta: number) => setSecondsLeft((s) => Math.max(0, s + delta)), []);
  const stop = useCallback(() => {
    setRunning(false);
    setSecondsLeft(0);
  }, []);

  const active = secondsLeft > 0 || running;

  return { secondsLeft, total, running, active, start, pause, resume, addTime, stop };
}

export type RestTimer = ReturnType<typeof useRestTimer>;
