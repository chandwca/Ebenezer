import { env, pipeline } from '@huggingface/transformers';
import { fileURLToPath, URL } from 'node:url';
export async function loadExtractor(config, offline = false) {
  env.cacheDir = fileURLToPath(new URL('./.model-cache/', import.meta.url));
  env.allowLocalModels = offline;
  env.allowRemoteModels = !offline;
  const extractor = await pipeline('feature-extraction', config.modelId, {
    revision: config.revision,
    local_files_only: offline,
    dtype: config.dtype,
    device: 'cpu',
    session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
    progress_callback: (event) => {
      if (event.status === 'done') globalThis.console.log(`Model file ready: ${event.file}`);
    },
  });
  extractor.tokenizer.model_max_length = config.maxTokens;
  return {
    tokenCount: (input) =>
      extractor.tokenizer(input, { truncation: false, padding: false }).input_ids.dims.at(-1),
    async embed(input) {
      const tokens = extractor
        .tokenizer(input, { truncation: false, padding: false })
        .input_ids.dims.at(-1);
      if (tokens > config.maxTokens)
        throw new Error(
          `Input has ${tokens} tokens; split into smaller passages (limit ${config.maxTokens}).`,
        );
      const result = await extractor(input, {
        pooling: config.pooling,
        normalize: config.normalize,
      });
      const vector = Array.from(result.data, (value) => Number(value.toFixed(8)));
      if (vector.length !== config.dimensions || vector.some((value) => !Number.isFinite(value)))
        throw new Error('Invalid embedding output');
      return vector;
    },
    dispose: () => extractor.dispose(),
  };
}
