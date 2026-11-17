// Offline play and fast loading, so the game works like an installed app.
// Pages and code: the network first (updates arrive at once), the saved copy
// when offline. Pictures: the saved copy first, fetched and saved when new.
const CACHE = 'farmstead-v2'; // a new name clears the old cache when this one takes over
// Code is cached under its ?v= version as pages ask for it, not unversioned here.
const CORE = ['./', 'index.html', 'manifest.json', 'assets/ui/app-icon-rose-192.png',
    'assets/stages/map/0@2x.jpg', 'assets/stages/barnyard/0@2x.jpg'];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys()
        .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
        .then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
    const req = event.request;
    if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
    const picture = /\.(png|jpe?g|webp|svg|gif|mp3)$/i.test(new URL(req.url).pathname); // pictures and sounds
    if (picture) {
        event.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        })));
    } else {
        event.respondWith(fetch(req).then(res => {
            if (res.ok) {
                const copy = res.clone();
                // Keep one copy per file: drop older ?v= versions, so offline play gets the newest.
                caches.open(CACHE).then(async c => {
                    const path = new URL(req.url).pathname;
                    for (const old of await c.keys()) if (new URL(old.url).pathname === path && old.url !== req.url) await c.delete(old);
                    await c.put(req, copy);
                });
            }
            return res;
        }).catch(() => caches.match(req).then(hit => hit || caches.match(req, { ignoreSearch: true }))));
    }
});
