import { publicPrayerRequestSchema } from '@ebenezer/contracts';
export function createPrayerLinksService(repository) {
    return {
        async open(token) {
            return publicPrayerRequestSchema.parse(await repository.open(token));
        },
        async answer(token, note) {
            await repository.answer(token, note);
            return publicPrayerRequestSchema.parse(await repository.open(token));
        },
    };
}
