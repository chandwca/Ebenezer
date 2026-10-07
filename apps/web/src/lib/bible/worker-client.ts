/** One worker entry point shared by the experiment and the guided journey. */
export function createBibleSearchWorker() {
  return new Worker(new URL('./search.worker.ts', import.meta.url), { type: 'module' });
}
