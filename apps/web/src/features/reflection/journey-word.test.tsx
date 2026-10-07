import * as React from 'react';
import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { emptyReflection, scriptureSnapshotSchema } from '@ebenezer/contracts';
import { db } from '@/db/database';
import { journal } from '@/db/repositories';
import { i18n } from '@/i18n';
import { StoneDetail } from '@/components/ui/stone-detail';
import { ReflectionPage } from '@/pages/reflection';
import { renderWithProviders } from '@/test/render';
import { TestBibleWorker, journeyResults } from '@/test/bible-worker';

beforeEach(async () => {
  await db.drafts.clear();
  await db.stones.clear();
  TestBibleWorker.instances = [];
  TestBibleWorker.autoReply = false;
  vi.stubGlobal('Worker', TestBibleWorker);
});

async function enter(draftStep = 1) {
  await journal.saveDraft(
    {
      ...emptyReflection,
      feel: 'lonely',
      feelings: ['lonely', 'hopeful'],
      checkIn: 'I miss home and need encouragement.',
    },
    draftStep,
  );
  return renderWithProviders(<ReflectionPage />, { route: '/reflection' });
}

it('retrieves from feelings and personal words, brings a passage forward and saves its exact text and chapter', async () => {
  const view = await enter();
  await screen.findByText('Making space for a Word for your day…');
  const worker = TestBibleWorker.instances[0];
  expect(worker.request?.query).toContain('I miss home and need encouragement.');
  expect(worker.request?.query).toContain('lonely');
  expect(worker.request?.query).toContain('hopeful');
  expect(worker.request?.strategy).toBe('context');
  expect(
    (screen.getByRole('button', { name: 'What stayed with me?' }) as HTMLButtonElement).disabled,
  ).toBe(true);
  expect(screen.queryByRole('radiogroup')).toBeNull();
  await act(async () => worker.finish());
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  fireEvent.click(screen.getByRole('button', { name: 'Spend time with the whole chapter' }));
  const dialog = screen.getByRole('dialog', { name: 'Matthew 11' });
  expect(within(dialog).getByText(/John heard in the prison/)).toBeTruthy();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Back to suggestions' }));
  await waitFor(async () =>
    expect((await journal.getDraft())?.values.scripture?.text).toBe(journeyResults[0].passage.text),
  );
  const inputKey = (await journal.getDraft())!.values.scripture!.inputKey;
  await act(async () => {
    await i18n.changeLanguage('es');
  });
  expect(TestBibleWorker.instances).toHaveLength(1);
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Spend a moment with another passage' }));
  await screen.findByText('Romans 8:31–39 · WEB Classic');
  await waitFor(async () => expect((await journal.getDraft())?.values.ref).toBe('Romans 8:31–39'));
  view.unmount();
  renderWithProviders(<ReflectionPage />, { route: '/reflection' });
  await screen.findByText('Romans 8:31–39 · WEB Classic');
  expect(TestBibleWorker.instances).toHaveLength(1);
  expect((await journal.getDraft())?.values.scripture?.inputKey).toBe(inputKey);
});

it('cancels stale retrieval when going back and refreshes after the person changes their words', async () => {
  await enter();
  await screen.findByText('Making space for a Word for your day…');
  const previous = TestBibleWorker.instances[0];
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  const words = await screen.findByRole('textbox', { name: 'Bring it all to the Lord.' });
  expect(previous.terminate).toHaveBeenCalled();
  fireEvent.change(words, { target: { value: 'I am thankful for a new friend.' } });
  await act(async () => previous.finish());
  expect(screen.queryByText('Matthew 11:28–30 · WEB Classic')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Find a little encouragement' }));
  await screen.findByText('Making space for a Word for your day…');
  expect(TestBibleWorker.instances[1].request?.query).toContain('I am thankful for a new friend.');
  await act(async () => TestBibleWorker.instances[1].finish());
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
});

it('keeps the journal usable when the model is unavailable and ignores a late result after fallback', async () => {
  await enter();
  await screen.findByText('Making space for a Word for your day…');
  const worker = TestBibleWorker.instances[0];
  await act(async () => worker.emit({ id: worker.request!.id, type: 'error', code: 'setup' }));
  await screen.findByText(/Scripture search isn’t ready/);
  fireEvent.click(screen.getByRole('button', { name: 'Continue with a word of care' }));
  await screen.findByText('1 Peter 5:7 · KJV');
  await act(async () => worker.finish());
  expect(screen.queryByText('Matthew 11:28–30 · WEB Classic')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'What stayed with me?' }));
  await screen.findByRole('heading', { name: 'Carry one thought with you.' });
  expect((await journal.getDraft())?.values.checkIn).toBe('I miss home and need encouragement.');
});

