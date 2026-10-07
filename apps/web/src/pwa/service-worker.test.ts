import { describe, it, expect, vi } from 'vitest';
import { serviceWorkerSource } from '../../tooling/service-worker';
import { prepareReload, registerReloadGuard } from './reload-guards';

function setup() {
  const handlers: Record<string, (event: unknown) => void> = {};
  const match = vi.fn(async (request: string | { url: string }) => {
    const path = typeof request === 'string' ? request : new URL(request.url).pathname;
    return ['/index.html', '/assets/story.js'].includes(path) ? new Response(path) : undefined;
  });
  const addAll = vi.fn(async () => {});
  const cache = { match, addAll };
  const caches = { open: vi.fn(async () => cache), keys: vi.fn(async () => ['ebenezer-app-v1']) };
  const scope = {
    location: { origin: 'https://example.test' },
    clients: { claim: vi.fn(async () => {}) },
    skipWaiting: vi.fn(async () => {}),
    addEventListener: (name: string, handler: (event: unknown) => void) => {
      handlers[name] = handler;
    },
  };
  const network = vi.fn(async () => {
    throw new Error('Offline');
  });
  new Function(
    'self',
    'caches',
    'fetch',
    'URL',
    'Response',
    serviceWorkerSource('v1', ['/index.html', '/assets/story.js']),
  )(scope, caches, network, URL, Response);
  return { handlers, scope, caches, addAll, network };
}
describe('offline service worker', () => {
  it('removes redirect metadata from the cached shell for Safari navigation', async () => {
    const { handlers, caches } = setup();
    const shell = new Response('app shell', { headers: { 'Content-Type': 'text/html' } });
    Object.defineProperty(shell, 'redirected', { value: true });
    (await caches.open()).match.mockResolvedValueOnce(shell);
    let response: Promise<Response> | undefined;
    handlers.fetch({
      request: { url: 'https://example.test/', method: 'GET', mode: 'navigate' },
      respondWith: (promise: Promise<Response>) => {
        response = promise;
      },
    });
    const result = await response!;
    expect(result.redirected).toBe(false);
    expect(result.headers.get('Content-Type')).toBe('text/html');
    expect(await result.text()).toBe('app shell');
  });
  it('precaches the complete build and does not skip waiting during install', async () => {
    const { handlers, addAll, scope } = setup();
    let work: Promise<unknown> | undefined;
    handlers.install({
      waitUntil: (promise: Promise<unknown>) => {
        work = promise;
      },
    });
    await work;
    expect(addAll).toHaveBeenCalledWith(['/index.html', '/assets/story.js']);
    expect(scope.skipWaiting).not.toHaveBeenCalled();
    handlers.message({ data: { type: 'ACTIVATE_UPDATE' }, waitUntil: () => {} });
    expect(scope.skipWaiting).toHaveBeenCalledOnce();
  });
  it('reopens deep routes and lazy screens without network and bypasses API/private requests', async () => {
    const { handlers, network } = setup();
    let response: Promise<Response> | undefined;
    const respondWith = (promise: Promise<Response>) => {
      response = promise;
    };
    handlers.fetch({
      request: { url: 'https://example.test/reflection', method: 'GET', mode: 'navigate' },
      respondWith,
    });
    expect(await (await response!).text()).toBe('/index.html');
    handlers.fetch({
      request: { url: 'https://example.test/assets/story.js', method: 'GET', mode: 'cors' },
      respondWith,
    });
    expect(await (await response!).text()).toBe('/assets/story.js');
    const bypass = vi.fn();
    for (const url of [
      'https://example.test/api/stones',
      'https://example.test/v1/me',
      'https://example.test/auth/session',
      'https://example.test/health',
      'https://api.example.test/stones',
    ]) {
      handlers.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: bypass });
    }
    expect(bypass).not.toHaveBeenCalled();
    expect(network).not.toHaveBeenCalled();
  });
  it('serves only the static shell for callback navigation and bypasses callback data requests', async () => {
    const { handlers, caches } = setup();
    let response: Promise<Response> | undefined;
    handlers.fetch({
      request: {
        url: 'https://example.test/auth/callback?code=one-use-code',
        method: 'GET',
        mode: 'navigate',
      },
      respondWith: (promise: Promise<Response>) => {
        response = promise;
      },
    });
    expect(await (await response!).text()).toBe('/index.html');
    expect((await caches.open()).match).toHaveBeenCalledWith('/index.html');
    const bypass = vi.fn();
    handlers.fetch({
      request: {
        url: 'https://example.test/auth/callback?code=one-use-code',
        method: 'GET',
        mode: 'cors',
      },
      respondWith: bypass,
    });
    expect(bypass).not.toHaveBeenCalled();
  });
  it('waits for saved drafts and propagates failed reload guards', async () => {
    const save = vi.fn(async () => {});
    const remove = registerReloadGuard(save);
    await prepareReload();
    expect(save).toHaveBeenCalledOnce();
    remove();
    const removeFailure = registerReloadGuard(async () => {
      throw new Error('Unsaved edits');
    });
    await expect(prepareReload()).rejects.toThrow('Unsaved edits');
    removeFailure();
  });
});

