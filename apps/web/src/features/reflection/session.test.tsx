import * as React from 'react';
import { AuthProvider } from '@/features/auth/auth-provider';
import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { db } from '@/db/database';
import { journal } from '@/db/repositories';
import { ReflectionPage } from '@/pages/reflection';
import { StoryPage } from '@/pages/story';
import { LanguageSelect } from '@/components/ui/language-select';
import { renderWithProviders } from '@/test/render';
import { TestBibleWorker } from '@/test/bible-worker';

beforeEach(async () => {
  TestBibleWorker.instances = [];
  TestBibleWorker.autoReply = true;
  vi.stubGlobal('Worker', TestBibleWorker);
  await db.drafts.clear();
  await db.stones.clear();
  await db.outbox.clear();
});

function mount() {
  return renderWithProviders(
    <>
      <LanguageSelect id="test-language" />
      <Routes>
        <Route path="/reflection" element={<ReflectionPage />} />
        <Route
          path="/story"
          element={
            <AuthProvider client={null}>
              <StoryPage />
            </AuthProvider>
          }
        />
      </Routes>
    </>,
    { route: '/reflection' },
  );
}
async function choose(label: string, option: string) {
  const choice =
    screen.queryByRole('radio', { name: option }) ??
    screen.queryByRole('checkbox', { name: option });
  if (choice) fireEvent.click(choice);
  else if (option === 'Español') {
    fireEvent.keyDown(await screen.findByRole('combobox', { name: label }), { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('option', { name: option }));
  } else fireEvent.click(await screen.findByRole('radio', { name: option }));
}
async function next(
  label:
    | string
    | RegExp = /^(Find a little encouragement|What stayed with me\?|Carry this with me|Shape my stone)$/,
) {
  fireEvent.click(screen.getByRole('button', { name: label }));
}

it('validates steps, preserves Back navigation and drafts, and saves a stone locally', async () => {
  const view = mount();
  await screen.findByRole('group', { name: 'How are you feeling?' });
  await next();
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'This field is required.');
  await choose('How are you feeling?', 'Grateful');
  await next();
  await screen.findByText('Matthew 11:28–30 · WEB Classic');
  expect(screen.queryByRole('checkbox', { name: 'I have read this passage' })).toBeNull();
  expect(document.querySelectorAll('blockquote')).toHaveLength(1);
  await next();
  const input = await screen.findByRole('textbox', { name: 'What stood out to you?' });
  expect(screen.getAllByRole('textbox')).toHaveLength(5);
  expect((await journal.getDraft())?.step).toBe(3);
  expect((await journal.getDraft())?.values.readConfirmed).toBe(true);
  for (const space of screen.getAllByRole('textbox')) expect(space.closest('details')).toBeNull();
  fireEvent.change(
    screen.getByRole('textbox', { name: 'What would you like to say to the Lord?' }),
    {
      target: { value: 'Lord, thank You for the people who walk with me.' },
    },
  );
  fireEvent.change(input, { target: { value: 'Help came through a friend.' } });
  await waitFor(async () =>
    expect((await journal.getDraft())?.values.stood).toBe('Help came through a friend.'),
  );
  view.unmount();
  mount();
  expect(
    (
      (await screen.findByRole('textbox', {
        name: 'What stood out to you?',
      })) as HTMLTextAreaElement
    ).value,
  ).toBe('Help came through a friend.');
  await next();
  await screen.findByText('Remember someone I could ask to pray (optional)');
  fireEvent.click(screen.getByRole('button', { name: 'Back' }));
  expect(
    (
      (await screen.findByRole('textbox', {
        name: 'What stood out to you?',
      })) as HTMLTextAreaElement
    ).value,
  ).toBe('Help came through a friend.');
  await next();
  await screen.findByText('Remember someone I could ask to pray (optional)');
  await next();
  fireEvent.change(await screen.findByRole('textbox', { name: 'Where did God meet you?' }), {
    target: { value: 'A friend checked in.' },
  });
  await choose('How did today feel?', 'Bright');
  fireEvent.click(screen.getByRole('button', { name: 'Set my stone' }));
  fireEvent.click(
    await screen.findByRole('button', { name: /Open stone:.*A friend checked in\./ }),
  );
  await screen.findByRole('dialog', { name: 'A friend checked in.' });
  expect(await db.stones.count()).toBe(1);
  expect((await db.stones.toArray())[0].prayer).toBe(
    'Lord, thank You for the people who walk with me.',
  );
  expect(await db.outbox.count()).toBe(0);
  expect(await journal.getDraft()).toBeUndefined();
});

