/* Turas service worker — cache-first for full offline use. */
const CACHE = 'turas-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/theme.css',
  './css/components.css',
  './js/main.js',
  './js/db.js',
  './js/calc.js',
  './js/ui.js',
  './js/data/presets.js',
  './js/features/achievements.js',
  './js/features/exportImport.js',
  './js/features/notifications.js',
  './js/features/milestones.js',
  './js/views/drinkEditor.js',
  './js/views/onboarding.js',
  './js/views/home.js',
  './js/views/log.js',
  './js/views/sos.js',
  './js/views/triggers.js',
  './js/views/checkin.js',
  './js/views/progress.js',
  './js/views/settings.js',
  './js/views/help.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  // User-added inspirational images may be cross-origin; let those hit the network.
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});

// Periodic Background Sync (Chrome/Android installed PWA): evening check-in nudge.
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== 'checkin-reminder') return;
  e.waitUntil((async () => {
    const hour = new Date().getHours();
    if (hour < 17) return; // only nudge in the evening
    await self.registration.showNotification('Evening check-in 🌙', {
      body: 'How was today? Fifteen seconds is all it takes.',
      icon: 'icons/icon-192.png',
      tag: 'turas-checkin',
      data: { url: './index.html#/checkin' }
    });
  })());
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data && e.notification.data.url ? e.notification.data.url : './index.html#/checkin';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.navigate(url); return c.focus(); } }
    return clients.openWindow(url);
  }));
});
