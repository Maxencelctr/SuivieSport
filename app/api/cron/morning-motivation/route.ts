import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

const GENERIC_MESSAGES = [
  "Nouvelle journée, nouvelle occasion de progresser 💪",
  "Aujourd'hui c'est le jour parfait pour avancer un peu plus.",
  "Petit rappel : chaque effort compte, même les petits.",
];

const WORKOUT_MESSAGES = [
  "Tu as séance aujourd'hui, courage, tu vas tout déchirer ! 🔥",
  "Séance prévue aujourd'hui — prépare-toi à envoyer du lourd 💪",
];

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: 'VAPID non configuré' }, { status: 500 });
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const { data: targets, error } = await supabase.rpc('get_morning_motivation_targets', { p_secret: cronSecret });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled(
    (targets ?? []).map((t: { endpoint: string; p256dh: string; auth_key: string; label: string; has_workout_today: boolean }) => {
      const pool = t.has_workout_today ? WORKOUT_MESSAGES : GENERIC_MESSAGES;
      const body = pool[Math.floor(Math.random() * pool.length)];
      return webpush.sendNotification(
        { endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth_key } },
        JSON.stringify({ title: `Salut ${t.label} 👋`, body, url: '/' })
      );
    })
  );

  return NextResponse.json({ sent: results.filter((r) => r.status === 'fulfilled').length, total: results.length });
}
