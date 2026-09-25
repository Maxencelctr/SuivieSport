'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { haptic } from '@/lib/haptics';

// Bouton flottant "+" pour démarrer une nouvelle entrée en un tap, sans
// avoir à remonter en haut de la liste (accessible au pouce en bas d'écran).
export default function Fab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      onClick={() => haptic(10)}
      aria-label={label}
      className="md:hidden fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-accent text-white shadow-lg shadow-black/40 flex items-center justify-center active:scale-95 transition-transform"
    >
      <Plus size={26} />
    </Link>
  );
}
