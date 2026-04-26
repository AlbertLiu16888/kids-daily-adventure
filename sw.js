// Bump on every release that ships JS/CSS changes — the activate handler
// deletes any caches whose key !== CACHE, so a version bump here cleanly
// invalidates the old shell on next visit.
const CACHE = 'kda-v5';
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
  // v2.4: landmark-as-element map assets
  './assets/images/map/map_bg_v24.png',
  './assets/images/landmarks/lm_qingtang.png',
  './assets/images/landmarks/lm_kindergarten.png',
  './assets/images/landmarks/lm_nursery.png',
  './assets/images/landmarks/lm_zoo.png',
  './assets/images/landmarks/lm_sheepworld.png',
  './assets/images/landmarks/lm_beach.png',
  './assets/images/landmarks/lm_dinomountain.png',
  './assets/images/landmarks/lm_office.png',
];

self.addEventListener('install', e => {
  // Use cache: 'reload' so the install-time pre-cache bypasses the browser's
  // HTTP cache. Otherwise, if a user has a stale .js / .css from a previous
  // visit, c.addAll(ASSETS) would silently bake that stale copy into the new
  // SW cache — breaking the version bump.
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async (u) => {
      try {
        const resp = await fetch(u, { cache: 'reload' });
        if (resp.ok) await c.put(u, resp);
      } catch {}
    }));
  })());
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
