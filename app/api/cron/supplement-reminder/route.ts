import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { sendPushToAll } from '@/lib/sendPush';

// Appelée une fois par jour par Vercel Cron (voir vercel.json). Protégée en
// double : le header Authorization que Vercel ajoute automatiquement quand
// CRON_SECRET est défini, ET le même secret repassé à la fonction SQL (pas
// de clé service-role disponible, donc get_supplement_reminder_targets
// vérifie elle-même qu'on a le bon secret avant de renvoyer quoi que ce soit).
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

  const { data: targets, error } = await supabase.rpc('get_supplement_reminder_targets', { p_secret: cronSecret });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { sent, total, errors } = await sendPushToAll(
    supabase,
    (targets ?? []) as { endpoint: string; p256dh: string; auth_key: string; missing_supplements: string[] }[],
    (t) => ({
      title: 'Pense à tes compléments 💊',
      body: `N'oublie pas : ${t.missing_supplements.join(', ')}. C'est important ;)`,
      url: '/alimentation',
    })
  );
  if (errors.length > 0) console.error('supplement reminder push errors', errors);

  return NextResponse.json({ sent, total, errors });
}
