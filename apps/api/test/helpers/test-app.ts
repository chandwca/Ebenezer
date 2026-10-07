import { createApp } from '../../src/app.js';
import type { RepositoryFactories } from '../../src/modules/index.js';
import type { AuthGateway } from '../../src/shared/supabase/auth-gateway.js';
import { createFakeAuthGateway } from './fake-auth.js';

/** An app with fake sign-in, quiet logs and only the repositories a test supplies. */
export function createTestApp(
  options: { authGateway?: AuthGateway; repositories?: Partial<RepositoryFactories> } = {},
) {
  return createApp({
    logger: false,
    authGateway: options.authGateway ?? createFakeAuthGateway(),
    repositories: options.repositories,
  });
}
