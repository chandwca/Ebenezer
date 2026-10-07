const steps = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
] as const;

/** “2 hours ago” in the active language; under a minute reads as “now”. */
export function relativeTime(iso: string, language: string, now = Date.now()) {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const format = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit);
  }
  return format.format(0, 'second');
}
