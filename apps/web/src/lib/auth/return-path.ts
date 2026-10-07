const KEY = 'ebenezer.afterSignIn';
// Only known in-app destinations are honored, so a stored value can never redirect elsewhere.
const allowed = new Set(['/welcome?step=account']);
const fallback = '/settings';

export function rememberReturnPath(path: string) {
  try {
    if (allowed.has(path)) sessionStorage.setItem(KEY, path);
  } catch {
    /* Without storage, sign-in returns to Settings. */
  }
}

/** Reads and clears the destination for the end of an OAuth sign-in. */
export function takeReturnPath() {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (value && allowed.has(value)) return value;
  } catch {
    /* Fall through to Settings. */
  }
  return fallback;
}
