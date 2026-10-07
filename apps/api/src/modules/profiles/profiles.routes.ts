import type { FastifyInstance } from 'fastify';
import type { AuthGateway } from '../../shared/supabase/auth-gateway.js';
import { requireAuth } from '../../shared/http/auth.js';
import { noStore } from '../../shared/http/no-store.js';
import { createProfilesController } from './profiles.controller.js';
import { createProfilesRepository } from './profiles.repository.js';
import type { ProfilesRepositoryFactory } from './profiles.types.js';

export function registerProfileRoutes(
  app: FastifyInstance,
  gateway: AuthGateway | undefined,
  // The module is assembled here: production uses the actor's Supabase client, tests inject a fake.
  repositoryFor: ProfilesRepositoryFactory = (context) => createProfilesRepository(context.client),
) {
  const profilesController = createProfilesController(repositoryFor);
  const onRequest = requireAuth(gateway);
  app.get('/me', { onRequest, onSend: noStore }, profilesController.getOwn);
  app.patch('/me', { onRequest, onSend: noStore }, profilesController.updateOwn);
}
