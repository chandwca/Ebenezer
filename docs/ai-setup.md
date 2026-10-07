# Optional Google AI Studio integration

Ebenezer now has an on-demand encouragement card on Today and an authenticated `POST /v1/encouragement` endpoint. Its strict body contains only `theme` (`remember`, `care`, `steadiness`) and `language` (`en`, `es`). It rejects additional fields. Names, journal entries, contacts, and prayer requests are not sent to the provider.

## Enable Gemini locally

1. Create an API key in [Google AI Studio](https://aistudio.google.com/apikey). Check that the project is on the free tier and that your account has quota for the chosen model.
2. Add these values to the existing `apps/api/.env`, preserving the existing Supabase and server configuration:

   ```dotenv
   AI_PROVIDER=gemini
   GEMINI_API_KEY=YOUR_KEY_SAVED_LOCALLY
   GEMINI_MODEL=gemini-3.1-flash-lite
   ```

3. Restart the backend with `pnpm dev` from the repository root, or restart the API separately if the frontend is already running.
4. Sign in, open Today, choose a theme, and click Find encouragement. The result identifies whether it is AI-assisted or prepared content.

Keep the key out of chat, Git, frontend files, and `VITE_` variables. On deployment, configure these variables as backend secrets. `AI_PROVIDER=none` (the default) returns prepared content without calling any provider. Selecting `gemini` requires a key; invalid configuration stops startup rather than silently pretending AI is enabled.

Google currently advertises free input/output for Gemini 3.1 Flash-Lite, subject to project quotas. Free-tier prompts/responses can be used for product improvement; its unpaid-service terms prohibit submitting sensitive, confidential, or personal information. Enabling billing changes charging/data-use rules. A server API key does not itself guarantee free usage. See [pricing](https://ai.google.dev/gemini-api/docs/pricing), [billing](https://ai.google.dev/gemini-api/docs/billing), and [terms](https://ai.google.dev/gemini-api/terms).

## Behavior and limits

- Scripture comes from the curated KJV excerpts already used in the application, never the model output. Generated commentary is labeled separately and is still subject to review.
- Requests are explicit user actions, authenticated through existing Supabase token verification, and timed out. No private reflection personalization is implemented.
- Structured responses have validated field lengths. Blocked, incomplete, invalid, timed-out, or rate-limited responses fall back to prepared encouragement.
- Six public theme/language combinations are cached for six hours per API process. Simultaneous requests share a single generation. Failed generations are cached for one minute. This is a demo quota safeguard, not a distributed production rate limiter.
- No new tables or migrations are needed for this feature. Results are not yet saved as daily devotions, transferred into reflection drafts, scheduled, or delivered as notifications. Offline journals continue working; requesting encouragement requires connectivity.

## Switching to Gloo later

Application services depend on `EncouragementProvider.generate()` in `apps/api/src/shared/ai/provider.ts`. Add a Gloo adapter implementing that interface and extend `config/ai.ts` once account entitlement, endpoint, model ID, and privacy terms are verified. The route, response contract, fallback, cache, and frontend can remain unchanged. `AI_PROVIDER=gloo` is deliberately rejected today because no Gloo adapter has been verified or implemented.

Validation: 78 frontend tests and 21 backend tests pass, including mocked Gemini responses, authentication, strict public inputs, fallback, caching/coalescing, UI requests, and account-switch cancellation. Type checking, lint, and production builds pass. The production browser smoke check confirms offline journal behavior is preserved. Live generation still needs your locally configured key and an account with quota.

### Morning calendar and weather context

Today selects from curated KJV excerpts using the device's local date. Christmas,
New Year, Gregorian/Western Easter and Good Friday take priority; ordinary days
use a dated Gemini selection from the three existing verified themes, with the
rotation as fallback. The AI selects an identifier; it cannot supply verse text. Optional weather categories influence
ordinary-day themes without inferring a student's feelings. This is an initial
Christian calendar, not a country-specific public holiday calendar.

Today automatically checks weather for the saved city when online, with a
five-second timeout and same-day reuse. The browser sends that city to Open-Meteo geocoding and requests weather
for the first matching location. The resolved location is displayed; use a more
specific saved city if it is incorrect. Missing weather leaves the calendar-only
passage available. Google receives only theme, language, occasion, weather category
and public Scripture, never city, coordinates or private reflections.

Morning AI selection and encouragement load automatically for signed-in students
when Today opens. Requests include the local date and use bounded shared cache
entries. Successful dated responses are cached for 24 hours; a new date triggers
a new selection. Calendar occasions retain their matching verified passage. Provider
failure returns prepared content and the same selected Scripture. Project billing
must be checked in AI Studio; this code cannot guarantee that an API key belongs to
a Free Tier project. No automatic model or paid-service upgrade is performed.

Today stores its selected morning context on this device. **Bring your day** opens
the existing reflection journey with a reminder of that passage. The student’s
evening feelings and check-in words then guide the existing on-device Scripture
retrieval to an evening passage. Both morning context and evening Scripture are
saved in the stone and backup. Existing unfinished drafts resume unchanged.
Private words from the five-step journey are not sent to Google; retrieval runs on the device.

### Evening reflection

From Today, **Bring your day** is one screen: feelings, optional own words, the
morning Word and the thought she chose to carry, one reflection box and Hard/Mixed/Bright.
The box is saved as the stone's memory. `POST /v1/evening-prompt` (public, rate-limited)
receives only the language, the morning reference and her carried thought, and returns one
gentle question about her day. A prepared question is shown offline or when AI fails.

### Evening Word and song

After she shares her feelings and words, `POST /v1/evening-word` (public, rate-limited)
sends the language, date, selected feelings, her own words, the morning reference and her
carried thought to Google AI. The AI returns only a reference (1–5 verses), a one-sentence
note shown as "Why this passage · suggested by AI", and up to three real worship songs or
hymns of its own choosing. The server looks up the exact World English Bible text and rejects
unknown references (one retry). Each song is confirmed in Apple's public iTunes Search API
(no key; only the song title and artist are sent) and the first match is shown with the
catalog's spelling; invented songs are dropped. Songs link to a YouTube search, never a fixed
video. Without AI, offline, or when no song is confirmed, the on-device search chooses the
passage and a song comes from the small fallback list in `packages/contracts/src/songs.ts`.
The chosen song is saved with the stone.

### Tower remembrance

My Story shows **Remembering His faithfulness** above the tower for a nonempty journal.
It loads automatically, signed in or not, with a gentle local fallback offline or on failure.

`POST /v1/journey-summary` is public and rate-limited. **Product decision (October 2026):
the AI reads her stones.** The 60 most recent stones are sent with their date, day category,
Scripture references, feelings, check-in, carried thought, reflection answers and memory
(each field capped at 1,200 characters). Older stones are compressed to day category and
references with a count. Prayer-partner names are never sent. Day totals are checked against
the entries. The panel states that the message was written with Google AI from her stones.
The prompt may recall what she wrote in its own words but forbids invented events,
diagnosis, judgement or claims of measured spiritual growth. Google's free tier may use
requests to improve its products; review this before a public pilot.

The server and browser cache successful replies in memory only; nothing is stored.

The morning card does not expose provider explanations, generation controls,
sign-in prompts, or raw errors. Prepared Scripture-grounded encouragement remains
visible while requests load, when signed out/offline, or when a request fails.
No changes to billing are made by this UI simplification.
