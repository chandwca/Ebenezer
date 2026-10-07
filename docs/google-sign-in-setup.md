# Google sign-in: setup and first account test

Updated October 6, 2026. React sign-in, the callback route, session restoration/refresh, sign-out and explicit community profile setup are implemented. The hosted development return URLs have been configured. A read-only check of the hosted project's Auth settings confirmed that **Google is not yet enabled**. Real Google sign-in and a hosted two-person account test still require provider setup.

## 1. Connect Google to Supabase

Use your personal Ebenezer Supabase project (`bbneqmpmobwllfzgkixh`). Your GitHub account does not determine which Google accounts can sign in to the app.

1. Open [Google Auth Platform](https://console.cloud.google.com/auth/overview). Create/select a Google Cloud project for Ebenezer.
2. Set up **Branding** with the application name and contact details. In **Audience**, choose **External** for people outside your own organization. If the app is in testing mode, add the Google accounts you will use for the demo under **Test users**.
3. Use only the basic identity scopes: `openid`, email and profile. This feature does not request Google Contacts, Drive or Gmail access.
4. In **Clients**, create an OAuth client with application type **Web application**. Add authorized JavaScript origin `http://localhost:5173`.
5. Add this **authorized redirect URI** in Google:

   ```text
   https://bbneqmpmobwllfzgkixh.supabase.co/auth/v1/callback
   ```

6. Copy the generated client ID and client secret directly into **Supabase → Authentication → Sign In / Providers → Google**, enable Google, and save. Do not put the secret in chat, `.env` browser variables or Git.

Google returns to Supabase first. Supabase then returns to the React application's `/auth/callback`. Those are two different URLs. See the official [Supabase Google sign-in guide](https://supabase.com/docs/guides/auth/social-login/auth-google).

## 2. Check the app return URLs

The following hosted development settings have already been applied:

- **Site URL:** `http://localhost:5173`
- **Redirect URLs:** `http://localhost:5173/auth/callback` and `http://127.0.0.1:5173/auth/callback`

They can be reviewed in **Supabase → Authentication → URL Configuration**. The partial configuration in `supabase/hosted-auth/supabase/config.toml` declares only these settings. Provider credentials and other hosted Auth settings were left unchanged.

For later deployment, add the exact HTTPS app callback, update the site URL and Node CORS origin, and configure the frontend host to serve `index.html` for `/auth/callback`. Recheck Google origins for the deployed app. Avoid copying the full local Supabase development configuration to the hosted project. See [Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Create your first community profile

1. From the repository root, run `pnpm dev`. Use the frontend on `http://localhost:5173`; Node should be on port `3001`.
2. Open **Settings** or **Together** and press **Continue with Google**. Complete Google's sign-in in the same browser where you started it.
3. The callback returns you to Settings. Enter the name your people should use and a unique handle, then press **Make my community profile**.
4. In Supabase, open **Authentication → Users** to see the account. Open **Table Editor**, select the **`ebenezer_api`** schema, and open **`profiles`** to see the saved profile. The two records have the same account ID.
5. Reload Settings: the account and saved profile should return. Update the display name and save again.
6. Sign out. The account form should disappear while private stones, drafts and device preferences remain available.

Signing in creates/authenticates an account through Supabase. It does not automatically create a community profile or upload the device-only name/city. Profile creation is an explicit Node `PATCH /v1/me` request. Passwords are not collected or stored by Ebenezer.

## 4. Verify a second account

Use a separate browser profile or private window to avoid reusing the first session. Sign in with another permitted Google test user, choose a different handle, and save. The second account must load only its own profile. Try the first person's handle: the form should explain that it is taken and preserve your entered values. Sign out/reload and check that the old account's profile is not displayed.

Read-only hosted schema/access checks already pass. Actual hosted Google sign-in and this two-account test are pending until you enable the provider. Automated component/API tests use fixtures; real Node/Auth/database integration tests use temporary local accounts only.

## Implemented checks

- Frontend tests cover session restoration/refresh, guest rejection, initial-session races, safe callback success/failure, explicit profile saving, handle conflicts, expired sessions, account switching and preserving device preferences on sign-out. The existing journal, journey, Bible search and bilingual route tests also pass. Slow route tests were run with one worker and a 15-second test timeout to avoid resource contention.
- Frontend TypeScript, ESLint, formatting and production build checks pass.
- The production Chrome smoke test verifies desktop/mobile account layout, offline journal saving/reopening, offline account/callback navigation, absence of Auth/profile responses in app caches, and controlled service-worker updates. Run `node apps/web/scripts/offline-smoke.mjs --account-screenshot` after a production build to reproduce it.
- Hosted configuration deployment changed only the development site URL and callback allow-list. A read-only provider availability check confirmed Google is disabled; no hosted account was created for these tests.

## Architecture and limits

```text
Google → Supabase Auth → React callback/session
React profile form → Node authentication → controller → service → repository → Supabase profiles/RLS
Private journal → device IndexedDB
```

- Shared UI components own markup and styling. Account features own form state, Auth lifecycle and API calls.
- The browser Auth client does not query application tables. The API client gets the current session token for each request, uses `Cache-Control` request semantics via `cache: 'no-store'`, and validates the response with shared contracts. Node independently verifies the token and PostgreSQL independently enforces ownership.
- Profile responses remain in component memory; they are not put into the journal or a community cache. Account switching/sign-out cancels pending profile requests and removes the previous account's profile from the UI.
- The SDK restores and refreshes sessions. The auth-state listener does not await SDK calls. PKCE callback exchanges are deduplicated under React StrictMode, and callback parameters are removed from the address bar.
- Offline use remains available for the journal. Account/profile operations require a connection. Sign-out is scoped to this device and may require reconnecting to finish.
- The service worker caches only the static callback shell, not callback codes, Auth responses or `/v1` responses. A callback code needs the PKCE verifier saved in the browser that started sign-in; a failed exchange asks the person to start sign-in again. See [Supabase PKCE](https://supabase.com/docs/guides/auth/sessions/pkce-flow).
- Friends, groups and shared stones remain future features. No Google provider credentials, hosted test users or community tables were created by this implementation.
