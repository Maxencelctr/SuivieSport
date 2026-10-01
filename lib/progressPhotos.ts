import { supabase } from './supabase';

export async function uploadProgressPhoto(userId: string, file: File, date: string): Promise<{ path?: string; error?: string }> {
  if (!file.type.startsWith('image/')) return { error: 'Choisis une image.' };
  if (file.size > 8 * 1024 * 1024) return { error: 'Image trop lourde (max 8 Mo).' };

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/${date}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('progress-photos').upload(path, file, { cacheControl: '3600' });
  if (error) return { error: error.message };
  return { path };
}

// Bucket privé : pas de getPublicUrl possible, il faut une URL signée à
// chaque affichage (expire après 1h, largement suffisant pour une session).
export async function getProgressPhotoUrl(path: string): Promise<string | null> {
  const { data } = await supabase.storage.from('progress-photos').createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}
