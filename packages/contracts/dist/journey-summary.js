import { z } from 'zod';
import { encouragementTextSchema } from './encouragement.js';
export const journeyCountsSchema = z
    .strictObject({
    hard: z.number().int().min(0).max(50000),
    mixed: z.number().int().min(0).max(50000),
    bright: z.number().int().min(0).max(50000),
})
    .refine((value) => value.hard + value.mixed + value.bright > 0);
const books = [
    'Genesis',
    'Exodus',
    'Leviticus',
    'Numbers',
    'Deuteronomy',
    'Joshua',
    'Judges',
    'Ruth',
    '1 Samuel',
    '2 Samuel',
    '1 Kings',
    '2 Kings',
    '1 Chronicles',
    '2 Chronicles',
    'Ezra',
    'Nehemiah',
    'Esther',
    'Job',
    'Psalm',
    'Psalms',
    'Proverbs',
    'Ecclesiastes',
    'Song of Solomon',
    'Isaiah',
    'Jeremiah',
    'Lamentations',
    'Ezekiel',
    'Daniel',
    'Hosea',
    'Joel',
    'Amos',
    'Obadiah',
    'Jonah',
    'Micah',
    'Nahum',
    'Habakkuk',
    'Zephaniah',
    'Haggai',
    'Zechariah',
    'Malachi',
    'Matthew',
    'Mark',
    'Luke',
    'John',
    'Acts',
    'Romans',
    '1 Corinthians',
    '2 Corinthians',
    'Galatians',
    'Ephesians',
    'Philippians',
    'Colossians',
    '1 Thessalonians',
    '2 Thessalonians',
    '1 Timothy',
    '2 Timothy',
    'Titus',
    'Philemon',
    'Hebrews',
    'James',
    '1 Peter',
    '2 Peter',
    '1 John',
    '2 John',
    '3 John',
    'Jude',
    'Revelation',
];
export const publicPassageReferenceSchema = z
    .string()
    .max(120)
    .regex(new RegExp(`^(${books.join('|')}) [1-9][0-9]{0,2}:[1-9][0-9]{0,2}(?:[–-][1-9][0-9]{0,2})?$`));
const words = z.string().trim().min(1).max(1200).optional();
export const journeyStoneSchema = z.strictObject({
    tone: z.enum(['hard', 'mixed', 'bright']),
    passages: z.array(publicPassageReferenceSchema).max(2),
    count: z.number().int().min(1).max(50000),
    // Her own words for each stone, so the remembrance can recall how God carried her.
    date: z.iso.date().optional(),
    feelings: z.array(z.string().trim().min(1).max(80)).max(11).optional(),
    checkIn: words,
    thought: words,
    reflection: words,
    memory: words,
});
export const journeySummaryRequestSchema = z
    .strictObject({
    language: z.enum(['en', 'es']),
    counts: journeyCountsSchema,
    stones: z.array(journeyStoneSchema).min(1).max(200).optional(),
    passages: z.array(publicPassageReferenceSchema).max(100).optional(),
})
    .refine((value) => {
    if (!value.stones)
        return true;
    const totals = { hard: 0, mixed: 0, bright: 0 };
    for (const stone of value.stones)
        totals[stone.tone] += stone.count;
    return (totals.hard === value.counts.hard &&
        totals.mixed === value.counts.mixed &&
        totals.bright === value.counts.bright);
}, { message: 'Stone entries must cover the day totals.' });
export const journeySummaryResponseSchema = z.strictObject({
    reflection: encouragementTextSchema,
    source: z.enum(['ai', 'prepared']),
});
// The evening question starts from the morning Word and the thought she chose to carry.
export const eveningPromptRequestSchema = z.strictObject({
    language: z.enum(['en', 'es']),
    reference: publicPassageReferenceSchema,
    thought: z.string().trim().min(1).max(500).optional(),
});
export const eveningPromptResponseSchema = z.strictObject({
    question: z.string().trim().min(1).max(240),
    source: z.enum(['ai', 'prepared']),
});
