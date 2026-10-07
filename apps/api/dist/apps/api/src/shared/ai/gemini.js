import { encouragementTextSchema, encouragementPassages, encouragementRequestSchema, eveningPromptResponseSchema, } from '@ebenezer/contracts';
// Google answers 429/5xx when the model is briefly busy (common on the free tier).
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
/**
 * Retries a busy model up to twice with short pauses. Retries share the caller's signal, so
 * the overall time limit for each feature is unchanged.
 */
export function retryingFetch(request, delays = [700, 2000]) {
    return async (input, init) => {
        for (let attempt = 0;; attempt++) {
            const response = await request(input, init);
            if (!RETRYABLE.has(response.status) || attempt >= delays.length)
                return response;
            await response.body?.cancel().catch(() => undefined);
            await new Promise((resolve, reject) => {
                const timer = setTimeout(resolve, delays[attempt]);
                init?.signal?.addEventListener('abort', () => {
                    clearTimeout(timer);
                    reject(init.signal.reason);
                });
            });
        }
    };
}
export function createGeminiProvider(config, baseRequest = fetch, retryDelays) {
    const request = retryingFetch(baseRequest, retryDelays);
    return {
        async selectMorningReference(input) {
            const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
                signal: AbortSignal.timeout(4000),
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: 'Choose one encouraging Bible verse from any of the 66 books for a student exploring Jesus and beginning their day. Use the local date for variety, calendar occasion when supplied, and optional weather as gentle context. If context is unknown, choose an encouraging passage about God’s love, hope, peace, wisdom or faithful care. Never infer personal feelings from weather. Return only the exact English Bible book name, chapter number and verse number. Do not supply or invent biblical text. Choose a verse that makes sense on its own; avoid genealogies and contextless promises of guaranteed outcomes.',
                            },
                        ],
                    },
                    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
                    generationConfig: {
                        maxOutputTokens: 200,
                        responseMimeType: 'application/json',
                        responseJsonSchema: {
                            type: 'object',
                            properties: {
                                book: { type: 'string' },
                                chapter: { type: 'integer' },
                                verse: { type: 'integer' },
                            },
                            required: ['book', 'chapter', 'verse'],
                            additionalProperties: false,
                        },
                    },
                }),
            });
            if (!response.ok)
                throw new Error('Morning selection unavailable');
            const data = (await response.json());
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason !== 'STOP')
                throw new Error('Morning selection incomplete');
            const result = JSON.parse(candidate.content?.parts
                ?.filter((part) => !part.thought)
                .map((part) => part.text ?? '')
                .join('') ?? '');
            if (typeof result.book !== 'string' ||
                result.book.length > 80 ||
                !Number.isInteger(result.chapter) ||
                result.chapter < 1 ||
                result.chapter > 150 ||
                !Number.isInteger(result.verse) ||
                result.verse < 1 ||
                result.verse > 176)
                throw new Error('Invalid reference');
            return { book: result.book, chapter: result.chapter, verse: result.verse };
        },
        async selectMorningTheme(input) {
            const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
                signal: AbortSignal.timeout(5000),
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: 'Select one morning Scripture theme from the supplied verified passages for a student exploring Christianity. Consider the date and optional weather category gently; never infer their feelings or treat weather as a divine message. Prefer the supplied rotating theme when no context suggests another. Return JSON containing only theme, using exactly remember, care or steadiness. Do not write biblical text.',
                            },
                        ],
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                { text: JSON.stringify({ context: input, passages: encouragementPassages }) },
                            ],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 100,
                        responseMimeType: 'application/json',
                        responseJsonSchema: {
                            type: 'object',
                            properties: { theme: { type: 'string', enum: ['remember', 'care', 'steadiness'] } },
                            required: ['theme'],
                            additionalProperties: false,
                        },
                    },
                }),
            });
            if (!response.ok)
                throw new Error('Morning selection unavailable');
            const data = (await response.json());
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason !== 'STOP')
                throw new Error('Morning selection incomplete');
            const text = candidate.content?.parts
                ?.filter((part) => !part.thought)
                .map((part) => part.text ?? '')
                .join('') ?? '';
            return encouragementRequestSchema.shape.theme.parse(JSON.parse(text).theme);
        },
        async selectEveningWord(input) {
            const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
                signal: AbortSignal.timeout(8000),
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: 'A student exploring Jesus is reflecting on her day in the evening. From her feelings and her own words (and, if supplied, the morning verse and the thought she carried), choose one Bible passage of 1 to 5 consecutive verses from any of the 66 books that meets her where she is with comfort, honesty or hope. Prefer passages that make sense on their own; avoid genealogies, harsh judgement passages out of context, and promises of guaranteed outcomes. Do not repeat any reference in exclude or the morning verse. ' +
                                    'Return the exact English book name, chapter, firstVerse and lastVerse only; never write or quote biblical text. ' +
                                    'Also write note: one gentle sentence (under 30 words, in the requested language) saying why this passage may speak to her today, without assuming events she did not share, diagnosing, or claiming to speak for God. ' +
                                    'Also suggest songs: up to three real, published Christian worship songs or hymns that fit what she is going through tonight, best first, each with its exact title and primary recording artist (use "Hymn" as artist for traditional hymns). Only suggest songs you are confident exist; vary your suggestions rather than defaulting to the most famous song.',
                            },
                        ],
                    },
                    contents: [
                        {
                            role: 'user',
                            parts: [
                                {
                                    text: JSON.stringify(input),
                                },
                            ],
                        },
                    ],
                    generationConfig: {
                        maxOutputTokens: 400,
                        responseMimeType: 'application/json',
                        responseJsonSchema: {
                            type: 'object',
                            properties: {
                                book: { type: 'string' },
                                chapter: { type: 'integer' },
                                firstVerse: { type: 'integer' },
                                lastVerse: { type: 'integer' },
                                note: { type: 'string', maxLength: 240 },
                                songs: {
                                    type: 'array',
                                    maxItems: 3,
                                    items: {
                                        type: 'object',
                                        properties: {
                                            title: { type: 'string', maxLength: 120 },
                                            artist: { type: 'string', maxLength: 120 },
                                        },
                                        required: ['title', 'artist'],
                                        additionalProperties: false,
                                    },
                                },
                            },
                            required: ['book', 'chapter', 'firstVerse', 'lastVerse', 'note', 'songs'],
                            additionalProperties: false,
                        },
                    },
                }),
            });
            if (!response.ok)
                throw new Error('Evening Word unavailable');
            const data = (await response.json());
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason !== 'STOP')
                throw new Error('Evening Word incomplete');
            const result = JSON.parse(candidate.content?.parts
                ?.filter((part) => !part.thought)
                .map((part) => part.text ?? '')
                .join('') ?? '');
            const songs = (Array.isArray(result.songs) ? result.songs : [])
                .filter((song) => typeof song?.title === 'string' &&
                typeof song?.artist === 'string')
                .slice(0, 3)
                .map((song) => ({
                title: song.title.trim().slice(0, 120),
                artist: song.artist.trim().slice(0, 120),
            }))
                .filter((song) => song.title && song.artist);
            if (typeof result.book !== 'string' ||
                result.book.length > 80 ||
                !Number.isInteger(result.chapter) ||
                !Number.isInteger(result.firstVerse) ||
                !Number.isInteger(result.lastVerse) ||
                result.firstVerse < 1 ||
                result.lastVerse < result.firstVerse ||
                result.lastVerse - result.firstVerse > 4 ||
                typeof result.note !== 'string' ||
                !result.note.trim())
                throw new Error('Invalid evening selection');
            return {
                book: result.book,
                chapter: result.chapter,
                firstVerse: result.firstVerse,
                lastVerse: result.lastVerse,
                note: result.note.trim().slice(0, 240),
                songs,
            };
        },
        async eveningQuestion(input) {
            const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
                signal: AbortSignal.timeout(5000),
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: 'A student exploring Jesus is returning in the evening. The app has just shown her the morning Bible verse (given by reference) and, if supplied, the thought she chose to carry. Write the next line: one warm, natural question asking how her day went, the way a caring friend would, gently connecting to that verse or thought. Use simple, beginner-friendly language and at most 30 words. Do not quote Scripture, assume what happened, infer feelings, or promise outcomes. Respond in the requested language. Return only JSON with question.',
                            },
                        ],
                    },
                    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
                    generationConfig: {
                        maxOutputTokens: 200,
                        responseMimeType: 'application/json',
                        responseJsonSchema: {
                            type: 'object',
                            properties: { question: { type: 'string', maxLength: 240 } },
                            required: ['question'],
                            additionalProperties: false,
                        },
                    },
                }),
            });
            if (!response.ok)
                throw new Error('Evening question unavailable');
            const data = (await response.json());
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason !== 'STOP')
                throw new Error('Evening question incomplete');
            const text = candidate.content?.parts
                ?.filter((part) => !part.thought)
                .map((part) => part.text ?? '')
                .join('') ?? '';
            return eveningPromptResponseSchema.shape.question.parse(JSON.parse(text).question);
        },
        async generate(input) {
            const response = await request(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
                // Reading a whole journal takes Gemini longer than a single encouragement.
                signal: AbortSignal.timeout(input.journey ? 30000 : 10000),
                body: JSON.stringify({
                    systemInstruction: {
                        parts: [
                            {
                                text: 'Write a brief Christian encouragement, a prayer addressed to Jesus, and one reflection question. For dated morning requests, keep the message to two or three short sentences (under 60 words), and make the question a gentle invitation about what the person wants to carry or how they want to approach the day. ' +
                                    'Use beginner-friendly language. If an occasion or weather category is supplied, use it gently as context; never infer feelings or claim weather is a divine message. Ground the encouragement in the supplied Scripture. Do not quote Scripture or add verse references; the application displays the verified text separately. ' +
                                    'Do not claim to speak as God, predict outcomes, assume personal experiences, or promise healing or success. ' +
                                    'If journey counts are supplied, write a gentle remembrance across hard, mixed and bright days. Explain God’s faithful love as grounded in Scripture; invite the person to notice His care without asserting that they experienced specific help, friendship, answered prayers, growth, or resolved struggles. Never mention recording or tracking. Acknowledge ongoing difficulty. If stones are supplied, consider each entry in order from oldest to newest: each links a day category to its biblical passages. Count means consecutive stones with the same category and passages. Weave their Scripture themes into one warm reflection, making room for hard days and unfinished questions. Do not list entries mechanically or claim improvement from category changes. If a stone includes her own words (feelings, checkIn, thought, reflection, memory), you may gently recall what she wrote to show how the Lord has carried her, briefly and in your own phrasing; never quote it at length, add events she did not write, diagnose, or judge. Otherwise, these categories and linked passages are the only known facts about their experiences. If passageReferences are supplied, connect the reflection gently with these biblical passages. Do not quote or invent their text, claim the person read or understood them, or invent personal events. ' +
                                    'Respond in the requested language. Return only JSON with message, prayer, question.',
                            },
                        ],
                    },
                    contents: [{ role: 'user', parts: [{ text: JSON.stringify(input) }] }],
                    generationConfig: {
                        maxOutputTokens: 1000,
                        responseMimeType: 'application/json',
                        responseJsonSchema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', maxLength: 900 },
                                prayer: { type: 'string', maxLength: 600 },
                                question: { type: 'string', maxLength: 240 },
                            },
                            required: ['message', 'prayer', 'question'],
                            additionalProperties: false,
                        },
                    },
                }),
            });
            // Never expose upstream bodies: they may include credentials or request context.
            if (!response.ok)
                throw new Error(`AI generation unavailable (HTTP ${response.status})`);
            const data = (await response.json());
            const candidate = data.candidates?.[0];
            if (candidate?.finishReason !== 'STOP')
                throw new Error(`AI generation incomplete (${candidate?.finishReason ?? 'no candidate'})`);
            const text = candidate.content?.parts
                ?.filter((part) => !part.thought)
                .map((part) => part.text ?? '')
                .join('') ?? '';
            return encouragementTextSchema.parse(JSON.parse(text));
        },
    };
}
