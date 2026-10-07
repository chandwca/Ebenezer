import type { FullIndex, Dataset, ModelConfig } from '../../src/lib/bible/types';
export function validateFullIndex(
  index: FullIndex,
  binary: Uint8Array,
  config: ModelConfig,
  datasetHash: string,
  vectorHash: string,
  dataset: Dataset,
): void;
export function rankFullPassages(
  query: number[],
  index: FullIndex,
  binary: Uint8Array,
  limit?: number,
): { id: string; reference: string; score: number }[];
