const CACHE_NAME = 'suivi-sport-v2';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stratégie "network first, fallback cache" : toujours la version la plus
// fraîche quand il y a du réseau, mais l'app reste consultable hors-ligne
// sur les pages déjà visitées (utile en salle de sport avec peu de réseau).
//
// Important : uniquement pour les requêtes vers notre propre origine (pages,
// JS, assets). Les appels vers Supabase (données perso : séances, repas...)
// sont sur un autre domaine et ne doivent JAMAIS être mis en cache ici —
// sinon ces données resteraient stockées en clair sur l'appareil même après
// déconnexion.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  if (new URL(event.request.url).origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Notification push (défi envoyé par un ami) : affiche même app fermée.
self.addEventListener('push', (event) => {
  let data = { title: 'Volt', body: 'Nouvelle notification' };
  try {
    data = event.data.json();
  } catch {
    // ignore, garde les valeurs par défaut
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: data.url || '/amis' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/amis';
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
