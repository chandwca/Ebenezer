import type { FastifyRequest } from 'fastify';
import { ApiError } from '../errors/api-error.js';

/**
 * Small fixed-window limiter for the unauthenticated routes. In memory, so limits are
 * per process; enough for one free-tier instance without adding Redis.
 */
export function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return async (request: FastifyRequest) => {
    const now = Date.now();
    if (hits.size > 10_000) {
      for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }
    const entry = hits.get(request.ip);
    if (!entry || entry.resetAt <= now) {
      hits.set(request.ip, { count: 1, resetAt: now + windowMs });
      return;
    }
    entry.count += 1;
    if (entry.count > max)
      throw new ApiError(429, 'rate_limited', 'Too many requests. Please wait a minute.');
  };
}
