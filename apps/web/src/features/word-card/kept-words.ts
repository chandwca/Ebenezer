import { useLiveQuery } from 'dexie-react-hooks';
import { z } from 'zod';
import { db } from '@/db/database';

const KEY = 'keptWords';
const MAX_KEPT = 10;

export const keptWordSchema = z.object({
  moment: z.string(),
  from: z.string().optional(),
  reference: z.string(),
  text: z.string(),
  translation: z.string().optional(),
  provider: z.literal('youversion').optional(),
  attribution: z.string().optional(),
  sourceUrl: z.string().optional(),
  keptAt: z.string(),
});
export type KeptWord = z.infer<typeof keptWordSchema>;

async function read(): Promise<KeptWord[]> {
  const stored = await db.preferences.get(KEY);
  if (typeof stored?.value !== 'string') return [];
  try {
    const parsed = z.array(keptWordSchema).safeParse(JSON.parse(stored.value));
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
}

export async function keepWord(word: Omit<KeptWord, 'keptAt'>) {
  const others = (await read()).filter(
    (item) => !(item.moment === word.moment && item.from === word.from),
  );
  const next = [{ ...word, keptAt: new Date().toISOString() }, ...others].slice(0, MAX_KEPT);
  await db.preferences.put({ key: KEY, value: JSON.stringify(next) });
}

export function useKeptWords() {
  return useLiveQuery(() => read().catch(() => []), []);
}
