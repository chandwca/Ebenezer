import { z } from 'zod';
// Only public, curated context crosses the AI boundary. No free-text journal input.
export const encouragementRequestSchema = z
    .object({
    theme: z.enum(['remember', 'care', 'steadiness']),
    language: z.enum(['en', 'es']),
    date: z.iso.date().optional(),
    occasion: z.enum(['christmas', 'easter', 'goodFriday', 'newYear']).optional(),
    weather: z.enum(['clear', 'cloudy', 'rain', 'snow', 'storm']).optional(),
})
    .strict();
export const encouragementTextSchema = z
    .object({
    message: z.string().trim().min(1).max(900),
    prayer: z.string().trim().min(1).max(600),
    question: z.string().trim().min(1).max(240),
})
    .strict();
export const encouragementPassages = {
    remember: {
        reference: '1 Samuel 7:12',
        text: 'Hitherto hath the LORD helped us.',
        translation: 'KJV',
    },
    care: {
        reference: '1 Peter 5:7',
        text: 'Casting all your care upon him; for he careth for you.',
        translation: 'KJV',
    },
    steadiness: {
        reference: 'Psalm 61:2',
        text: 'From the end of the earth will I cry unto thee, when my heart is overwhelmed: lead me to the rock that is higher than I.',
        translation: 'KJV',
    },
};
export const encouragementResponseSchema = z.object({
    scripture: z.object({
        reference: z.string(),
        text: z.string(),
        translation: z.enum(['KJV', 'WEB Classic']),
    }),
    encouragement: encouragementTextSchema,
    source: z.enum(['ai', 'prepared']),
});
export const occasionPassages = {
    christmas: {
        reference: 'Luke 2:11',
        text: 'For unto you is born this day in the city of David a Saviour, which is Christ the Lord.',
        translation: 'KJV',
    },
    easter: {
        reference: 'Matthew 28:6',
        text: 'He is not here: for he is risen, as he said. Come, see the place where the Lord lay.',
        translation: 'KJV',
    },
    goodFriday: {
        reference: 'Romans 5:8',
        text: 'But God commendeth his love toward us, in that, while we were yet sinners, Christ died for us.',
        translation: 'KJV',
    },
    newYear: {
        reference: 'Lamentations 3:23',
        text: 'They are new every morning: great is thy faithfulness.',
        translation: 'KJV',
    },
};
export function morningContext(date, weather) {
    const year = date.getFullYear();
    // Gregorian (Western) Easter; other traditions can be added as explicit calendar choices.
    const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4;
    const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
    const easter = new Date(year, month - 1, day);
    const friday = new Date(year, month - 1, day - 2);
    const same = (other) => date.getMonth() === other.getMonth() && date.getDate() === other.getDate();
    const occasion = date.getMonth() === 11 && date.getDate() === 25
        ? 'christmas'
        : date.getMonth() === 0 && date.getDate() === 1
            ? 'newYear'
            : same(easter)
                ? 'easter'
                : same(friday)
                    ? 'goodFriday'
                    : undefined;
    const themes = ['remember', 'care', 'steadiness'];
    const theme = weather === 'rain' || weather === 'snow'
        ? 'care'
        : weather === 'storm'
            ? 'steadiness'
            : themes[Math.floor(Date.UTC(year, date.getMonth(), date.getDate()) / 86400000) % themes.length];
    return {
        theme,
        language: 'en',
        ...(occasion ? { occasion } : {}),
        ...(weather ? { weather } : {}),
    };
}
export function morningPassage(input) {
    return input.occasion ? occasionPassages[input.occasion] : encouragementPassages[input.theme];
}
