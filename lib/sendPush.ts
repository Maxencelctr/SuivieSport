import type { SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';

interface Sub {
  endpoint: string;
  p256dh: string;
  auth_key: string;
}

// Envoie une notification à une liste d'abonnements et nettoie au passage
// ceux qui sont morts (410/404 = abonnement révoqué côté navigateur, ex:
// données du site effacées, ou abonnement souscrit avec une ancienne clé
// VAPID après une rotation de clé — dans ce cas TOUS les envois échouent
// silencieusement tant que la ligne n'est pas supprimée, puisque rien ne
// force le navigateur à se réabonner tout seul).
export async function sendPushToAll<T extends Sub>(
  supabase: SupabaseClient,
  subs: T[],
  payload: object | ((sub: T) => object)
) {
  const errors: string[] = [];
  const payloadFor = typeof payload === 'function' ? (payload as (sub: T) => object) : () => payload;

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify(payloadFor(s)),
        // "high" indique au service de push (FCM côté Android) de livrer
        // tout de suite même si l'appareil est en veille/mode économie de
        // batterie, au lieu de regrouper l'envoi avec d'autres plus tard.
        { urgency: 'high' }
      )
    )
  );

  await Promise.all(
    results.map(async (r, i) => {
      if (r.status === 'fulfilled') return;
      const err = r.reason as { statusCode?: number; body?: string; message?: string };
      errors.push(`${err.statusCode ?? '?'} ${err.body ?? err.message ?? 'erreur inconnue'}`.trim());
      if (err.statusCode === 404 || err.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', subs[i].endpoint);
      }
    })
  );

  return { sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length, errors };
}