describe('reminder notifications', () => {
  function setupPush(
    windows: { url: string; focus: () => Promise<void>; postMessage: (m: unknown) => void }[] = [],
  ) {
    const records = new Map<string, Response>();
    const wordCache = {
      match: async (path: string) => records.get(path)?.clone(),
      put: async (path: string, response: Response) => {
        records.set(path, response);
      },
      keys: async () => [...records.keys()],
      delete: async (path: string) => records.delete(path),
    };
    const handlers: Record<string, (event: unknown) => void> = {};
    const scope = {
      location: { origin: 'https://example.test' },
      registration: { showNotification: vi.fn(async () => {}) },
      clients: {
        claim: vi.fn(async () => {}),
        matchAll: vi.fn(async () => windows),
        openWindow: vi.fn(async () => {}),
      },
      addEventListener: (name: string, handler: (event: unknown) => void) => {
        handlers[name] = handler;
      },
    };
    new Function('self', 'caches', 'fetch', 'URL', 'Response', serviceWorkerSource('v1', []))(
      scope,
      { open: async () => wordCache },
      vi.fn(),
      URL,
      Response,
    );
    const run = async (name: string, event: object) => {
      let work: Promise<unknown> | undefined;
      handlers[name]({ ...event, waitUntil: (promise: Promise<unknown>) => (work = promise) });
      await work;
    };
    return { scope, run, records };
  }

  it('shows the reminder with its text and page, and ignores unsafe or malformed data', async () => {
    const { scope, run } = setupPush();
    await run('push', {
      data: {
        json: () => ({
          title: 'Ebenezer',
          body: 'A moment for you',
          url: '/reflection?from=today',
          tag: 'evening',
        }),
      },
    });
    expect(scope.registration.showNotification).toHaveBeenCalledWith('Ebenezer', {
      body: 'A moment for you',
      tag: 'evening',
      renotify: true,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { url: '/reflection?from=today' },
    });
    await run('push', {
      data: { json: () => ({ title: 'x', url: 'https://evil.example/phish', tag: 'other' }) },
    });
    expect(scope.registration.showNotification).toHaveBeenLastCalledWith(
      'x',
      expect.objectContaining({ tag: 'ebenezer', data: { url: '/' } }),
    );
    await run('push', {
      data: {
        json: () => {
          throw new Error('not json');
        },
      },
    });
    expect(scope.registration.showNotification).toHaveBeenLastCalledWith(
      'Ebenezer',
      expect.anything(),
    );
  });

  it('a tap routes an open app in place, or opens the app at the reminder page', async () => {
    const focus = vi.fn(async () => {});
    const postMessage = vi.fn();
    const open = setupPush([{ url: 'https://example.test/story', focus, postMessage }]);
    const close = vi.fn();
    await open.run('notificationclick', {
      notification: { close, data: { url: '/reflection?from=today' } },
    });
    expect(close).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(postMessage).toHaveBeenCalledWith({ type: 'OPEN_PATH', path: '/reflection?from=today' });
    expect(open.scope.clients.openWindow).not.toHaveBeenCalled();

    const closed = setupPush();
    await closed.run('notificationclick', { notification: { close, data: { url: '/' } } });
    expect(closed.scope.clients.openWindow).toHaveBeenCalledWith('/');
  });
  it('keeps the originally delivered verse and attribution offline, without cutting the preview body', async () => {
    const { run, records, scope } = setupPush();
    const word = {
      date: '2026-10-07',
      text: 'We love because He first loved us.',
      reference: '1 John 4:19',
      provider: 'youversion',
      translation: 'BSB',
      attribution: 'Publisher public domain credit. '.repeat(12),
    };
    const body = `${word.text}\n${word.reference} · BSB\n${word.attribution}`;
    await run('push', {
      data: {
        json: () => ({
          title: 'Breathe in the Word',
          tag: 'morning',
          body,
          word,
          url: '/notification/morning/2026-10-07',
        }),
      },
    });
    expect(await records.get('/notification-word/2026-10-07')!.clone().json()).toEqual(word);
    expect(scope.registration.showNotification).toHaveBeenCalledWith(
      'Breathe in the Word',
      expect.objectContaining({ body }),
    );
    await run('push', {
      data: { json: () => ({ tag: 'evening', word: { ...word, text: 'A different verse.' } }) },
    });
    expect((await records.get('/notification-word/2026-10-07')!.clone().json()).text).toBe(
      word.text,
    );
  });
});
