import { z } from 'zod';

// Public Scripture only. Compact enough for encrypted Web Push; never journal words.
export const notificationWordSchema = z.strictObject({
  date: z.iso.date(),
  book: z.string().min(1).max(80),
  chapter: z.number().int().min(1).max(150),
  verse: z.number().int().min(1).max(200),
  reference: z.string().min(1).max(120),
  text: z.string().min(1).max(200),
  translation: z.literal('BSB'),
  provider: z.literal('youversion'),
  attribution: z.string().min(1).max(1200),
  sourceUrl: z.string().regex(/^https:\/\/www\.bible\.com\/bible\/3034\/[A-Z0-9]{3}\.\d+\.BSB$/),
});
export type NotificationWord = z.infer<typeof notificationWordSchema>;
