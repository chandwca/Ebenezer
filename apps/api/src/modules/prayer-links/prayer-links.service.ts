import { publicPrayerRequestSchema } from '@ebenezer/contracts';
import type { PrayerLinksRepository } from './prayer-links.types.js';

export function createPrayerLinksService(repository: PrayerLinksRepository) {
  return {
    async open(token: string) {
      return publicPrayerRequestSchema.parse(await repository.open(token));
    },
    async answer(token: string, note?: string) {
      await repository.answer(token, note);
      return publicPrayerRequestSchema.parse(await repository.open(token));
    },
  };
}
