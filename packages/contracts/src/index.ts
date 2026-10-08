import { z } from 'zod';
import { encouragementRequestSchema, encouragementResponseSchema } from './encouragement.js';

export {
  cloudProfileSchema,
  cloudProfileResponseSchema,
  updateCloudProfileSchema,
} from './profiles.js';
export type { CloudProfile, UpdateCloudProfile } from './profiles.js';
export * from './community.js';
export * from './encouragement.js';
export * from './journey-summary.js';
export * from './songs.js';
export * from './notifications.js';
import { worshipSongIds } from './songs.js';
import { publicPassageReferenceSchema } from './journey-summary.js';

export const healthSchema = z.object({
  status: z.literal('ok'),
  service: z.literal('ebenezer-api'),
});
export type HealthResponse = z.infer<typeof healthSchema>;
export const stoneToneSchema = z.enum(['bright', 'mixed', 'hard']);
export type StoneTone = z.infer<typeof stoneToneSchema>;

export const scriptureSnapshotSchema = z
  .object({
    reference: z.string().min(1).max(120),
    text: z.string().min(1).max(20000),
    context: z.string().max(2000),
    sourceUrl: z
      .string()
      .regex(
        /^https:\/\/(?:ebible\.org\/eng-web\/[A-Za-z0-9]+\.htm|www\.bible\.com\/bible\/3034\/[A-Z0-9]{3}\.\d+\.BSB)$/,
      ),
    translation: z.enum(['WEB Classic', 'BSB']),
    provider: z.literal('youversion').optional(),
    attribution: z.string().min(1).max(8000).optional(),
    firstVerse: z.number().int().positive(),
    lastVerse: z.number().int().positive(),
    chapter: z.object({
      book: z.string().min(1).max(80),
      chapter: z.number().int().positive().max(150),
      verses: z
        .array(
          z.object({
            number: z.number().int().positive(),
            text: z.string().max(4000),
          }),
        )
        .min(1)
        .max(200),
    }),
    inputKey: z.string().max(3000),
    // Push stores the selected verse, not a whole chapter. Readers must label this honestly.
    chapterComplete: z.boolean().optional(),
  })
  .refine(
    (value) =>
      (value.translation !== 'BSB' ||
        (value.provider === 'youversion' &&
          !!value.attribution &&
          value.sourceUrl.startsWith('https://www.bible.com/'))) &&
      (value.translation !== 'WEB Classic' || value.sourceUrl.startsWith('https://ebible.org/')) &&
      value.firstVerse <= value.lastVerse &&
      value.chapter.verses
        .filter(
          (verse) =>
            verse.number >= value.firstVerse && verse.number <= value.lastVerse && verse.text,
        )
        .map((verse) => verse.text)
        .join(' ') === value.text,
  );
export type ScriptureSnapshot = z.infer<typeof scriptureSnapshotSchema>;

export const songSchema = z.strictObject({
  title: z.string().trim().min(1).max(120),
  artist: z.string().trim().min(1).max(120),
});
export type Song = z.infer<typeof songSchema>;

// Evening: AI chooses a passage and a song from what she shared about her day.
export const eveningWordRequestSchema = z.strictObject({
  language: z.enum(['en', 'es']),
  date: z.iso.date(),
  feelings: z.array(z.string().trim().min(1).max(80)).max(11),
  checkIn: z.string().trim().min(1).max(2000).optional(),
  morningReference: publicPassageReferenceSchema.optional(),
  thought: z.string().trim().min(1).max(500).optional(),
  // Passages already offered tonight, so "another passage" brings something new.
  exclude: z.array(publicPassageReferenceSchema).max(10).optional(),
});
export type EveningWordRequest = z.infer<typeof eveningWordRequestSchema>;

export const morningWordResponseSchema = encouragementResponseSchema.extend({
  snapshot: scriptureSnapshotSchema.optional(),
});
export type MorningWordResponse = z.infer<typeof morningWordResponseSchema>;

export const reflectionSchema = z
  .object({
    feel: z.string().trim().max(80, 'errors:tooLong'),
    feelings: z.array(z.string().trim().min(1).max(80)).max(11).optional(),
    checkIn: z.string().trim().max(2000, 'errors:tooLong').optional(),
    ref: z.string().trim().min(1, 'errors:required').max(120, 'errors:tooLong'),
    scripture: scriptureSnapshotSchema.optional(),
    morningWord: z
      .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        input: encouragementRequestSchema,
        scripture: scriptureSnapshotSchema.optional(),
        thought: z.string().trim().max(500).optional(),
      })
      .optional(),
    readConfirmed: z.boolean().refine((value) => value, 'journal:form.confirmReadError'),
    stood: z.string().trim().max(4000, 'errors:tooLong'),
    learned: z.string().trim().max(4000, 'errors:tooLong'),
    questions: z.string().trim().max(4000, 'errors:tooLong'),
    thoughts: z.string().trim().max(4000, 'errors:tooLong'),
    prayer: z.string().trim().max(4000, 'errors:tooLong'),
    partner: z.string().trim().max(120, 'errors:tooLong'),
    // Earlier stones referenced the curated list; new stones keep the song itself.
    songId: z.enum(worshipSongIds).optional(),
    song: songSchema.optional(),
    memory: z.string().trim().min(1, 'errors:required').max(2000, 'errors:tooLong'),
    tone: z
      .string()
      .refine((value) => ['bright', 'mixed', 'hard'].includes(value), 'errors:required'),
  })
  .refine(
    (value) =>
      (value.feelings === undefined ? !!value.feel : value.feelings.length > 0) || !!value.checkIn,
    { message: 'errors:required', path: ['feelings'] },
  )
  .refine(
    // The evening reflection has one box, saved as the memory beside the morning Word.
    (value) =>
      !!value.morningWord ||
      [value.stood, value.learned, value.questions, value.thoughts, value.prayer].some(Boolean),
    {
      message: 'journal:form.reflectionRequired',
      path: ['stood'],
    },
  );
export type ReflectionValues = z.infer<typeof reflectionSchema>;
export const emptyReflection: ReflectionValues = {
  feel: '',
  ref: '',
  readConfirmed: false,
  stood: '',
  learned: '',
  questions: '',
  thoughts: '',
  prayer: '',
  partner: '',
  memory: '',
  tone: '',
};

export const profileSchema = z.object({
  name: z.string().trim().min(1, 'errors:required').max(120, 'errors:tooLong'),
  city: z.string().trim().min(1, 'errors:required').max(120, 'errors:tooLong'),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const eveningWordResponseSchema = z.strictObject({
  scripture: scriptureSnapshotSchema,
  // Why this passage, written by AI and always labelled as such; never presented as Scripture.
  note: z.string().trim().min(1).max(240).optional(),
  // A real song, suggested by AI and confirmed in a music catalog before it is shown.
  song: songSchema.optional(),
  source: z.literal('ai'),
});
export type EveningWordResponse = z.infer<typeof eveningWordResponseSchema>;
