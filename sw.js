// Offline play and fast loading, so the game works like an installed app.
// Pages and code: the network first (updates arrive at once), the saved copy
// when offline. Pictures: the saved copy first, fetched and saved when new.
const CACHE = 'farmstead-v1';
const CORE = ['./', 'index.html', 'assets.js', 'game.js', 'manifest.json', 'assets/ui/app-icon-192.png',
    'assets/stages/map/0.jpg', 'assets/stages/barnyard/0.jpg'];

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
            if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return res;
        }).catch(() => caches.match(req, { ignoreSearch: true })));
    }
});
