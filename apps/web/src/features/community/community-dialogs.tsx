import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  createGroupSchema,
  prayerContactSchema,
  type CommunityGroup,
  type CreateGroupValues,
  type PrayerContact,
  type PrayerContactValues,
} from '@ebenezer/contracts';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogModalLayout } from '@/components/ui/dialog-modal-layout';
import { FormBuilder, type FormField } from '@/components/ui/form-builder';
import { WritingArea } from '@/components/ui/input';

const groupFields: FormField<CreateGroupValues>[] = [
  { name: 'name', type: 'text', labelKey: 'community:groups.form.name' },
  {
    name: 'description',
    type: 'textarea',
    labelKey: 'community:groups.form.description',
    placeholderKey: 'community:groups.form.descriptionPlaceholder',
  },
  {
    name: 'meetingNote',
    type: 'text',
    labelKey: 'community:groups.form.meeting',
    placeholderKey: 'community:groups.form.meetingPlaceholder',
  },
  {
    name: 'visibility',
    type: 'choices',
    labelKey: 'community:groups.form.visibility',
    choices: [
      { value: 'open', labelKey: 'community:groups.form.open' },
      { value: 'private', labelKey: 'community:groups.form.private' },
    ],
  },
];

const contactFields: FormField<PrayerContactValues>[] = [
  {
    name: 'displayName',
    type: 'text',
    labelKey: 'community:people.form.name',
    placeholderKey: 'community:people.form.namePlaceholder',
  },
  {
    name: 'relationship',
    type: 'text',
    labelKey: 'community:people.form.relationship',
    placeholderKey: 'community:people.form.relationshipPlaceholder',
  },
  {
    name: 'channel',
    type: 'choices',
    labelKey: 'community:people.form.channel',
    choices: (['whatsapp', 'sms', 'email', 'share'] as const).map((value) => ({
      value,
      labelKey: `community:people.channel.${value}`,
    })),
  },
  {
    name: 'phone',
    type: 'text',
    labelKey: 'community:people.form.phone',
    descriptionKey: 'community:people.form.phoneHint',
    placeholderKey: 'community:people.form.phonePlaceholder',
  },
  { name: 'email', type: 'email', labelKey: 'community:people.form.email' },
];

/** Shared submit wrapper: keeps the dialog open and shows a message when saving fails. */
function useSave<T>(save: (values: T) => Promise<void>) {
  const [error, setError] = React.useState<string>();
  return {
    error,
    async submit(values: T) {
      setError(undefined);
      try {
        await save(values);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'request_failed');
      }
    },
  };
}

export function GroupFormDialog({
  group,
  onSave,
  onClose,
}: {
  group?: CommunityGroup;
  onSave: (values: CreateGroupValues) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const form = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: group?.name ?? '',
      description: group?.description ?? '',
      meetingNote: group?.meetingNote ?? '',
      visibility: group?.visibility ?? 'private',
    },
  });
  const { error, submit } = useSave(onSave);
  return (
    <DialogModalLayout
      title={t(group ? 'groups.edit' : 'groups.start')}
      description={t('groups.form.intro')}
      onClose={onClose}
      busy={form.formState.isSubmitting}
    >
      <FormBuilder form={form} fields={groupFields} onSubmit={submit}>
        {error && <Alert>{t(`errors.${error}`, t('errors.request_failed'))}</Alert>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t(group ? 'groups.form.save' : 'groups.form.submit')}
        </Button>
      </FormBuilder>
    </DialogModalLayout>
  );
}

export function ContactDialog({
  contact,
  onSave,
  onClose,
}: {
  contact?: PrayerContact;
  onSave: (values: PrayerContactValues) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const form = useForm<PrayerContactValues>({
    resolver: zodResolver(prayerContactSchema),
    defaultValues: {
      displayName: contact?.displayName ?? '',
      relationship: contact?.relationship ?? '',
      channel: contact?.channel ?? 'whatsapp',
      phone: contact?.phone ?? '',
      email: contact?.email ?? '',
    },
  });
  const { error, submit } = useSave(onSave);
  return (
    <DialogModalLayout
      title={t(contact ? 'people.editContact' : 'people.addContact')}
      description={t('people.form.intro')}
      onClose={onClose}
    >
      <FormBuilder form={form} fields={contactFields} onSubmit={submit}>
        {error && <Alert>{t('errors.storage')}</Alert>}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {t(contact ? 'people.form.save' : 'people.form.submit')}
        </Button>
      </FormBuilder>
    </DialogModalLayout>
  );
}

export function EditPostDialog({
  body,
  onSave,
  onClose,
}: {
  body: string;
  onSave: (body: string) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation('community');
  const id = React.useId();
  const [value, setValue] = React.useState(body);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string>();
  return (
    <DialogModalLayout
      title={t('post.editTitle')}
      onClose={onClose}
      busy={busy}
      size="md"
      footer={
        <Button
          disabled={busy || !value.trim()}
          onClick={() => {
            setBusy(true);
            setError(undefined);
            onSave(value.trim())
              .catch((cause: unknown) =>
                setError(cause instanceof Error ? cause.message : 'request_failed'),
              )
              .finally(() => setBusy(false));
          }}
        >
          {t('post.save')}
        </Button>
      }
    >
      <WritingArea
        id={id}
        aria-label={t('composer.bodyLabel')}
        maxLength={4000}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      {error && <Alert>{t(`errors.${error}`, t('errors.request_failed'))}</Alert>}
    </DialogModalLayout>
  );
}
