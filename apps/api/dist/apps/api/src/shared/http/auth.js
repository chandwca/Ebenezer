import { ApiError } from '../errors/api-error.js';
export function requireAuth(gateway) {
    return async (request) => {
        const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '');
        if (!match || match[1].length > 8192) {
            throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
        }
        if (!gateway)
            throw new ApiError(503, 'supabase_not_configured', 'Account services are not configured.');
        request.authContext = await gateway.authenticate(match[1]);
    };
}
export function authContext(request) {
    if (!request.authContext)
        throw new ApiError(401, 'unauthorized', 'Please sign in to continue.');
    return request.authContext;
}
