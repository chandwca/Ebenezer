import type { SongCatalog } from '../shared/music/song-catalog.js';
import type { ScriptureProvider } from '../shared/bible/provider.js';
import type { FastifyInstance } from 'fastify';
import type { AuthGateway } from '../shared/supabase/auth-gateway.js';
import type { UserScopedSupabaseClient } from '../shared/supabase/client-types.js';
import type { EncouragementProvider } from '../shared/ai/provider.js';
import { registerEncouragementRoutes } from './encouragement/index.js';
import { registerHealthRoutes } from './health/index.js';
import { registerProfileRoutes, type ProfilesRepositoryFactory } from './profiles/index.js';
import { registerPeopleRoutes, type PeopleRepositoryFactory } from './people/index.js';
import { registerGroupRoutes, type GroupsRepositoryFactory } from './groups/index.js';
import { registerPostRoutes, type PostsRepositoryFactory } from './posts/index.js';
import {
  createPrayerLinksRepository,
  registerPrayerLinkRoutes,
  type PrayerLinksRepositoryFactory,
} from './prayer-links/index.js';

/** Tests replace a module's repository here; production builds them from the actor's client. */
export interface RepositoryFactories {
  profiles: ProfilesRepositoryFactory;
  people: PeopleRepositoryFactory;
  groups: GroupsRepositoryFactory;
  posts: PostsRepositoryFactory;
  prayerLinks: PrayerLinksRepositoryFactory;
}

export interface ModuleDependencies {
  scriptureProvider?: ScriptureProvider;
  encouragementProvider?: EncouragementProvider;
  songCatalog?: SongCatalog;
  authGateway?: AuthGateway;
  /** Signed-out client for the prayer-link routes. */
  publicClient?: UserScopedSupabaseClient;
  repositories?: Partial<RepositoryFactories>;
}

export const API_PREFIX = '/v1';

export function registerModules(
  app: FastifyInstance,
  {
    authGateway,
    publicClient,
    repositories = {},
    encouragementProvider,
    songCatalog,
    scriptureProvider,
  }: ModuleDependencies,
) {
  // Unversioned so hosting health checks survive API version changes.
  registerHealthRoutes(app);
  const prayerLinks =
    repositories.prayerLinks ??
    (publicClient ? () => createPrayerLinksRepository(publicClient) : undefined);
  app.register(
    async (api) => {
      registerProfileRoutes(api, authGateway, repositories.profiles);
      registerEncouragementRoutes(
        api,
        authGateway,
        encouragementProvider,
        songCatalog,
        scriptureProvider,
      );
      registerPeopleRoutes(api, authGateway, repositories.people);
      registerGroupRoutes(api, authGateway, repositories.groups);
      registerPostRoutes(api, authGateway, repositories.posts);
      registerPrayerLinkRoutes(api, prayerLinks);
    },
    { prefix: API_PREFIX },
  );
}
