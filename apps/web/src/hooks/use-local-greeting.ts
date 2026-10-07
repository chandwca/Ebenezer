import { useEffect, useState } from 'react';

export function greetingPeriod(date = new Date()) {
  const hour = date.getHours();
  return hour >= 5 && hour < 12 ? 'morning' : hour >= 12 && hour < 17 ? 'afternoon' : 'evening';
}

export function useLocalGreeting() {
  const [period, setPeriod] = useState(() => greetingPeriod());
  useEffect(() => {
    const refresh = () => setPeriod(greetingPeriod());
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return period;
}
