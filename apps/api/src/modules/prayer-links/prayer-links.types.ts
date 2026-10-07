/** Signed-out access to one prayer request through its private link token. */
export interface PrayerLinksRepository {
  open(token: string): Promise<unknown>;
  answer(token: string, note?: string): Promise<void>;
}
export type PrayerLinksRepositoryFactory = () => PrayerLinksRepository;
