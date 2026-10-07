# Free demo deployment

Use Cloudflare Pages Free for the PWA, Render Free for the Node API, the existing Supabase
Free project for Auth and reminders, and Google AI Studio's free API tier. Use provider
subdomains; no purchased domain is needed. Stay on free plans and verify the Gemini project's
billing tier in AI Studio. Free quotas can stop service; Render sleeps after inactivity.

## 1. Prepare this repository

- [ ] Revoke the Gemini key previously placed in `.env.example`, if it was real. Replace the
      local backend key with a fresh key. Do not commit `.env` or private VAPID keys.
- [ ] Run `pnpm check`, API tests, web tests, and reminder tests.
- [ ] Review and commit the app changes and `render.yaml`, then push to GitHub. Hosting builds
      the committed repository, not the files on this computer.
- [ ] Verify AI responses actually return `source: "ai"`. Prepared fallback is not proof that
      Gemini works. Use fictional reflections for demo testing.

## 2. Deploy the backend on Render

- [ ] Sign in to Render, connect GitHub, and grant access to FrontierCommons/Ebenezer.
- [ ] Create a Blueprint from the repository using `render.yaml`; confirm **Free** instance.
- [ ] Supply `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `WEB_ORIGIN`.
      Initially use the intended Pages URL; correct it once Pages assigns the final URL.
- [ ] Keep the repository root as build root. The API build needs the contracts workspace
      and `apps/web/data/bible/full.json`.
- [ ] Deploy and record the assigned HTTPS API URL. Visit `<API_URL>/health` and expect
      `{"status":"ok","service":"ebenezer-api"}`. Never put the Gemini key in frontend variables.

## 3. Deploy the frontend on Cloudflare Pages

- [ ] Connect the GitHub repository to a **Pages** project and select the deployment branch.
- [ ] Keep root directory empty (repository root).
- [ ] Build command: `pnpm --filter @ebenezer/contracts build && pnpm --filter @ebenezer/web build`.
- [ ] Output directory: `apps/web/dist`. Node environment: `NODE_VERSION=22.16.0`.
- [ ] Set `VITE_API_URL` to Render's HTTPS API URL, `VITE_SUPABASE_URL`,
      `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_VAPID_PUBLIC_KEY`.
- [ ] Deploy; record the actual `https://<project>.pages.dev` URL.
- [ ] Set Render's `WEB_ORIGIN` to that exact origin (no trailing slash) and redeploy.
      Frontend environment changes require rebuilding Pages.
- [ ] If using Google sign-in, set the Supabase Site URL to the Pages origin and allow
      `<PAGES_ORIGIN>/auth/callback`; update Google OAuth configuration as necessary.

## 4. Deploy Supabase reminders

- [ ] Confirm the CLI is linked to the intended project; run `pnpm exec supabase db push --dry-run`.
- [ ] Apply migrations with `pnpm exec supabase db push`.
- [ ] Upload secrets: `pnpm exec supabase secrets set --env-file supabase/functions/.env`.
- [ ] Deploy `pnpm exec supabase functions deploy push-subscription` and
      `pnpm exec supabase functions deploy send-reminders`.
- [ ] Create the Vault secrets `reminders_project_url` and `reminders_cron_secret` using the
      actual project URL and matching `REMINDERS_CRON_SECRET`. See notifications-setup.md.
- [ ] Verify the cron job, turn on reminders, and receive a real notification using Settings.

## 5. Check the judges' experience

- [ ] Open the public link on a phone without signing in.
- [ ] Read the morning Word, save a thought, reflect, and set a stone.
- [ ] Open My Story and verify a personalized AI summary, then refresh and revisit the stone.
- [ ] Verify direct `/story` and `/reflection` links, installation, and offline reopening.
- [ ] On iPhone install from Safari first, then allow notifications and test delivery.
- [ ] Open the backend before judging; a sleeping free Render instance can exceed the app's
      request timeout. After it wakes, reload the app before presenting.

## 6. Create the QR code after the public URL passes

- [ ] Encode the final Pages URL, not localhost or the GitHub repository.
- [ ] Export a high contrast SVG/PNG with a white margin; include the URL beneath it.
- [ ] Scan from two phones and verify the exact destination.
- [ ] Add the QR to the pitch slide. Judges can use the site immediately; installation is optional.

Sources: https://render.com/docs/free,
https://developers.cloudflare.com/pages/platform/limits/,
https://ai.google.dev/gemini-api/docs/pricing,
https://supabase.com/pricing.
