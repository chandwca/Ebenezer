import { morningPassage, encouragementTextSchema, } from '@ebenezer/contracts';
const prepared = {
    en: {
        remember: {
            message: 'Take a quiet moment to remember the help God has given. A small act of gratitude can make room for hope today.',
            prayer: 'Jesus, thank You for Your faithful care. Help me notice Your goodness and care for someone today. Amen.',
            question: 'What is one moment of help you want to remember?',
        },
        care: {
            message: 'You can bring your concerns to Jesus. Make room for an honest prayer and, if you wish, reach out to someone you trust.',
            prayer: 'Jesus, help me bring my cares to You and receive support with an open heart. Amen.',
            question: 'What would you like to bring to Jesus today?',
        },
        steadiness: {
            message: 'This passage makes room for an overwhelmed heart. You can pause, pray honestly, and take your next step with support.',
            prayer: 'Jesus, meet me as I pause. Guide my next step and help me reach for support when I need it. Amen.',
            question: 'What is one small step you can take with support today?',
        },
    },
    es: {
        remember: {
            message: 'Toma un momento de calma para recordar la ayuda de Dios. Un pequeño gesto de gratitud puede abrir espacio a la esperanza hoy.',
            prayer: 'Jesús, gracias por Tu cuidado fiel. Ayúdame a reconocer Tu bondad y cuidar de alguien hoy. Amén.',
            question: '¿Qué momento de ayuda quieres recordar?',
        },
        care: {
            message: 'Puedes llevar tus preocupaciones a Jesús. Haz espacio para una oración sincera y, si quieres, busca a alguien de confianza.',
            prayer: 'Jesús, ayúdame a entregarte mis preocupaciones y recibir apoyo con un corazón abierto. Amén.',
            question: '¿Qué te gustaría llevar a Jesús hoy?',
        },
        steadiness: {
            message: 'Este pasaje da espacio a un corazón abrumado. Puedes hacer una pausa, orar con sinceridad y dar el siguiente paso con apoyo.',
            prayer: 'Jesús, acompáñame en esta pausa. Guía mi siguiente paso y ayúdame a buscar apoyo cuando lo necesite. Amén.',
            question: '¿Qué pequeño paso puedes dar hoy con apoyo?',
        },
    },
};
export function createEncouragementService(provider, now = Date.now) {
    // Bounded public themes, occasions and weather categories protect free quotas.
    const cache = new Map();
    const pending = new Map();
    return {
        async get(input) {
            const key = `${input.date ?? 'manual'}:${input.language}:${input.theme}:${input.occasion ?? 'ordinary'}:${input.weather ?? 'unknown'}`;
            const existing = cache.get(key);
            if (existing && existing.expires > now())
                return existing.value;
            const running = pending.get(key);
            if (running)
                return running;
            const operation = (async () => {
                let selected = input;
                if (input.date && !input.occasion && provider?.selectMorningTheme) {
                    try {
                        selected = { ...input, theme: await provider.selectMorningTheme(input) };
                    }
                    catch {
                        /* Curated daily fallback. */
                    }
                }
                const scripture = morningPassage(selected);
                let value = {
                    scripture,
                    encouragement: input.occasion
                        ? {
                            message: input.language === 'es'
                                ? 'Haz una pausa con este pasaje y explora lo que revela sobre el amor y la fidelidad de Dios.'
                                : 'Pause with this passage and explore what it reveals about God’s love and faithfulness.',
                            prayer: input.language === 'es'
                                ? 'Jesús, ayúdame a entender este pasaje y Tu amor. Amén.'
                                : 'Jesus, help me understand this passage and Your love. Amen.',
                            question: input.language === 'es'
                                ? '¿Qué te llama la atención en este pasaje?'
                                : 'What stands out to you in this passage?',
                        }
                        : prepared[input.language][selected.theme],
                    source: 'prepared',
                };
                try {
                    if (provider)
                        value = {
                            scripture,
                            encouragement: encouragementTextSchema.parse(await provider.generate({ ...selected, scripture })),
                            source: 'ai',
                        };
                }
                catch {
                    // Keep verified Scripture and a usable prepared encouragement on quota/network failures.
                }
                if (cache.size >= 200)
                    cache.delete(cache.keys().next().value);
                cache.set(key, {
                    expires: now() + (value.source === 'ai' ? (input.date ? 24 : 6) * 60 * 60 * 1000 : 60000),
                    value,
                });
                return value;
            })();
            pending.set(key, operation);
            try {
                return await operation;
            }
            finally {
                pending.delete(key);
            }
        },
    };
}
