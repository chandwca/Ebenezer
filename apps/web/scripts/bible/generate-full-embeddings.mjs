import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { loadExtractor } from './embedding-runtime.mjs';
import { paragraphGroups, splitGroup } from './chunk-passages.mjs';

const folder = new URL('../../data/bible/', import.meta.url);
const raw = await readFile(new URL('full.json', folder));
const dataset = JSON.parse(raw);
const config = JSON.parse(
  await readFile(new URL('../../public/bible/model-config.json', import.meta.url), 'utf8'),
);
const extractor = await loadExtractor(config, true);
const passages = [];
const vectors = [];
const started = performance.now();
try {
  for (const [key, chapter] of Object.entries(dataset.chapters)) {
    const html = await readFile(
      new URL(`./.source-cache/full/${key}.htm`, import.meta.url),
      'utf8',
    );
    if (createHash('sha256').update(html).digest('hex') !== chapter.sourceSha256)
      throw new Error(`Source changed for ${key}; regenerate the full dataset first.`);
    for (const group of paragraphGroups(html, chapter.verses)) {
      for (const verses of splitGroup(
        group,
        extractor.tokenCount,
        config.passagePrefix,
        256,
        config.maxTokens,
      )) {
        const firstVerse = verses[0].number;
        const lastVerse = verses.at(-1).number;
        const text = verses.map((verse) => verse.text).join(' ');
        const id = `${key}.${firstVerse}-${lastVerse}`;
        const reference = `${chapter.book} ${chapter.chapter}:${firstVerse}${firstVerse === lastVerse ? '' : `–${lastVerse}`}`;
        const input = config.passagePrefix + text;
        passages.push({
          id,
          reference,
          chapterKey: key,
          firstVerse,
          lastVerse,
          text,
          tokens: extractor.tokenCount(input),
        });
        vectors.push(await extractor.embed(input));
      }
    }
    if (Object.keys(dataset.chapters).indexOf(key) % 25 === 0)
      globalThis.console.log(
        `${key}: ${passages.length} passages; ${Math.round((performance.now() - started) / 1000)}s`,
      );
  }
  // Float32 little-endian avoids huge JSON number arrays and is portable to browser workers.
  const binary = Buffer.alloc(vectors.length * config.dimensions * 4);
  vectors.forEach((vector, row) =>
    vector.forEach((value, column) =>
      binary.writeFloatLE(value, (row * config.dimensions + column) * 4),
    ),
  );
  const index = {
    format: 'ebenezer-bible-full-embeddings',
    version: 1,
    model: config,
    strategy: 'scripture',
    datasetSha256: createHash('sha256').update(raw).digest('hex'),
    vectorsSha256: createHash('sha256').update(binary).digest('hex'),
    encoding: 'float32-le',
    dimensions: config.dimensions,
    chunking:
      'Source narrative paragraphs and consecutive poetry lines; split at verse boundaries around 256 tokens; no overlap or truncation.',
    generatedAt: new Date().toISOString(),
    passages,
  };
  await writeFile(new URL('vectors.f32', folder), binary);
  await writeFile(new URL('index.json', folder), JSON.stringify(index) + '\n');
  globalThis.console.log(
    `Generated ${passages.length} full-Bible passage embeddings; ${binary.length} vector bytes.`,
  );
} finally {
  await extractor.dispose();
}
