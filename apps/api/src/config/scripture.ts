import { createYouVersionProvider } from '../shared/bible/youversion.js';

export function readScriptureProvider(env: NodeJS.ProcessEnv = process.env) {
  const key = env.YOUVERSION_APP_KEY?.trim();
  return key ? createYouVersionProvider(key) : undefined;
}
