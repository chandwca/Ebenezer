import * as React from 'react';
import { useWatch } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  eveningPromptResponseSchema,
  morningPassage,
  publicPassageReferenceSchema,
  songSearchUrl,
  type ReflectionValues,
} from '@ebenezer/contracts';
import { registerReloadGuard } from '@/pwa/reload-guards';
import { journal } from '@/db/repositories';
import type { Draft } from '@/db/database';
import { FormBuilder, type FormField } from '@/components/ui/form-builder';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { PageHeading } from '@/components/ui/page-heading';
import { JourneyStatus } from '@/components/ui/journey-layout';
import {
  JourneyChapterDialog,
  JourneyScripture,
  JourneyWordStatus,
} from '@/components/ui/journey-scripture';
import { MorningRecall } from '@/components/ui/morning-recall';
import {
  StoryActions,
  StoryChapter,
  StoryNote,
  StoryQuestion,
} from '@/components/ui/evening-story';
import { StonePreview } from '@/components/ui/stone-preview';
import { SongSuggestion } from '@/components/ui/song-suggestion';
import { useStudentProfile } from '@/features/profile/use-student-profile';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { publicRequest } from '@/lib/api/client';
import { fields as journeyFields, passages } from './config';
import { isAiChosen, useEveningWord } from './use-evening-word';
import { useReflectionForm } from './use-reflection-form';

// The evening unfolds in stages: her day, a Word for it, then reflecting and setting the stone.
type Stage = 0 | 1 | 2;
const feelings = journeyFields[0].find((field) => field.name === 'feelings')!;

/** A natural question about her day from the morning Word; prepared until AI replies. */
function useEveningQuestion(reference: string, thought: string | undefined) {
  const { t, i18n } = useTranslation('journal');
  const online = useOnlineStatus();
  const language = i18n.resolvedLanguage === 'es' ? 'es' : 'en';
  const [question, setQuestion] = React.useState<string>();
  React.useEffect(() => {
    setQuestion(undefined);
    if (!online || !publicPassageReferenceSchema.safeParse(reference).success) return;
    const request = new AbortController();
    void publicRequest('/v1/evening-prompt', eveningPromptResponseSchema, {
      method: 'POST',
      body: { language, reference, ...(thought ? { thought } : {}) },
      signal: request.signal,
    })
      .then((value) => {
        if (!request.signal.aborted && value.source === 'ai') setQuestion(value.question);
      })
      .catch(() => {
        /* The prepared question remains. */
      });
    return () => request.abort();
  }, [language, online, reference, thought]);
  return question ?? t('evening.question');
}

const reflectFields: FormField<ReflectionValues>[] = (
  ['stood', 'questions', 'prayer'] as const
).map((name) => ({
  name,
  type: 'journal-prompt',
  promptKind: name,
  labelKey: `journal:evening.prompts.${name}`,
  placeholderKey: `journal:journey.writing.${name}`,
}));
const stoneFields: FormField<ReflectionValues>[] = [
  {
    name: 'memory',
    type: 'textarea',
    labelKey: 'journal:evening.memory',
    placeholderKey: 'journal:form.memoryPlaceholder',
  },
  {
    name: 'tone',
    type: 'choices',
    labelKey: 'journal:evening.dayTone',
    choices: ['hard', 'mixed', 'bright'].map((value) => ({
      value,
      labelKey: `journal:tones.${value}`,
    })),
  },
];

