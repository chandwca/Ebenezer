import { fileURLToPath } from 'node:url';

try {
  process.loadEnvFile(fileURLToPath(new URL('../.env', import.meta.url)));
} catch {
  console.error('Could not load apps/api/.env. Save your Gemini settings there first.');
  process.exit(1);
}

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || 'gemini-3.1-flash-lite';
if (!key || !/^[A-Za-z0-9_.-]+$/.test(model)) {
  console.error('GEMINI_API_KEY is missing or GEMINI_MODEL is invalid.');
  process.exit(1);
}

const prompt = process.argv.slice(2).join(' ') ||
  'Write two gentle sentences of encouragement for someone exploring Christianity, grounded in 1 Peter 5:7. Do not invent personal experiences or quote biblical text.';

try {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    },
  );
  const data = await response.json();
  console.log(`Gemini HTTP status: ${response.status}`);
  if (!response.ok) {
    const hints = {
      400: 'Check your key and model configuration.',
      401: 'The API key was not accepted.',
      403: 'Check project permissions and Gemini availability.',
      404: 'The configured model is unavailable.',
      429: 'Quota or rate limit reached. Check AI Studio usage; do not enable billing just to retry.',
      503: 'Google is temporarily unavailable. Try again later.',
    };
    console.error(hints[response.status] || 'Google could not complete the request.');
    process.exitCode = 1;
  } else {
    const text = data.candidates?.[0]?.content?.parts
      ?.filter(part => !part.thought)
      .map(part => part.text || '').join('');
    if (text) console.log(text);
    else {
      console.error('Google returned no visible text.');
      process.exitCode = 1;
    }
  }
} catch {
  console.error('Request failed or timed out. Check internet access and retry.');
  process.exitCode = 1;
}
