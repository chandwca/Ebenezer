# Supabase setup: first milestone

Updated October 6, 2026. The hosted Ebenezer project has been created in West US (Oregon), and its URL and publishable key are saved in the local web/API `.env` files. The profile migration, owner-only RLS, generated types, shared contracts, Node token verification and layered profile endpoints are implemented and tested against local Supabase. The CLI is authenticated and this workspace is linked to the personal Ebenezer project (`bbneqmpmobwllfzgkixh`). The profile migration was deployed after a dry run listed only that migration; a subsequent dry run confirmed the remote database is up to date. React sign-in and explicit account-profile setup are implemented. Hosted development callback settings are deployed; Google provider credentials and hosted end-to-end account testing remain pending. See [Google sign-in setup](./google-sign-in-setup.md).

Start with a development project and one authenticated profile feature. The people workflow is deferred. Groups and sharing follow after the foundation works.

The [decided community data model](./community-data-model.md) places application tables in `ebenezer_api` and internal records/helpers in `ebenezer_private`. Both schemas are deployed. The existing profile table has moved to `ebenezer_api.profiles`, preserving its data, constraints and permissions; its timestamp helper lives in `ebenezer_private`. Node clients and generated types use the new schema. The hosted Data API exposes only `ebenezer_api`.

In the hosted project's Table Editor, switch the schema selector from `public` to `ebenezer_api` to see `profiles`. The private schema currently contains a function, not a table. Friends, groups and shared posts are designed but have not been created yet.

## 1. Create the hosted project

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and sign in.
2. Create or select a personal organization on the Free plan.
3. Select **New project** and name it `ebenezer-dev`.
4. Generate a strong database password and save it in your password manager. It is not an application user's password; do not put it in chat, Git or frontend configuration.
5. Choose a region near the primary demo audience. Choose based on where students will use the app, rather than their home country.
6. Create the project and wait until provisioning completes.

Creating the project also creates its PostgreSQL database. You do not need to run `CREATE DATABASE`. The Dashboard's Table Editor will show application tables once we apply our schema. See [Database overview](https://supabase.com/docs/guides/database/overview).

## 2. Save application configuration locally

Open the project's **Connect** dialog for the project URL and publishable key. **Settings → API Keys** also lists the keys. Choose the publishable key (`sb_publishable_...`); our normal API requests will combine it with the signed-in user's access token. See [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys).

If a local `.env` file does not exist, create it using the example in the same application directory. If it exists, add the missing variables without replacing the existing settings.

`apps/api/.env`:

```dotenv
PORT=3001
HOST=0.0.0.0
WEB_ORIGIN=http://localhost:5173
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

`apps/web/.env`:

```dotenv
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Replace the uppercase placeholders locally. The URL and publishable key are browser-safe configuration; authorization comes from authentication and Row Level Security. Database passwords and secret/service-role keys must never enter the browser bundle. We do not need an administrative key for this first feature.

The repository already ignores `.env` and `.env.*`, except `.env.example`. Node consumes this configuration for `/v1/me`; React uses this configuration for Supabase Auth; the profile form calls Node using the current session token. Configuration alone does not deploy the database schema.

## 3. Create tables through migrations

Supabase CLI `2.120.0` is pinned as a root development dependency. Local configuration lives in `supabase/config.toml`. Two migrations have been applied locally and to the hosted personal Ebenezer project:

- `20261006173603_create_profiles.sql` originally creates the profile table and permissions.
- `20261006185220_organize_ebenezer_schemas.sql` moves the existing table and helper into their application schemas, preserves existing records, tightens guest-account access, and restricts default grants for future objects. Future functions need explicit execution grants; the original migration remains unchanged.

The table references Supabase's managed `auth.users` table and stores account ID, display name, unique lowercase handle and server timestamps. Passwords remain with Supabase Auth. Profile visibility starts with owner-only access; discovery permissions can be added when the people workflow is decided. Creating a profile is explicit; signing in alone does not copy local journal/profile data into the cloud.