it('resumes an older Read draft in the combined Scripture moment and goes straight to reflection', async () => {
  const view = await enter(2);
  await screen.findByText('Making space for a Word for your day…');
  await act(async () => TestBibleWorker.instances[0].finish());
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  expect(screen.queryByRole('checkbox')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'What stayed with me?' }));
  const writing = await screen.findByRole('textbox', { name: 'What stood out to you?' });
  fireEvent.change(writing, { target: { value: 'There is room for me to rest.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  expect(TestBibleWorker.instances).toHaveLength(1);
  await waitFor(async () => expect((await journal.getDraft())?.step).toBe(1));
  view.unmount();
  renderWithProviders(<ReflectionPage />, { route: '/reflection' });
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  expect(TestBibleWorker.instances).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'What stayed with me?' }));
  expect(await screen.findByRole('textbox', { name: 'What stood out to you?' })).toHaveProperty(
    'value',
    'There is room for me to rest.',
  );
  expect((await journal.getDraft())?.step).toBe(3);
});

it('retains the retrieved Scripture and chapter through stone saving and backup import', async () => {
  const result = journeyResults[0];
  const scripture = scriptureSnapshotSchema.parse({
    ...result.passage,
    chapter: result.chapter,
    translation: 'WEB Classic',
    inputKey: 'tired\nI need rest.',
  });
  await journal.saveStone({
    ...emptyReflection,
    feel: 'tired',
    ref: scripture.reference,
    scripture,
    readConfirmed: true,
    stood: 'Jesus invites me to rest.',
    memory: 'A moment of rest.',
    tone: 'hard',
  });
  const backup = await journal.exportBackup();
  await db.stones.clear();
  await journal.importBackup(backup);
  expect((await journal.listStones())[0].scripture).toEqual(scripture);
  expect(() => scriptureSnapshotSchema.parse({ ...scripture, text: 'Invented text.' })).toThrow();
});

it('tells the evening as one story: morning Word, her day, a Word for it, reflection and stone', async () => {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const morningWord = {
    date,
    input: { theme: 'care', language: 'en', occasion: 'christmas', weather: 'rain' },
    thought: 'I can bring what feels heavy to Jesus.',
  };
  await journal.setPreference('today:morningWord', JSON.stringify(morningWord));
  const fetch = vi.fn(
    async () =>
      new Response(
        JSON.stringify({ source: 'ai', question: 'How did the good news meet you today?' }),
      ),
  );
  vi.stubGlobal('fetch', fetch);
  const view = renderWithProviders(<ReflectionPage />, { route: '/reflection?from=today' });
  await screen.findByText('This morning, you were reminded:');
  expect(screen.getByText(/For unto you is born this day/)).toBeTruthy();
  expect(screen.getByText(/I can bring what feels heavy to Jesus\./)).toBeTruthy();
  await screen.findByText('How did the good news meet you today?');
  expect(
    JSON.parse(String((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body)),
  ).toEqual({
    language: 'en',
    reference: 'Luke 2:11',
    thought: 'I can bring what feels heavy to Jesus.',
  });
  // Reflection and the stone wait until a Word for her day has been found.
  expect(screen.queryByRole('button', { name: 'Set my stone' })).toBeNull();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Lonely' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Or tell Him in your own words.' }), {
    target: { value: 'I missed home during lunch today.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find a Word for my day' }));
  await screen.findByText('Here is a Word for what you shared.');
  await waitFor(() => expect(TestBibleWorker.instances[0]?.request).toBeTruthy());
  const worker = TestBibleWorker.instances[0];
  expect(worker.request?.query).toContain('lonely');
  expect(worker.request?.query).toContain('I missed home during lunch today.');
  await act(async () => worker.finish());
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  await waitFor(async () => expect((await journal.getDraft())?.step).toBe(1));
  view.unmount();
  renderWithProviders(<ReflectionPage />, { route: '/reflection?from=today' });
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  expect(TestBibleWorker.instances).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Reflect on this Word' }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'What stood out to you tonight?' }), {
    target: { value: 'Jesus offers rest to the weary.' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'Where did God meet you today?' }), {
    target: { value: 'A friend sat with me at dinner.' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Mixed' }));
  fireEvent.click(screen.getByRole('button', { name: 'Set my stone' }));
  await waitFor(async () => expect(await db.stones.count()).toBe(1));
  const stone = (await journal.listStones())[0];
  expect(stone.ref).toBe('Matthew 11:28–30');
  expect(stone.scripture?.text).toBe(journeyResults[0].passage.text);
  expect(stone.stood).toBe('Jesus offers rest to the weary.');
  expect(stone.memory).toBe('A friend sat with me at dinner.');
  expect(stone.morningWord).toEqual(morningWord);
  expect(stone.feelings).toContain('lonely');
  expect(stone.tone).toBe('mixed');
  renderWithProviders(
    <StoneDetail stone={stone} onClose={() => {}} onEdit={() => {}} onDelete={() => {}} />,
  );
  expect(screen.getAllByText(/For unto you is born this day/).length).toBeGreaterThan(0);
  const backup = await journal.exportBackup();
  await db.stones.clear();
  await journal.importBackup(backup);
  expect((await journal.listStones())[0].morningWord).toEqual(morningWord);
});

