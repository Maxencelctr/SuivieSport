'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        // Si ça échoue (ex: en dev local sans https), l'app fonctionne quand
        // même, juste sans cache offline ni notifications push — mais on
        // logge pour pouvoir diagnostiquer, plutôt que d'avaler l'erreur.
        console.error('Service worker registration failed', err);
      });
    }
  }, []);

  return null;
}
