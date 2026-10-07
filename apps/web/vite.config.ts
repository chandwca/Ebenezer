import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { serviceWorkerSource } from './tooling/service-worker';

const require = createRequire(import.meta.url);
const runtimeDir = dirname(require.resolve('@huggingface/transformers'));
const runtimeFiles = ['ort-wasm-simd-threaded.jsep.mjs'];
const fullFiles = ['full.json', 'index.json', 'vectors.f32'];
const fullRevision = createHash('sha256')
  .update(readFileSync(new URL('data/bible/index.json', import.meta.url)))
  .digest('hex')
  .slice(0, 16);
const fullManifest = JSON.stringify({
  version: 1,
  files: fullFiles.map((file) => `/bible/full/${fullRevision}/${file}`),
});

function offlineApp(): Plugin {
  return {
    name: 'ebenezer-offline-app',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.startsWith('/bible/full/')) {
          const path = request.url.split('?')[0];
          if (path === '/bible/full/manifest.json') {
            response.setHeader('Content-Type', 'application/json');
            response.end(fullManifest);
            return;
          }
          const file = fullFiles.find((name) => path === `/bible/full/${fullRevision}/${name}`);
          if (!file) return next();
          response.setHeader(
            'Content-Type',
            file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
          );
          response.end(readFileSync(new URL(`data/bible/${file}`, import.meta.url)));
          return;
        }
        const file = request.url?.split('?')[0].replace('/bible-runtime/', '');
        if (!request.url?.startsWith('/bible-runtime/') || !file || !runtimeFiles.includes(file))
          return next();
        response.setHeader(
          'Content-Type',
          file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript',
        );
        response.end(readFileSync(resolve(runtimeDir, file)));
      });
    },
    generateBundle(_, bundle) {
      this.emitFile({ type: 'asset', fileName: 'bible/full/manifest.json', source: fullManifest });
      for (const file of fullFiles)
        this.emitFile({
          type: 'asset',
          fileName: `bible/full/${fullRevision}/${file}`,
          source: readFileSync(new URL(`data/bible/${file}`, import.meta.url)),
        });

      for (const file of runtimeFiles)
        this.emitFile({
          type: 'asset',
          fileName: `bible-runtime/${file}`,
          source: readFileSync(resolve(runtimeDir, file)),
        });
      const bibleFiles = [
        'sample.json',
        'model-config.json',
        'embeddings-scripture.json',
        'embeddings-context.json',
      ];
      const assets = [
        ...runtimeFiles.map((file) => `/bible-runtime/${file}`),
        ...bibleFiles.map((file) => `/bible/${file}`),
        '/index.html',
        ...Object.keys(bundle)
          .filter((name) => !name.endsWith('.map') && !name.startsWith('bible/full/'))
          .map((name) => `/${name}`),
        '/icon-180.png',
        '/icon-192.png',
        '/icon-512.png',
        '/manifest.webmanifest',
      ];
      const hash = createHash('sha256');
      for (const file of bibleFiles)
        hash.update(readFileSync(new URL(`public/bible/${file}`, import.meta.url)));
      for (const item of Object.values(bundle))
        hash.update(item.type === 'chunk' ? item.code : item.source);
      for (const file of [
        'index.html',
        'public/manifest.webmanifest',
        'public/icon-180.png',
        'public/icon-192.png',
        'public/icon-512.png',
      ])
        hash.update(readFileSync(new URL(file, import.meta.url)));
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: serviceWorkerSource(hash.digest('hex').slice(0, 16), [...new Set(assets)]),
      });
    },
  };
}
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\//, replacement: fileURLToPath(new URL('./src/', import.meta.url)) },
      {
        find: /^@bible-wasm\?url$/,
        replacement: resolve(runtimeDir, 'ort-wasm-simd-threaded.jsep.wasm') + '?url',
      },
    ],
  },
  plugins: [react(), tailwindcss(), offlineApp()],
});