it('does not replace an unfinished reflection when entering from Today', async () => {
  await journal.saveDraft(
    { ...emptyReflection, feel: 'hopeful', ref: '1 Peter 5:7', stood: 'My earlier reflection.' },
    3,
  );
  renderWithProviders(<ReflectionPage />, { route: '/reflection?from=today' });
  expect(await screen.findByRole('textbox', { name: 'What stood out to you?' })).toHaveProperty(
    'value',
    'My earlier reflection.',
  );
  expect((await journal.getDraft())?.values.ref).toBe('1 Peter 5:7');
  expect((await journal.getDraft())?.values.morningWord).toBeUndefined();
});

it('an unfinished evening recalls today’s morning Word, not an earlier one, and keeps her words', async () => {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const earlier = { date: '2026-10-05', input: { theme: 'remember', language: 'en' } } as const;
  await journal.saveDraft(
    {
      ...emptyReflection,
      ref: '1 Samuel 7:12',
      checkIn: 'Still thinking about today.',
      morningWord: earlier,
    },
    0,
  );
  const today = {
    date,
    input: { theme: 'care', language: 'en', occasion: 'christmas' },
    thought: 'Good news for me too.',
  };
  await journal.setPreference('today:morningWord', JSON.stringify(today));
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
  renderWithProviders(<ReflectionPage />, { route: '/reflection?from=today' });
  expect(await screen.findByText(/For unto you is born this day/)).toBeTruthy();
  expect(screen.queryByText(/Hitherto hath the LORD helped us/)).toBeNull();
  expect(screen.getByText(/Good news for me too\./)).toBeTruthy();
  const draft = await journal.getDraft();
  expect(draft?.values.morningWord).toEqual(today);
  expect(draft?.values.ref).toBe('Luke 2:11');
  expect(draft?.values.checkIn).toBe('Still thinking about today.');
});

it('AI chooses tonight’s passage and its own song from her feelings and words', async () => {
  const now = new Date();
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  await journal.setPreference(
    'today:morningWord',
    JSON.stringify({ date, input: { theme: 'care', language: 'en' } }),
  );
  const passage = scriptureSnapshotSchema.parse({
    ...journeyResults[0].passage,
    chapter: journeyResults[0].chapter,
    translation: 'WEB Classic',
    context: '',
    inputKey: 'evening',
  });
  const fetch = vi.fn(async (url: string) =>
    String(url).includes('/v1/evening-word')
      ? new Response(
          JSON.stringify({
            scripture: passage,
            note: 'Jesus invites the weary to rest.',
            song: { title: 'Rest', artist: 'Matt Maher' },
            source: 'ai',
          }),
        )
      : new Response(JSON.stringify({ source: 'ai', question: 'How was your day?' })),
  );
  vi.stubGlobal('fetch', fetch);
  renderWithProviders(<ReflectionPage />, { route: '/reflection?from=today' });
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Tired' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'Or tell Him in your own words.' }), {
    target: { value: 'A long week of exams.' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Find a Word for my day' }));
  expect(await screen.findByText(`${passage.reference} · WEB Classic`)).toBeTruthy();
  expect(screen.getByText('Why this passage · suggested by AI')).toBeTruthy();
  expect(screen.getByText('Jesus invites the weary to rest.')).toBeTruthy();
  expect(screen.getByText('Rest')).toBeTruthy();
  expect(screen.getByText('Matt Maher')).toBeTruthy();
  expect(screen.getByRole('link', { name: /Listen on YouTube/ }).getAttribute('href')).toContain(
    'youtube.com/results?search_query=Rest%20Matt%20Maher',
  );
  const request = fetch.mock.calls.find(([url]) => String(url).includes('/v1/evening-word'))!;
  expect(JSON.parse(String((request as unknown as [string, RequestInit])[1].body))).toMatchObject({
    feelings: ['tired'],
    checkIn: 'A long week of exams.',
    morningReference: '1 Peter 5:7',
  });
  expect(TestBibleWorker.instances).toHaveLength(0);
  fireEvent.click(screen.getByRole('button', { name: 'Reflect on this Word' }));
  fireEvent.change(await screen.findByRole('textbox', { name: 'Where did God meet you today?' }), {
    target: { value: 'Rest after the exam.' },
  });
  fireEvent.click(screen.getByRole('radio', { name: 'Hard' }));
  fireEvent.click(screen.getByRole('button', { name: 'Set my stone' }));
  await waitFor(async () => expect(await db.stones.count()).toBe(1));
  const stone = (await journal.listStones())[0];
  expect(stone.ref).toBe(passage.reference);
  expect(stone.song).toEqual({ title: 'Rest', artist: 'Matt Maher' });
});