export function EveningReflection({ draft }: { draft: Draft }) {
  const { t } = useTranslation(['journal', 'errors']);
  const navigate = useNavigate();
  const profile = useStudentProfile();
  const form = useReflectionForm(draft.values);
  const [stage, setStage] = React.useState<Stage>(Math.min(Math.max(draft.step, 0), 2) as Stage);
  const [revealed, setRevealed] = React.useState<Stage>();
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [reading, setReading] = React.useState(false);
  const finishing = React.useRef(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const currentStage = React.useRef(stage);
  currentStage.current = stage;
  const morning = draft.values.morningWord!;
  const morningScripture = morning.scripture ?? morningPassage(morning.input);
  const question = useEveningQuestion(morningScripture.reference, morning.thought);
  const word = useEveningWord(form, stage >= 1);
  const [ref, scripture, memory, tone, song] = useWatch({
    control: form.control,
    name: ['ref', 'scripture', 'memory', 'tone', 'song'],
  });
  const aiChosen = isAiChosen(scripture?.inputKey);
  const bundled = !scripture ? passages.find((item) => item.value === ref) : undefined;
  const wordReady = word.phase === 'done' && !!ref;

  // Reaching reflection means she spent time with tonight's Word; not a reading measurement.
  React.useEffect(() => {
    if (stage === 2 && wordReady && !form.getValues('readConfirmed'))
      form.setValue('readConfirmed', true);
  }, [stage, wordReady, ref, form]);

  // Autosave quietly so she can leave and come back to the same evening.
  React.useEffect(() => {
    const subscription = form.watch(() => {
      if (finishing.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (finishing.current) return;
        journal.saveDraft(form.getValues(), currentStage.current).then(
          () => setFailed(false),
          () => setFailed(true),
        );
      }, 300);
    });
    return () => {
      subscription.unsubscribe();
      if (timer.current && !finishing.current) {
        clearTimeout(timer.current);
        void journal.saveDraft(form.getValues(), currentStage.current).catch(() => undefined);
      }
    };
  }, [form]);
  React.useEffect(
    () =>
      registerReloadGuard(async () => {
        if (finishing.current) throw new Error('Save in progress');
        await journal.saveDraft(form.getValues(), currentStage.current);
      }),
    [form],
  );

  async function advance(next: Stage) {
    if (next === 1 && !(await form.trigger(['feelings', 'checkIn'], { shouldFocus: true }))) return;
    setStage(next);
    setRevealed(next);
    void journal.saveDraft(form.getValues(), next).catch(() => setFailed(true));
  }

  async function save(values: ReflectionValues) {
    if (busy) return;
    setBusy(true);
    // A pending autosave must not recreate the draft after the stone is set.
    finishing.current = true;
    clearTimeout(timer.current);
    try {
      await journal.saveStone(values);
      navigate('/story', { state: { saved: true } });
    } catch {
      finishing.current = false;
      setFailed(true);
      setBusy(false);
    }
  }

  const name = profile?.profile?.name;
  return (
    <>
      <PageHeading title={name ? t('evening.titleNamed', { name }) : t('evening.title')} />

      <StoryChapter eyebrow={t('evening.chapters.morning')} current={stage === 0}>
        <MorningRecall
          credit={morning.scripture}
          lead={t('evening.remindedLead')}
          reference={morningScripture.reference}
          translation={morningScripture.translation}
          quote={morningScripture.text}
          thoughtLead={t('evening.thoughtLead')}
          thought={morning.thought}
        />
        <StoryQuestion>{question}</StoryQuestion>
        <FormBuilder
          form={form}
          fields={[
            { ...feelings, labelKey: 'journal:evening.feel' },
            {
              name: 'checkIn',
              type: 'journal-prompt',
              promptKind: 'thoughts',
              labelKey: 'journal:evening.ownWords',
              placeholderKey: 'journal:evening.ownWordsPlaceholder',
            },
          ]}
          onSubmit={save}
          onContinue={stage === 0 ? () => advance(1) : undefined}
        >
          {stage === 0 && (
            <StoryActions>
              <Button type="submit">{t('evening.findWord')}</Button>
            </StoryActions>
          )}
        </FormBuilder>
      </StoryChapter>

      {stage >= 1 && (
        <StoryChapter
          eyebrow={t('evening.chapters.word')}
          title={t('evening.wordTitle')}
          current={stage === 1}
          reveal={revealed === 1}
        >
          <StoryNote>{t('evening.wordNote')}</StoryNote>
          {wordReady && scripture && (
            <JourneyScripture
              credit={scripture}
              quote={scripture.text}
              reference={scripture.reference}
              translation={scripture.translation}
              note={t('journey.word.note')}
              context={scripture.context}
              contextLabel={t(aiChosen ? 'evening.whyLabel' : 'journey.word.context')}
              chapterLabel={t('journey.word.chapter')}
              chapterUrl={scripture.sourceUrl}
              onRead={() => setReading(true)}
            />
          )}
          {wordReady && bundled && (
            <JourneyScripture
              quote={bundled.quote}
              reference={bundled.value}
              note={t('form.readNote')}
              chapterLabel={t('tower.chapter')}
              chapterUrl={bundled.chapterUrl}
            />
          )}
          {wordReady && song && (
            <SongSuggestion
              label={t('evening.song.label')}
              title={song.title}
              artist={song.artist}
              href={songSearchUrl(song)}
              listen={t('evening.song.listen')}
            />
          )}
          {wordReady && aiChosen && (
            <StoryNote>
              {t('evening.aiNote', { translation: scripture?.translation ?? 'WEB Classic' })}
            </StoryNote>
          )}
          <JourneyWordStatus
            {...word}
            onExplore={word.explore}
            onRetry={word.retry}
            onBundled={word.useBundledWord}
          />
          {reading && scripture && (
            <JourneyChapterDialog scripture={scripture} onClose={() => setReading(false)} />
          )}
          {stage === 1 && wordReady && (
            <StoryActions>
              <Button onClick={() => void advance(2)}>{t('evening.reflectAction')}</Button>
            </StoryActions>
          )}
        </StoryChapter>
      )}

      {stage === 2 && (
        <>
          <StoryChapter
            eyebrow={t('evening.chapters.reflect')}
            title={t('evening.reflectTitle')}
            reveal={revealed === 2}
          >
            <StoryNote>{t('evening.reflectNote')}</StoryNote>
            <FormBuilder form={form} fields={reflectFields} onSubmit={save} />
          </StoryChapter>
          <StoryChapter
            eyebrow={t('evening.chapters.stone')}
            title={t('evening.stoneTitle')}
            current
            last
          >
            <StonePreview
              memory={memory}
              tone={tone}
              reference={ref}
              symbol={bundled?.symbol ?? '🪨'}
              label={t('journey.preview')}
            />
            <FormBuilder form={form} fields={stoneFields} onSubmit={save}>
              {failed && <Alert>{t('errors:saveFailed')}</Alert>}
              <StoryActions>
                <Button type="submit" disabled={busy || !wordReady || form.formState.isSubmitting}>
                  {t('form.saveStone')}
                </Button>
              </StoryActions>
              <JourneyStatus>{t('evening.private')}</JourneyStatus>
            </FormBuilder>
          </StoryChapter>
        </>
      )}
      {stage < 2 && failed && <Alert>{t('errors:saveFailed')}</Alert>}
    </>
  );
}
