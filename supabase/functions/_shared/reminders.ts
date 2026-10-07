// Reminder timing and wording. Pure functions: no Supabase or Deno APIs, so Node tests run them.

export type Language = 'en' | 'es';
export type ReminderKind = 'morning' | 'evening';
export type MessageKind = ReminderKind | 'welcome';

export type Subscription = {
  time_zone: string;
  language: Language;
  morning_time: string; // 'HH:MM' or 'HH:MM:SS'
  evening_time: string;
  discreet: boolean;
  scripture_preview_consent?: boolean;
  last_morning_sent: string | null; // local 'YYYY-MM-DD'
  last_evening_sent: string | null;
};

import type { NotificationWord } from '../../../packages/contracts/src/notifications.ts';
export type Payload = {
  title: string;
  body: string;
  url: string;
  tag: MessageKind;
  word?: NotificationWord;
};

// A reminder missed by a late or failed run is still sent within this window, never hours later.
const SEND_WINDOW_MINUTES = 180;

const minutesOf = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Her local date and minutes past midnight, in her own time zone. */
export function localNow(timeZone: string, now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

export function isTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const isDue = (time: string, lastSent: string | null, local: { date: string; minutes: number }) => {
  const start = minutesOf(time);
  return (
    lastSent !== local.date && local.minutes >= start && local.minutes < start + SEND_WINDOW_MINUTES
  );
};

/**
 * Which reminder, if any, is due now. When both are due (close times or a delayed run), only
 * the later one is sent and both are marked, so she never gets two at once.
 */
export function dueReminder(row: Subscription, now: Date) {
  const local = localNow(row.time_zone, now);
  const morning = isDue(row.morning_time, row.last_morning_sent, local);
  const evening = isDue(row.evening_time, row.last_evening_sent, local);
  if (!morning && !evening) return undefined;
  const kind: ReminderKind =
    morning && evening
      ? minutesOf(row.evening_time) >= minutesOf(row.morning_time)
        ? 'evening'
        : 'morning'
      : morning
        ? 'morning'
        : 'evening';
  return {
    kind,
    date: local.date,
    marks: {
      ...(morning ? { last_morning_sent: local.date } : {}),
      ...(evening ? { last_evening_sent: local.date } : {}),
    },
  };
}

/**
 * Sent dates after saving settings: a time already passed today counts as done, so turning
 * reminders on (or moving a time earlier) never triggers an immediate scheduled reminder.
 * A time moved later today still arrives, unless today's reminder was already sent.
 */
export function settledSentDates(
  row: Pick<Subscription, 'time_zone' | 'morning_time' | 'evening_time'> &
    Partial<Pick<Subscription, 'last_morning_sent' | 'last_evening_sent'>>,
  now: Date,
) {
  const local = localNow(row.time_zone, now);
  const settle = (time: string, lastSent: string | null | undefined) =>
    lastSent === local.date || local.minutes >= minutesOf(time) ? local.date : null;
  return {
    last_morning_sent: settle(row.morning_time, row.last_morning_sent),
    last_evening_sent: settle(row.evening_time, row.last_evening_sent),
  };
}

const text = {
  en: {
    discreet: { title: 'Ebenezer', body: 'A moment for you' },
    morning: { title: 'Breathe in the Word', body: 'Pause with Scripture when you’re ready.' },
    evening: { title: 'Bring your day to Jesus', body: 'Pause, pray, and build a stone.' },
    welcome: {
      title: 'You’re all set',
      body: 'We’ll meet you at {morning} each morning and {evening} each evening.',
    },
    welcomeDiscreet: { title: 'Ebenezer', body: 'Reminders are on: {morning} and {evening}.' },
  },
  es: {
    discreet: { title: 'Ebenezer', body: 'Un momento para ti' },
    morning: {
      title: 'Respira la Palabra',
      body: 'Haz una pausa con la Escritura cuando quieras.',
    },
    evening: { title: 'Lleva tu día a Jesús', body: 'Haz una pausa, ora y guarda una piedra.' },
    welcome: {
      title: 'Todo listo',
      body: 'Te acompañaremos a las {morning} cada mañana y a las {evening} cada noche.',
    },
    welcomeDiscreet: { title: 'Ebenezer', body: 'Recordatorios activos: {morning} y {evening}.' },
  },
} as const;

const urls: Record<MessageKind, string> = {
  morning: '/',
  evening: '/reflection?from=today',
  welcome: '/',
};

/** A clock time in her language, e.g. "7:30 AM" or "7:30". */
export function formatTime(time: string, language: Language) {
  const minutes = minutesOf(time);
  return new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(2026, 0, 1, Math.floor(minutes / 60), minutes % 60)));
}

/** Lock-screen wording. Never contains journal content; discreet wording names nothing religious. */
export function messageFor(
  kind: MessageKind,
  row: Pick<
    Subscription,
    'language' | 'discreet' | 'morning_time' | 'evening_time' | 'scripture_preview_consent'
  >,
  word?: NotificationWord,
): Payload {
  const words = text[row.language] ?? text.en;
  const chosen =
    kind === 'welcome'
      ? row.discreet
        ? words.welcomeDiscreet
        : words.welcome
      : row.discreet
        ? words.discreet
        : words[kind];
  let body = chosen.body
    .replace('{morning}', formatTime(row.morning_time, row.language))
    .replace('{evening}', formatTime(row.evening_time, row.language));
  if (kind === 'morning' && !row.discreet && row.scripture_preview_consent === true && word)
    body = `${word.text}\n${word.reference} · BSB${row.language === 'es' ? ' · Inglés' : ''}\n${word.attribution}`;
  return {
    title: chosen.title,
    body,
    url: word && kind !== 'welcome' ? `/notification/${kind}/${word.date}` : urls[kind],
    tag: kind,
    ...(word && kind !== 'welcome' ? { word } : {}),
  };
}