The migration enables RLS and owner-only select/insert/update policies. Column grants prevent direct API clients from setting account IDs on updates or supplying timestamps. A trigger maintains `updated_at`. Anonymous users have no table access; deletion is not enabled for this feature. Schema, constraints and permissions live in the same migration. See [Database migrations](https://supabase.com/docs/guides/deployment/database-migrations).

To reproduce and test locally, start Docker and run these commands from the repository root:

```sh
pnpm db:start
pnpm db:migrate
pnpm db:types
pnpm db:test
pnpm --filter @ebenezer/api test
pnpm --filter @ebenezer/api test:integration
```

Integration tests obtain local credentials from CLI status, require a localhost URL, create two temporary local accounts without sending email, and remove them afterward. They never use the hosted `.env` values or print credentials. Normal Node requests use only a publishable key and the caller's verified JWT.

If optional local dashboard or logging containers fail their health checks, the database, Auth and REST services needed by these tests can run with:

```sh
pnpm exec supabase start -x studio,vector,logflare,imgproxy,storage-api,edge-runtime,realtime,supavisor
```

This smaller local stack does not provide local Studio, Storage or Realtime. The hosted dashboard is unaffected.

To deploy the tested migration to the user's hosted project, complete CLI sign-in in your own terminal, then link and push:

```sh
pnpm exec supabase login
pnpm exec supabase link --project-ref bbneqmpmobwllfzgkixh
pnpm exec supabase db push --dry-run
pnpm exec supabase db push
```

The dry run lists migrations that have not yet been deployed; for the current hosted project it confirms the database is up to date. If the CLI asks for credentials, enter them only in your terminal. This step needs project-management access; a publishable key cannot create tables. Hosted schema changes belong in migrations rather than ad hoc Table Editor changes.

Data API exposure is configured separately from SQL migrations. The partial hosted configuration declares only the exposed schema and search path:

```sh
pnpm exec supabase config diff --workdir supabase/hosted-api --project-ref bbneqmpmobwllfzgkixh
pnpm exec supabase config push --workdir supabase/hosted-api --project-ref bbneqmpmobwllfzgkixh
```

These settings have already been deployed: exposed schemas are `ebenezer_api`, and the extra search path is `extensions`. Undeclared hosted settings, including Auth settings, are unchanged. Do not push the full local development configuration to configure the hosted API. Local callback URLs in `config.toml` do not automatically configure hosted OAuth. The React callback screen is implemented, and the separate partial configuration in `supabase/hosted-auth/supabase/config.toml` has deployed development site/return URLs. Google provider credentials remain a separate Dashboard setup.

## 4. Maintain the Node layers

Implemented files:

```text
apps/api/src/
  config/env.ts
  database/database.types.ts
  shared/
    errors/api-error.ts, database-error.ts
    http/auth.ts, no-store.ts
    supabase/auth-gateway.ts, client-types.ts, node-websocket.ts
  modules/
    index.ts                      # registers modules under /v1
    profiles/
      index.ts                    # public surface for other modules
      profiles.routes.ts
      profiles.controller.ts
      profiles.service.ts
      profiles.repository.ts
      profiles.types.ts
      profiles.repository.fake.ts # in-memory, tests only
      profiles.routes.test.ts
      profiles.service.test.ts
apps/api/test/
  helpers/                        # createTestApp, fake sign-in
  integration/profiles.integration.test.ts

packages/contracts/src/
  profiles.ts

supabase/
  config.toml
  migrations/20261006173603_create_profiles.sql
  migrations/20261006185220_organize_ebenezer_schemas.sql
  hosted-api/supabase/config.toml
  tests/database/profiles.test.sql
  tests/database/schema-move.test.sql

scripts/
  generate-database-types.mjs
  test-database.mjs
```

The request flow is:

```text
API caller → route + authentication → controller → service → repository → PostgreSQL + RLS
```

| Layer                   | Responsibility                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Routes                  | Register URLs and attach the authentication hook.                                           |
| Authentication          | Verify the access token and establish the actor and user-scoped database client.            |
| Controller              | Validate request data with shared contracts, call the service and return the HTTP response. |
| Service                 | Apply application rules, such as updating only the signed-in person's profile.              |
| Repository / data layer | Execute typed Supabase queries or database functions and map results.                       |
| PostgreSQL              | Persist rows and enforce foreign keys, uniqueness, constraints and RLS.                     |

Controllers do not issue database queries. Services do not depend on Fastify request/reply objects. Repositories do not render UI or decide HTTP status codes. Clients are scoped to the verified user's JWT; normal requests must not bypass RLS with an administrative key.

React continues to use common UI components. Feature hooks own API calls and state; shared components remain presentational.

The shared authentication hook verifies the token with `auth.getUser(token)` and provides a request-scoped database client configured for `ebenezer_api`. Its schema constant and client type live in `client-types.ts`. It has no dependency on the profiles module, so groups and posts can reuse it later. HTTP responses omit raw database/auth errors, authenticated responses use `Cache-Control: no-store`, and logs redact authorization/cookie headers.

### Profile API behavior

- `GET /v1/me`: returns `{ profile: { id, displayName, handle, createdAt, updatedAt } }`. Returns `404` until the person creates a profile.
- `PATCH /v1/me`: first request requires `displayName` and `handle`; later requests may change either. Handles are normalized to lowercase; omitted fields are preserved.
- Both require `Authorization: Bearer <Supabase access token>`. Tokens are verified, not merely decoded; anonymous Auth accounts are also rejected.
- Fields such as account ID and timestamps, unknown fields, empty updates and oversized input are rejected. Unique-handle conflicts return `409`; unavailable account services return `503`.
- The Node service derives the owner from authentication. Database RLS protects direct Supabase requests independently.

Example PATCH JSON:

```json
{ "displayName": "Chetna", "handle": "chetna" }
```

This example is not an automatic profile upload. The existing device-only name/city form, private stones and drafts are unchanged. Settings and Together now offer Google sign-in and explicit profile creation/update through Node. Google provider setup is still required before the hosted flow can be used.

## 5. How models are created

There are three related representations, each with one purpose:

1. **SQL migrations** define actual database tables, relationships, constraints and permissions. This is the database schema's source of truth.
2. **Generated TypeScript database types** describe row, insert and update shapes for the repository. Regenerate them after schema changes; do not maintain duplicate handwritten database models. See [Generating TypeScript types](https://supabase.com/docs/guides/api/rest/generating-types).
3. **Shared Zod contracts** validate API inputs and responses at runtime. API contracts deliberately allow only supported fields; they are not unrestricted database rows.

A TypeScript interface does not create a table or validate incoming JSON. Repositories use `@supabase/supabase-js`; an additional ORM is not required. A WebSocket transport is supplied for the existing Node 20 development runtime, because the SDK initializes realtime internally even for Auth/REST. Node 22+ remains the project's recommended runtime; no realtime subscription is started by this feature.

## Foundation checklist

- [x] Review current API and storage boundaries.
- [x] Prepare configuration placeholders and this setup guide.
- [x] Define the controller/service/repository responsibilities.
- [x] Create the hosted development project and add local configuration.
- [x] Initialize Supabase CLI and a reproducible local database.
- [x] Create and locally apply the profile migration, constraints and owner-only RLS policies.
- [x] Deploy the tested profile migration to the hosted project after CLI sign-in; confirm no pending migrations remain.
- [x] Deploy the schema move, update Node clients and generated types, and expose only `ebenezer_api` through the hosted Data API.
- [x] Implement the React authentication lifecycle and configure hosted development callback URLs.
- [ ] Enable the Google provider and verify real hosted sign-in with two accounts.
- [x] Generate database types and add shared profile contracts.
- [x] Implement authenticated `GET /v1/me` and `PATCH /v1/me` through all Node layers.
- [x] Verify locally that two accounts cannot read or update each other's private profile; verify unauthenticated requests are rejected, including direct database API calls. Fourteen API tests, thirty-four database assertions (nineteen permissions and fifteen migration-preservation assertions), and the real two-account integration test pass.
- [x] Verify the hosted API denies unsigned-in profile access and does not expose `public` or `ebenezer_private`. Hosted signed-in end-to-end testing remains pending.

The first milestone is complete when a signed-in user can read and update their own profile through Node, permissions are tested, and the schema can be reproduced from migrations. Creating the hosted project alone does not complete this milestone.
