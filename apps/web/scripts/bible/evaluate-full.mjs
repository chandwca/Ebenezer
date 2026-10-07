import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadExtractor } from './embedding-runtime.mjs';
import { rankPassages, validateIndex } from './search-core.mjs';
import { validateFullIndex, rankFullPassages } from './full-search-core.mjs';

const folder = new URL('../../data/bible/', import.meta.url);
const raw = await readFile(new URL('full.json', folder));
const dataset = JSON.parse(raw);
const index = JSON.parse(await readFile(new URL('index.json', folder), 'utf8'));
const binary = await readFile(new URL('vectors.f32', folder));
const config = JSON.parse(
  await readFile(new URL('../../public/bible/model-config.json', import.meta.url), 'utf8'),
);
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
validateFullIndex(index, binary, config, sha(raw), sha(binary), dataset);
const sampleRaw = await readFile(new URL('../../public/bible/sample.json', import.meta.url));
const sample = JSON.parse(sampleRaw);
const baseline = JSON.parse(
  await readFile(new URL('../../public/bible/embeddings-context.json', import.meta.url), 'utf8'),
);
validateIndex(
  baseline,
  config,
  sha(sampleRaw),
  sample.passages.map((p) => p.id),
);
const cases = [
  { id: 'loved', query: 'I feel loved.' },
  { id: 'unloved', query: 'I feel unloved.' },
  { id: 'am-unloved', query: 'I am unloved' },
  { id: 'want-love', query: 'I want to feel loved.' },
  ...JSON.parse(await readFile(new URL('evaluation-cases.json', import.meta.url), 'utf8')).cases,
];
const extractor = await loadExtractor(config, true);
const results = [];
try {
  for (const example of cases) {
    const started = performance.now();
    const vector = await extractor.embed(config.queryPrefix + example.query);
    const full = rankFullPassages(vector, index, binary).map((match) => {
      const passage = index.passages.find((p) => p.id === match.id);
      return {
        ...match,
        text: passage.text,
        sourceUrl: dataset.chapters[passage.chapterKey].sourceUrl,
      };
    });
    const elapsedMs = Math.round(performance.now() - started);
    const original = rankPassages(vector, baseline.entries).map((match) => ({
      ...match,
      reference: sample.passages.find((p) => p.id === match.id).reference,
    }));
    results.push({
      id: example.id,
      query: example.query,
      elapsedMs,
      full,
      original,
      review: { helpful: null, distinguishesEmotion: null, notes: '' },
    });
    globalThis.console.log(`${example.id}: ${full.map((p) => p.reference).join(' | ')}`);
  }
} finally {
  await extractor.dispose();
}
const output = new URL('../../../../docs/bible-search/', import.meta.url);
await mkdir(output, { recursive: true });
await writeFile(
  new URL('full-evaluation.json', output),
  JSON.stringify(
    {
      datasetSha256: index.datasetSha256,
      model: config,
      passageCount: index.passages.length,
      generatedAt: new Date().toISOString(),
      limitations:
        'Full Scripture-only paragraphs versus original 50 Scripture-plus-editorial-context passages. Coverage and chunking differ. Similarity is not confidence; human review and rejection handling remain required. Timing includes local inference and ranking, excludes setup.',
      results,
    },
    null,
    2,
  ) + '\n',
);
