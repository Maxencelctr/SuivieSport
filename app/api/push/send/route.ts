import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Envoie une notification push à un ami quand on lui crée un défi. Tourne
// côté serveur car web-push a besoin de la clé VAPID privée. Pas de clé
// service-role Supabase ici : on rejoue le token d'accès de l'appelant, et
// c'est la fonction SQL get_friend_push_subscriptions (SECURITY DEFINER,
// restreinte aux amis confirmés) qui autorise ou non la lecture des
// abonnements du destinataire.
export async function POST(req: NextRequest) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: 'Notifications push non configurées côté serveur.' }, { status: 500 });
  }

  const { accessToken, targetUserId, title, body } = await req.json();
  if (!accessToken || !targetUserId || !title) {
    return NextResponse.json({ error: 'Champs manquants.' }, { status: 400 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: subs, error } = await supabase.rpc('get_friend_push_subscriptions', { target: targetUserId });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }

  const results = await Promise.allSettled(
    (subs ?? []).map((s: { endpoint: string; p256dh: string; auth_key: string }) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({ title, body, url: '/amis' })
      )
    )
  );

  return NextResponse.json({ sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length });
}
