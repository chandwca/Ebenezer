import * as React from 'react';
import { beforeEach, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { BibleSearchForm } from './search-form';
import { LanguageSelect } from '@/components/ui/language-select';
import { i18n } from '@/i18n';
import { renderWithProviders } from '@/test/render';
import type { WorkerResponse } from '@/lib/bible/types';
class TestWorker {
  static instances: TestWorker[] = [];
  onmessage?: (event: MessageEvent<WorkerResponse>) => void;
  onerror?: () => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    TestWorker.instances.push(this);
  }
  emit(message: WorkerResponse) {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>);
  }
}
const query = 'I feel exhausted and need rest.';
beforeEach(() => {
  TestWorker.instances = [];
  vi.stubGlobal('Worker', TestWorker);
});
function mount() {
  return renderWithProviders(
    <>
      <LanguageSelect id="search-language" />
      <BibleSearchForm />
    </>,
  );
}
async function submit() {
  fireEvent.change(screen.getByRole('textbox', { name: 'What is happening in your life?' }), {
    target: { value: query },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search Scripture' }));
  await screen.findByText('Preparing search…');
  return TestWorker.instances[0];
}
it('validates input, renders exact passages and their chapter, and keeps text through language changes', async () => {
  mount();
  fireEvent.click(screen.getByRole('button', { name: 'Search Scripture' }));
  await screen.findByText('Write at least three characters about your situation.');
  expect(TestWorker.instances).toHaveLength(0);
  const worker = await submit();
  expect(worker.postMessage).toHaveBeenCalledWith({ id: 1, query, strategy: 'context' });
  await act(async () => {
    worker.emit({
      id: 1,
      type: 'result',
      elapsedMs: 25,
      offlineReady: true,
      results: [
        {
          score: 0.82,
          passage: {
            id: 'MAT.11.28-30',
            reference: 'Matthew 11:28–30',
            text: 'Come to me.',
            context: 'Jesus invites the weary.',
            sourceUrl: 'https://ebible.org/eng-web/MAT11.htm',
            chapterKey: 'MAT11',
            firstVerse: 28,
            lastVerse: 30,
          },
          chapter: {
            book: 'Matthew',
            chapter: 11,
            verses: [
              { number: 27, text: 'Chapter context.' },
              { number: 28, text: 'Come to me.' },
            ],
          },
        },
      ],
    });
  });
  expect(screen.getByRole('heading', { name: 'Matthew 11:28–30' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Read Matthew 11' }));
  expect(screen.getByText('Chapter context.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Back to suggestions' }));
  const input = screen.getByRole('textbox', { name: 'What is happening in your life?' });
  await act(async () => {
    await i18n.changeLanguage('es');
  });
  expect(screen.getByRole('textbox', { name: '¿Qué está pasando en tu vida?' })).toBe(input);
  expect((input as HTMLTextAreaElement).value).toBe(query);
  expect(screen.getByRole('button', { name: 'Leer Matthew 11' })).toBeTruthy();
});
it('retains text on setup failure and cancels safely without showing late results', async () => {
  const view = mount();
  const worker = await submit();
  await act(async () => {
    worker.emit({ id: 1, type: 'error', code: 'setup' });
  });
  expect(screen.getByText(/Search setup failed/)).toBeTruthy();
  expect(
    (
      screen.getByRole('textbox', {
        name: 'What is happening in your life?',
      }) as HTMLTextAreaElement
    ).value,
  ).toBe(query);
  fireEvent.click(screen.getByRole('button', { name: 'Search Scripture' }));
  await screen.findByText('Preparing search…');
  fireEvent.click(screen.getByRole('button', { name: 'Cancel search' }));
  expect(worker.terminate).toHaveBeenCalledOnce();
  await act(async () => {
    worker.emit({ id: 2, type: 'result', results: [], elapsedMs: 1, offlineReady: true });
  });
  expect(screen.queryByText(/Search completed/)).toBeNull();
  view.unmount();
});

it('selects the full Bible without clearing the query and labels the submitted dataset', async () => {
  mount();
  const input = screen.getByRole('textbox', { name: 'What is happening in your life?' });
  fireEvent.change(input, { target: { value: 'I am unloved' } });
  fireEvent.keyDown(screen.getByRole('combobox', { name: 'Search approach' }), { key: 'Enter' });
  fireEvent.click(await screen.findByRole('option', { name: 'Full Bible — experimental' }));
  expect((input as HTMLTextAreaElement).value).toBe('I am unloved');
  expect(screen.getByText(/9,534 passages/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Search Scripture' }));
  await screen.findByText('Preparing search…');
  const worker = TestWorker.instances[0];
  expect(worker.postMessage).toHaveBeenCalledWith({
    id: 1,
    query: 'I am unloved',
    strategy: 'full',
  });
  await act(async () => {
    worker.emit({ id: 1, type: 'result', results: [], elapsedMs: 42, offlineReady: true });
  });
  expect(screen.getByText(/Full Bible — experimental\. Search completed in 42 ms/)).toBeTruthy();
});
