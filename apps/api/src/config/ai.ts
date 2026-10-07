import { createGeminiProvider } from '../shared/ai/gemini.js';
import type { EncouragementProvider } from '../shared/ai/provider.js';

export function readEncouragementProvider(
  env: NodeJS.ProcessEnv = process.env,
): EncouragementProvider | undefined {
  const provider = env.AI_PROVIDER?.trim() || 'none';
  if (provider === 'none') return undefined;
  if (provider !== 'gemini') throw new Error('AI_PROVIDER must be none or gemini.');
  const apiKey = env.GEMINI_API_KEY?.trim();
  const model = env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
  if (!apiKey || !/^[A-Za-z0-9_.-]+$/.test(model))
    throw new Error('Set GEMINI_API_KEY and a valid GEMINI_MODEL for Gemini.');
  return createGeminiProvider({ apiKey, model });
}
