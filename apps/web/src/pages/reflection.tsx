import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import {
  emptyReflection,
  encouragementRequestSchema,
  morningContext,
  morningPassage,
  scriptureSnapshotSchema,
} from '@ebenezer/contracts';
import { journal, REFLECTION_DRAFT } from '@/db/repositories';
import type { Draft } from '@/db/database';
import { ReflectionSession } from '@/features/reflection/session';
import { EveningReflection } from '@/features/reflection/evening';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { readNotificationWord, notificationSnapshot } from '@/features/reminders/notification-word';

export function ReflectionPage() {
  const location = useLocation();
  const evening = new URLSearchParams(location.search).get('from') === 'today';
  const notificationDate = new URLSearchParams(location.search).get('notificationDate');
  const { t } = useTranslation(['journal', 'errors']);
  const [draft, setDraft] = React.useState<Draft>();
  const [failed, setFailed] = React.useState(false);
  const [attempt, setAttempt] = React.useState(0);
  React.useEffect(() => {
    let active = true;
    setFailed(false);
    journal
      .getDraft()
      .then(async (value) => {
        if (evening) {
          const now = new Date();
          let date = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 10);
          let input = morningContext(now);
          let scripture;
          let thought;
          let shownToday = false;
          const saved = await journal.getPreference('today:morningWord');
          try {
            const stored = typeof saved?.value === 'string' ? JSON.parse(saved.value) : undefined;
            const parsed = encouragementRequestSchema.safeParse(stored?.input);
            if (stored?.date === date && parsed.success) {
              shownToday = true;
              input = parsed.data;
              const snapshot = scriptureSnapshotSchema.safeParse(stored.scripture);
              if (snapshot.success) scripture = snapshot.data;
              if (typeof stored.thought === 'string' && stored.thought.length <= 500)
                thought = stored.thought;
            }
          } catch {
            /* Use today’s curated passage if the optional preference is damaged. */
          }
          if (notificationDate && !value) {
            const notified = await readNotificationWord(notificationDate);
            if (notified) {
              date = notified.date;
              input = {
                ...morningContext(new Date(`${date}T12:00:00`)),
                date,
                language: input.language,
              };
              scripture = notificationSnapshot(notified);
              const carried = await journal.getPreference(`notification:thought:${date}`);
              thought = typeof carried?.value === 'string' ? carried.value : undefined;
            }
          }
          const morningWord = {
            date,
            input,
            ...(scripture ? { scripture } : {}),
            ...(thought ? { thought } : {}),
          };
          const reference = scripture?.reference ?? morningPassage(input).reference;
          if (!value) {
            value = {
              id: REFLECTION_DRAFT,
              step: 0,
              updatedAt: '',
              values: {
                ...emptyReflection,
                ref: reference,
                // The morning Word was read when it was given; the evening carries it forward.
                readConfirmed: true,
                morningWord,
              },
            };
            await journal.saveDraft(value.values, 0);
          } else if (
            value.values.morningWord &&
            !notificationDate &&
            shownToday &&
            JSON.stringify(value.values.morningWord) !== JSON.stringify(morningWord)
          ) {
            // An unfinished evening keeps her words but always recalls today’s morning Word.
            const previous = value.values.morningWord;
            const previousRef =
              previous.scripture?.reference ?? morningPassage(previous.input).reference;
            value = {
              ...value,
              values: {
                ...value.values,
                morningWord,
                ...(value.values.ref === previousRef ? { ref: reference } : {}),
              },
            };
            await journal.saveDraft(value.values, value.step);
          }
          // Other unfinished reflections resume without replacing their passage or words.
        }
        if (active)
          setDraft(
            value ?? {
              id: REFLECTION_DRAFT,
              values: { ...emptyReflection },
              step: 0,
              updatedAt: '',
            },
          );
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [attempt, evening, notificationDate]);
  return (
    <>
      {failed ? (
        <Alert>
          {t('errors:storageUnavailable')}
          <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
            {t('journal:form.retry')}
          </Button>
        </Alert>
      ) : draft?.values.morningWord ? (
        <EveningReflection draft={draft} />
      ) : draft ? (
        <ReflectionSession draft={draft} />
      ) : (
        <Alert variant="info">{t('status.loading')}</Alert>
      )}
    </>
  );
}
