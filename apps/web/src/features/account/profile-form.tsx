import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cloudProfileSchema, type CloudProfile } from '@ebenezer/contracts';
import { useTranslation } from 'react-i18next';
import { AccountApiError } from '@/lib/api/client';
import { FormBuilder, type FormField } from '@/components/ui/form-builder';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

const fieldsSchema = cloudProfileSchema.pick({ displayName: true, handle: true });
type ProfileFields = Pick<CloudProfile, 'displayName' | 'handle'>;
const fields: FormField<ProfileFields>[] = [
  {
    name: 'displayName',
    type: 'text',
    labelKey: 'account:profile.name',
    descriptionKey: 'account:profile.nameHint',
  },
  {
    name: 'handle',
    type: 'text',
    labelKey: 'account:profile.handle',
    descriptionKey: 'account:profile.handleHint',
    placeholderKey: 'account:profile.handlePlaceholder',
  },
];

export function CommunityProfileForm({
  profile,
  save,
}: {
  profile: CloudProfile | null;
  save: (values: ProfileFields) => Promise<void>;
}) {
  const { t } = useTranslation('account');
  const form = useForm<ProfileFields>({
    resolver: zodResolver(fieldsSchema, { error: () => 'account:errors.invalidProfile' }),
    defaultValues: { displayName: profile?.displayName ?? '', handle: profile?.handle ?? '' },
  });
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    form.reset({ displayName: profile?.displayName ?? '', handle: profile?.handle ?? '' });
  }, [form, profile]);

  async function submit(values: ProfileFields) {
    setErrorKey(null);
    setSaved(false);
    try {
      await save(values);
      setSaved(true);
    } catch (error) {
      setErrorKey(
        error instanceof AccountApiError && error.code === 'handle_taken'
          ? 'errors.handleTaken'
          : error instanceof AccountApiError && error.status === 401
            ? 'errors.sessionExpired'
            : 'errors.save',
      );
    }
  }
  return (
    <FormBuilder form={form} fields={fields} onSubmit={submit}>
      {errorKey && <Alert>{t(errorKey)}</Alert>}
      {saved && <Alert variant="success">{t('profile.saved')}</Alert>}
      <Button type="submit" variant="gold" disabled={form.formState.isSubmitting}>
        {t(
          form.formState.isSubmitting
            ? 'profile.saving'
            : profile
              ? 'profile.update'
              : 'profile.create',
        )}
      </Button>
    </FormBuilder>
  );
}
