'use client';

import { useState } from 'react';
import { Bell, PartyPopper, Share } from 'lucide-react';
import { enablePushNotifications, pushSupported } from '@/lib/push';
import { haptic } from '@/lib/haptics';

export default function WelcomeModal({ onClose }: { onClose: () => void }) {
  const [pushLoading, setPushLoading] = useState(false);
  const [pushDone, setPushDone] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  async function handleEnablePush() {
    setPushLoading(true);
    setPushError(null);
    const res = await enablePushNotifications();
    setPushLoading(false);
    if (!res.ok) {
      setPushError(res.error ?? 'Erreur inconnue.');
      return;
    }
    haptic(15);
    setPushDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
      <div className="card max-w-sm w-full space-y-4">
        <div className="flex items-center gap-2">
          <PartyPopper className="text-volt shrink-0" size={22} />
          <h3 className="font-semibold">Bienvenue sur Volt</h3>
        </div>

        <p className="text-sm text-neutral-400">
          C'est encore une <span className="text-white font-medium">V1</span> — si tu tombes sur un bug, ou que tu as
          une idée pour améliorer l'app ou ajouter une fonctionnalité, n'hésite pas à en parler à Maxence directement.
        </p>

        {pushSupported() && !pushDone && (
          <div className="bg-[#0a0a0b] border border-[#26262a] rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Bell size={15} className="text-accent shrink-0" />
              Active les notifications pour recevoir les défis de tes amis.
            </div>
            <button onClick={handleEnablePush} disabled={pushLoading} className="btn-primary w-full text-sm py-1.5">
              {pushLoading ? '...' : 'Activer les notifications'}
            </button>
            {pushError && <p className="text-red-400 text-xs">{pushError}</p>}
          </div>
        )}
        {pushDone && <p className="text-xs text-accent">Notifications activées ✓</p>}

        <div className="bg-[#0a0a0b] border border-[#26262a] rounded-lg p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Share size={15} className="text-accent shrink-0" />
            Installe Volt comme une vraie app
          </div>
          <p className="text-xs text-neutral-500">
            Menu de ton navigateur → "Ajouter à l'écran d'accueil" (ou "Installer l'application").
          </p>
        </div>

        <button onClick={onClose} className="btn-primary w-full">
          Compris, c'est parti
        </button>
      </div>
    </div>
  );
}
