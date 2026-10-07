import { journal } from '@/db/repositories';

// Morning and evening reminders (docs/notifications-setup.md). Settings stay on this device;
// the push-subscription function stores only delivery details, times and language.

export type ReminderSettings = {
  enabled: boolean;
  morningTime: string; // 'HH:MM'
  eveningTime: string;
  discreet: boolean;
  /** Language the server last saved, so a language change can be passed on. */
  language?: 'en' | 'es';
  /** 'once' after the first "Not now"; 'after-stone' once asked again after a stone. */
  dismissed?: 'once' | 'after-stone';
};
export const defaultReminders: ReminderSettings = {
  enabled: false,
  morningTime: '07:30',
  eveningTime: '20:30',
  discreet: true,
};
export const REMINDERS_KEY = 'reminders';

export function parseReminders(value: unknown): ReminderSettings {
  try {
    const stored = typeof value === 'string' ? JSON.parse(value) : undefined;
    const time = (item: unknown, fallback: string) =>
      typeof item === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(item) ? item : fallback;
    return {
      enabled: stored?.enabled === true,
      morningTime: time(stored?.morningTime, defaultReminders.morningTime),
      eveningTime: time(stored?.eveningTime, defaultReminders.eveningTime),
      discreet: stored?.discreet !== false,
      ...(stored?.language === 'en' || stored?.language === 'es'
        ? { language: stored.language }
        : {}),
      ...(stored?.dismissed === 'once' || stored?.dismissed === 'after-stone'
        ? { dismissed: stored.dismissed }
        : {}),
    };
  } catch {
    return defaultReminders;
  }
}

export const storeReminders = (settings: ReminderSettings) =>
  journal.setPreference(REMINDERS_KEY, JSON.stringify(settings));

/**
 * 'install-first': iPhone/iPad in a browser tab, where Apple allows reminders only once the app
 * is on the Home Screen. 'unsupported': this browser cannot receive Web Push at all.
 */
export type ReminderSupport = 'available' | 'install-first' | 'unsupported';

function isAppleMobile() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
function isStandalone() {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
export function reminderSupport(): ReminderSupport {
  if (isAppleMobile() && !isStandalone()) return 'install-first';
  return typeof Notification !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof PushManager !== 'undefined'
    ? 'available'
    : 'unsupported';
}

/** Stable reason codes, translated in settings:reminders.errors. */
export class ReminderError extends Error {
  constructor(public readonly code: 'blocked' | 'dismissed' | 'not_ready' | 'failed') {
    super(code);
  }
}

function functionUrl() {
  const base = import.meta.env.VITE_SUPABASE_URL;
  if (!base) throw new ReminderError('failed');
  return `${base.replace(/\/$/, '')}/functions/v1/push-subscription`;
}

async function call(body: Record<string, unknown>) {
  let response: Response;
  try {
    response = await fetch(functionUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new ReminderError('failed');
  }
  if (!response.ok) throw new ReminderError('failed');
  return (await response.json().catch(() => ({}))) as Record<string, unknown>;
}

function applicationServerKey() {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!key) throw new ReminderError('failed');
  const base64 = key.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

async function registration() {
  // The service worker runs in the production build (and the installed app), not `pnpm dev`.
  const current = await navigator.serviceWorker.getRegistration();
  if (!current) throw new ReminderError('not_ready');
  return current;
}

function settingsBody(settings: ReminderSettings, language: 'en' | 'es') {
  return {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language,
    morningTime: settings.morningTime,
    eveningTime: settings.eveningTime,
    discreet: settings.discreet,
  };
}

function subscriptionBody(subscription: PushSubscription) {
  const { endpoint, keys } = subscription.toJSON();
  if (!endpoint || !keys?.p256dh || !keys.auth) throw new ReminderError('failed');
  return { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } };
}

/** Must be called straight from her tap: Safari allows the permission prompt only then. */
export async function turnOnReminders(settings: ReminderSettings, language: 'en' | 'es') {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') throw new ReminderError('blocked');
  if (permission !== 'granted') throw new ReminderError('dismissed');
  const worker = await registration();
  let subscription = await worker.pushManager.getSubscription();
  try {
    subscription ??= await worker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(),
    });
  } catch (error) {
    throw error instanceof ReminderError ? error : new ReminderError('failed');
  }
  // The server sends a welcome notification the first time it sees this phone.
  await call({
    action: 'save',
    subscription: subscriptionBody(subscription),
    ...settingsBody(settings, language),
  });
}

/** New times, wording or language for a phone that already has reminders on. */
export async function updateReminders(settings: ReminderSettings, language: 'en' | 'es') {
  const subscription = await (await registration()).pushManager.getSubscription();
  if (!subscription) throw new ReminderError('not_ready');
  await call({
    action: 'save',
    subscription: subscriptionBody(subscription),
    ...settingsBody(settings, language),
  });
}

export async function turnOffReminders() {
  const subscription = await (
    await navigator.serviceWorker.getRegistration()
  )?.pushManager
    .getSubscription()
    .catch(() => null);
  if (!subscription) return;
  // Forget the phone on the server first; unsubscribing locally stops delivery regardless.
  await call({ action: 'remove', endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription.unsubscribe().catch(() => undefined);
}

export async function sendTestReminder(kind: 'morning' | 'evening') {
  const subscription = await (await registration()).pushManager.getSubscription();
  if (!subscription) throw new ReminderError('not_ready');
  const reply = await call({ action: 'test', endpoint: subscription.endpoint, kind });
  if (reply.delivery !== 'sent') throw new ReminderError('failed');
}
