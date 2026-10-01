import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { sendPushToAll } from '@/lib/sendPush';

// Envoie une notif de test à l'utilisateur authentifié lui-même, pour
// vérifier que la chaîne complète (abonnement -> VAPID -> service worker)
// fonctionne réellement, sans dépendre d'un ami pour tester.
export async function POST(req: NextRequest) {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: 'Notifications push non configurées côté serveur.' }, { status: 500 });
  }

  const { accessToken } = await req.json();
  if (!accessToken) {
    return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté.' }, { status: 401 });

  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth_key')
    .eq('user_id', user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { sent, total, errors } = await sendPushToAll(supabase, subs ?? [], {
    title: 'Test Volt 🔔',
    body: 'Si tu vois ça, les notifications marchent.',
    url: '/',
  });

  return NextResponse.json({ sent, total, errors });
}
