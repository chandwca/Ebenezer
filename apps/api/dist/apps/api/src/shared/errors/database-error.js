import { ApiError } from './api-error.js';
const postgresCodes = {
    '23505': 'uniqueViolation',
    '23514': 'checkViolation',
    '42501': 'insufficientPrivilege',
};
const statuses = {
    uniqueViolation: 409,
    checkViolation: 400,
    insufficientPrivilege: 403,
    unavailable: 503,
};
export function databaseError(error, replies) {
    const kind = postgresCodes[error.code] ?? 'unavailable';
    throw new ApiError(statuses[kind], replies[kind].code, replies[kind].message);
}
