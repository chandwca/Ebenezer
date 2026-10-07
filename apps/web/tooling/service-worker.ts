export function serviceWorkerSource(version: string, assets: string[]) {
  return `
const CACHE = 'ebenezer-app-${version}';
const ASSETS = ${JSON.stringify(assets)};
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
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const response = await cache.match('/index.html') || await fetch(request);
      // Pages redirects /index.html to /. Safari rejects redirected navigation responses
      // served by a worker; preserve the content without the original redirect metadata.
      if (response.redirected) return new Response(response.body, {
        status: response.status, statusText: response.statusText, headers: response.headers,
      });
      return response;
    })());
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
`;
}
