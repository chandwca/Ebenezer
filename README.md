# Ebenezer

Ebenezer sends **Scripture beyond the app**: a trusted person shares a *Word card* link into a group chat, and a student opens it with no install or account, reads a reviewed passage, replies from their own messaging app, and chooses what happens next. See [Word card](docs/word-card.md) for the pitch, design decisions and demo checklist, and [validation log](docs/validation-log.md). The journaling PWA below (reflection journey, stones, reminders) is the optional "keep going" layer.

The rebuild below currently implements the **stages 1–8**: preserved prototype, typed workspace, Node API, common theme/components, responsive routed screens, and bundled English/Spanish interface translations.

The primary audience is international students who are new to Christian faith and want to understand Jesus’ love. The main morning/evening Scripture flows and guided reader now support YouVersion BSB, with backend-only credentials, publisher attribution, and verified WEB fallback. See [YouVersion setup and live verification](docs/youversion-setup.md). Community needs still require validation with students; this audience statement is not a claim of completed user research.

The shared FormBuilder powers a five-moment reflection journey (Feel → Read → Reflect → Together → Stone) and the profile form. Scripture appears in one reading moment, with full-chapter and alternative-passage options, before continuing directly to reflection. Drafts, saved reflections, and profile preferences are stored locally in IndexedDB. The production build includes install metadata, precached application assets, offline status, and a user-controlled update prompt. Authentication and cloud synchronization remain future stages.

## Development

Use Node.js 22 LTS or newer supported LTS, and pnpm 10.

```sh
pnpm install
pnpm dev
```

Frontend: http://localhost:5173. API: http://localhost:3001/health.
Copy the `.env.example` in each app to `.env` if changing defaults. No credentials are required for this foundation.

```sh
pnpm check
pnpm --filter @ebenezer/api test
pnpm --filter @ebenezer/web test
```

The original app is in `legacy/original-pwa/`. Its browser data remains separate from the new application; no migration has run. Do not register the legacy service worker for the new frontend.

## Languages

Choose English or Español in the header or Settings. The selection is stored under `ebenezer.language`; blocked browser storage falls back to an in-memory selection. All translation resources are imported at build time, so switching requires no translation-server requests once the app is loaded. Production builds precache these resources for offline reopening after the first successful online setup.

Namespaces are `common`, `today`, `journal`, `community`, `settings`, and `errors`, under `apps/web/src/locales/{en,es}/`. English is the fallback. The document language, title, navigation, screen content, controls, and accessibility labels update without remounting the app. Scripture remains attributed English KJV with an explicit language label. Interface translations do not translate user-authored content.

Integration tests cover translation-key parity, screen/accessibility translation, route/theme preservation, shared-input value retention, persistence reading, blocked storage, and English fallback. Tests also verify that the actual reflection form retains its input when switching languages. English and Spanish copy has been checked for consistency; independent native-speaker review remains desirable before a public release.

## Try the local journal

1. Open the reflection journey from Today. Choose a feeling and passage, confirm reading, write a reflection, and complete the memory and tone fields.
2. Navigate away and return to resume your saved draft. The draft autosaves quietly after a short delay and is flushed when you leave the page.
3. Save the stone and view it in My Story. Reload to verify it remains on this browser.
4. In My Story, search by text, filter by tone/date, expand full reflections, edit, or delete with confirmation. Export a private JSON backup and import it on another browser; existing IDs are skipped.
5. In Settings, save your name and city. Change language while editing to verify your text stays intact.

Local records live in the `ebenezer-journal` IndexedDB database. Dexie manages versioned tables for stones, drafts, preferences, an outbox, and sync metadata. Saves are transactional; an account-scoped outbox is prepared for future sync, but no cloud upload runs today. Data is tied to the browser and origin, so clearing browser data removes it; export/import is available in My Story, and cloud backup comes later. Redis is not needed.

The production app can reopen and write locally without a network request after its first successful online setup. The current database migration preserves version 1 records; importing the original prototype is a separate later stage.

## Install and test offline

Service workers run in the **production build**, not the Vite development server. To try locally:

```sh
pnpm build
pnpm --filter @ebenezer/web preview --host localhost --port 4173
```

1. Open http://localhost:4173 online and wait for **Application assets are cached for offline use on this browser**.
2. Create a reflection, turn off networking using browser developer tools, and reload `/reflection` or `/story`. Switch language and save/view stones offline.
3. Install using the displayed Install button when supported, or your browser's install menu. On iPhone/iPad, use Safari → Share → Add to Home Screen. Installation is optional.
4. On a later release, an update waits for **Update and reload**. Reflection drafts are flushed before activation; dirty profile and stone editors block reload until saved or cancelled. Other open tabs are not forcibly reloaded.

