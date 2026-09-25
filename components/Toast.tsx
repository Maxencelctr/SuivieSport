'use client';

import { Check } from 'lucide-react';

// Petite confirmation flottante en bas d'écran (ex: "Profil enregistré").
// Le composant appelant gère lui-même le show/hide (voir useToast()).
export default function Toast({ message, show }: { message: string; show: boolean }) {
  return (
    <div
      className={`fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 transition-all duration-300 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      }`}
    >
      <div className="flex items-center gap-2 bg-[#1a1a1d] border border-[#2a2a2e] rounded-full px-4 py-2 shadow-lg text-sm">
        <Check size={15} className="text-volt shrink-0" />
        {message}
      </div>
    </div>
  );
}
