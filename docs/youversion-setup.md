# YouVersion Scripture integration

Ebenezer serves international students who are new to Christian faith and want to understand the love of Jesus. Homesickness, belonging, unfamiliar Bible vocabulary, and study pressure are hypotheses to validate with students, not established study findings.

## Enable the integration

1. Register Ebenezer at https://platform.youversion.com/ and obtain its App Key.
2. In the portal, confirm access to Berean Standard Bible (BSB), version **3034**, and review/accept applicable platform and Bible license requirements. This implementation deliberately supports this public-domain English edition only; do not substitute a copyrighted version ID without implementing its permissions.
3. Add `YOUVERSION_APP_KEY=<your key>` to **apps/api/.env**, which is ignored by Git. Keep it out of chat, source files, and frontend `VITE_` settings.
4. Restart the Node API. For deployment, set the same backend environment variable in the hosting service and restart/redeploy the API.
5. Open Today on a fresh day/browser, or request a passage using the reference-only endpoint below. Confirm **BSB**, **Scripture from YouVersion**, and the publisher attribution appear. Use the chapter action to verify the matching BSB reader. Previously saved WEB passages remain WEB rather than being silently relabelled.

```sh
curl --fail --silent --show-error http://localhost:3001/v1/scripture \
  -H 'Content-Type: application/json' \
  -d '{"book":"John","chapter":3,"firstVerse":16,"lastVerse":17}'
```

The response must contain `provider: "youversion"`, `translation: "BSB"`, the exact Scripture text, a complete numbered chapter, and attribution. A successful WEB response proves the fallback works, **not** that YouVersion access is working. Do not claim a live integration in the submission until this check succeeds with your key.

## What is connected

- Morning Word resolves the selected verse through YouVersion even with AI disabled.
- Evening AI chooses references; YouVersion supplies actual Scripture text, not AI-generated quotations.
- Guided device search keeps the user's query local and sends only book/chapter/verse numbers to `/v1/scripture` to resolve YouVersion text online.
- Passage text, provider, edition, attribution, and numbered chapters survive local draft/stone saves and backups. The selected public-domain edition supports this storage strategy; other editions need a separate licensing design.
- Attribution appears beside morning/evening passages, saved stones, and chapter reading. Chapter links use the matching BSB edition.
- No App Key is sent to the browser. Only Scripture identifiers are sent from the backend to YouVersion; no feelings, personal words, or local input keys are sent to YouVersion.

The experimental standalone Bible search retains its WEB dataset and is not the main YouVersion encounter. The legacy on-demand encouragement endpoint remains a prepared KJV feature. UI language switching does not translate English BSB Scripture.

## Fallback and performance

A missing key, denied license, timeout, unavailable metadata, or invalid response uses verified WEB text with its own edition/source. Offline saved chapters remain readable. Existing saved readings are preserved.

The REST chapter metadata contains verse identifiers rather than numbered text. The adapter resolves each verse through the Passages API in batches of six and caches up to 100 public-domain chapters in server memory, coalescing concurrent requests for the same chapter. Attribution is fetched anew for each encounter. A first chapter load makes multiple requests and has a 12-second time limit; test real latency/quota with the registered key before the demo. Production rate limiting also applies to public Scripture requests. No full-Bible download from YouVersion is performed.

Morning results remain stable in the current browser for the day. After enabling a key, an already saved daily passage may remain WEB until the next day; use the endpoint above or a fresh browser profile to verify immediately.

## Official references

- Authentication: https://developers.youversion.com/authentication
- Passage and chapter schemas: https://developers.youversion.com/api/bibles
- Attribution: https://developers.youversion.com/sdks/javascript/guides/copyright-and-attribution

This implementation can be tested with mocked API responses without a key. Live platform access and app approval cannot be established by those tests.