it('retains real form input while language changes and displays translated errors', async () => {
  await journal.saveDraft(
    {
      feel: 'grateful',
      ref: '1 Samuel 7:12',
      readConfirmed: true,
      stood: '',
      learned: '',
      questions: '',
      thoughts: '',
      prayer: '',
      partner: '',
      memory: '',
      tone: '',
    },
    3,
  );
  mount();
  const input = await screen.findByRole('textbox', { name: 'What stood out to you?' });
  fireEvent.change(input, { target: { value: 'Keep this draft' } });
  await choose('Application language', 'Español');
  const translated = await screen.findByRole('textbox', { name: '¿Qué te llamó la atención?' });
  expect(translated).toBe(input);
  expect((translated as HTMLTextAreaElement).value).toBe('Keep this draft');
  fireEvent.change(translated, { target: { value: '' } });
  await next('Llevar esto conmigo');
  expect(await screen.findByText('Escribe al menos una respuesta de reflexión.')).toBeTruthy();
});

it('keeps form text when draft storage fails', async () => {
  mount();
  await screen.findByRole('group', { name: 'How are you feeling?' });
  vi.spyOn(journal, 'saveDraft').mockRejectedValue(new Error('quota exceeded'));
  await choose('How are you feeling?', 'Grateful');
  await next();
  expect(await screen.findByText('Could not save your changes. Please try again.')).toBeTruthy();
  expect((screen.getByRole('checkbox', { name: 'Grateful' }) as HTMLInputElement).checked).toBe(
    true,
  );
});

it('keeps mixed feelings and personal words through language switching, Back and reopening', async () => {
  const view = mount();
  fireEvent.click(await screen.findByRole('checkbox', { name: 'Lonely' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Hopeful' }));
  const words = screen.getByRole('textbox', { name: 'Bring it all to the Lord.' });
  fireEvent.change(words, { target: { value: 'I miss home, but made a new friend today.' } });
  await choose('Application language', 'Español');
  expect(screen.getByRole('textbox', { name: 'Ponlo todo en manos del Señor.' })).toBe(words);
  expect((screen.getByRole('checkbox', { name: 'Con soledad' }) as HTMLInputElement).checked).toBe(
    true,
  );
  expect(
    (screen.getByRole('checkbox', { name: 'Con esperanza' }) as HTMLInputElement).checked,
  ).toBe(true);
  await next('Encontrar un poco de ánimo');
  await screen.findByRole('heading', { name: 'Dedica tiempo al Señor.' });
  fireEvent.click(screen.getByRole('button', { name: 'Atrás' }));
  await screen.findByRole('textbox', { name: 'Ponlo todo en manos del Señor.' });
  await waitFor(async () => expect((await journal.getDraft())?.step).toBe(0));
  view.unmount();
  mount();
  expect(
    (
      (await screen.findByRole('textbox', {
        name: 'Ponlo todo en manos del Señor.',
      })) as HTMLTextAreaElement
    ).value,
  ).toBe('I miss home, but made a new friend today.');
  expect((await journal.getDraft())?.values.feelings).toEqual(['lonely', 'hopeful']);
});

it('allows a check-in in the person’s own words without requiring a feeling label', async () => {
  mount();
  await screen.findByRole('group', { name: 'How are you feeling?' });
  const words = screen.getByRole('textbox', { name: 'Bring it all to the Lord.' });
  fireEvent.change(words, { target: { value: 'A thought I changed my mind about.' } });
  fireEvent.change(words, { target: { value: '' } });
  expect(screen.getByRole('textbox', { name: 'Bring it all to the Lord.' })).toBe(words);
  fireEvent.change(words, {
    target: { value: 'I do not know how to describe today.' },
  });
  await next();
  await screen.findByRole('heading', { name: 'Spend time with the Lord.' });
  expect((await journal.getDraft())?.values.checkIn).toBe('I do not know how to describe today.');
});

it('offers starters in an open writing space without replacing the person’s words', async () => {
  mount();
  const words = await screen.findByRole('textbox', { name: 'Bring it all to the Lord.' });
  fireEvent.click(screen.getByRole('button', { name: 'Something joyful' }));
  expect((words as HTMLTextAreaElement).value).toBe('Lord, thank You for ');
  fireEvent.change(words, { target: { value: 'Lord, thank You for a new friend.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Something heavy' }));
  const expected = 'Lord, thank You for a new friend.\n\nLord, I’m placing this in Your hands: ';
  expect((words as HTMLTextAreaElement).value).toBe(expected);
  expect(document.activeElement).toBe(words);
  await waitFor(async () => expect((await journal.getDraft())?.values.checkIn).toBe(expected));
});
