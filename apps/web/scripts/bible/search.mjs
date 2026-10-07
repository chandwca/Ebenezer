import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { loadExtractor } from './embedding-runtime.mjs';
import { rankPassages, validateIndex } from './search-core.mjs';
const query = globalThis.process.argv.slice(2).join(' ').trim();
if (!query || query.length > 2000)
  throw new Error('Enter a description between 1 and 2,000 characters.');
const folder = new URL('../../public/bible/', import.meta.url);
const raw = await readFile(new URL('sample.json', folder));
const dataset = JSON.parse(raw);
const config = JSON.parse(await readFile(new URL('model-config.json', folder), 'utf8'));
const checksum = createHash('sha256').update(raw).digest('hex');
const extractor = await loadExtractor(config, true);
try {
  const vector = await extractor.embed(config.queryPrefix + query);
  for (const strategy of ['scripture', 'context']) {
    const index = JSON.parse(
      await readFile(new URL(`embeddings-${strategy}.json`, folder), 'utf8'),
    );
    validateIndex(
      index,
      config,
      checksum,
      dataset.passages.map((p) => p.id),
    );
    globalThis.console.log(
      `\n${strategy === 'scripture' ? 'Scripture only' : 'Scripture + editorial context'} — top three suggestions:`,
    );
    for (const match of rankPassages(vector, index.entries)) {
      const passage = dataset.passages.find((p) => p.id === match.id);
      globalThis.console.log(
        `\n${passage.reference} (WEB Classic) — similarity ${match.score.toFixed(3)}`,
      );
      globalThis.console.log(passage.text);
      globalThis.console.log(`Context (editorial): ${passage.context}`);
      globalThis.console.log(passage.sourceUrl);
    }
  }
  globalThis.console.log(
    '\nSimilarity is not confidence or theological validation. Review the full chapter; suggestions may be unsuitable.',
  );
} finally {
  await extractor.dispose();
}
