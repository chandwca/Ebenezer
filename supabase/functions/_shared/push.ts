// Encrypts and signs a notification with web-push, then delivers it with the runtime's fetch.
import webpush from 'web-push';
import type { Payload } from './reminders.ts';

export type Vapid = { subject: string; publicKey: string; privateKey: string };
export type Target = { endpoint: string; p256dh: string; auth: string };
/** 'gone': the phone unsubscribed or uninstalled, so its row should be deleted. */
export type Delivery = 'sent' | 'gone' | 'failed';

export function requestFor(target: Target, payload: Payload, vapid: Vapid) {
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > 3500)
    throw new Error('Reminder payload is too large');
  return webpush.generateRequestDetails(
    { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
    JSON.stringify(payload),
    {
      vapidDetails: vapid,
      // Undelivered reminders expire after a few hours rather than arriving stale.
      TTL: 4 * 60 * 60,
      urgency: 'normal',
      // A newer reminder of the same kind replaces an undelivered older one.
      topic: payload.tag,
    },
  );
}

export async function deliver(
  target: Target,
  payload: Payload,
  vapid: Vapid,
  request: typeof fetch = fetch,
): Promise<Delivery> {
  try {
    const details = requestFor(target, payload, vapid);
    const response = await request(details.endpoint, {
      method: details.method,
      headers: details.headers as Record<string, string>,
      body: Uint8Array.from(details.body as Uint8Array).buffer,
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 404 || response.status === 410) return 'gone';
    return response.ok ? 'sent' : 'failed';
  } catch {
    return 'failed';
  }
}

/** VAPID settings from the function's secrets; undefined until they are set. */
export function vapidFromEnv(read: (name: string) => string | undefined): Vapid | undefined {
  const subject = read('VAPID_SUBJECT');
  const publicKey = read('VAPID_PUBLIC_KEY');
  const privateKey = read('VAPID_PRIVATE_KEY');
  return subject && publicKey && privateKey ? { subject, publicKey, privateKey } : undefined;
}
