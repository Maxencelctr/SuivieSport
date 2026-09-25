import { useCallback, useRef, useState } from 'react';
import { haptic } from './haptics';

// Affiche un message (via <Toast/>) pendant ~2s puis le cache tout seul.
export function useToast() {
  const [message, setMessage] = useState('');
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trigger = useCallback((msg: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(msg);
    setShow(true);
    haptic(10);
    timer.current = setTimeout(() => setShow(false), 2200);
  }, []);

  return { message, show, trigger };
}
