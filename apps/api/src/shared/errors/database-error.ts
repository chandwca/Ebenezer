import { ApiError } from './api-error.js';

interface ErrorReply {
  code: string;
  message: string;
}

/** Each module names its own replies; the PostgreSQL codes are shared by every table. */
export interface DatabaseErrorReplies {
  uniqueViolation: ErrorReply;
  checkViolation: ErrorReply;
  insufficientPrivilege: ErrorReply;
  unavailable: ErrorReply;
}

const postgresCodes: Record<string, keyof DatabaseErrorReplies> = {
  '23505': 'uniqueViolation',
  '23514': 'checkViolation',
  '42501': 'insufficientPrivilege',
};
const statuses: Record<keyof DatabaseErrorReplies, number> = {
  uniqueViolation: 409,
  checkViolation: 400,
  insufficientPrivilege: 403,
  unavailable: 503,
};

export function databaseError(error: { code: string }, replies: DatabaseErrorReplies): never {
  const kind = postgresCodes[error.code] ?? 'unavailable';
  throw new ApiError(statuses[kind], replies[kind].code, replies[kind].message);
}
