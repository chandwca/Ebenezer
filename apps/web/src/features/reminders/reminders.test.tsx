import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { db } from '@/db/database';
import { renderWithProviders } from '@/test/render';
import { REMINDERS_KEY, parseReminders, storeReminders } from './reminders';
import { ReminderPreferences } from './reminder-preferences';
import { ReminderPrompt } from './reminder-prompt';

const VAPID =
  'BO5GrRw74RRSYO4qpSMFosudASh7Yntgu5YukXydyoheTjfrsh-DRM3U_-yUI1kyVNRzk5izFsBjwLzO92dShaQ';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-device';

// A browser that can receive push: permission prompt, service worker and push subscription.
function pushBrowser({ answer = 'granted' as NotificationPermission, userAgent = 'Chrome' } = {}) {
  const subscription = {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } }),
    unsubscribe: vi.fn(async () => true),
  };
  let current: typeof subscription | null = null;
  const pushManager = {
    getSubscription: vi.fn(async () => current),
    subscribe: vi.fn<(options?: PushSubscriptionOptionsInit) => Promise<typeof subscription>>(
      async () => (current = subscription),
    ),
  };
  const Notification = Object.assign(function Notification() {}, {
    permission: 'default' as NotificationPermission,
    requestPermission: vi.fn(async () => (Notification.permission = answer)),
  });
  vi.stubGlobal('Notification', Notification);
  vi.stubGlobal('PushManager', function PushManager() {});
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => ({ pushManager })), addEventListener() {} },
  });
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  const fetch = vi.fn(async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    return new Response(
      JSON.stringify(body.action === 'test' ? { delivery: 'sent' } : { created: true }),
    );
  });
  vi.stubGlobal('fetch', fetch);
  return {
    Notification,
    pushManager,
    subscription,
    fetch,
    sent: () => fetch.mock.calls.map(([, init]) => JSON.parse(String(init?.body))),
  };
}
const stored = async () => parseReminders((await db.preferences.get(REMINDERS_KEY))?.value);

it('shows a rejected preview save inside the consent dialog and preserves discreet wording', async () => {
  const browser = pushBrowser();
  await browser.pushManager.subscribe();
  await storeReminders({ ...parseReminders(undefined), enabled: true, language: 'en' });
  browser.fetch.mockImplementation(async () => new Response('{}', { status: 400 }));
  renderWithProviders(<ReminderPreferences />);
  fireEvent.click(await screen.findByRole('checkbox', { name: /Discreet wording/ }));
  const dialog = await screen.findByRole('dialog');
  fireEvent.click(within(dialog).getByRole('button', { name: 'Allow Scripture previews' }));
  expect(await within(dialog).findByRole('alert')).toBeTruthy();
  expect((await stored()).discreet).toBe(true);
  fireEvent.click(within(dialog).getByRole('button', { name: 'Keep discreet wording' }));
});

beforeEach(async () => {
  await db.preferences.delete(REMINDERS_KEY);
  vi.stubEnv('VITE_SUPABASE_URL', 'https://project.supabase.test');
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', VAPID);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  // @ts-expect-error test-only cleanup of the stubbed service worker container
  delete navigator.serviceWorker;
});

