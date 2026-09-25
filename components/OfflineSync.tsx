'use client';

import { useEffect } from 'react';
import { flushQueue, getQueue } from '@/lib/offlineQueue';
import { useToast } from '@/lib/useToast';
import Toast from './Toast';
import { useAuth } from './AuthProvider';

// Tente de resynchroniser les séances enregistrées hors-ligne dès qu'une
// connexion est disponible (au chargement + à chaque retour de réseau).
export default function OfflineSync() {
  const { user } = useAuth();
  const toast = useToast();

  useEffect(() => {
    if (!user) return;

    async function trySync() {
      if (getQueue().length === 0) return;
      const { synced } = await flushQueue();
      if (synced > 0) {
        toast.trigger(`${synced} séance${synced > 1 ? 's' : ''} hors-ligne synchronisée${synced > 1 ? 's' : ''}`);
      }
    }

    trySync();
    window.addEventListener('online', trySync);
    return () => window.removeEventListener('online', trySync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return <Toast message={toast.message} show={toast.show} />;
}
