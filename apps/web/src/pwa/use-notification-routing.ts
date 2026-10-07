import * as React from 'react';
import { useNavigate } from 'react-router-dom';

/** A tapped reminder opens its page inside the running app (see tooling/service-worker.ts). */
export function useNotificationRouting() {
  const navigate = useNavigate();
  React.useEffect(() => {
    const container = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined;
    if (!container) return;
    const open = (event: MessageEvent) => {
      const path = event.data?.type === 'OPEN_PATH' ? event.data.path : undefined;
      if (typeof path === 'string' && path.startsWith('/') && !path.startsWith('//'))
        navigate(path);
    };
    container.addEventListener('message', open);
    return () => container.removeEventListener('message', open);
  }, [navigate]);
}
