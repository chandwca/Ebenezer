import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { journal } from '@/db/repositories';
import type { Stone } from '@/db/database';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { StoneTower } from '@/components/ui/stone-tower';
import { StoneDetail } from '@/components/ui/stone-detail';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { JourneySummary } from '@/features/remembrance/journey-summary';
import { StoneEditor } from '@/features/journal/stone-editor';
import { ReminderPrompt } from '@/features/reminders/reminder-prompt';
import { useLocation } from 'react-router-dom';

export function StoryPage() {
  // Arriving right after setting a stone: a second, final chance to turn on reminders.
  const justSaved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  const { t } = useTranslation(['journal', 'errors']);
  const [editing, setEditing] = useState<Stone>();
  const [selectedId, setSelectedId] = useState<string>();
  const [deleting, setDeleting] = useState<Stone>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ error: boolean; key: string }>();
  const result = useLiveQuery(async () => {
    try {
      return { stones: await journal.listStones(), failed: false };
    } catch {
      return { stones: [], failed: true };
    }
  });
  const stones = result?.stones ?? [];
  const selected = stones.find((stone) => stone.id === selectedId);
  return (
    <>
      <PageHeading
        eyebrow={t('story.eyebrow')}
        title={t('tower.heading')}
        description={t('tower.description')}
      />
      {justSaved && <ReminderPrompt placement="after-stone" />}
      {!editing && result && !result.failed && stones.length > 0 && (
        <JourneySummary stones={result.stones} />
      )}
      {notice && <Alert variant={notice.error ? 'error' : 'success'}>{t(notice.key)}</Alert>}
      {editing ? (
        <StoneEditor
          key={editing.id}
          stone={editing}
          onClose={(saved) => {
            setEditing(undefined);
            if (saved) setNotice({ error: false, key: 'manage.saved' });
          }}
        />
      ) : !result ? (
        <Alert variant="info">{t('status.loading')}</Alert>
      ) : result.failed ? (
        <Alert>{t('errors:storageUnavailable')}</Alert>
      ) : stones.length ? (
        <StoneTower stones={stones} onOpen={(stone) => setSelectedId(stone.id)} />
      ) : (
        <EmptyState
          icon={Layers}
          title={t('story.heading')}
          description={t('story.empty')}
          action={t('form.begin')}
          to="/reflection"
        />
      )}
      {selected && (
        <StoneDetail
          stone={selected}
          onClose={() => setSelectedId(undefined)}
          onEdit={(stone) => {
            setSelectedId(undefined);
            setEditing(stone);
          }}
          onDelete={(stone) => {
            setSelectedId(undefined);
            setNotice(undefined);
            setDeleting(stone);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          title={t('manage.deleteTitle')}
          description={t('manage.deleteDescription')}
          confirmLabel={t('manage.delete')}
          cancelLabel={t('manage.cancel')}
          busy={busy}
          error={notice?.error ? t(notice.key) : undefined}
          onCancel={() => setDeleting(undefined)}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              try {
                await journal.deleteStone(deleting.id);
                setDeleting(undefined);
                setNotice({ error: false, key: 'manage.deleted' });
              } catch {
                setNotice({ error: true, key: 'errors:storageUnavailable' });
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      )}
    </>
  );
}
