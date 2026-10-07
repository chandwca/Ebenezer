# Ebenezer user experience and release checklist

Audit started October 6, 2026. Checked items describe verified behavior or completed fixes; unchecked items need implementation or verification. Local tests do not establish hosted or physical-device readiness.

## Current application

- [x] Type checking, lint, and production builds pass after corrections.
- [x] Complete frontend suite: 74 tests passed; latest community regressions also pass (9 targeted tests, including the additional draft-preservation test).
- [x] Run backend unit tests: 15 passed.
- [x] Run local database permission and migration tests: 72 assertions passed.
- [x] Two backend integration scenarios passed against real local Auth and PostgreSQL, covering multiple accounts and guest prayer responses.
- [x] Hide board/group controls until initial community loading and account checks finish.
- [x] Ignore asynchronous community state updates belonging to an earlier account.
- [x] Offer retry on a temporary prayer-link loading failure.
- [x] Keep unfinished community drafts mounted when filtering an empty board.
- [x] Clear community drafts/dialogs when switching accounts; do not relabel old account data while offline.
- [x] Provide Clear filters when journal searches hide all existing stones.
- [x] Remount guest prayer pages when their token changes.
- [x] Give unknown routes the not-found document title rather than Reflection.

## Walk the complete journey

The automated suites cover these behaviors locally. The following checklist is the remaining manual rehearsal, including deployed services and actual devices.

- [ ] First visit: explore without signing in; optional profile persists after reopening.
- [ ] Sign in: callback returns to intended route; profile creation errors preserve entered fields.
- [ ] Reflect: feelings or own words lead to verified Scripture; unavailable search has a usable fallback.
- [ ] Reflect: Back, reload, language change, and offline use preserve the draft.
- [ ] My Story: save, reopen, edit, search, export, import, and confirmed deletion work.
- [ ] Together: two accounts can connect, join a group, publish to the chosen audience, comment, and pray.
- [ ] Privacy: a nonrecipient cannot read a direct or private-group post.
- [ ] Prayer link: guest can read and answer; revoked/expired links are unavailable; temporary failures are retryable.
- [ ] Errors: unavailable backend, expired session, and offline status explain the next action without losing writing.
- [ ] Accessibility: keyboard-only use, dialog focus return, labels, contrast, zoom, and screen-reader announcements.
- [x] Emulated mobile journey: no horizontal overflow; sticky header and light/dark layouts checked.
- [ ] Physical mobile: keyboard does not hide primary controls; touch targets and navigation fit.

## Hosted readiness

- [x] Hosted dry run reports all migrations applied; no hosted database writes were performed during this audit.
- [x] Community migration is no longer pending in the linked hosted project.
- [ ] In Table Editor select `ebenezer_api`; confirm profiles and community tables.
- [ ] Confirm Data API exposes `ebenezer_api` and frontend/backend use the same project.
- [ ] Verify Google provider credentials and allowed callback URLs.
- [ ] Deploy HTTPS frontend/backend and configure CORS, API URL, and SPA deep-link fallback.
- [ ] Verify hosted flows with two demo accounts; unit tests use stand-ins and are insufficient for this check.

## Installation and hackathon

- [x] Production Chrome smoke test passed: offline deep routes, draft recovery, saved stone/Scripture, safe account shell, and explicit service-worker update. Desktop/mobile screenshots captured; journey layout fits the viewport in light/dark themes.
- [ ] Install from HTTPS on a physical iPhone and Android; verify icon, standalone launch, and offline reopening.
- [ ] Measure first load on a typical demo/mobile connection; optimize large initial bundles if needed.
- [ ] Generate a QR code only after the public URL is stable.
- [ ] Rehearse the full experience with demo data and a second account.

## Daily rhythm and notifications

Morning/evening encounters and scheduled Web Push are implemented locally. See [AI setup](./ai-setup.md), [notification setup](./notifications-setup.md), and the [notification submission checklist](./notification-submission-checklist.md) for deployment and device verification. AI availability depends on the deployed API configuration.

- [x] Morning passage, local carried thought, and evening continuation from a delivered notification.
- [x] Reminder times, displayed timezone, discreet defaults and explicit Scripture-preview consent.
- [ ] Verify Gloo inference entitlement; configure server-side credentials.
- [ ] Curated calendar and optional city weather; exact dataset Scripture and prepared fallback.
- [x] Web Push subscriptions, service-worker handling, scheduled worker, bounded delivery window and concurrent delivery claims.
- [ ] Authorized Realtime updates for prayer/community; catch-up fetch after reconnect.
- [ ] Sharing preview for prayer/testimony; no automatic publishing of private reflections.
- [ ] Protected presenter controls and physical-device reminder verification.

Hosted notification deployment, physical-device delivery and student validation remain unchecked. Installation alone does not enable reminders; each device must opt in.
