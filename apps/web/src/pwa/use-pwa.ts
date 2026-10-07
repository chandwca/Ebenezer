import * as React from 'react';
import { prepareReload } from './reload-guards';
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}
export function usePwa() {
  const [online, setOnline] = React.useState(navigator.onLine);
  const [ready, setReady] = React.useState(false);
  const [waiting, setWaiting] = React.useState<ServiceWorker>();
  const [install, setInstall] = React.useState<InstallPrompt>();
  const [installed, setInstalled] = React.useState(
    () => window.matchMedia?.('(display-mode: standalone)').matches ?? false,
  );
  const [failed, setFailed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const reload = React.useRef(false);
  React.useEffect(() => {
    let disposed = false;
    const network = () => setOnline(navigator.onLine);
    const prompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as InstallPrompt);
    };
    const installedApp = () => {
      setInstalled(true);
      setInstall(undefined);
    };
    const controller = () => {
      if (reload.current) window.location.reload();
    };
    window.addEventListener('online', network);
    window.addEventListener('offline', network);
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', installedApp);
    if ('serviceWorker' in navigator && import.meta.env.PROD) {
      navigator.serviceWorker.addEventListener('controllerchange', controller);
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          if (disposed) return;
          if (registration.waiting) setWaiting(registration.waiting);
          registration.addEventListener('updatefound', () => {
            const worker = registration.installing;
            worker?.addEventListener('statechange', () => {
              if (!disposed && worker.state === 'installed') {
                if (registration.waiting && navigator.serviceWorker.controller)
                  setWaiting(registration.waiting);
                else setReady(true);
              }
            });
          });
          void navigator.serviceWorker.ready.then(() => {
            if (!disposed) setReady(true);
          });
        })
        .catch(() => {
          if (!disposed) setFailed(true);
        });
    }
    return () => {
      disposed = true;
      window.removeEventListener('online', network);
      window.removeEventListener('offline', network);
      window.removeEventListener('beforeinstallprompt', prompt);
      window.removeEventListener('appinstalled', installedApp);
      navigator.serviceWorker?.removeEventListener('controllerchange', controller);
    };
  }, []);
  async function update() {
    if (!waiting || busy) return;
    setBusy(true);
    setFailed(false);
    try {
      await prepareReload();
      reload.current = true;
      waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  async function installApp() {
    if (!install) return;
    try {
      await install.prompt();
      await install.userChoice;
    } finally {
      setInstall(undefined);
    }
  }
  return { online, ready, waiting, installed, install, failed, busy, update, installApp };
}