HTTPS is required when deployed; localhost is supported for testing. The first visit needs internet. Clearing/evicting site storage removes offline availability and can remove local journal data, so keep a backup. Installation controls vary by browser. See [MDN service workers](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers) and [installation prompts](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt).

The service worker caches only app files; API, authentication, and external responses are excluded. Prior build caches are retained so open older tabs can still load their original lazy chunks; these caches contain no journal content. IndexedDB is independent and is never cleared by an application update. A cache-retention policy can be added with client-version tracking before a long-running public release.

For an isolated browser smoke test on macOS with Google Chrome installed:

```sh
pnpm --filter @ebenezer/web test:pwa
```

This uses a temporary Chrome profile and local production server. It checks offline deep routes, lazy screens/fonts, draft save/reload, and update activation with draft preservation. Physical Android/iPhone installation remains a manual check.

## Structure and documentation

All reusable UI and its styles live in `apps/web/src/components/ui/`. Screens in `pages/` compose these components and pass translated content and actions. `App.tsx` owns routing and theme state. ESLint prevents page/feature files from adding raw HTML elements or `className` styling; add or extend a common component instead. Shared colors remain in `styles/theme.css`. Run `pnpm format` for consistent source formatting.

- `apps/web`: React + Vite + Tailwind frontend.
- `apps/api`: Node + Fastify API.
- `packages/contracts`: shared Zod schemas/types.
- [Architecture](docs/architecture.md)
- [User flows](docs/user-flows.md)
- [Optional Google AI Studio setup](docs/ai-setup.md): on-demand Today encouragement, backend-only credentials, prepared fallback, and the provider interface for a future Gloo adapter.

## Deployment targets

Cloudflare Pages: build `pnpm --filter @ebenezer/contracts build && pnpm --filter @ebenezer/web build`, output `apps/web/dist`.
Render: build `pnpm install --frozen-lockfile && pnpm --filter @ebenezer/api build`, start `pnpm --filter @ebenezer/api start`. Set `WEB_ORIGIN` to the frontend origin. Use Node 22+ and configure `PORT` through the hosting environment.

Supabase's profile foundation is implemented and tested locally: migration-backed `profiles`, owner-only RLS, verified authentication, and Node `GET /v1/me` / `PATCH /v1/me` through controller/service/repository layers. The profile and schema-move migrations are deployed to the personal hosted Ebenezer development project, and a dry run confirms no pending migrations. Profiles live in `ebenezer_api`; internal helpers live in unexposed `ebenezer_private`. Hosted Data API access checks pass. See [setup, local tests and hosted migration deployment](docs/supabase-setup.md). React Google sign-in, session handling and explicit account-profile setup are available in Settings and Together. Hosted development callback URLs are configured; enable Google using [these setup and test steps](docs/google-sign-in-setup.md). Real hosted account acceptance tests and community storage remain pending. Free-tier limits and idle-service sleep apply. The frontend and Node backend have not been deployed.

## Bible search experiment

The first increment prepares 50 source-verified World English Bible passages and their 41 complete chapters. Node embedding generation is complete, with two indexes and a local CLI search. The React search screen is available at `/bible-search`, or Today → Find a Word. See [the step-by-step experiment](docs/bible-search-prototype.md). Run `pnpm --filter @ebenezer/web test:bible` to check the sample.

Search your own description at `/bible-search`. The first search downloads roughly 145 MB of model files from Hugging Face; descriptions stay on the device. You can compare Scripture-only and Scripture-with-context suggestions, then open a full chapter. The interface is English/Spanish; the sample Scripture and editorial context remain English. Relevance needs review, especially for ambiguous or unrelated questions.

For offline semantic search, use the production preview, wait for the app offline-ready message, and finish one successful search with the model-cached message before disconnecting. Both data and model caching are required. The self-hosted WASM runtime adds about 21.6 MB uncompressed to app assets. The model weights are downloaded on demand, outside the deployment bundle. Browser storage eviction can require setup again.

Run `pnpm --filter @ebenezer/web test:bible-browser` on macOS with Chrome to test real browser inference, chapter reading, and searching after an offline reload. Physical phone performance remains to be tested.

Full-Bible preparation now includes the standard 66-book WEB dataset and a separate 9,534-passage local embedding index. The React search now offers **Full Bible — experimental** alongside the original 50-passage options; the full package downloads on first use and is cached for offline searches. See [full-Bible dataset and evaluation](docs/full-bible-dataset.md) for commands, sizes, and known matching limitations; YouVersion comparison is deferred.
