import type { FastifyRequest } from 'fastify';
import { ApiError } from '../errors/api-error.js';
import type { AuthContext, AuthGateway } from '../supabase/auth-gateway.js';

declare module 'fastify' {
  interface FastifyRequest {
    authContext: AuthContext | null;
  }
}

export function requireAuth(gateway: AuthGateway | undefined) {
  return async (request: FastifyRequest) => {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
    if (!match || match[1].length > 8192) {
      throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
    }
    if (!gateway)
      throw new ApiError(503, 'supabase_not_configured', 'Account services are not configured.');
    request.authContext = await gateway.authenticate(match[1]);
  };
}

export function authContext(request: FastifyRequest): AuthContext {
  if (!request.authContext) throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
  return request.authContext;
}
