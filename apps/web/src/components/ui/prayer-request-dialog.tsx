import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Link2, Mail, MessageCircle, MessageSquare, Send, Share2 } from 'lucide-react';
import { Button } from './button';
import { Checkbox } from './checkbox';
import { DialogModalLayout } from './dialog-modal-layout';
import { WritingArea } from './input';

export type PrayerChannelAction =
  | { channel: 'whatsapp' | 'sms' | 'email'; href: string }
  | { channel: 'share' | 'copy'; onSelect: () => void };

const icons = {
  whatsapp: MessageCircle,
  sms: MessageSquare,
  email: Mail,
  share: Share2,
  copy: Copy,
};

/** Editable prayer request with hand-off buttons. Delivery always happens in the person's own app. */
export function PrayerRequestDialog({
  personName,
  message,
  onMessageChange,
  link,
  actions,
  notice,
  onAsked,
  onSendInApp,
  onClose,
}: {
  personName: string;
  message: string;
  onMessageChange: (message: string) => void;
  /** Private prayer link for someone without an account; omitted for app friends. */
  link?: {
    available: boolean;
    included: boolean;
    busy: boolean;
    url?: string;
    onChange: (included: boolean) => void;
  };
  actions: readonly PrayerChannelAction[];
  notice?: string;
  onAsked: () => void;
  /** App friends receive the request inside Ebenezer instead of an outside app. */
  onSendInApp?: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const id = React.useId();
  return (
    <DialogModalLayout
      title={t('ask.title', { name: personName })}
      description={t('ask.description')}
      onClose={onClose}
      size="md"
      footer={
        onSendInApp ? (
          <Button onClick={onSendInApp}>
            <Send aria-hidden="true" />
            {t('ask.sendInApp', { name: personName })}
          </Button>
        ) : (
          <Button variant="secondary" onClick={onAsked}>
            {t('ask.asked', { name: personName })}
          </Button>
        )
      }
    >
      <label htmlFor={`${id}-message`} className="text-sm font-semibold">
        {t('ask.message')}
      </label>
      <WritingArea
        id={`${id}-message`}
        className="mt-2"
        minHeight={140}
        maxLength={1000}
        value={message}
        readOnly={!!link?.url}
        onChange={(event) => onMessageChange(event.target.value)}
      />
      {link && (
        <label className="mt-4 flex gap-3 rounded-xl border bg-background p-4 text-sm">
          <Checkbox
            checked={link.included}
            disabled={!link.available || link.busy}
            onChange={(event) => link.onChange(event.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <Link2 className="size-4 text-teal" aria-hidden="true" />
              {t('ask.link', { name: personName })}
            </span>
            <span className="mt-1 block leading-5 text-muted-foreground">
              {t(
                link.busy
                  ? 'ask.linkCreating'
                  : link.url
                    ? 'ask.linkReady'
                    : link.available
                      ? 'ask.linkHint'
                      : 'ask.linkUnavailable',
                { name: personName },
              )}
            </span>
            {link.url && (
              <span className="mt-2 block break-all font-mono text-xs text-secondary-foreground">
                {link.url}
              </span>
            )}
          </span>
        </label>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm text-secondary-foreground">
          {notice}
        </p>
      )}
      <p className="mt-5 text-sm font-semibold">
        {t(onSendInApp ? 'ask.orShare' : 'ask.sendWith')}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = icons[action.channel];
          const label = t(`ask.channel.${action.channel}`);
          return 'href' in action ? (
            <Button key={action.channel} asChild variant="outline">
              <a href={action.href} target="_blank" rel="noreferrer">
                <Icon aria-hidden="true" />
                {label}
              </a>
            </Button>
          ) : (
            <Button key={action.channel} variant="outline" onClick={action.onSelect}>
              <Icon aria-hidden="true" />
              {label}
            </Button>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">{t('ask.privacy')}</p>
    </DialogModalLayout>
  );
}
