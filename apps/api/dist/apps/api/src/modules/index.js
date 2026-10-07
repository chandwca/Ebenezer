import { registerEncouragementRoutes } from './encouragement/index.js';
import { registerHealthRoutes } from './health/index.js';
import { registerProfileRoutes } from './profiles/index.js';
import { registerPeopleRoutes } from './people/index.js';
import { registerGroupRoutes } from './groups/index.js';
import { registerPostRoutes } from './posts/index.js';
import { createPrayerLinksRepository, registerPrayerLinkRoutes, } from './prayer-links/index.js';
export const API_PREFIX = '/v1';
export function registerModules(app, { authGateway, publicClient, repositories = {}, encouragementProvider, songCatalog, }) {
    // Unversioned so hosting health checks survive API version changes.
    registerHealthRoutes(app);
    const prayerLinks = repositories.prayerLinks ??
        (publicClient ? () => createPrayerLinksRepository(publicClient) : undefined);
    app.register(async (api) => {
        registerProfileRoutes(api, authGateway, repositories.profiles);
        registerEncouragementRoutes(api, authGateway, encouragementProvider, songCatalog);
        registerPeopleRoutes(api, authGateway, repositories.people);
        registerGroupRoutes(api, authGateway, repositories.groups);
        registerPostRoutes(api, authGateway, repositories.posts);
        registerPrayerLinkRoutes(api, prayerLinks);
    }, { prefix: API_PREFIX });
}
