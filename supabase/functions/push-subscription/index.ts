// Called by the app: save reminder settings (welcome notification the first time),
// send a reminder now, or turn reminders off. No account; see _shared/subscriptions.ts.
import { deliver, vapidFromEnv } from '../_shared/push.ts';
import { corsHeaders, json, rateLimiter } from '../_shared/http.ts';
import { createStore } from '../_shared/store.ts';
import { handleSubscriptionRequest } from '../_shared/subscriptions.ts';

const headers = corsHeaders(Deno.env.get('WEB_ORIGIN') ?? '*');
const store = createStore(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const perCaller = rateLimiter(30, 60_000);
const testsPerPhone = rateLimiter(6, 60_000);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405, headers);
  if (Number(request.headers.get('content-length') ?? 0) > 8192)
    return json({ error: 'too_large' }, 413, headers);
  const caller = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!perCaller(caller)) return json({ error: 'rate_limited' }, 429, headers);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'invalid_request' }, 400, headers);
  }
  const action = (body as { action?: unknown })?.action;
  const endpoint = String((body as { endpoint?: unknown })?.endpoint ?? '');
  if (action === 'test' && !testsPerPhone(endpoint))
    return json({ error: 'rate_limited' }, 429, headers);
  try {
    const reply = await handleSubscriptionRequest(body, {
      store,
      vapid: vapidFromEnv((name) => Deno.env.get(name)),
      deliver,
      now: () => new Date(),
    });
    return json(reply.body, reply.status, headers);
  } catch {
    // Never echo storage or push-service errors: they can contain request details.
    return json({ error: 'unavailable' }, 503, headers);
  }
});
