import { supabase } from './supabase';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

export function pushSupported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
}

export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported()) return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
}

export async function enablePushNotifications(options?: { forceResubscribe?: boolean }): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupported()) {
    return { ok: false, error: "Les notifications ne sont pas supportées sur cet appareil/navigateur." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'Permission refusée.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Non connecté.' };

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) return { ok: false, error: 'Clé VAPID manquante côté client.' };

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  // Si on force (bouton "réinitialiser") ou si l'abonnement existant a été
  // créé avec une ancienne clé VAPID (après une rotation de clé côté
  // serveur), le réabonnement silencieux ci-dessous ne suffit pas : il faut
  // d'abord se désabonner, sinon le navigateur garde l'ancien abonnement
  // mort et tous les envois échouent sans que rien ne le signale.
  if (subscription && options?.forceResubscribe) {
    await subscription.unsubscribe();
    subscription = null;
  }

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
  }

  const json = subscription.toJSON();
  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: json.endpoint!,
      p256dh: json.keys!.p256dh,
      auth_key: json.keys!.auth,
    },
    { onConflict: 'endpoint' }
  );

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
