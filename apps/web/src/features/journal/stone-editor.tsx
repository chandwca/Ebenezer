import { useEffect } from 'react';
import { registerReloadGuard } from '@/pwa/reload-guards';
import { useState } from 'react';
import { useReflectionForm } from '@/features/reflection/use-reflection-form';
import { useTranslation } from 'react-i18next';
import { journal } from '@/db/repositories';
import type { Stone } from '@/db/database';
import { fields } from '@/features/reflection/config';
import { FormBuilder } from '@/components/ui/form-builder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { ContentLayout } from '@/components/ui/content-layout';
export function StoneEditor({
  stone,
  onClose,
}: {
  stone: Stone;
  onClose: (saved?: boolean) => void;
}) {
  const { t } = useTranslation(['journal', 'errors']);
  const form = useReflectionForm(stone);
  const [failed, setFailed] = useState(false);
  useEffect(
    () =>
      registerReloadGuard(async () => {
        if (form.formState.isDirty || form.formState.isSubmitting)
          throw new Error('Save changes before updating');
      }),
    [form.formState.isDirty, form.formState.isSubmitting],
  );
  return (
    <Card>
      <FormBuilder
        form={form}
        fields={fields.flat()}
        onSubmit={async (values) => {
          setFailed(false);
          try {
            await journal.saveStone(values, { id: stone.id, preserveDraft: true });
            onClose(true);
          } catch {
            setFailed(true);
          }
        }}
      >
        {failed && <Alert>{t('errors:storageUnavailable')}</Alert>}
        <ContentLayout>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {t('manage.save')}
          </Button>
          <Button
            variant="outline"
            disabled={form.formState.isSubmitting}
            onClick={() => onClose()}
          >
            {t('manage.cancel')}
          </Button>
        </ContentLayout>
      </FormBuilder>
    </Card>
  );
}
