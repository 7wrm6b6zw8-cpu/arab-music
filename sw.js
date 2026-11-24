// BODO service worker: keeps the app itself on the phone so it opens without internet.
const V = 'bodo-v4';
const SHELL = ['./', 'index.html', 'app.js?v=4', 'bodoApi.js?v=4', 'offline.js?v=4', 'styles.css?v=4', 'manifest.json', 'icon-180.png', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'bodo-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin === location.origin) { // app files: newest when online, saved copy when offline
    e.respondWith((async () => {
      const c = await caches.open(V);
      try {
        const n = await Promise.race([fetch(r), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 4000))]);
        if (n && n.ok) c.put(r, n.clone());
        return n;
      } catch {
        return (await c.match(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await c.match('index.html') : Response.error());
      }
    })());
  } else if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith((async () => {
      const c = await caches.open('bodo-fonts'), m = await c.match(r); if (m) return m;
      try { const n = await fetch(r); c.put(r, n.clone()); return n; } catch { return Response.error(); }
    })());
  }
});
