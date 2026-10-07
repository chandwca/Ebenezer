import type { ScriptureSnapshot } from '@ebenezer/contracts';

export type ScriptureProvider = {
  passage(
    book: string,
    chapter: number,
    firstVerse: number,
    lastVerse: number,
    inputKey: string,
  ): Promise<ScriptureSnapshot>;
};
