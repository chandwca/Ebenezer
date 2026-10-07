import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { greetingPeriod, useLocalGreeting } from './use-local-greeting';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it('uses local hours at the morning, noon and evening boundaries', () => {
  for (const [hour, minute, expected] of [
    [0, 0, 'evening'],
    [4, 59, 'evening'],
    [5, 0, 'morning'],
    [11, 59, 'morning'],
    [12, 0, 'afternoon'],
    [16, 59, 'afternoon'],
    [17, 0, 'evening'],
    [23, 59, 'evening'],
  ] as const) {
    expect(greetingPeriod(new Date(2026, 9, 5, hour, minute))).toBe(expected);
  }
});

it('updates while open, refreshes on return and clears its timer on unmount', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 5, 11, 59));
  const { result, unmount } = renderHook(useLocalGreeting);
  expect(result.current).toBe('morning');
  act(() => vi.advanceTimersByTime(60_000));
  expect(result.current).toBe('afternoon');
  vi.setSystemTime(new Date(2026, 9, 5, 19, 0));
  act(() => window.dispatchEvent(new Event('focus')));
  expect(result.current).toBe('evening');
  vi.setSystemTime(new Date(2026, 9, 6, 8, 0));
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(result.current).toBe('morning');
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
