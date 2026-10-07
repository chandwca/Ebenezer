# Word card: Scripture beyond the app

Challenge 2, **Activation lane**. Last updated October 7, 2026.

## The five judge questions

1. **Who:** international students who are new to Christian faith, reached through someone they already trust (a campus ministry leader, a host family, a friend). The audience is a hypothesis until the validation log below has real entries.
2. **Barrier:** a Bible app is not where a student far from home is when a hard moment arrives. Their group chat is. A link in that chat is the smallest possible step.
3. **Why Scripture is essential:** the card _is_ the passage. Remove Scripture and there is nothing to open, answer or keep.
4. **Validation:** see [validation-log.md](./validation-log.md). It is empty until real conversations happen.
5. **Reach:** every student who opens a card can send one. A ministry can post a card to a whole group chat with no install, account or integration.

## The encounter

1. A sender opens **Send**, picks a moment (new here, far from home, feeling alone, overwhelmed, alone on a break, a hard day, curious about Jesus), optionally adds their first name, and shares the link.
2. The student taps the link in their chat. The preview shows the verse and who sent it. The page opens with no account, onboarding or navigation.
3. **Response:** one tap (_This helped / I'm struggling / Tell me more_), an optional line, then a reply sent from the student's own messaging app.
4. **Continuation:** keep the Word (shown on Today), read the full chapter on YouVersion, or send a card to someone else. A person, not an app, is the next step: the reply goes to whoever sent the Word.

## Beyond a single card

- **Five-day packs** (`/p/arrival`, `/p/hard`). One link, one new Word each day, opened by the student's own device clock from a start date in the link. Finite on purpose: no streaks, no push, nothing stored. This is the Continuation requirement as an ongoing practice without optimizing for retention. A pack is just an ordered list of moments in `apps/web/src/lib/word-pack.ts`, so another community can add its own (grief, caregiving, recovery) with one entry and its copy. That is the reusable approach.
- **Listen.** The card reads the verse aloud with the device's built-in voice. It helps second-language readers and screen-free use. Nothing is sent anywhere. Voice quality depends on the device.
- **QR code** on Send for a card or a pack. A ministry can print it for an orientation table or flyer, which is a distribution path that needs no integration. The code encodes the deployed site address, so it only scans from a phone once the app is deployed.
- **Link previews** for both cards and packs via the Pages Functions in `apps/web/functions/`.

## Design decisions

- **Stateless links.** `/w/:moment?from=Name`. The link holds a moment and a first name. Scripture text is resolved by the API through YouVersion (BSB), with an attributed WEB fallback. Nothing about the student is stored or transmitted: no account, no analytics on the card, no server-side reply. This follows the guardrail against data capture and against requiring sensitive information.
- **Reviewed passages only.** `apps/web/src/lib/word-card.ts` holds one passage per moment. They are a starting selection, not yet reviewed by a ministry or language expert. Review them during validation and record changes in the log.
- **No AI in the encounter.** Scripture is never generated or paraphrased. The earlier AI journal reflection is now opt-in per request, with a disclosure of what is sent.
- **Language.** The interface is English and Spanish. Scripture is English (BSB) and labelled as such. Showing Scripture in the student's own language is the most valuable next step; confirm which YouVersion versions the App Key may display and store before adding any (`apps/api/src/shared/bible/youversion.ts` is currently locked to the public-domain BSB on purpose).
- **Link previews.** `apps/web/functions/w/[moment].ts` is a Cloudflare Pages Function that injects Open Graph tags so the verse appears in the chat before the link is opened. Set `API_URL` (the deployed API origin) in the Pages project environment. Without it the preview shows the moment name instead of the verse. Chat apps do not run JavaScript, so the SPA alone cannot do this.

## What changed in the app

Three tabs (Today, Send, My stones), settings in the header. Today is the day's Word plus two actions. The welcome is one screen. Community feed and groups moved to Settings → Prayer circle and are not part of the pitch.

## Before the demo

- [ ] Set `YOUVERSION_APP_KEY` on the API and confirm `/v1/scripture` returns `provider: "youversion"` ([setup](./youversion-setup.md)).
- [ ] Deploy web and API over HTTPS; set `API_URL` on the Pages project.
- [ ] Paste a card link and a pack link into WhatsApp, iMessage and one other chat app and confirm the preview.
- [ ] Print a QR code and scan it from a phone against the deployed site.
- [ ] Check Listen on an iPhone and an Android phone; voices differ.
- [ ] Open a card on a physical iPhone and Android phone on cellular data.
- [ ] Have a ministry or language reviewer approve or change each passage.
- [ ] Fill in the validation log with real conversations.

## Known limits

- Reply and link-preview behavior depends on the student's device and chat app; opening a composer proves nothing was sent.
- Evening passage suggestions (inside the journal flow) still send feelings and the check-in to the AI provider, after the student taps _Find a Word for my day_.
- Web tests need Node 22 LTS. On newer Node versions run them with `NODE_OPTIONS=--no-experimental-webstorage`.
