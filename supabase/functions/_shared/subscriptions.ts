// What the app can ask: save reminder settings, send a reminder now, or turn reminders off.
// No account: the push address is a long unguessable URL issued to this phone, so knowing it
// is what proves the request comes from that phone.
import { z } from 'zod';
import type { Delivery, Target, Vapid } from './push.ts';
import {
  isTimeZone,
  messageFor,
  settledSentDates,
  type MessageKind,
  type Payload,
  type Subscription,
} from './reminders.ts';

export type Row = Subscription & Target & { id: string };
export type NewRow = Omit<Row, 'id'>;

export interface Store {
  find(endpoint: string): Promise<Row | undefined>;
  save(row: NewRow): Promise<void>;
  remove(endpoint: string): Promise<void>;
}

export type Deps = {
  store: Store;
  vapid: Vapid | undefined;
  deliver: (target: Target, payload: Payload, vapid: Vapid) => Promise<Delivery>;
  now: () => Date;
};

const base64url = z.string().regex(/^[A-Za-z0-9_-]+=*$/);
const endpoint = z.string().max(2048).regex(/^https:\/\//);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const requestSchema = z.discriminatedUnion('action', [
  z.strictObject({
    action: z.literal('save'),
    subscription: z.object({
      endpoint,
      keys: z.object({ p256dh: base64url.min(40).max(200), auth: base64url.min(8).max(100) }),
    }),
    timeZone: z.string().min(1).max(64).refine(isTimeZone),
    language: z.enum(['en', 'es']),
    morningTime: time.default('07:30'),
    eveningTime: time.default('20:30'),
    discreet: z.boolean().default(true),
  }),
  z.strictObject({ action: z.literal('test'), endpoint, kind: z.enum(['morning', 'evening']) }),
  z.strictObject({ action: z.literal('remove'), endpoint }),
]);

export type Reply = { status: number; body: Record<string, unknown> };

async function send(deps: Deps, row: Row, kind: MessageKind) {
  if (!deps.vapid) return 'failed' as const;
  const delivery = await deps.deliver(row, messageFor(kind, row), deps.vapid);
  // The push service says this phone no longer accepts reminders: forget it.
  if (delivery === 'gone') await deps.store.remove(row.endpoint);
  return delivery;
}

export async function handleSubscriptionRequest(input: unknown, deps: Deps): Promise<Reply> {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return { status: 400, body: { error: 'invalid_request' } };
  const request = parsed.data;

  if (request.action === 'remove') {
    await deps.store.remove(request.endpoint);
    return { status: 200, body: { removed: true } };
  }

  if (request.action === 'test') {
    const row = await deps.store.find(request.endpoint);
    if (!row) return { status: 404, body: { error: 'not_subscribed' } };
    if (!deps.vapid) return { status: 503, body: { error: 'unavailable' } };
    return { status: 200, body: { delivery: await send(deps, row, request.kind) } };
  }

  if (!deps.vapid) return { status: 503, body: { error: 'unavailable' } };
  const existing = await deps.store.find(request.subscription.endpoint);
  const settings = {
    time_zone: request.timeZone,
    language: request.language,
    morning_time: request.morningTime,
    evening_time: request.eveningTime,
    discreet: request.discreet,
  };
  const row: NewRow = {
    endpoint: request.subscription.endpoint,
    p256dh: request.subscription.keys.p256dh,
    auth: request.subscription.keys.auth,
    ...settings,
    // New times apply; today's already-sent reminders stay sent.
    ...settledSentDates(
      {
        ...settings,
        last_morning_sent: existing?.last_morning_sent,
        last_evening_sent: existing?.last_evening_sent,
      },
      deps.now(),
    ),
  };
  await deps.store.save(row);
  // The first time only: a welcome notification proves reminders work, right away.
  const welcome = existing ? undefined : await send(deps, { ...row, id: '' }, 'welcome');
  return { status: 200, body: { created: !existing, ...(welcome ? { welcome } : {}) } };
}
