// Офлайн: всё, что нужно игре, — в кэше. Новая версия — поменять VER, старый кэш удалится.
const VER = 'sh-v3';
const FILES = ['./', 'index.html', 'logic.js', 'app.js', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png',
  ...['01_monet_impression', '02_hokusai_wave', '03_vermeer_pearl', '04_vangogh_sunflowers', '05_monet_lilies', '06_renoir_moulin',
    '07_botticelli_venus', '08_mucha_spring', '09_vangogh_starry', '10_klimt_kiss', '11_vangogh_cafe', '12_degas_dance', '13_monet_poppies',
    '14_seurat_jatte', '15_kandinsky_vii'].map(n => `img/${n}.jpg`), 'img/cat.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))); self.clients.claim(); });
// Код и страница — сначала из сети (обновления доходят сразу), без сети — из кэша. Картины — из кэша (они не меняются).
self.addEventListener('fetch', e => {
  const img = e.request.url.includes('/img/');
  e.respondWith(img ? caches.match(e.request).then(r => r || fetch(e.request))
    : fetch(e.request).then(r => { const c = r.clone(); caches.open(VER).then(k => k.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});
