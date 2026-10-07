import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadExtractor } from './embedding-runtime.mjs';
import { passageInput, validateIndex } from './search-core.mjs';
const folder = new URL('../../public/bible/', import.meta.url);
const raw = await readFile(new URL('sample.json', folder));
const dataset = JSON.parse(raw);
const config = JSON.parse(await readFile(new URL('model-config.json', folder), 'utf8'));
const datasetSha256 = createHash('sha256').update(raw).digest('hex');
const started = performance.now();
const extractor = await loadExtractor(config);
try {
  for (const strategy of ['scripture', 'context']) {
    const entries = [];
    for (const passage of dataset.passages) {
      entries.push({
        id: passage.id,
        vector: await extractor.embed(passageInput(passage, config, strategy)),
      });
      globalThis.console.log(
        `${strategy}: ${entries.length}/${dataset.passages.length} — ${passage.reference}`,
      );
    }
    const index = {
      format: 'ebenezer-bible-embeddings',
      version: 1,
      model: config,
      datasetSha256,
      strategy,
      generatedAt: new Date().toISOString(),
      entries,
    };
    validateIndex(
      index,
      config,
      datasetSha256,
      dataset.passages.map((passage) => passage.id),
    );
    await writeFile(new URL(`embeddings-${strategy}.json`, folder), JSON.stringify(index) + '\n');
  }
  globalThis.console.log(
    `Generated both 50-passage indexes in ${((performance.now() - started) / 1000).toFixed(1)} seconds.`,
  );
} finally {
  await extractor.dispose();
}
