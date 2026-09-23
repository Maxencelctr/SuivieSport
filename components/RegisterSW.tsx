'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Pas grave si ça échoue (ex: en dev local sans https) : l'app
        // fonctionne normalement, juste sans le cache offline.
      });
    }
  }, []);

  return null;
}
