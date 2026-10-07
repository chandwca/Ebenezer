const guards = new Set<() => Promise<void>>();
export function registerReloadGuard(guard: () => Promise<void>) {
  guards.add(guard);
  return () => {
    guards.delete(guard);
  };
}
export async function prepareReload() {
  for (const guard of guards) await guard();
}
