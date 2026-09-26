'use client';

import { useEffect, useState } from 'react';
import { Bell, Download, X } from 'lucide-react';
import { enablePushNotifications, isPushEnabled, pushSupported } from '@/lib/push';
import { haptic } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Bannière "Installer l'app" (Chrome/Edge/Android — le seul écosystème qui
// expose cet évènement ; iOS n'a pas d'équivalent JS, l'ajout à l'écran
// d'accueil y reste manuel, expliqué dans WelcomeModal). Une fois installée,
// enchaîne directement sur la demande de notifications.
export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [showPushAsk, setShowPushAsk] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    }
    async function onInstalled() {
      setDeferredPrompt(null);
      if (pushSupported() && !(await isPushEnabled())) {
        setShowPushAsk(true);
      }
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    haptic(10);
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  async function handleEnablePush() {
    setPushLoading(true);
    await enablePushNotifications();
    setPushLoading(false);
    haptic(15);
    setShowPushAsk(false);
  }

  if (showPushAsk) {
    return (
      <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center px-4">
        <div className="card max-w-sm w-full space-y-3">
          <div className="flex items-center gap-2">
            <Bell size={18} className="text-accent shrink-0" />
            <h3 className="font-semibold text-sm">Volt est installé !</h3>
          </div>
          <p className="text-sm text-neutral-400">
            Active les notifications pour recevoir les défis de tes amis même quand l'app est fermée.
          </p>
          <button onClick={handleEnablePush} disabled={pushLoading} className="btn-primary w-full text-sm py-1.5">
            {pushLoading ? '...' : 'Activer les notifications'}
          </button>
          <button onClick={() => setShowPushAsk(false)} className="w-full text-center text-xs text-neutral-500">
            Plus tard
          </button>
        </div>
      </div>
    );
  }

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 inset-x-4 md:inset-x-auto md:right-4 md:w-80 z-40">
      <div className="card flex items-center gap-3">
        <Download size={18} className="text-accent shrink-0" />
        <div className="flex-1 text-sm min-w-0">
          <div className="font-medium">Installer Volt</div>
          <div className="text-xs text-neutral-500">Accès rapide depuis ton écran d'accueil</div>
        </div>
        <button onClick={handleInstall} className="btn-primary text-xs px-3 py-1.5 shrink-0">
          Installer
        </button>
        <button onClick={() => setDismissed(true)} className="text-neutral-500 shrink-0" aria-label="Fermer">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
