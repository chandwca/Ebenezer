import * as React from 'react';

export function useAutosave(
  value: string,
  save: (value: string) => Promise<unknown> | void,
  enabled = true,
  delay = 500,
) {
  const latest = React.useRef(value);
  const saved = React.useRef('');
  const saveRef = React.useRef(save);
  const enabledRef = React.useRef(enabled);
  latest.current = value;
  saveRef.current = save;
  enabledRef.current = enabled;
  React.useEffect(() => {
    if (!enabled || value === saved.current) return;
    const timer = setTimeout(() => {
      saved.current = value;
      void saveRef.current(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, enabled, delay]);
  React.useEffect(
    () => () => {
      if (!enabledRef.current || latest.current === saved.current) return;
      saved.current = latest.current;
      void saveRef.current(latest.current);
    },
    [],
  );
}
