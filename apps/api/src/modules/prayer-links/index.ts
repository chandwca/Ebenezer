// Public surface of the prayer-links module. Other modules import only from here.
export { registerPrayerLinkRoutes } from './prayer-links.routes.js';
export { createPrayerLinksRepository } from './prayer-links.repository.js';
export type { PrayerLinksRepository, PrayerLinksRepositoryFactory } from './prayer-links.types.js';
