import { wordMoments } from '@ebenezer/contracts';

export { wordMoments };

export type WordMoment = (typeof wordMoments)[number];
export type WordMomentId = WordMoment['id'];

export function wordMoment(id: string | undefined): WordMoment | undefined {
  return wordMoments.find((moment) => moment.id === id);
}

const MAX_SENDER = 30;

export function cleanSender(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/[^\p{L}\p{M}\p{N} '’.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_SENDER);
}

export function wordCardPath(id: WordMomentId, sender?: string): string {
  const from = cleanSender(sender);
  return `/w/${id}${from ? `?from=${encodeURIComponent(from)}` : ''}`;
}

export function wordCardUrl(origin: string, id: WordMomentId, sender?: string): string {
  return `${origin.replace(/\/$/, '')}${wordCardPath(id, sender)}`;
}

export function composeReply(lines: (string | undefined)[]): string {
  return lines
    .map((line) => line?.trim())
    .filter(Boolean)
    .join('\n');
}
