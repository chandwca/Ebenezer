import { ApiError } from './api-error.js';
// SQLSTATE codes raised by the ebenezer_api functions (see the community migration).
// Replies are fixed text: raw database messages never reach clients.
const replies = {
    P0002: [404, 'not_found', 'We couldn’t find that. It may have been removed.'],
    '42501': [403, 'forbidden', 'You don’t have permission to do that.'],
    EB428: [409, 'profile_required', 'Create your community profile first.'],
    '55000': [409, 'conflict', 'That change isn’t possible right now.'],
    '23505': [409, 'conflict', 'That already exists.'],
};
const invalidCodes = new Set(['22023', '23514', '22001', '23502', '22P02', '22007']);
export function rpcError(error) {
    if (invalidCodes.has(error.code))
        throw new ApiError(400, 'invalid_request', 'Check the details and try again.');
    const [status, code, message] = replies[error.code] ?? [
        503,
        'database_unavailable',
        'Community storage is unavailable. Please try again.',
    ];
    throw new ApiError(status, code, message);
}
