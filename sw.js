/* অফলাইনে চালানোর জন্য Service Worker। কন্টেন্ট বদলালে VERSION বাড়াও। */
const VERSION = 'v1';
const CACHE = 'darpotro-' + VERSION;
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js',
  'js/content/week1.js', 'js/content/week2.js', 'js/content/week3.js', 'js/content/week4.js',
  'js/content/week5.js', 'js/content/week6.js', 'js/content/week7.js',
  'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok && new URL(e.request.url).origin === location.origin) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
