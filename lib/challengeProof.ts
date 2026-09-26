import { supabase } from './supabase';

export async function uploadChallengeProof(userId: string, challengeId: string, file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith('image/')) return { error: 'Choisis une image.' };
  if (file.size > 5 * 1024 * 1024) return { error: 'Image trop lourde (max 5 Mo).' };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${challengeId}.${ext}`;

  const { error } = await supabase.storage.from('challenge-proofs').upload(path, file, { upsert: true, cacheControl: '3600' });
  if (error) return { error: error.message };

  const { data } = supabase.storage.from('challenge-proofs').getPublicUrl(path);
  return { url: `${data.publicUrl}?v=${Date.now()}` };
}
