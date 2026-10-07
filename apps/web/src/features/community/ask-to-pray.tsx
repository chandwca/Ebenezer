import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { Connection, PrayerContact } from '@ebenezer/contracts';
import {
  PrayerRequestDialog,
  type PrayerChannelAction,
} from '@/components/ui/prayer-request-dialog';
import { canShare, channelHref } from '@/lib/contact-messaging';
import { prayerLinkUrl, type CommunityApi } from './community-api';
import { errorKey } from './use-community';

export type PrayerTarget =
  { kind: 'contact'; contact: PrayerContact } | { kind: 'friend'; connection: Connection };

const outsideChannels = ['whatsapp', 'sms', 'email'] as const;

/**
 * Prepares a prayer request for one person. Friends receive it inside Ebenezer. People
 * without an account receive it through the person's own messaging app, optionally with a
 * private prayer link. Nothing is recorded as “asked” unless the person says so.
 */
export function AskToPray({
  target,
  api,
  online,
  initialMessage,
  onDone,
  onClose,
}: {
  target: PrayerTarget;
  /** Present when signed in with a community profile. */
  api?: CommunityApi;
  online: boolean;
  initialMessage?: string;
  onDone: (notice: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const name =
    target.kind === 'contact' ? target.contact.displayName : target.connection.person.displayName;
  const [message, setMessage] = React.useState(
    () => initialMessage ?? t('ask.defaultMessage', { name }),
  );
  const [link, setLink] = React.useState<{ postId: string; url: string }>();
  const [linkBusy, setLinkBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string>();
  const fail = (error: unknown) => setNotice(t(`errors.${errorKey(error)}`));

  async function toggleLink(include: boolean) {
    if (!api || target.kind !== 'contact') return;
    setLinkBusy(true);
    setNotice(undefined);
    try {
      if (include) {
        // A private request only the author sees, opened for Mom through the link.
        const post = await api.createPost({
          kind: 'prayer_request',
          audience: 'people',
          body: message.trim(),
        });
        const created = await api.createPrayerLink(post.id, name);
        setLink({ postId: post.id, url: prayerLinkUrl(created.token) });
      } else if (link) {
        await api.deletePost(link.postId);
        setLink(undefined);
      }
    } catch (error) {
      fail(error);
    } finally {
      setLinkBusy(false);
    }
  }

  const text = link ? `${message.trim()}\n\n${t('ask.linkLine')} ${link.url}` : message;
  const contact = target.kind === 'contact' ? target.contact : undefined;
  const ordered = contact
    ? [...outsideChannels].sort(
        (a, b) => Number(b === contact.channel) - Number(a === contact.channel),
      )
    : [];
  const actions: PrayerChannelAction[] = [
    ...ordered.map((channel) => ({
      channel,
      href: channelHref(channel, text, { phone: contact?.phone, email: contact?.email }),
    })),
    ...(canShare()
      ? [
          {
            channel: 'share' as const,
            onSelect: () => {
              void navigator.share({ text }).catch(() => undefined);
            },
          },
        ]
      : []),
    {
      channel: 'copy',
      onSelect: () => {
        navigator.clipboard
          ?.writeText(text)
          .then(() => setNotice(t('ask.copied')))
          .catch(() => setNotice(t('ask.copyFailed')));
      },
    },
  ];

  return (
    <PrayerRequestDialog
      personName={name}
      message={message}
      onMessageChange={setMessage}
      link={
        contact
          ? {
              available: !!api && online,
              included: !!link,
              busy: linkBusy,
              url: link?.url,
              onChange: (include) => void toggleLink(include),
            }
          : undefined
      }
      actions={actions}
      notice={notice}
      onAsked={() => onDone(t('ask.recorded', { name }))}
      onSendInApp={
        target.kind === 'friend'
          ? () => {
              if (!api) return;
              api
                .createPost({
                  kind: 'prayer_request',
                  audience: 'people',
                  body: message.trim(),
                  recipientIds: [target.connection.person.id],
                })
                .then(() => onDone(t('ask.sentInApp', { name })))
                .catch(fail);
            }
          : undefined
      }
      onClose={onClose}
    />
  );
}
