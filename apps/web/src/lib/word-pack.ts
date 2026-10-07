import { cleanSender, type WordMomentId } from './word-card';

export const wordPacks = [
  { id: 'arrival', moments: ['new', 'homesick', 'lonely', 'stress', 'curious'] },
  { id: 'hard', moments: ['hard', 'stress', 'lonely', 'break', 'curious'] },
] as const satisfies readonly { id: string; moments: readonly WordMomentId[] }[];

export type WordPack = (typeof wordPacks)[number];
export type WordPackId = WordPack['id'];

export function wordPack(id: string | undefined): WordPack | undefined {
  return wordPacks.find((pack) => pack.id === id);
}

export function localDate(now: Date = new Date()): string {
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
}

export function cleanStart(value: string | null | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? undefined
    : value;
}

export function openDays(start: string, today: string, total: number): number {
  return Math.max(0, Math.min(total, dayNumber(today) - dayNumber(start) + 1));
}

export function dayOpensOn(start: string, day: number): string {
  return new Date((dayNumber(start) + day - 1) * 86400000).toISOString().slice(0, 10);
}

export function packPath(id: WordPackId, options: { start?: string; from?: string } = {}): string {
  const params = new URLSearchParams();
  const start = cleanStart(options.start);
  const from = cleanSender(options.from);
  if (start) params.set('start', start);
  if (from) params.set('from', from);
  const query = params.toString();
  return `/p/${id}${query ? `?${query}` : ''}`;
}

export function packUrl(
  origin: string,
  id: WordPackId,
  options: { start?: string; from?: string } = {},
): string {
  return `${origin.replace(/\/$/, '')}${packPath(id, options)}`;
}

export function packCardPath(
  packId: WordPackId,
  moment: WordMomentId,
  options: { start?: string; from?: string } = {},
): string {
  const params = new URLSearchParams();
  const from = cleanSender(options.from);
  const start = cleanStart(options.start);
  if (from) params.set('from', from);
  params.set('pack', packId);
  if (start) params.set('start', start);
  return `/w/${moment}?${params.toString()}`;
}
