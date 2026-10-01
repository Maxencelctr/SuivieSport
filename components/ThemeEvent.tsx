'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

function hexToRgbTriplet(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
}

// Recolore temporairement l'accent de l'app (variables CSS dans
// app/globals.css) si un événement thématique actif (dates + couleurs
// définies) existe dans app_events — ex: rose pour Octobre Rose. Rien à
// déployer pour activer/désactiver un thème, juste une ligne en base.
export default function ThemeEvent() {
  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from('app_events')
      .select('theme_accent, theme_accent_dark, theme_accent_light')
      .not('theme_accent', 'is', null)
      .lte('starts_at', now)
      .gte('ends_at', now)
      .order('starts_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const root = document.documentElement;
        const accent = data.theme_accent ? hexToRgbTriplet(data.theme_accent) : null;
        const dark = data.theme_accent_dark ? hexToRgbTriplet(data.theme_accent_dark) : null;
        const light = data.theme_accent_light ? hexToRgbTriplet(data.theme_accent_light) : null;
        if (accent) root.style.setProperty('--accent-rgb', accent);
        if (dark) root.style.setProperty('--accent-dark-rgb', dark);
        if (light) root.style.setProperty('--accent-light-rgb', light);
      });
  }, []);

  return null;
}
