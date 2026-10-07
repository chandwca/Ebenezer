import Fastify from 'fastify';
import cors from '@fastify/cors';
import { readSupabaseConfig, type SupabaseConfig } from './config/env.js';
import { ApiError } from './shared/errors/api-error.js';
import { createAuthGateway, type AuthGateway } from './shared/supabase/auth-gateway.js';
import { createPublicClient } from './shared/supabase/public-client.js';
import { readEncouragementProvider } from './config/ai.js';
import type { EncouragementProvider } from './shared/ai/provider.js';
import type { SongCatalog } from './shared/music/song-catalog.js';
import type { ScriptureProvider } from './shared/bible/provider.js';
import { readScriptureProvider } from './config/scripture.js';
import { registerModules, type RepositoryFactories } from './modules/index.js';

interface AppOptions {
  authGateway?: AuthGateway;
  repositories?: Partial<RepositoryFactories>;
  supabaseConfig?: SupabaseConfig;
  logger?: boolean;
  encouragementProvider?: EncouragementProvider;
  songCatalog?: SongCatalog;
  scriptureProvider?: ScriptureProvider;
}

export function createApp(options: AppOptions = {}) {
  const config = options.supabaseConfig ?? (options.authGateway ? undefined : readSupabaseConfig());
  const gateway = options.authGateway ?? (config ? createAuthGateway(config) : undefined);
  const app = Fastify({
    bodyLimit: 16384,
    logger:
      options.logger === false
        ? false
        : { redact: ['req.headers.authorization', 'req.headers.cookie'] },
  });
  app.register(cors, {
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
    methods: ['GET', 'HEAD', 'POST', 'PATCH', 'PUT', 'DELETE'],
  });
  app.decorateRequest('authContext', null);
  registerModules(app, {
    authGateway: gateway,
    publicClient: config ? createPublicClient(config) : undefined,
    repositories: options.repositories,
    encouragementProvider: options.encouragementProvider ?? readEncouragementProvider(),
    songCatalog: options.songCatalog,
    scriptureProvider: options.scriptureProvider ?? readScriptureProvider(),
  });
  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ApiError)
      return reply.code(error.status).send({ error: { code: error.code, message: error.message } });
    if (
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      return reply.code(error.statusCode).send({
        error: {
          code: 'invalid_request',
          message: 'The request could not be accepted.',
        },
      });
    }
    // Do not log tokens, request bodies or raw upstream errors containing personal data.
    request.log.error({ requestId: request.id }, 'Unhandled API failure');
    return reply.code(500).send({
      error: {
        code: 'internal_error',
        message: 'Something went wrong. Please try again.',
      },
    });
  });
  return app;
}