it('one tap asks permission, subscribes with the app key and saves default times without an account', async () => {
  const browser = pushBrowser();
  renderWithProviders(<ReminderPrompt placement="today" />);
  expect(await screen.findByText('A gentle reminder, twice a day')).toBeTruthy();
  expect(screen.getByText('7:30 AM')).toBeTruthy();
  expect(screen.getByText('8:30 PM')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Turn on reminders' }));
  expect(
    await screen.findByText('Reminders are on. We’ll meet you tomorrow at 7:30 AM.'),
  ).toBeTruthy();
  expect(browser.Notification.requestPermission).toHaveBeenCalled();
  const options = browser.pushManager.subscribe.mock.calls[0][0]!;
  expect(options.userVisibleOnly).toBe(true);
  expect((options.applicationServerKey as Uint8Array).length).toBe(65);
  expect(browser.fetch.mock.calls[0][0]).toBe(
    'https://project.supabase.test/functions/v1/push-subscription',
  );
  expect(browser.sent()[0]).toEqual({
    action: 'save',
    subscription: { endpoint: ENDPOINT, keys: { p256dh: 'p'.repeat(87), auth: 'a'.repeat(22) } },
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: 'en',
    morningTime: '07:30',
    eveningTime: '20:30',
    discreet: true,
  });
  expect(await stored()).toMatchObject({ enabled: true, language: 'en' });
});

it('“Not now” is respected: asked again once after a stone, then never', async () => {
  pushBrowser();
  const today = renderWithProviders(<ReminderPrompt placement="today" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
  await waitFor(() => expect(screen.queryByText('A gentle reminder, twice a day')).toBeNull());
  expect((await stored()).dismissed).toBe('once');
  today.unmount();
  renderWithProviders(<ReminderPrompt placement="after-stone" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Not now' }));
  await waitFor(async () => expect((await stored()).dismissed).toBe('after-stone'));
  await waitFor(() => expect(screen.queryByText('A gentle reminder, twice a day')).toBeNull());
});

it('a refused permission explains how to allow notifications', async () => {
  pushBrowser({ answer: 'denied' });
  renderWithProviders(<ReminderPrompt placement="today" />);
  fireEvent.click(await screen.findByRole('button', { name: 'Turn on reminders' }));
  expect(await screen.findByText('Notifications are blocked for Ebenezer')).toBeTruthy();
  expect(screen.getByText('Allow notifications.')).toBeTruthy();
  expect((await stored()).enabled).toBe(false);
});

it('on an iPhone browser tab it shows the Home Screen steps instead of asking', async () => {
  const browser = pushBrowser({
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)',
  });
  renderWithProviders(<ReminderPrompt placement="today" />);
  expect(await screen.findByText('Get reminders on your iPhone')).toBeTruthy();
  expect(screen.getByText('Choose Add to Home Screen.')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Turn on reminders' })).toBeNull();
  expect(browser.Notification.requestPermission).not.toHaveBeenCalled();
});

it('browsers without push show nothing on Today and an explanation in Settings', async () => {
  vi.stubGlobal('Notification', undefined);
  // @ts-expect-error simulate a browser without PushManager
  delete window.PushManager;
  const today = renderWithProviders(<ReminderPrompt placement="today" />);
  await waitFor(() => expect(today.container.textContent).toBe(''));
  renderWithProviders(<ReminderPreferences />);
  expect(await screen.findByText(/This browser can’t show reminders/)).toBeTruthy();
});

it('Settings changes times and wording, sends a test now, and turns reminders off', async () => {
  const browser = pushBrowser();
  await browser.pushManager.subscribe();
  await storeReminders({
    enabled: true,
    morningTime: '07:30',
    eveningTime: '20:30',
    discreet: true,
    language: 'en',
  });
  renderWithProviders(<ReminderPreferences />);
  expect(await screen.findByText('Reminders are on')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Evening'), { target: { value: '21:15' } });
  expect(await screen.findByText('Saved.')).toBeTruthy();
  expect(browser.sent().at(-1)).toMatchObject({ action: 'save', eveningTime: '21:15' });

  fireEvent.click(screen.getByRole('checkbox', { name: /Discreet wording/ }));
  expect(await screen.findByText('Show Scripture on your lock screen?')).toBeTruthy();
  expect(browser.sent().at(-1)).toMatchObject({ discreet: true });
  fireEvent.click(screen.getByRole('button', { name: 'Allow Scripture previews' }));
  await waitFor(() =>
    expect(browser.sent().at(-1)).toMatchObject({ discreet: false, scripturePreviewConsent: true }),
  );

  fireEvent.click(await screen.findByRole('button', { name: 'Evening reminder' }));
  expect(await screen.findByText('Sent. It should arrive in a few seconds.')).toBeTruthy();
  expect(browser.sent().at(-1)).toEqual({ action: 'test', endpoint: ENDPOINT, kind: 'evening' });

  fireEvent.click(screen.getByRole('button', { name: 'Turn off reminders' }));
  expect(await screen.findByText('Reminders are off')).toBeTruthy();
  expect(browser.sent().at(-1)).toEqual({ action: 'remove', endpoint: ENDPOINT });
  expect(browser.subscription.unsubscribe).toHaveBeenCalled();
  expect(await stored()).toMatchObject({ enabled: false, eveningTime: '21:15', discreet: false });
});
