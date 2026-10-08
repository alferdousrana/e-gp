/* দরপত্র পাঠশালা — Service Worker (v2)
   • অ্যাপের সব ফাইল আগেই ক্যাশে রাখে → ইন্টারনেট ছাড়া পুরো অ্যাপ চলে
   • cache-first: সাথে সাথে খোলে; একই সংস্করণের ফাইল কখনো মিশে যায় না
   • নতুন সংস্করণ এলে অ্যাপে “হালনাগাদ করো” বার্তা দেখায় (SKIP_WAITING)
   • Firebase SDK ও ফন্ট প্রথমবার লোডের পর রানটাইম ক্যাশে থাকে
   • Firestore/Auth-এর নেটওয়ার্ক অনুরোধ ছোঁয়া হয় না — সেগুলো Firebase নিজেই অফলাইনে সামলায় */
const VERSION = 'v2.0.0';
const CACHE = 'darpotro-' + VERSION;
const RUNTIME = 'darpotro-runtime';
const FILES = ['./', 'index.html', 'css/style.css',
  'js/content/week1.js', 'js/content/week2.js', 'js/content/week3.js', 'js/content/week4.js',
  'js/content/week5.js', 'js/content/week6.js', 'js/content/week7.js', 'js/content/week8.js',
  'js/content/week9.js', 'js/content/extras.js',
  'js/app.js', 'js/lab.js', 'js/v2.js', 'js/firebase-config.js', 'js/sync.js',
  'manifest.json', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
const RUNTIME_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== RUNTIME).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    // নিজের ফাইল: cache-first। একই সংস্করণের সব ফাইল একসাথে থাকে, তাই কখনো
    // পুরনো-নতুন মিশে যায় না। নতুন সংস্করণ আসে শুধু নতুন Service Worker-এর মাধ্যমে।
    const key = req.mode === 'navigate' ? 'index.html' : req;
    e.respondWith(caches.match(key, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok && req.mode !== 'navigate') { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }).catch(() => caches.match('index.html'))));
    return;
  }

  // Firebase SDK ও ফন্ট: cache-first রানটাইম ক্যাশ
  if (RUNTIME_HOSTS.includes(url.hostname)) {
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') c.put(req, res.clone());
      return res;
    }))).catch(() => caches.match(req)));
  }
  // বাকি সব (Firestore, Auth) — সরাসরি নেটওয়ার্কে, Firebase নিজের অফলাইন ক্যাশ চালায়
});
