// ╔══════════════════════════════════════════════════════════════╗
// ║   عفراء للتوظيف — Service Worker v3                        ║
// ╚══════════════════════════════════════════════════════════════╝

const CACHE = 'afraa-v3';

const LOCAL_ASSETS = [
  './index.html',
  './landing.html',
  './about.html',
  './marketing.html',
  './css/variables.css',
  './css/components.css',
  './css/pages.css',
  './js/firebase-config.js',
  './js/app.js',
  './js/auth.js',
  './js/jobs.js',
  './js/cv.js',
  './js/interview.js',
  './js/office.js',
  './js/employer.js',
  './js/booking.js',
  './js/quiz.js',
  './js/myapps.js',
  './js/home.js',
  './js/profile.js',
  './js/contact.js',
  './js/payment.js',
  './manifest.json',
  './icons/icon.svg',
];

// ── تثبيت: precache الأصول المحلية ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(LOCAL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── تفعيل: حذف الكاشات القديمة ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// ── طلبات الشبكة ──
const SKIP_HOSTS = [
  'firebaseio.com', 'firebasestorage.googleapis.com', 'googleapis.com',
  'workers.dev', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'gstatic.com',
  'emailjs.com', 'api.telegram.org', 'wa.me',
  'facebook.com', 'twitter.com', 'linkedin.com', 't.me',
  'imgbb.com', 'unpkg.com',
];

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // تخطّي الخدمات الخارجية — الشبكة فقط
  if (SKIP_HOSTS.some(h => url.hostname.includes(h))) return;

  // استراتيجية: Cache first ← ثم الشبكة مع تحديث الكاش
  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchNet = fetch(e.request).then(res => {
          if (res.ok && res.type !== 'opaque') cache.put(e.request, res.clone());
          return res;
        }).catch(() => {
          // Offline fallback: أرجع index.html للطلبات HTML
          if (e.request.headers.get('accept')?.includes('text/html')) {
            return cache.match('./index.html');
          }
        });
        return cached || fetchNet;
      })
    )
  );
});
