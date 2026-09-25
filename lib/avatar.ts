import { supabase } from './supabase';

export async function uploadAvatar(userId: string, file: File): Promise<{ url?: string; error?: string }> {
  if (!file.type.startsWith('image/')) {
    return { error: 'Choisis une image.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Image trop lourde (max 5 Mo).' };
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (uploadError) return { error: uploadError.message };

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust : même chemin réutilisé à chaque changement de photo, sinon
  // le navigateur garde l'ancienne image en cache indéfiniment.
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: profileError } = await supabase.from('profile').upsert({ avatar_url: url });
  if (profileError) return { error: profileError.message };

  return { url };
}
