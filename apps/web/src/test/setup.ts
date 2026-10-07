import { afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup, configure } from '@testing-library/react';
import 'fake-indexeddb/auto';
import { i18n } from '@/i18n';

if (!HTMLElement.prototype.scrollIntoView) HTMLElement.prototype.scrollIntoView = () => {};

if (!HTMLDialogElement.prototype.showModal)
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
if (!HTMLDialogElement.prototype.close)
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };

// Lazy route imports can take longer while production/browser checks share the machine.
configure({ asyncUtilTimeout: 5000 });

// Every test starts in English and leaves no rendered tree, stubs or spies behind.
beforeEach(async () => {
  vi.stubGlobal('scrollTo', vi.fn());
  // jsdom has no layout engine; actual header sizing is checked in the browser smoke test.
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  await act(async () => {
    await i18n.changeLanguage('en');
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
