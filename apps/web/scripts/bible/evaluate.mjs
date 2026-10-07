import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadExtractor } from './embedding-runtime.mjs';
import { rankPassages, validateIndex } from './search-core.mjs';
const folder = new URL('../../public/bible/', import.meta.url);
const raw = await readFile(new URL('sample.json', folder));
const dataset = JSON.parse(raw);
const config = JSON.parse(await readFile(new URL('model-config.json', folder), 'utf8'));
const checksum = createHash('sha256').update(raw).digest('hex');
const indexes = await Promise.all(
  ['scripture', 'context'].map(async (strategy) =>
    JSON.parse(await readFile(new URL(`embeddings-${strategy}.json`, folder), 'utf8')),
  ),
);
for (const index of indexes)
  validateIndex(
    index,
    config,
    checksum,
    dataset.passages.map((p) => p.id),
  );
const cases = JSON.parse(
  await readFile(new URL('evaluation-cases.json', import.meta.url), 'utf8'),
).cases;
const extractor = await loadExtractor(config, true);
const results = [];
try {
  for (const example of cases) {
    const started = performance.now();
    const vector = await extractor.embed(config.queryPrefix + example.query);
    results.push({
      ...example,
      queryMs: Math.round(performance.now() - started),
      results: Object.fromEntries(
        indexes.map((index) => [
          index.strategy,
          rankPassages(vector, index.entries).map((match) => ({
            ...match,
            reference: dataset.passages.find((p) => p.id === match.id).reference,
          })),
        ]),
      ),
    });
    globalThis.console.log(
      `${example.id}: ${results
        .at(-1)
        .results.context.map((p) => p.reference)
        .join(' | ')}`,
    );
  }
} finally {
  await extractor.dispose();
}
const summary = Object.fromEntries(
  indexes.map((index) => {
    const scored = results.filter((row) => row.candidatePassageIds.length);
    const hits = scored.filter((row) =>
      row.results[index.strategy].some((match) => row.candidatePassageIds.includes(match.id)),
    ).length;
    return [
      index.strategy,
      {
        candidateHitAt3: hits,
        cases: scored.length,
        note: 'Agreement with hand-selected candidates, not human-reviewed usefulness or theological correctness.',
      },
    ];
  }),
);
const report = {
  model: config,
  datasetSha256: checksum,
  generatedAt: new Date().toISOString(),
  summary,
  results,
};
await mkdir(new URL('../../../../docs/bible-search/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../../../../docs/bible-search/evaluation.json', import.meta.url),
  JSON.stringify(report, null, 2) + '\n',
);
globalThis.console.log(JSON.stringify(summary, null, 2));
