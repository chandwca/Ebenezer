import {
  notificationWordSchema,
  scriptureSnapshotSchema,
  type NotificationWord,
} from '@ebenezer/contracts';
export async function readNotificationWord(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !('caches' in globalThis)) return undefined;
  const cache = await caches.open('ebenezer-notification-words-v1');
  const response = await cache.match(`/notification-word/${date}`);
  if (!response) return undefined;
  const parsed = notificationWordSchema.safeParse(await response.json());
  return parsed.success && parsed.data.date === date ? parsed.data : undefined;
}
export function notificationSnapshot(word: NotificationWord) {
  return scriptureSnapshotSchema.parse({
    ...word,
    context: '',
    firstVerse: word.verse,
    lastVerse: word.verse,
    chapter: {
      book: word.book,
      chapter: word.chapter,
      verses: [{ number: word.verse, text: word.text }],
    },
    inputKey: `notification:${word.date}`,
    chapterComplete: false,
  });
}
