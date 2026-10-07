export type ModelConfig = {
  modelId: string;
  revision: string;
  runtime: string;
  runtimeVersion: string;
  dtype: 'q8';
  pooling: 'mean';
  normalize: true;
  dimensions: number;
  maxTokens: number;
  queryPrefix: string;
  passagePrefix: string;
};
export type Passage = {
  id: string;
  reference: string;
  text: string;
  context: string;
  sourceUrl: string;
  chapterKey: string;
  firstVerse: number;
  lastVerse: number;
};
export type Chapter = { book: string; chapter: number; verses: { number: number; text: string }[] };
export type Dataset = {
  passages: Passage[];
  chapters: Record<string, Chapter>;
  translation: string;
};
export type Index = {
  format: string;
  version: number;
  model: ModelConfig;
  datasetSha256: string;
  strategy: string;
  entries: { id: string; vector: number[] }[];
};
export type SearchRequest = {
  id: number;
  query: string;
  strategy: 'scripture' | 'context' | 'full';
};
export type SearchResult = { passage: Passage; chapter: Chapter; score: number };
export type WorkerResponse =
  | {
      id: number;
      type: 'progress';
      phase: 'loading' | 'downloading' | 'searching';
      percent?: number;
    }
  | { id: number; type: 'error'; code: 'setup' | 'tooLong' | 'search' }
  | {
      id: number;
      type: 'result';
      results: SearchResult[];
      elapsedMs: number;
      offlineReady: boolean;
    };

export type FullIndex = {
  format: string;
  version: number;
  encoding: string;
  strategy: string;
  dimensions: number;
  model: ModelConfig;
  datasetSha256: string;
  vectorsSha256: string;
  passages: (Omit<Passage, 'context' | 'sourceUrl'> & { tokens: number })[];
};
