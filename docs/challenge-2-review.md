# Challenge 2 review: Scripture Beyond the App

Reviewed October 7, 2026 against the challenge text supplied by the user.

Implementation follow-up: the audience is now international students new to Christian faith who want to understand Jesus’ love. YouVersion BSB integration has been added to the main Scripture flows; see [setup and live verification](youversion-setup.md). The original assessment below records the pre-integration findings. Platform credentials and live verification are still needed, and community validation remains outstanding.

> Update October 7, 2026: the Word card ([word-card.md](./word-card.md)) now implements recommendations 2 and 3 and part of 1 and 6. Validation (4) and Scripture review (5) remain open.

## Assessment

Ebenezer partly meets the challenge. Scripture, response, and continuation are strong foundations. The main gaps are a demonstrated encounter in an existing digital environment, YouVersion as the core Scripture layer, evidence of real community validation, and accurate privacy controls for newer AI features.

Activation is the better fit for the current product: international students away from home, experiencing homesickness, isolation, and study pressure. Offline support strengthens this lane but does not by itself establish an Access-lane solution. Choosing Access would require evidence of a specific distribution/connectivity/language barrier and testing under that community's actual conditions.

This is a repository review of the current frontend, backend, contracts, Scripture pipeline, persistence, service worker, reminder functions, migrations, tests, and documentation. It does not establish live deployment, device readiness, or real-user validation. Legacy code is historical context, not the current deliverable.

## Requirements and evidence

| Requirement | Current evidence | Assessment / change |
| --- | --- | --- |
| Choose one lane | Student audience and offline PWA, but no explicit challenge submission lane found | State Activation explicitly and explain one concrete student moment |
| Need | `docs/architecture.md` and `docs/development-progress.md` identify international students | Narrow to an actual reachable community; substantiate why current Bible apps do not naturally reach them |
| Encounter | Feel → Read → Reflect journey, morning Word, evening passage suggestions | Strong inside Ebenezer; deliver a complete Scripture encounter through an existing messaging or partner surface |
| Response | Reflection, prayer, saved stones, community comments, guest prayer responses | Strong implementation foundation; extend the response to the external entry surface |
| Continuation | My Story, saved chapters, morning/evening rhythm, reminders, trusted contacts | Show a specific next-day or trusted-person path from the external encounter |
| Validation | Automated tests and technical search evaluation | No interview/pilot evidence found; collect who, findings, wrong assumptions, and resulting product changes during the build period |
| Core Scripture layer | Exact WEB dataset and bundled KJV; YouVersion deferred in documentation | Integrate YouVersion into the principal demonstrated Scripture path; confirm platform permissions before promising offline distribution |
| Gloo | Gemini adapter; Gloo deferred | Optional under the supplied challenge, not a blocker |
| Language | English/Spanish UI; English Scripture | Do not claim Spanish Scripture support; obtain permitted translations and community language review |
| Safety / privacy | Optional accounts, local journal, explicit sharing, discreet reminders, audience permissions | New AI flows transmit personal words automatically; disclosures and consent need correction |

## Priority changes

### 1. Establish YouVersion as the core Scripture layer

Create one Scripture provider interface supplying reference, exact text, translation, attribution, and chapter access. Implement the YouVersion provider for the main encounter. Keep existing verified data only as a clearly described fallback where rights permit. Review platform attribution, caching, redistribution, and translation requirements. A link to YouVersion alone is insufficient to demonstrate it as the core layer.

Evidence: `apps/api/src/shared/bible/morning-bible.ts` reads the locally prepared WEB dataset; `apps/web/src/lib/bible/search.worker.ts` retrieves local indexes. `docs/development-progress.md` defers YouVersion.

### 2. Complete the encounter outside the app

Use a surface students actually use, selected through validation. A small pilot could use an existing campus ministry WhatsApp group: an opt-in, reviewed passage with a short contextual invitation, a prayer/reflection response, and optional continuation in Ebenezer. A manual partner-led distribution pilot is sufficient to test this assumption before building a messaging bot.

Keep external sharing user-controlled. Include Scripture, translation attribution, a response invitation, and a next step in the message/link preview. Do not require installation or account creation for the initial encounter.

