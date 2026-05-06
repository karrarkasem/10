// ╔══════════════════════════════════════════════════════════════╗
// ║   عفراء للتوظيف — Service Worker v4                        ║
// ╚══════════════════════════════════════════════════════════════╝

const CACHE = 'afraa-v4';

// فقط الأصول الثابتة التي نادراً ما تتغير
const PRECACHE = [
  './index.html',
  './manifest.json',
  './icons/icon.svg',
];

// خدمات خارجية — نتخطاها دائماً
const SKIP_HOSTS = [
  'firebaseio.com', 'firebasestorage.googleapis.com', 'googleapis.com',
  'workers.dev', 'fonts.googleapis.com', 'fonts.gstatic.com',
  'cdnjs.cloudflare.com', 'cdn.jsdelivr.net', 'gstatic.com',
  'emailjs.com', 'api.telegram.org', 'wa.me',
  'facebook.com', 'twitter.com', 'linkedin.com', 't.me',
  'imgbb.com', 'unpkg.com',
];

// ── تثبيت: precache الأصول الأساسية فقط ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── تفعيل: حذف الكاشات القديمة + إشعار العملاء بالتحديث ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => {
        // أرسل إشعار لجميع التبويبات المفتوحة أن تحديثاً جاهز
        return self.clients.matchAll({ type: 'window' }).then(clients =>
          clients.forEach(c => c.postMessage({ type: 'SW_UPDATED' }))
        );
      })
  );
});

// ── طلبات الشبكة ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (SKIP_HOSTS.some(h => url.hostname.includes(h))) return;

  // الأيقونات والمانيفست → Cache First (نادراً تتغير)
  if (url.pathname.match(/\.(svg|png|ico|webp|woff2?)$/) || url.pathname.endsWith('manifest.json')) {
    e.respondWith(cacheFirst(e.request));
    return;
  }

  // HTML + JS + CSS → Network First (دائماً أحدث إصدار)
  e.respondWith(networkFirst(e.request));
});

// Network First: جرّب الشبكة أولاً، ارجع للكاش إذا أوفلاين
async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (res.ok && res.type !== 'opaque') cache.put(req, res.clone());
    return res;
  } catch {
    const cached = await cache.match(req);
    if (cached) return cached;
    // Offline fallback للصفحات
    if (req.headers.get('accept')?.includes('text/html')) {
      return cache.match('./index.html') || new Response('Offline', { status: 503 });
    }
    return new Response('', { status: 503 });
  }
}

// Cache First: أرجع الكاش فوراً، حدّث في الخلفية
async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(req);
  if (cached) {
    fetch(req).then(res => { if (res.ok) cache.put(req, res.clone()); }).catch(() => {});
    return cached;
  }
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return new Response('', { status: 408 });
  }
}
