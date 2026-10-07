import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { setTimeout, clearTimeout } from 'node:timers';
const fetch = globalThis.fetch;
// Production PWA smoke test using installed Chrome and its DevTools protocol.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, extname, dirname } from 'node:path';
import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const WebSocket =
  globalThis.WebSocket ??
  require(require.resolve('ws', { paths: [dirname(require.resolve('jsdom'))] }));
const dist = resolve(import.meta.dirname, '../dist');
const profile = await mkdtemp(resolve(tmpdir(), 'ebenezer-pwa-test-'));
const localModel = globalThis.process.argv.includes('--journey-bible');
const modelFiles = [
  'config.json',
  'tokenizer_config.json',
  'tokenizer.json',
  'onnx/model_quantized.onnx',
];
const modelConfig = JSON.parse(await readFile(resolve(dist, 'bible/model-config.json'), 'utf8'));
let revision = 1;
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.wasm': 'application/wasm',
  '.css': 'text/css',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    if (localModel && modelFiles.some((file) => path === `/smoke-model/${file}`)) {
      const file = path.slice('/smoke-model/'.length);
      const body = await readFile(
        resolve(
          import.meta.dirname,
          `bible/.model-cache/${modelConfig.modelId}/${modelConfig.revision}/${file}`,
        ),
      );
      res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
      res.end(body);
      return;
    }
    const name = path === '/' || !extname(path) ? '/index.html' : path;
    let body = await readFile(resolve(dist, `.${name}`));
    if (path === '/sw.js')
      body = Buffer.from(
        body.toString().replace(/const CACHE = '([^']+)'/, `const CACHE = '$1-smoke-${revision}'`),
      );
    res.writeHead(200, {
      'Content-Type': types[extname(name)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const origin = `http://localhost:${server.address().port}`;
const chrome = spawn(
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ],
  { stdio: ['ignore', 'ignore', 'pipe'] },
);
let socket;
try {
  const browserUrl = await new Promise((done, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(new Error('Chrome startup timed out')), 20000);
    chrome.stderr.on('data', (data) => {
      output += data;
      const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timeout);
        done(match[1]);
      }
    });
    chrome.on('exit', () => {
      clearTimeout(timeout);
      reject(new Error('Chrome exited'));
    });
  });
  const port = new URL(browserUrl).port;
  const target = await (
    await fetch(`http://127.0.0.1:${port}/json/new?${origin}`, { method: 'PUT' })
  ).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((done) => socket.addEventListener('open', done, { once: true }));
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const data = JSON.parse(event.data);
    if (!data.id) return;
    const pair = pending.get(data.id);
    pending.delete(data.id);
    if (data.error) pair.reject(new Error(data.error.message));
    else pair.done(data.result);
  });
  const send = (method, params = {}) =>
    new Promise((done, reject) => {
      const id = ++nextId;
      pending.set(id, { done, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const wait = async (expression, attempts = 100) => {
    for (let i = 0; i < attempts; i++) {
      try {
        if (await evaluate(expression)) return;
      } catch {
        /* Context may be replaced during reload. */
      }
      await new Promise((done) => setTimeout(done, 100));
    }
    throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}`);
  };
  await send('Network.enable');
  await wait('document.body.innerText.includes("Application assets are cached")');
  assert(await evaluate('!!navigator.serviceWorker.controller'), 'Worker should control the page');
  const cached = await evaluate(
    '(async () => { const names = await caches.keys(); return (await (await caches.open(names.find(n => n.startsWith("ebenezer-app-")))).keys()).map(r => new URL(r.url).pathname); })()',
  );
  assert(cached.includes('/index.html'));
  assert(cached.some((name) => name.endsWith('.woff2')));
  assert(
    await evaluate(
      'document.body.innerText.includes("Welcome to Ebenezer.") && !document.querySelector("aside")',
    ),
    'First visit should show standalone onboarding',
  );
  if (globalThis.process.argv.includes('--welcome-screenshot')) {
    for (const [label, width, height, mobile] of [
      ['desktop', 1366, 900, false],
      ['mobile', 390, 844, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-welcome-${label}.png`, Buffer.from(capture.data, 'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
  }

  if (globalThis.process.argv.includes('--journey-screenshot')) {
    await send('Page.navigate', { url: `${origin}/reflection` });
    await wait('document.body.innerText.includes("What’s on your heart today?")');
    assert(
      await evaluate(
        '!!document.querySelector("textarea") && !document.querySelector("textarea").closest("details")',
      ),
      'Heart writing space should be open immediately',
    );
    for (const [label, width, height, mobile, dark] of [
      ['desktop', 1600, 1000, false, false],
      ['mobile', 390, 844, true, false],
      ['desktop-dark', 1600, 1000, false, true],
      ['mobile-dark', 390, 844, true, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      await evaluate(
        `document.documentElement.classList.toggle('dark', ${dark}); window.scrollTo(0, 0)`,
      );
      assert(
        await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
        'Journey should not overflow horizontally',
      );
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-journey-${label}.png`, Buffer.from(capture.data, 'base64'));
      await evaluate('document.querySelector("textarea").scrollIntoView({block:"center"})');
      assert(
        await evaluate(
          'window.scrollY > 0 && Math.abs(document.querySelector("#main-content").previousElementSibling.getBoundingClientRect().top) < 1',
        ),
        `App header should stay at the top while scrolling on ${label}`,
      );
      await evaluate('document.querySelector("h2").scrollIntoView({block:"start"})');
      assert(
        await evaluate(
          'document.querySelector("h2").getBoundingClientRect().top >= document.querySelector("#main-content").previousElementSibling.getBoundingClientRect().bottom',
        ),
        `Journey heading should remain below the sticky header on ${label}`,
      );
      await evaluate('document.querySelector("textarea").scrollIntoView({block:"center"})');
      const heartCapture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-heart-${label}.png`, Buffer.from(heartCapture.data, 'base64'));
    }
    await evaluate("document.documentElement.classList.remove('dark')");
    await send('Emulation.clearDeviceMetricsOverride');
  }

  if (globalThis.process.argv.includes('--tower-screenshot')) {
    await evaluate(`(async () => {
      const db = await new Promise((done, reject) => { const r = indexedDB.open('ebenezer-journal'); r.onsuccess = () => done(r.result); r.onerror = () => reject(r.error); });
      const tx = db.transaction('stones', 'readwrite');
      const tones = ['bright', 'bright', 'hard', 'hard', 'mixed', 'bright', 'hard', 'bright'];
      tones.forEach((tone, i) => tx.objectStore('stones').put({
        id: 'tower-smoke-' + i, accountId: 'local', journalDate: '2026-09-' + String(i + 1).padStart(2, '0'),
        createdAt: '2026-09-' + String(i + 1).padStart(2, '0') + 'T12:00:00Z', updatedAt: new Date().toISOString(), version: 0, syncState: 'local',
        feel: tone === 'hard' ? 'lonely' : 'grateful', ref: ['1 Samuel 7:12', '1 Peter 5:7', 'Psalm 61:2'][i % 3], readConfirmed: true,
        stood: 'God cares for me, even far from home.', learned: 'I can bring my worries to Him.', questions: '', thoughts: '', prayer: 'Help me find community.', partner: 'Alex',
        memory: ['A friend invited me to dinner', 'A prayer of thanks', 'A lonely evening', 'An overwhelming week', 'A little hope', 'A moment of joy', 'Waiting with faith', 'Remembering His faithfulness'][i], tone
      }));
      await new Promise((done, reject) => { tx.oncomplete = done; tx.onerror = () => reject(tx.error); });
      db.close();
    })()`);
    await send('Page.navigate', { url: `${origin}/story` });
    await wait(
      'document.querySelector("svg[role=group]")?.querySelectorAll("[role=button]").length === 8',
    );
    for (const [label, width, height, mobile] of [
      ['desktop', 1366, 900, false],
      ['mobile', 390, 844, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-tower-${label}.png`, Buffer.from(capture.data, 'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
  }

  await send('Page.navigate', { url: `${origin}/settings` });
  await wait(
    '!!Array.from(document.querySelectorAll("input")).find(input => input.type === "text")',
  );
  await wait('document.body.innerText.includes("You don’t have to walk alone.")');
  if (globalThis.process.argv.includes('--account-screenshot')) {
    for (const [label, width, height, mobile] of [
      ['desktop', 1366, 900, false],
      ['mobile', 390, 844, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      assert(
        await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
        'Account screen should fit the viewport',
      );
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-account-${label}.png`, Buffer.from(capture.data, 'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
  }
  await wait(
    '(async () => { const r = indexedDB.open("ebenezer-journal"); return await new Promise(done => { r.onsuccess = () => { const result = r.result.objectStoreNames.contains("drafts"); r.result.close(); done(result); }; }); })()',
  );
  // Seed an in-progress reflection through the native IndexedDB API.
  await evaluate(
    `(async () => { const db = await new Promise((done, reject) => { const r = indexedDB.open('ebenezer-journal'); r.onsuccess = () => done(r.result); r.onerror = () => reject(r.error); }); const tx = db.transaction('drafts', 'readwrite'); tx.objectStore('drafts').put({id:'local:reflection',step:3,updatedAt:new Date().toISOString(),values:{feel:'grateful',ref:'1 Samuel 7:12',readConfirmed:true,stood:'Offline draft',learned:'',questions:'',thoughts:'',prayer:'',partner:'',memory:'',tone:''}}); await new Promise((done,reject) => {tx.oncomplete=done;tx.onerror=()=>reject(tx.error);}); db.close(); })()`,
  );
  await send('Network.emulateNetworkConditions', {
    offline: true,
    latency: 0,
    downloadThroughput: 0,
    uploadThroughput: 0,
  });
  await send('Page.navigate', { url: `${origin}/reflection` });
  await wait('document.querySelector("textarea")?.value === "Offline draft"');
  assert(
    await evaluate(
      'document.querySelectorAll("textarea").length === 5 && Array.from(document.querySelectorAll("textarea")).every(input => !input.closest("details"))',
    ),
    'Every reflection writing space should be open offline',
  );
  if (globalThis.process.argv.includes('--journey-screenshot')) {
    for (const [label, width, height, mobile, dark] of [
      ['desktop', 1600, 1000, false, false],
      ['mobile', 390, 844, true, false],
      ['desktop-dark', 1600, 1000, false, true],
      ['mobile-dark', 390, 844, true, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      await evaluate(
        `document.documentElement.classList.toggle('dark', ${dark}); window.scrollTo(0, 0)`,
      );
      assert(
        await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
        'Reflection writing spaces should fit the screen',
      );
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-reflect-${label}.png`, Buffer.from(capture.data, 'base64'));
      await evaluate(`(() => {
        const card = document.querySelector('textarea').closest('[data-slot="card"]');
        const header = document.querySelector('#main-content').previousElementSibling;
        window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - header.getBoundingClientRect().height - 20);
      })()`);
      const writingCapture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(
        `/tmp/ebenezer-reflect-writing-${label}.png`,
        Buffer.from(writingCapture.data, 'base64'),
      );
    }
    await evaluate("document.documentElement.classList.remove('dark')");
    await send('Emulation.clearDeviceMetricsOverride');
  }
  await evaluate(
    `(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'Written offline'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`,
  );
  // Autosave is silent, so confirm the debounced draft reached IndexedDB.
  await wait(
    `(async () => { const db = await new Promise((done, reject) => { const r = indexedDB.open('ebenezer-journal'); r.onsuccess = () => done(r.result); r.onerror = () => reject(r.error); }); const draft = await new Promise((done) => { const q = db.transaction('drafts').objectStore('drafts').get('local:reflection'); q.onsuccess = () => done(q.result); q.onerror = () => done(undefined); }); db.close(); return draft?.values.stood === 'Written offline'; })()`,
  );
  await send('Page.reload');
  await wait('document.querySelector("textarea")?.value === "Written offline"');
  await send('Page.navigate', { url: `${origin}/story` });
  await wait('document.body.innerText.includes("Thus far, the Lord has helped me")');
  if (globalThis.process.argv.includes('--tower-screenshot')) {
    await wait(
      'document.querySelector("svg[role=group]")?.querySelectorAll("[role=button]").length === 8',
    );
    await evaluate(
      'document.querySelector("svg[role=group] [role=button]").dispatchEvent(new KeyboardEvent("keydown", {key:"Enter", bubbles:true}))',
    );
    await wait(
      'document.querySelector("dialog[open]")?.innerText.includes("A friend invited me to dinner")',
    );
    assert(
      await evaluate(
        'document.querySelector("dialog[open]").innerText.includes("Hitherto hath the LORD helped us")',
      ),
      'Saved stone should open Scripture offline',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("dialog[open] button")).find(button => button.getAttribute("aria-label") === "Close memory").click()',
    );
    globalThis.console.log('PASS: tower and saved Scripture/reflection open offline by keyboard.');
  }
  await send('Page.navigate', { url: `${origin}/settings` });
  await wait('document.body.innerText.includes("You can keep your journal here while offline")');
  assert(
    await evaluate('!!document.querySelector("input[type=text]")'),
    'Private preferences remain available offline',
  );
  await send('Page.navigate', {
    url: `${origin}/auth/callback?error=access_denied&error_description=private-provider-details`,
  });
  await wait(
    'document.body.innerText.includes("You didn’t finish signing in.") && !location.search && !location.hash',
  );
  assert(
    !(await evaluate('document.body.innerText')).includes('private-provider-details'),
    'Callback should show a friendly error without provider details',
  );
  assert(
    await evaluate(
      '(async () => { for (const name of await caches.keys()) { if (!name.startsWith("ebenezer-app-")) continue; for (const request of await (await caches.open(name)).keys()) { const url = new URL(request.url); if (url.pathname.startsWith("/v1/") || url.pathname.startsWith("/auth/") || url.search.includes("code=")) return false; } } return true; })()',
    ),
    'Account responses and callback URLs must not enter app caches',
  );
  globalThis.console.log(
    'PASS: account settings and safe callback shell reopen offline without caching Auth or profile responses.',
  );
  await send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 0,
    downloadThroughput: -1,
    uploadThroughput: -1,
  });
  await send('Page.navigate', { url: `${origin}/reflection` });
  await wait('document.querySelector("textarea")?.value === "Written offline"');
  revision = 2;
  await evaluate(
    '(async () => { const registration = await navigator.serviceWorker.getRegistration(); await registration.update(); })()',
  );
  await wait('document.body.innerText.includes("An update is ready")');
  assert(
    await evaluate('(async () => !!(await navigator.serviceWorker.getRegistration()).waiting)()'),
    'Update must wait for user approval',
  );
  await evaluate(
    `(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'Update-safe draft'); input.dispatchEvent(new Event('input',{bubbles:true})); Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Update and reload').click(); })()`,
  );
  await wait(
    '(async () => (await caches.keys()).some(n => n.endsWith("smoke-2")) && !document.body.innerText.includes("An update is ready") && document.querySelector("textarea")?.value === "Update-safe draft")()',
  );
  if (globalThis.process.argv.includes('--bible')) {
    await send('Page.navigate', { url: `${origin}/bible-search` });
    await wait('document.body.innerText.includes("Tell us what’s on your heart")');
    await evaluate(
      `(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'I am exhausted from caring for my family and need rest.'); input.dispatchEvent(new Event('input',{bubbles:true})); Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Search Scripture').click(); })()`,
    );
    await wait(
      'document.body.innerText.includes("Search completed") || document.body.innerText.includes("Search setup failed") || document.body.innerText.includes("Search could not complete")',
      1800,
    );
    const body = await evaluate('document.body.innerText');
    assert(body.includes('Search completed'), body);
    assert(body.includes('Matthew 11:28–30'), 'Relevant passage expected');
    const report = JSON.parse(
      await readFile(resolve(dist, '../../../docs/bible-search/evaluation.json'), 'utf8'),
    );
    const expected = report.results.find((row) => row.id === 'exhausted').results.context;
    const browserReferences = await evaluate(
      'Array.from(document.querySelectorAll("h2")).map(node => node.textContent).filter(text => /[0-9]+:[0-9]+/.test(text))',
    );
    assert.deepEqual(
      browserReferences,
      expected.map((result) => result.reference),
      'Browser and Node should agree on the three ranked passages for this fixture',
    );
    globalThis.console.log('Browser timing:', body.match(/Search completed in [0-9]+ ms\./)?.[0]);

    assert(
      body.includes('The model and selected search data are cached'),
      'All model files should be cached',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Read Matthew 11").click()',
    );
    await wait('document.body.innerText.includes("The selected verses are highlighted")');
    assert(
      await evaluate('document.body.innerText.includes("John")'),
      'Full chapter should include surrounding context',
    );
    // Fetch the optional full-Bible package using the same worker/model.
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Back to suggestions").click()',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("[role=combobox]")).find(b => b.textContent.includes("50 passages")).dispatchEvent(new KeyboardEvent("keydown", {key:"Enter",bubbles:true}))',
    );
    await wait(
      'Array.from(document.querySelectorAll("[role=option]")).some(b => b.textContent === "Full Bible — experimental")',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("[role=option]")).find(b => b.textContent === "Full Bible — experimental").click()',
    );
    await evaluate(
      `(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'I feel loved.'); input.dispatchEvent(new Event('input',{bubbles:true})); Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Search Scripture').click(); })()`,
    );
    await wait(
      'document.body.innerText.includes("Search completed") || document.body.innerText.includes("Search setup failed") || document.body.innerText.includes("Search could not complete")',
      1800,
    );
    assert(
      (await evaluate('document.body.innerText')).includes('Search completed'),
      await evaluate('document.body.innerText'),
    );
    const fullReport = JSON.parse(
      await readFile(resolve(dist, '../../../docs/bible-search/full-evaluation.json'), 'utf8'),
    );
    const fullReferences = await evaluate(
      'Array.from(document.querySelectorAll("h2")).map(node => node.textContent).filter(text => /[0-9]+:[0-9]+/.test(text))',
    );
    assert.deepEqual(
      fullReferences,
      fullReport.results.find((row) => row.id === 'loved').full.map((row) => row.reference),
      'Full-Bible browser results must agree with Node',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Read Jeremiah 31").click()',
    );
    await wait('document.body.innerText.includes("The selected verses are highlighted")');
    assert(
      (await evaluate('document.querySelectorAll("[lang=en] p").length')) >= 40,
      'Full chapter context should be available',
    );
    await send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await send('Page.reload');
    await wait('!!document.querySelector("textarea")');
    await evaluate(
      'Array.from(document.querySelectorAll("[role=combobox]")).find(b => b.textContent.includes("50 passages")).dispatchEvent(new KeyboardEvent("keydown", {key:"Enter",bubbles:true}))',
    );
    await wait(
      'Array.from(document.querySelectorAll("[role=option]")).some(b => b.textContent === "Full Bible — experimental")',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("[role=option]")).find(b => b.textContent === "Full Bible — experimental").click()',
    );

    await evaluate(
      `(() => { const input = document.querySelector('textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'I am exhausted and need rest.'); input.dispatchEvent(new Event('input',{bubbles:true})); Array.from(document.querySelectorAll('button')).find(b => b.textContent === 'Search Scripture').click(); })()`,
    );
    await wait(
      'document.body.innerText.includes("Search completed") || document.body.innerText.includes("Search setup failed") || document.body.innerText.includes("Search could not complete")',
      1800,
    );
    assert(
      (await evaluate('document.body.innerText')).includes('Search completed'),
      await evaluate('document.body.innerText'),
    );
    const results = await evaluate(
      'Array.from(document.querySelectorAll("blockquote")).map(node => node.textContent)',
    );
    assert.equal(results.length, 3);
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => /^Read /.test(b.textContent)).click()',
    );
    await wait('document.body.innerText.includes("The selected verses are highlighted")');
    assert(
      (await evaluate('document.querySelectorAll("[lang=en] p").length')) > 0,
      'Full chapter should open offline',
    );

    globalThis.console.log(
      'PASS: real browser WASM inference, relevant results, full chapter reader, and sample/full-Bible search and full chapter reading after offline reload.',
    );
  }
  if (localModel) {
    // Use the existing pinned Node artifacts to test real browser inference without redownloading.
    await evaluate(`(async () => {
      const cache = await caches.open('ebenezer-bible-model-${modelConfig.revision}');
      for (const file of ${JSON.stringify(modelFiles)}) {
        const response = await fetch('/smoke-model/' + file);
        if (!response.ok) throw new Error('Pinned local model artifact missing');
        await cache.put('https://huggingface.co/${modelConfig.modelId}/resolve/${modelConfig.revision}/' + file, response);
      }
      const db = await new Promise((done, reject) => { const r = indexedDB.open('ebenezer-journal'); r.onsuccess = () => done(r.result); r.onerror = () => reject(r.error); });
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').put({ id: 'local:reflection', step: 0, updatedAt: new Date().toISOString(), values: {
        feel: 'lonely', feelings: ['lonely', 'hopeful'], checkIn: 'I am not loved. I miss home and want encouragement.',
        ref: '', readConfirmed: false, stood: '', learned: '', questions: '', thoughts: '', prayer: '', partner: '', memory: '', tone: ''
      }});
      await new Promise((done, reject) => { tx.oncomplete = done; tx.onerror = () => reject(tx.error); }); db.close();
    })()`);
    await send('Network.emulateNetworkConditions', {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    await send('Page.navigate', { url: `${origin}/reflection` });
    await wait('document.body.innerText.includes("What’s on your heart today?")');
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Find a little encouragement")).click()',
    );
    await wait(
      '!!document.querySelector("blockquote") || document.body.innerText.includes("Scripture search isn’t ready")',
      600,
    );
    assert(
      await evaluate('!!document.querySelector("blockquote")'),
      await evaluate('document.body.innerText'),
    );
    assert(
      await evaluate('!document.querySelector("[role=radiogroup]")'),
      'Journey should bring Scripture forward without passage choices',
    );
    // Wait for the ordinary debounced autosave before reading the complete snapshot.
    await wait(`(async () => {
      const db = await new Promise(done => { const r = indexedDB.open('ebenezer-journal'); r.onsuccess = () => done(r.result); });
      const draft = await new Promise(done => { const r = db.transaction('drafts').objectStore('drafts').get('local:reflection'); r.onsuccess = () => done(r.result); }); db.close(); return !!draft?.values.scripture;
    })()`);
    const text = await evaluate('document.querySelector("blockquote").textContent');
    const sample = JSON.parse(await readFile(resolve(dist, 'bible/sample.json'), 'utf8'));
    assert(
      sample.passages.some((p) => text === `“${p.text}”`),
      'Journey must show exact verified Scripture',
    );
    globalThis.console.log(
      'Journey Scripture:',
      await evaluate(
        'Array.from(document.querySelectorAll("p")).find(p => p.textContent.includes(" · WEB Classic")).textContent',
      ),
    );
    for (const [label, width, height, mobile] of [
      ['desktop', 1600, 1000, false],
      ['mobile', 390, 844, true],
    ]) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor: 1,
        mobile,
      });
      await evaluate('window.scrollTo(0,0)');
      assert(
        await evaluate('document.documentElement.scrollWidth <= window.innerWidth'),
        'Suggested Scripture should fit the screen',
      );
      const capture = await send('Page.captureScreenshot', { format: 'png' });
      await writeFile(`/tmp/ebenezer-word-${label}.png`, Buffer.from(capture.data, 'base64'));
    }
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Page.reload');
    await wait('!!document.querySelector("blockquote")');
    assert.equal(
      await evaluate('document.querySelector("blockquote").textContent'),
      text,
      'Saved passage should reopen offline unchanged',
    );
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent === "Spend time with the whole chapter").click()',
    );
    await wait('!!document.querySelector("dialog[open]")');
    assert(
      await evaluate('document.querySelectorAll("dialog[open] [lang=en] p").length > 1'),
      'Stored chapter should open offline',
    );
    await evaluate('document.querySelector("dialog[open] button[aria-label]").click()');
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("What stayed with me?")).click()',
    );
    await wait('!!document.querySelector("textarea[name=stood]")');
    await evaluate(
      `(() => { const input = document.querySelector('textarea[name=stood]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'God’s care meets me far from home.'); input.dispatchEvent(new Event('input',{bubbles:true})); })()`,
    );
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Carry this with me")).click()',
    );
    await wait('document.body.innerText.includes("Who could walk alongside you?")');
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Shape my stone")).click()',
    );
    await wait('!!document.querySelector("textarea[name=memory]")');
    await evaluate(
      `(() => { const input = document.querySelector('textarea[name=memory]'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(input,'Encouragement far from home'); input.dispatchEvent(new Event('input',{bubbles:true})); document.querySelector('input[name=tone][value=mixed]').click(); })()`,
    );
    await evaluate(
      'Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Set my stone")).click()',
    );
    await wait('document.querySelectorAll("svg[role=group] [role=button]").length === 1');
    assert(
      (
        await evaluate(
          'document.querySelector("svg[role=group] [role=button]").getAttribute("aria-label")',
        )
      ).includes('Encouragement far from home'),
      'Saved memory should label its stone',
    );
    await evaluate(
      'document.querySelector("svg[role=group] [role=button]").dispatchEvent(new KeyboardEvent("keydown", {key:"Enter",bubbles:true}))',
    );
    await wait('!!document.querySelector("dialog[open]")');
    assert.equal(
      await evaluate('document.querySelector("dialog[open] blockquote").textContent'),
      text,
      'Stone should retain retrieved Scripture offline',
    );
    globalThis.console.log(
      'PASS: journey automatically retrieves using real cached WASM embeddings, opens its chapter offline, restores the draft and saves Scripture with a stone.',
    );
  }
  globalThis.console.log(
    'PASS: cached deep routes/lazy chunks/fonts, offline draft save/reload, and user-controlled service-worker update.',
  );
} finally {
  socket?.close();
  chrome.kill();
  server.close();
  await new Promise((done) => (chrome.exitCode !== null ? done() : chrome.once('exit', done)));
  await rm(profile, { recursive: true, force: true });
}
