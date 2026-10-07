import type { ContactChannel } from '@ebenezer/contracts';

/**
 * Builds a link that opens the person's own messaging app with the text filled in.
 * Opening it proves nothing was sent; callers must never record “asked” automatically.
 */
export function channelHref(
  channel: Exclude<ContactChannel, 'share'>,
  text: string,
  to: { phone?: string; email?: string } = {},
) {
  const body = encodeURIComponent(text);
  const phone = to.phone?.replace(/[^\d]/g, '') ?? '';
  if (channel === 'whatsapp') return `https://wa.me/${phone}?text=${body}`;
  if (channel === 'sms') return `sms:${phone ? `+${phone}` : ''}?&body=${body}`;
  return `mailto:${encodeURIComponent(to.email ?? '')}?body=${body}`;
}

export function canShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}
