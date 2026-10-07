import type { z } from 'zod';
import { ApiError } from '../errors/api-error.js';

/** Validates untrusted HTTP input; failures become a generic 400 without echoing the input. */
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value ?? {});
  if (!result.success)
    throw new ApiError(400, 'invalid_request', 'Check the details and try again.');
  return result.data;
}
