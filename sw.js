// Офлайн: всё, что нужно игре, — в кэше. Новая версия — поменять VER, старый кэш удалится.
const VER = 'sh-v20';
const FILES = ['./', 'index.html', 'logic.js', 'houses.js', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  ...Array.from({ length: 15 }, (_, i) => `img/food/${String(i + 1).padStart(2, '0')}.jpg`), 'img/cat.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))); self.clients.claim(); });
// Код и страница — сначала из сети, мимо HTTP-кэша браузера (Pages разрешает держать файлы 10 мин — обновление не доходило), без сети — из кэша. Картинки — из кэша (они не меняются).
self.addEventListener('fetch', e => {
  const img = e.request.url.includes('/img/');
  e.respondWith(img ? caches.match(e.request).then(r => r || fetch(e.request))
    : fetch(e.request, { cache: 'no-cache' }).then(r => { const c = r.clone(); caches.open(VER).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
