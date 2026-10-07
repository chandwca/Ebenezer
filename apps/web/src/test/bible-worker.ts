import { vi } from 'vitest';
import sample from '../../public/bible/sample.json';
import type { Dataset, SearchRequest, SearchResult, WorkerResponse } from '@/lib/bible/types';

const dataset = sample as Dataset;
export const journeyResults: SearchResult[] = ['MAT.11.28-30', 'ROM.8.31-39'].map((id) => {
  const passage = dataset.passages.find((item) => item.id === id)!;
  return { passage, chapter: dataset.chapters[passage.chapterKey], score: 0.8 };
});

/** UI fixture only. Real embedding inference is checked by the browser smoke test. */
export class TestBibleWorker {
  static instances: TestBibleWorker[] = [];
  static autoReply = true;
  onmessage?: (event: MessageEvent<WorkerResponse>) => void;
  onerror?: () => void;
  request?: SearchRequest;
  terminate = vi.fn();
  postMessage = vi.fn((request: SearchRequest) => {
    this.request = request;
    if (TestBibleWorker.autoReply)
      queueMicrotask(() =>
        this.emit({
          id: request.id,
          type: 'result',
          results: journeyResults,
          elapsedMs: 1,
          offlineReady: true,
        }),
      );
  });
  constructor() {
    TestBibleWorker.instances.push(this);
  }
  emit(message: WorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }
  finish(results = journeyResults) {
    this.emit({ id: this.request!.id, type: 'result', results, elapsedMs: 1, offlineReady: true });
  }
}
