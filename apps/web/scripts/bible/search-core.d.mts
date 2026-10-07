import type { Index, ModelConfig, Passage } from '../../src/lib/bible/types';
export function passageInput(passage: Passage, config: ModelConfig, strategy: string): string;
export function validateIndex(
  index: Index,
  config: ModelConfig,
  datasetSha256: string,
  passageIds: string[],
): void;
export function rankPassages(
  query: number[],
  entries: Index['entries'],
  limit?: number,
): { id: string; score: number }[];
