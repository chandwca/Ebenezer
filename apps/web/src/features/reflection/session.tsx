import * as React from 'react';
import { useWatch } from 'react-hook-form';
import { type ReflectionValues, morningPassage } from '@ebenezer/contracts';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { registerReloadGuard } from '@/pwa/reload-guards';
import { journal } from '@/db/repositories';
import type { Draft } from '@/db/database';
import { FormBuilder } from '@/components/ui/form-builder';
import { WizardActions } from '@/components/ui/form-wizard';
import { Alert } from '@/components/ui/alert';
import { JourneyLayout, JourneyMoment, JourneyStatus } from '@/components/ui/journey-layout';
import {
  JourneyScripture,
  JourneyWordStatus,
  JourneyChapterDialog,
} from '@/components/ui/journey-scripture';
import { StonePreview } from '@/components/ui/stone-preview';
import { useReflectionForm } from './use-reflection-form';
import { fields, passages, steps } from './config';
import { useJourneyWord } from './use-journey-word';
import { persistedJourneyStep, restoreJourneyStep } from '@/lib/journey';

export function ReflectionSession({ draft }: { draft: Draft }) {
  const { t } = useTranslation(['journal', 'common', 'errors']);
  const navigate = useNavigate();
  const form = useReflectionForm(draft.values);
  const [step, setStep] = React.useState(restoreJourneyStep(draft.step));
  const finalStep = steps.length - 1;
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const queue = React.useRef<Promise<unknown>>(Promise.resolve());
  const mounted = React.useRef(true);
  const finishing = React.useRef(false);
  const changed = React.useRef(false);
  const currentStep = React.useRef(step);
  currentStep.current = step;
  const [ref, scripture] = useWatch({
    control: form.control,
    name: ['ref', 'scripture'],
  });
  const [memory, tone] = useWatch({
    control: form.control,
    name: ['memory', 'tone'],
  });
  const passage = passages.find((item) => item.value === ref);
  const morning = draft.values.morningWord;
  const morningScripture = morning
    ? (morning.scripture ?? morningPassage(morning.input))
    : undefined;
  const word = useJourneyWord(form, step === 1);
  const [readingChapter, setReadingChapter] = React.useState(false);
  const findingWord = step === 1 && (!ref || word.phase !== 'done');

  const persist = React.useCallback((values: ReflectionValues, atStep: number) => {
    queue.current = queue.current
      .catch(() => undefined)
      .then(() => journal.saveDraft(values, persistedJourneyStep(atStep)));
    return queue.current.then(
      () => {
        if (mounted.current) setFailed(false);
      },
      (error) => {
        if (mounted.current) setFailed(true);
        throw error;
      },
    );
  }, []);

  React.useEffect(() => {
    mounted.current = true;
    const subscription = form.watch(() => {
      if (finishing.current) return;
      changed.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        void persist(form.getValues(), currentStep.current).catch(() => undefined);
      }, 300);
    });
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      subscription.unsubscribe();
      // Flush edits on route navigation rather than dropping the debounce.
      if (!finishing.current && changed.current)
        void persist(form.getValues(), currentStep.current).catch(() => undefined);
    };
  }, [form, persist]);

  React.useEffect(
    () =>
      registerReloadGuard(async () => {
        if (finishing.current) throw new Error('Save in progress');
        clearTimeout(timer.current);
        await persist(form.getValues(), currentStep.current);
      }),
    [form, persist],
  );

  async function move(next: number) {
    if (busy || (next > step && findingWord)) return;
    if (
      next > step &&
      !(await form.trigger(
        fields[step].map((field) => field.name),
        { shouldFocus: true },
      ))
    )
      return;
    // Continuing into reflection replaces the old reading checkbox. This records the
    // person's continuation, not a claim that we measured or verified their reading.
    if (step === 1 && next > step) form.setValue('readConfirmed', true, { shouldDirty: true });
    setBusy(true);
    clearTimeout(timer.current);
    try {
      await persist(form.getValues(), next);
      setStep(next);
    } catch {
      /* Status already explains failure; keep current values. */
    } finally {
      setBusy(false);
    }
  }

  async function save(values: ReflectionValues) {
    if (busy || step !== finalStep) return;
    setBusy(true);
    finishing.current = true;
    clearTimeout(timer.current);
    try {
      await queue.current.catch(() => undefined);
      await journal.saveStone(values);
      navigate('/story', { state: { saved: true } });
    } catch {
      finishing.current = false;
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <JourneyLayout
      title={t('reflection.title')}
      description={t('journey.description')}
      eyebrow={t('reflection.eyebrow')}
      steps={steps.map((value) => t(`common:steps.${value}`))}
      current={step}
      progress={t('common:stepOf', {
        current: step + 1,
        total: steps.length,
        step: t(`common:steps.${steps[step]}`),
      })}
      affirmation={t('journey.affirmation')}
      note={t('journey.note')}
    >
      <JourneyMoment
        title={t(
          morning && step === 0 ? 'journey.evening.title' : `journey.moments.${steps[step]}.title`,
        )}
        description={t(
          morning && step === 0
            ? 'journey.evening.description'
            : `journey.moments.${steps[step]}.description`,
        )}
        current={step}
      />
      {step === 0 && morningScripture && (
        <JourneyScripture
          quote={morningScripture.text}
          credit={morning?.scripture}
          translation={morningScripture.translation}
          reference={morningScripture.reference}
          note={t('journey.evening.wordNote')}
          chapterLabel={t('tower.chapter')}
          chapterUrl={
            morning?.scripture?.sourceUrl ??
            `https://www.biblegateway.com/passage/?search=${encodeURIComponent(morningScripture.reference)}&version=KJV`
          }
        />
      )}
      {step === 0 && morning?.thought && <JourneyStatus>{morning.thought}</JourneyStatus>}
      {step === 1 && scripture && (
        <JourneyScripture
          quote={scripture.text}
          credit={scripture}
          reference={scripture.reference}
          translation={scripture.translation}
          note={t('journey.word.note')}
          context={scripture.context}
          contextLabel={t('journey.word.context')}
          chapterLabel={t('journey.word.chapter')}
          chapterUrl={scripture.sourceUrl}
          onRead={() => setReadingChapter(true)}
        />
      )}
      {step === 1 && !scripture && passage && (
        <JourneyScripture
          quote={passage.quote}
          reference={passage.value}
          note={t('journal:form.readNote')}
          chapterLabel={t('tower.chapter')}
          chapterUrl={passage.chapterUrl}
        />
      )}
      {step === 1 && (
        <JourneyWordStatus
          {...word}
          onExplore={word.explore}
          onRetry={word.retry}
          onBundled={word.useBundledWord}
        />
      )}
      {readingChapter && scripture && (
        <JourneyChapterDialog scripture={scripture} onClose={() => setReadingChapter(false)} />
      )}
      {step === finalStep && (
        <StonePreview
          memory={memory}
          tone={tone}
          reference={ref}
          symbol={passage?.symbol ?? '🪨'}
          label={t('journey.preview')}
        />
      )}
      <FormBuilder
        form={form}
        fields={step === 1 ? [] : fields[step]}
        onSubmit={save}
        onContinue={step < finalStep ? () => move(step + 1) : undefined}
      >
        {failed ? (
          <Alert>{t('errors:saveFailed')}</Alert>
        ) : (
          <JourneyStatus>{t('journey.takeYourTime')}</JourneyStatus>
        )}
        <WizardActions
          back={t('common:buttons.back')}
          next={t(`journey.moments.${steps[step]}.action`)}
          save={t('journal:form.saveStone')}
          onBack={() => (step > 0 ? void move(step - 1) : navigate('/'))}
          onNext={() => void move(step + 1)}
          final={step === finalStep}
          disabled={busy || form.formState.isSubmitting}
          nextDisabled={findingWord}
        />
      </FormBuilder>
    </JourneyLayout>
  );
}
