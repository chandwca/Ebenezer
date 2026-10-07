import { writeFile, readFile } from 'node:fs/promises';
import { URL } from 'node:url';
const output = new URL('../../public/bible/model-config.json', import.meta.url);
try {
  await readFile(output);
  globalThis.console.log('Using existing pinned model configuration.');
} catch {
  const modelId = 'Xenova/multilingual-e5-small';
  const response = await globalThis.fetch(`https://huggingface.co/api/models/${modelId}`, {
    signal: globalThis.AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Model lookup failed: ${response.status}`);
  const metadata = await response.json();
  if (!/^[a-f0-9]{40}$/.test(metadata.sha)) throw new Error('Missing immutable model revision');
  const config = {
    modelId,
    revision: metadata.sha,
    runtime: '@huggingface/transformers',
    runtimeVersion: '3.8.1',
    dtype: 'q8',
    pooling: 'mean',
    normalize: true,
    dimensions: 384,
    maxTokens: 512,
    queryPrefix: 'query: ',
    passagePrefix: 'passage: ',
  };
  await writeFile(output, JSON.stringify(config, null, 2) + '\n');
  globalThis.console.log(`Pinned ${modelId} at ${config.revision}`);
}
