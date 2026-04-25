// Bump on every release that ships JS/CSS changes — the activate handler
// deletes any caches whose key !== CACHE, so a version bump here cleanly
// invalidates the old shell on next visit.
const CACHE = 'kda-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/state.js',
  './js/scenes.js',
  './js/drag.js',
  './js/audio.js',
  './js/haptics.js',
  './js/dialogs.js',
  './js/pets.js',
  './js/profile.js',
  './js/cloud.js',
  './js/pet3d.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Skip cross-origin: jsonblob.com (cloud sync) and unpkg.com (three.js CDN)
  // must always hit the network so we don't serve stale snapshots / modules.
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(resp => {
      const copy = resp.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return resp;
    }).catch(() => hit))
  );
});
