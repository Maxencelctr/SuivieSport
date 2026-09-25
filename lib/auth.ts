import { supabase } from './supabase';

// Vide le cache du service worker en plus de la session : évite qu'un
// appareil partagé garde des pages/données visitées par le compte précédent.
export async function signOutAndClear() {
  if (typeof caches !== 'undefined') {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
  await supabase.auth.signOut();
}