Evidence: `apps/web/src/lib/contact-messaging.ts` supports WhatsApp/SMS/email links. `apps/web/src/features/community/ask-to-pray.tsx` creates prayer posts containing the message but does not populate Scripture fields. `apps/web/src/components/ui/public-prayer-card.tsx` can display Scripture when provided. Current push messages in `supabase/functions/_shared/reminders.ts` are reminders routing into the app, rather than a full Scripture encounter.

### 3. Correct AI privacy and add consent before transmission

`use-evening-word.ts` sends feelings, check-in, and optional morning thought to `/v1/evening-word`. `journey-summary.tsx` automatically submits recent check-ins, thoughts, reflections/prayers, memories, dates, and feelings to `/v1/journey-summary` when My Story renders online; the backend forwards supplied stones to the configured AI provider. Clipping or omitting partner names does not anonymize free text.

Add explicit informed opt-in before sending personal content, with a preview of included fields and a device-only alternative. Make remembrance generation a deliberate action. Explain provider processing and relevant retention terms. Update English/Spanish privacy copy and README together: current copy saying journal words are never sent or only totals are sent conflicts with these flows. Test that declining consent produces no personal-content request.

### 4. Collect real validation and show a resulting change

Run a small, consent-based study with international students and a campus ministry/international-student representative during the 30-day build period. Ask where they already seek support, which moments need Scripture, language preferences, comfort with journaling/AI/sharing, and download constraints. Observe the external encounter through response and continuation. Do not collect unnecessary immigration, religious-risk, or private journal details.

Keep an anonymized evidence log: participant role, assumption, observed finding, what was wrong/incomplete, resulting change, and follow-up result. Track whether people understood the passage, found it relevant, could respond safely, and knew their next step. Synthetic query evaluation and unit tests cannot substitute for community validation.

### 5. Review Scripture relevance and attribution

Exact text verification is a strength, but a real verse can still be an inappropriate suggestion. Human-review representative homesickness, loneliness, academic pressure, grief, and ambiguous inputs. Preserve full-chapter access and distinguish generated explanations from Scripture. Use reviewed passages for the pilot; retain the full-Bible index as experimental until evaluated. Add a graceful unrelated-input response based on evaluation rather than an arbitrary similarity threshold.

Community post contracts currently accept independently supplied `scriptureReference` and `scriptureText` strings, and the post service forwards them. For product-provided quotations, resolve and verify text through the Scripture layer rather than trusting client text. Include translation attribution on external prayer cards.

Evidence: `docs/full-bible-dataset.md` records unsuitable matches for “I feel unloved” and unrelated queries, with unfilled human-review fields. `packages/contracts/src/community.ts` and `apps/api/src/modules/posts/posts.service.ts` do not verify quote/reference correspondence.

### 6. Make the first encounter lightweight

The local search model needs about 145 MB; the optional full-Bible package adds about 24.8 MB. Provide a reviewed passage immediately without that download, make search downloads optional with clear sizes, and demonstrate offline reading after setup. Test a real lower-end phone and constrained connection. English/Spanish interface translation is distinct from Scripture translation.

### 7. Establish a deployable pilot and update documentation

Deploy HTTPS frontend/backend, verify partner entry links, guest prayer responses, account isolation, revoked/expired links, reminders, and physical iPhone/Android behavior. Separate implemented code from deployed and verified behavior. Update README, architecture, user flows, and experience checklist: several sections still call auth, community, songs, or daily reminders future work although relevant implementations exist.

Select a willing distribution partner and describe how a small pilot could expand through that trusted surface. Avoid adding more social features, translation languages, or AI providers until the principal encounter is validated.

## Suggested demonstration

1. An international student receives a contextual, attributed Scripture invitation in an existing trusted messaging group.
2. They read and respond without installation or account creation.
3. They optionally continue into Ebenezer, read the chapter, pray or reflect, and save a private stone.
4. They return to the passage or a trusted person the next day.
5. Present an actual validation finding and the concrete change it caused.

## Verification limits

Automated frontend/backend checks are technical evidence only. No new hosted writes, deployment, real-user study, or physical-device test was performed for this review. Application code was not changed.
