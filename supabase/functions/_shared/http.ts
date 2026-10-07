// Small HTTP helpers shared by the reminder functions.

export function corsHeaders(allowedOrigin: string) {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

export function json(body: unknown, status: number, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** Best-effort fixed window per caller within one function instance. */
export function rateLimiter(max: number, windowMs: number) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  return (key: string, now = Date.now()) => {
    if (hits.size > 10_000)
      for (const [entry, value] of hits) if (value.resetAt <= now) hits.delete(entry);
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    return ++entry.count <= max;
  };
}

/** Constant-time comparison for the scheduler's shared secret. */
export function sameSecret(given: string | null, expected: string | undefined) {
  if (!given || !expected || given.length !== expected.length) return false;
  let difference = 0;
  for (let index = 0; index < given.length; index++)
    difference |= given.charCodeAt(index) ^ expected.charCodeAt(index);
  return difference === 0;
}
