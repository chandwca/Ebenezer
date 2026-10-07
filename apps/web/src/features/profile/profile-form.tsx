import { useEffect } from 'react';
import { registerReloadGuard } from '@/pwa/reload-guards';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type ProfileValues } from '@ebenezer/contracts';
import { useTranslation } from 'react-i18next';
import { journal } from '@/db/repositories';
import { FormBuilder, type FormField } from '@/components/ui/form-builder';
import { PreferenceCard } from '@/components/ui/preference-card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const fields: FormField<ProfileValues>[] = [
  {
    name: 'name',
    type: 'text',
    labelKey: 'settings:profile.name',
    descriptionKey: 'settings:profile.nameHint',
    placeholderKey: 'settings:profile.namePlaceholder',
  },
  {
    name: 'city',
    type: 'text',
    labelKey: 'settings:profile.city',
    descriptionKey: 'settings:profile.cityHint',
    placeholderKey: 'settings:profile.cityPlaceholder',
  },
];

export function ProfileForm({
  onSaved,
  compact = false,
  submitLabel,
}: { onSaved?: () => Promise<void>; compact?: boolean; submitLabel?: string } = {}) {
  const { t } = useTranslation(['settings', 'common', 'errors']);
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', city: '' },
  });
  const [status, setStatus] = React.useState<'loading' | 'ready' | 'saved' | 'error'>('loading');
  React.useEffect(() => {
    let active = true;
    journal
      .getPreference('profile')
      .then((preference) => {
        if (!active) return;
        if (typeof preference?.value === 'string') {
          const parsed = profileSchema.safeParse(JSON.parse(preference.value));
          if (parsed.success) form.reset(parsed.data);
        }
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [form]);
  useEffect(
    () =>
      registerReloadGuard(async () => {
        if (form.formState.isDirty || form.formState.isSubmitting)
          throw new Error('Save changes before updating');
      }),
    [form.formState.isDirty, form.formState.isSubmitting],
  );
  async function save(values: ProfileValues) {
    try {
      await journal.setPreference('profile', JSON.stringify(values));
      form.reset(values);
      setStatus('saved');
      await onSaved?.();
    } catch {
      setStatus('error');
    }
  }
  const content = (
    <>
      <FormBuilder form={form} fields={fields} onSubmit={save}>
        {status === 'error' && <Alert>{t('errors:saveFailed')}</Alert>}
        {status === 'saved' && <Alert variant="success">{t('profile.saved')}</Alert>}
        <Button type="submit" disabled={status === 'loading' || form.formState.isSubmitting}>
          {submitLabel ?? t('common:buttons.save')}
        </Button>
      </FormBuilder>
    </>
  );
  return compact ? (
    content
  ) : (
    <PreferenceCard title={t('profile.title')} description={t('profile.description')}>
      {content}
    </PreferenceCard>
  );
}
