import wordEn from '../locales/en/word.json';
import { cleanSender, wordMoment } from './word-card';
import { wordPack } from './word-pack';

export type WordCardMeta = { title: string; description: string; url: string; image: string };

const MAX_DESCRIPTION = 200;

export function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildWordCardMeta(input: {
  origin: string;
  moment: string;
  from?: string | null;
  passage?: { text: string; reference: string };
}): WordCardMeta | undefined {
  const moment = wordMoment(input.moment);
  if (!moment) return undefined;
  const from = cleanSender(input.from);
  const label = wordEn.moments[moment.id];
  const quote = input.passage
    ? `“${input.passage.text.replace(/\s+/g, ' ').trim()}” — ${input.passage.reference}`
    : label;
  const description =
    quote.length > MAX_DESCRIPTION ? `${quote.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : quote;
  const origin = input.origin.replace(/\/$/, '');
  return {
    title: from ? wordEn.card.from.replace('{{name}}', from) : wordEn.card.fromAnon,
    description,
    url: `${origin}/w/${moment.id}${from ? `?from=${encodeURIComponent(from)}` : ''}`,
    image: `${origin}/icon-512.png`,
  };
}

export function metaTags(meta: WordCardMeta): string {
  const title = escapeAttribute(meta.title);
  const description = escapeAttribute(meta.description);
  return [
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="Ebenezer">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${escapeAttribute(meta.url)}">`,
    `<meta property="og:image" content="${escapeAttribute(meta.image)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
  ].join('');
}

export function buildPackMeta(input: {
  origin: string;
  pack: string;
  from?: string | null;
  start?: string | null;
}): WordCardMeta | undefined {
  const pack = wordPack(input.pack);
  if (!pack) return undefined;
  const from = cleanSender(input.from);
  const origin = input.origin.replace(/\/$/, '');
  const params = new URLSearchParams();
  if (input.start && /^\d{4}-\d{2}-\d{2}$/.test(input.start)) params.set('start', input.start);
  if (from) params.set('from', from);
  const query = params.toString();
  return {
    title: from ? wordEn.pack.from.replace('{{name}}', from) : wordEn.pack.fromAnon,
    description: `${wordEn.packs[pack.id].title}. ${wordEn.packs[pack.id].lead}`,
    url: `${origin}/p/${pack.id}${query ? `?${query}` : ''}`,
    image: `${origin}/icon-512.png`,
  };
}
