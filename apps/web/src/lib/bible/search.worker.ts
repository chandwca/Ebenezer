import wasmUrl from '@bible-wasm?url';
import { env, pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';
import { rankPassages, validateIndex } from '../../../scripts/bible/search-core.mjs';
import { rankFullPassages, validateFullIndex } from '../../../scripts/bible/full-search-core.mjs';
import type {
  Dataset,
  FullIndex,
  Index,
  ModelConfig,
  SearchRequest,
  WorkerResponse,
} from './types';

const DATA_CACHE = 'ebenezer-bible-data-v1';
let ready:
  | Promise<{
      config: ModelConfig;
      dataset: Dataset;
      indexes: Index[];
      extractor: FeatureExtractionPipeline;
      offlineReady: boolean;
    }>
  | undefined;
let active = false;
const send = (message: WorkerResponse) => self.postMessage(message);

async function cachedFile(path: string, immutable = false) {
  const cache = await caches.open(DATA_CACHE);
  if (immutable) {
    const existing = await cache.match(path);
    if (existing) return existing;
  }
  // Prefer current server data when online; cached data is the offline fallback.
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error('Data unavailable');
    await cache.put(path, response.clone());
    return response;
  } catch {
    const cached = await cache.match(path);
    if (!cached) throw new Error('Download the search data while online first.');
    return cached;
  }
}
async function initialize(id: number) {
  send({ id, type: 'progress', phase: 'loading' });
  const [configResponse, sampleResponse, scriptureResponse, contextResponse] = await Promise.all(
    [
      'model-config.json',
      'sample.json',
      'embeddings-scripture.json',
      'embeddings-context.json',
    ].map((file) => cachedFile(`/bible/${file}`)),
  );
  const config: ModelConfig = await configResponse.json();
  const sampleBytes = await sampleResponse.arrayBuffer();
  const dataset: Dataset = JSON.parse(new TextDecoder().decode(sampleBytes));
  const checksum = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', sampleBytes)),
    (n) => n.toString(16).padStart(2, '0'),
  ).join('');
  const indexes: Index[] = await Promise.all([scriptureResponse.json(), contextResponse.json()]);
  for (const index of indexes)
    validateIndex(
      index,
      config,
      checksum,
      dataset.passages.map((p) => p.id),
    );
  if (
    env.version !== config.runtimeVersion ||
    config.dtype !== 'q8' ||
    config.pooling !== 'mean' ||
    !config.normalize
  )
    throw new Error('Model settings changed; regenerate the index.');
  const modelCache = await caches.open(`ebenezer-bible-model-${config.revision}`);
  env.allowLocalModels = false;
  env.useBrowserCache = false;
  env.useCustomCache = true;
  env.customCache = modelCache;
  env.backends.onnx.wasm!.wasmPaths = {
    mjs: `${self.location.origin}/bible-runtime/ort-wasm-simd-threaded.jsep.mjs`,
    wasm: new URL(wasmUrl, self.location.origin).href,
  };
  env.backends.onnx.wasm!.numThreads = 1;
  env.backends.onnx.wasm!.proxy = false;
  const extractor = await pipeline('feature-extraction', config.modelId, {
    revision: config.revision,
    dtype: config.dtype,
    device: 'wasm',
    progress_callback: (event) => {
      if (event.status === 'progress')
        send({ id, type: 'progress', phase: 'downloading', percent: Math.round(event.progress) });
    },
  });
  extractor.tokenizer.model_max_length = config.maxTokens;
  const modelFiles = [
    'config.json',
    'tokenizer_config.json',
    'tokenizer.json',
    'onnx/model_quantized.onnx',
  ];
  const stored = await modelCache.keys();
  const offlineReady = modelFiles.every((file) =>
    stored.some((request) => new URL(request.url).pathname.endsWith(`/${file}`)),
  );
  return { config, dataset, indexes, extractor, offlineReady };
}
let fullReady: Promise<{ dataset: Dataset; index: FullIndex; binary: Uint8Array }> | undefined;
async function digest(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), (n) =>
    n.toString(16).padStart(2, '0'),
  ).join('');
}
async function initializeFull(config: ModelConfig) {
  const manifest = await (await cachedFile('/bible/full/manifest.json')).json();
  if (
    manifest.version !== 1 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== 3 ||
    manifest.files.some(
      (path: unknown, i: number) =>
        typeof path !== 'string' ||
        !new RegExp(
          `^/bible/full/[a-f0-9]{16}/${['full\\.json', 'index\\.json', 'vectors\\.f32'][i]}$`,
        ).test(path),
    )
  )
    throw new Error('Invalid full-Bible package manifest');
  const [datasetResponse, indexResponse, binaryResponse] = await Promise.all(
    manifest.files.map((path: string) => cachedFile(path, true)),
  );
  const raw: ArrayBuffer = await datasetResponse.arrayBuffer();
  const vectorBytes: ArrayBuffer = await binaryResponse.arrayBuffer();
  const dataset: Dataset = JSON.parse(new TextDecoder().decode(raw));
  const index: FullIndex = await indexResponse.json();
  const binary = new Uint8Array(vectorBytes);
  validateFullIndex(index, binary, config, await digest(raw), await digest(vectorBytes), dataset);
  return { dataset, index, binary };
}
self.onmessage = async (event: MessageEvent<SearchRequest>) => {
  const { id, query, strategy } = event.data;
  if (active) return;
  active = true;
  try {
    if (
      !query.trim() ||
      query.length > 3000 ||
      !['scripture', 'context', 'full'].includes(strategy)
    )
      throw new Error('Invalid search');
    if (!ready)
      ready = initialize(id).catch((error) => {
        ready = undefined;
        throw error;
      });
    const state = await ready;
    let full;
    if (strategy === 'full') {
      if (!fullReady)
        fullReady = initializeFull(state.config).catch((error) => {
          fullReady = undefined;
          throw error;
        });
      full = await fullReady;
    }
    send({ id, type: 'progress', phase: 'searching' });
    const input = state.config.queryPrefix + query.trim();
    const tokenCount = state.extractor
      .tokenizer(input, { truncation: false, padding: false })
      .input_ids.dims.at(-1)!;
    if (tokenCount > state.config.maxTokens) {
      send({ id, type: 'error', code: 'tooLong' });
      return;
    }
    const started = performance.now();
    const output = await state.extractor(input, {
      pooling: state.config.pooling,
      normalize: state.config.normalize,
    });
    const vector = Array.from(output.data, (n) => Number(n));
    if (vector.length !== state.config.dimensions || vector.some((n) => !Number.isFinite(n)))
      throw new Error('Invalid model output');
    const results = full
      ? rankFullPassages(vector, full.index, full.binary).map((match) => {
          const passage = full!.index.passages.find((p) => p.id === match.id)!;
          const chapter = full!.dataset.chapters[passage.chapterKey];
          return {
            passage: {
              ...passage,
              context: '',
              sourceUrl: `https://ebible.org/eng-web/${passage.chapterKey}.htm`,
            },
            chapter,
            score: match.score,
          };
        })
      : rankPassages(vector, state.indexes.find((item) => item.strategy === strategy)!.entries).map(
          (match) => {
            const passage = state.dataset.passages.find((p) => p.id === match.id)!;
            const chapter = state.dataset.chapters[passage.chapterKey];
            if (!chapter) throw new Error('Chapter missing');
            return { passage, chapter, score: match.score };
          },
        );
    send({
      id,
      type: 'result',
      results,
      elapsedMs: Math.round(performance.now() - started),
      offlineReady: state.offlineReady,
    });
  } catch {
    send({
      id,
      type: 'error',
      code: ready && (strategy !== 'full' || fullReady) ? 'search' : 'setup',
    });
  } finally {
    active = false;
  }
};
