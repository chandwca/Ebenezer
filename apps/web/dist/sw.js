
const CACHE = 'ebenezer-app-bc97bcbf3c1f3920';
const ASSETS = ["/bible-runtime/ort-wasm-simd-threaded.jsep.mjs","/bible/sample.json","/bible/model-config.json","/bible/embeddings-scripture.json","/bible/embeddings-context.json","/index.html","/assets/plus-jakarta-sans-vietnamese-wght-normal-qRpaaN48.woff2","/assets/plus-jakarta-sans-latin-wght-normal-eXO_dkmS.woff2","/assets/plus-jakarta-sans-latin-ext-wght-normal-DmpS2jIq.woff2","/assets/index-C_BV4jff.css","/assets/index-DdoUahUq.js","/assets/auth-callback-DS5-Xd3Z.js","/assets/today-BKAh1M_0.js","/assets/settings-Br1zUR7a.js","/assets/reflection-DdwokkI5.js","/assets/story-DyCowNCK.js","/assets/reminder-prompt-DKRwdLzH.js","/assets/use-reminders-DH6nA2Qg.js","/assets/song-suggestion-CVXxMraV.js","/assets/scripture-sGaSbPXc.js","/assets/pray-D2G4_fWZ.js","/assets/together-BPCgfVHw.js","/assets/confirm-dialog-B7HLiTBq.js","/assets/stone-appearance-vwFkqHQE.js","/assets/use-community-BfqkjjQe.js","/assets/bible-search--uIvCMJn.js","/assets/worker-client-CutWD0qp.js","/assets/bible-results-BeP9JvbF.js","/assets/page-heading-BBRULITN.js","/assets/student-welcome-CMhOfW96.js","/assets/profile-form-BWHlC5hp.js","/assets/journey-D3fNrQuA.js","/assets/user-plus-C8DkKhHe.js","/assets/account-card-Ck0gB7Pj.js","/assets/return-path-Ct03IQfZ.js","/assets/repositories-CGargOA_.js","/assets/client-CLsZGu0o.js","/assets/use-online-status-D5cgiaC4.js","/assets/form-builder-BbKxiiGL.js","/assets/content-layout-GIQ6TnLr.js","/assets/input-CUqxKqn4.js","/assets/ort-wasm-simd-threaded.jsep-B0T3yYHD.wasm","/assets/search.worker-D7klqNLv.js","/icon-180.png","/icon-192.png","/icon-512.png","/manifest.webmanifest"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});
self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
// Morning and evening reminders (supabase/functions). Only short text and an in-app path arrive.
const REMINDER_TAGS = ['morning', 'evening', 'welcome'];
const appPath = value => typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/';
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = typeof data.title === 'string' && data.title ? data.title.slice(0, 80) : 'Ebenezer';
  const body = typeof data.body === 'string' ? data.body.slice(0, 240) : '';
  const tag = REMINDER_TAGS.includes(data.tag) ? data.tag : 'ebenezer';
  event.waitUntil(self.registration.showNotification(title, {
    body, tag, icon: '/icon-192.png', badge: '/icon-192.png', data: { url: appPath(data.url) },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const path = appPath(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const open = windows.find(client => new URL(client.url).origin === self.location.origin);
    // An open app routes itself, so unsaved writing is never lost to a reload.
    if (open) {
      await open.focus();
      open.postMessage({ type: 'OPEN_PATH', path });
      return;
    }
    await self.clients.openWindow(path);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Backend, auth and external data are never cached or replaced by HTML.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/v1/') ||
      (url.pathname.startsWith('/auth/') && url.pathname !== '/auth/callback') || url.pathname === '/health') return;
  // Callback navigation may use the static app shell; never cache a callback URL/code or Auth response.
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(cache => cache.match('/index.html')).then(response => response || fetch(request)));
    return;
  }
  if (!ASSETS.includes(url.pathname) && !url.pathname.startsWith('/assets/')) return;
  event.respondWith((async () => {
    const current = await caches.open(CACHE);
    const cached = await current.match(request);
    if (cached) return cached;
    // Retain prior builds so older open tabs can still load their lazy chunks.
    for (const name of await caches.keys()) {
      if (!name.startsWith('ebenezer-app-') || name === CACHE) continue;
      const previous = await (await caches.open(name)).match(request);
      if (previous) return previous;
    }
    return fetch(request);
  })());
});
