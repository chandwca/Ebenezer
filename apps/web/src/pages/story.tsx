import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';
import { journal } from '@/db/repositories';
import type { Stone } from '@/db/database';
import { backupSchema, MAX_BACKUP_BYTES } from '@/db/backup';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeading } from '@/components/ui/page-heading';
import { StoneList } from '@/components/ui/stone-list';
import { StoneTower } from '@/components/ui/stone-tower';
import { StoneDetail } from '@/components/ui/stone-detail';
import { StoryViewSwitcher } from '@/components/ui/story-view-switcher';
import { Disclosure } from '@/components/ui/disclosure';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { JournalToolbar, type JournalFilters } from '@/components/ui/journal-toolbar';
import { JourneySummary } from '@/features/remembrance/journey-summary';
import { StoneEditor } from '@/features/journal/stone-editor';
import { ReminderPrompt } from '@/features/reminders/reminder-prompt';
import { useLocation } from 'react-router-dom';

export function StoryPage() {
  // Arriving right after setting a stone: a second, final chance to turn on reminders.
  const justSaved = (useLocation().state as { saved?: boolean } | null)?.saved === true;
  const { t } = useTranslation(['journal', 'errors']);
  const [filters, setFilters] = useState<JournalFilters>({
    search: '',
    tone: 'all',
    from: '',
    to: '',
  });
  const [editing, setEditing] = useState<Stone>();
  const [view, setView] = useState<'tower' | 'list'>('tower');
  const [selectedId, setSelectedId] = useState<string>();
  const [deleting, setDeleting] = useState<Stone>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{
    error: boolean;
    key: string;
    values?: { imported: number; skipped: number };
  }>();
  const result = useLiveQuery(async () => {
    try {
      return { stones: await journal.listStones(), failed: false };
    } catch {
      return { stones: [], failed: true };
    }
  });
  const stones =
    result?.stones.filter((stone) => {
      const text = [
        stone.memory,
        stone.ref,
        stone.feel,
        stone.feelings?.join(' '),
        stone.checkIn,
        stone.stood,
        stone.learned,
        stone.questions,
        stone.thoughts,
        stone.prayer,
        stone.partner,
      ]
        .join(' ')
        .toLocaleLowerCase();
      return (
        text.includes(filters.search.trim().toLocaleLowerCase()) &&
        (filters.tone === 'all' || stone.tone === filters.tone) &&
        (!filters.from || stone.journalDate >= filters.from) &&
        (!filters.to || stone.journalDate <= filters.to)
      );
    }) ?? [];
  const selected = result?.stones.find((stone) => stone.id === selectedId);
  async function exportJournal() {
    setBusy(true);
    setNotice(undefined);
    try {
      const backup = await journal.exportBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      if (blob.size > MAX_BACKUP_BYTES) {
        setNotice({ error: true, key: 'manage.exportTooLarge' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ebenezer-journal-${backup.exportedAt.slice(0, 10)}.json`;
      link.click();
      const revokeUrl = URL.revokeObjectURL.bind(URL);
      setTimeout(() => revokeUrl(url), 1000);
      setNotice({ error: false, key: 'manage.exported' });
    } catch {
      setNotice({ error: true, key: 'errors:storageUnavailable' });
    } finally {
      setBusy(false);
    }
  }
  async function importJournal(file: File) {
    setBusy(true);
    setNotice(undefined);
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('Invalid backup');
      const content: unknown = JSON.parse(await file.text());
      const validated = backupSchema.safeParse(content);
      if (!validated.success) throw new Error('Invalid backup');
      try {
        const summary = await journal.importBackup(validated.data);
        setNotice({ error: false, key: 'manage.imported', values: summary });
      } catch {
        setNotice({ error: true, key: 'errors:storageUnavailable' });
      }
    } catch {
      setNotice({ error: true, key: 'manage.invalidBackup' });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        eyebrow={t('story.eyebrow')}
        title={t('tower.heading')}
        description={t('tower.description')}
      />
      {justSaved && <ReminderPrompt placement="after-stone" />}
      {!editing && result && !result.failed && result.stones.length > 0 && (
        <JourneySummary stones={result.stones} />
      )}
      <StoryViewSwitcher value={view} onChange={setView} />
      <Disclosure label={t('tower.tools')}>
        <JournalToolbar
          filters={filters}
          onChange={setFilters}
          onExport={() => void exportJournal()}
          onImport={(file) => void importJournal(file)}
          busy={busy}
        />
      </Disclosure>
      {notice && (
        <Alert variant={notice.error ? 'error' : 'success'}>{t(notice.key, notice.values)}</Alert>
      )}
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
        view === 'tower' ? (
          <StoneTower stones={stones} onOpen={(stone) => setSelectedId(stone.id)} />
        ) : (
          <StoneList
            stones={stones}
            onEdit={setEditing}
            onDelete={(stone) => {
              setNotice(undefined);
              setDeleting(stone);
            }}
          />
        )
      ) : (
        <EmptyState
          icon={Layers}
          title={t(result.stones.length ? 'manage.noResults' : 'story.heading')}
          description={t(result.stones.length ? 'manage.changeFilters' : 'story.empty')}
          action={t(result.stones.length ? 'manage.clearFilters' : 'form.begin')}
          {...(result.stones.length
            ? { onAction: () => setFilters({ search: '', tone: 'all', from: '', to: '' }) }
            : { to: '/reflection' })}
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
          error={notice?.error ? t(notice.key, notice.values) : undefined}
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
