# Ebenezer: user journeys and expected behavior

Status: agreed target flows for the rebuild. Stages 1–8 now implement English/Spanish switching, local profile preferences, the five-moment reflection journey with draft recovery, and saving/viewing local stones. The journey automatically retrieves from the 50 verified WEB passages with context, using the check-in and selected feelings; a bundled KJV care passage remains available when search cannot run. My Story now supports text search, tone/date filters, full details, editing, confirmed deletion, and JSON export/import. Authentication, extended archive/song views, community interactions and migration remain planned; the flows below describe the complete target.

To try the implemented journey, open Today → reflection, complete each step, then save to My Story. Leaving and returning restores the saved draft and step. In Settings, save your name and city locally. Switch language while typing to confirm input remains unchanged. In a production build, wait for the offline-ready message on the first online visit, then reopen routes without internet. Installation uses a supported browser prompt/menu or Safari’s Add to Home Screen. Updates wait for explicit reload; drafts flush first and dirty editors must be saved or cancelled. No cloud upload or partner notification occurs.
Last updated: October 5, 2026.

Read [Architecture](./architecture.md) for technology, storage, privacy, and implementation details.

## 1. Product in simple words

Ebenezer helps you read Scripture, reflect on your day, save a memory of God's help as a **stone**, and return to those memories later. You can journal privately, optionally back up your journal to an account, and deliberately share selected encouragement with a group.

Use the website on a laptop or phone. Installation is optional. A first successful online visit downloads the app; the local journal then works offline. Account and community actions need connectivity to complete.

## 2. First visit and onboarding

Current local implementation:

1. Open the application while online for initial setup. A new user sees a dedicated welcome before the dashboard; returning users enter Today directly.
2. Read the welcome: Scripture for encouragement, space for feelings, and memories of hope.
3. Choose the application language using the shared language selector.
4. Choose **Let’s get started** to open the short profile step, or **Explore first** to enter Today without details. The profile step offers **Enter my space** and **Skip for now**. No account is required.
5. Saving personalizes Today with the saved name and a greeting based on the device's local time: morning from 05:00 to noon, afternoon from noon to 17:00, and evening otherwise. The greeting refreshes every minute and when returning to the app; it works offline and translates with the interface. Skipping is remembered locally and shows the greeting without a name; Settings can add or edit the profile later. `/welcome` previews the entry flow without deleting journal data.
6. Begin a reflection and save a stone. After the production app reports offline readiness, journaling works offline.

Planned later: explicit timezone preferences, optional account/sync selection, cloud-mode backup implications and signup recovery. These controls do not exist yet. Do not infer timezone solely from city or language; the current local journal uses the device date/timezone.

See [Development progress](./development-progress.md) for remaining student-journey features. Any example content must be visibly labelled; it must not count toward personal progress or imply real community activity.

## 3. Main reflection: create a stone

Implemented interface: a winding five-stone path, with the current moment in gold and preceding moments softly filled. Stones use colour and shape without tick marks or a white active dot. Choose one or more of eleven feeling stones, or write a check-in without choosing a label. The always-open HeartSpace invites “Bring it all to the Lord.” Joy, gratitude, worries and uncertainty are welcome. Optional sentence starters append to existing words; writing grows with the text and stays optional when a feeling is chosen. Continue to a single reading moment, where a passage appears automatically from semantic retrieval. Explore another result or the full chapter in the same place, then continue directly to reflection without a reading checkbox or a second copy of the passage, write at least one reflection, optionally record someone to ask for prayer, then preview and set the stone. All five reflection invitations stay open, with quiet conversational prompts and growing writing spaces. A single thought or prayer is enough; the optional partner entry expands on demand. Retrieved chapters open in a shared in-app dialog and are saved for offline reading. The bundled KJV fallback still links to an online chapter. Retrieval uses embeddings rather than an LLM; audio/songs and sending messages remain unimplemented. Drafts retain all feelings, check-in text and step across Back, reopening and English/Spanish switching. The final tone is always the user's choice. The broader target flow follows:

1. On Today, choose Find a Word or Set a Stone.
2. **Feel:** choose an emotion, select what happened, or search.
3. **Read:** a passage appears from what the person shared. Read its excerpt and context, explore another passage or open the full chapter here, then continue straight into reflection. Use downloaded/bundled chapter content offline; external chapter links need internet. No checkbox or reading-completion claim is made.
4. **Reflect:** answer one or more questions: what stood out, what you learned, questions, thoughts, and prayer request.
5. **Together:** optionally prepare a message, choose a group, or select fields to share. Skipping social actions is allowed.
6. **Stone:** write a short memory of where God met you and select Bright, Mixed, or Hard.
7. Save the stone with its Scripture reference. A passage, memory, tone, and at least one reflection answer are required for this guided flow.
8. After the local database confirms saving, show **Saved on this device** and open My Story.
9. If private cloud sync is enabled, show pending state and then **Synced** after acknowledgement.

Autosave the draft as the user writes. Going Back retains answers. A refresh or restart offers to resume. Report storage failures clearly; do not claim a successful save. Do not silently discard an unfinished draft when beginning another reflection.

## 4. Offline journal

Prerequisite: the application and required content were downloaded successfully.

1. Turn off connectivity or open during a network outage.
2. See an offline indicator without a blocking error page.
3. Read downloaded Scripture and open My Story.
4. Create, edit, or delete personal stones; resume drafts.
5. Close and reopen; persisted records remain available.
6. When connected, synchronize eligible pending changes with valid authentication.

Local-only records never upload automatically. Previously downloaded community content can be read with a cached/stale label. New community content, first login, and external services are unavailable offline. Comments/sharing may be queued only if the relevant feature supports it; queueing does not mean delivery.

## 5. My Story, editing, and deletion

1. Open My Story. The default **Tower** displays real saved stones, oldest at the bottom. Gold/bright stones lean right, navy/hard stones lean left, and teal/mixed stones sit in the centre. No sample stones are added to the person's journal.
2. Click or focus a stone and press Enter/Space to open its memory, reflection, prayer notes and reference. Retrieved WEB stones retain their exact excerpt and chapter, both readable offline. Older KJV stones have their bundled excerpts and online chapter links. Imported references without a snapshot or known excerpt display the reference without inventing Scripture.
3. **I need to remember** opens the latest dated stone in the current filtered view. Matching memories to the person's current feelings is later work.
4. Switch to **Journal** for the existing card list. Book, Look Back and Songs are planned views.
5. Expand **Search, filters & backups** for search, tone/date filters and backup controls. Filters apply to both views.
6. Edit through the common form and save locally. To delete, confirm the action. Cloud synchronization is not enabled yet.

Deletion and unsharing are different. If the stone has a published copy, clearly offer whether to remove that copy too; do not assume deleting a private record removes all published content. Show pending cloud removal until the server confirms. Define removal of group-chat copies before enabling stone sharing in chat.

Backups are available in My Story. Export downloads all local stones, regardless of current filters. Import accepts the version 1 Ebenezer format (up to 10 MB/10,000 stones), validates every entry, and adds new IDs atomically. Existing IDs are skipped; later edits are preserved. Backups do not include unfinished drafts, preferences, or other accounts, and imported stones stay local. Store the file privately.

## 6. Look-back and songs

1. Choose a week, month, quarter, year, or all-time period.
2. Review stone counts, tone distribution, Scripture references, and prayer partners.
3. Star meaningful entries for that period.
4. Optionally select them for publication using the sharing preview.

These summaries use local journal data and work offline. Song titles can be available locally, but YouTube playback/search requires internet. Build additional archive views after the core journal is reliable.

## 7. Morning routine

1. Start the routine on Today.
2. Read a suggested passage and context.
3. Follow a short optional breathing exercise with reduced-motion support.
4. Choose an intention: read, pray, share, or set a stone.
5. Save routine completion locally and continue into a reflection when ready.

Suggestions are curated rules based on context, not an AI diagnosis. Live weather and local calendars are not assumed. In-app reminders appear when the app is used; push reminders require a separately implemented opt-in feature.

## 8. I need to remember

1. Select a feeling.
2. Revisit a relevant previous personal stone.
3. If no matching stone exists, offer another recent personal stone.
4. If no personal history exists, offer a curated passage and invite a reflection.

Use locally available content offline. Support links must be reviewed before launch and appropriate to the selected location; do not present the app as medical care. External helpline sites and communication actions depend on device/network capabilities.

## 9. Create an account and enable private sync

1. While online, choose Create account or Sign in.
2. Complete authentication and any required verification.
3. Explain that private cloud backup stores records on the server but does not publish them to other users.
4. Ask whether to upload existing local journal records; allow the user to keep them local.
5. Upload only approved records and show progress/errors.
6. Mark individual records Synced only after acceptance.

Signing in is not consent to upload every existing record. If authentication expires, keep local edits and ask for sign-in when syncing; no loss of drafts or forced deletion. Turning off future sync does not automatically delete existing cloud copies. Provide a separate clear action for cloud-data removal.

## 10. Use another device and resolve conflicts

1. Open the app online on the second device and sign into the same account.
2. Download authorized synced records into its local database.
3. Read and edit them, including offline after download.
4. Reconnect and synchronize.
5. If both devices edited the same revision, show both versions and let the user choose or combine them.

Local-only records are available on another device only through deliberate export/import or opt-in upload. Chrome and Safari do not share IndexedDB automatically. Pending data remains scoped to its account; switching accounts must never expose or upload another account's records.

## 11. Community sharing

The proposed implementation checklist and ER model are in [Together community plan](./together-community-plan.md). Together will have Feed, My People and Groups. Its first release uses accepted app-user connections and private invite-only groups; the journal journey prepares an optional audience, saves the stone locally and then offers a deliberate publishing preview.

1. Sign in online.
2. Browse and join an available group according to its membership policy.
3. Wait for server confirmation before treating membership as granted.
4. Choose a stone or compose an approved post.
5. Preview the exact content, author identity, and group audience.
6. Confirm publishing. Private reflection fields are excluded unless explicitly selected.
7. Show **Waiting to publish** until the server accepts; then **Published**.
8. Read comments and prayer reactions from authorized members.

Sharing from a local-only journal is a separate explicit transmission of the selected content, not enrollment of the whole journal in sync. If permissions change before a queued action is sent, show rejection and retain the user's local text for recovery. The first hackathon version needs one real group, posts, comments, and reactions; full chat can follow.

## 12. Comments, prayer reactions, and unsharing

1. Open a published post in a group you belong to.
2. Add a comment through the compact FormBuilder or toggle a prayer reaction.
3. If offline queueing is supported, distinguish pending from accepted activity.
4. Authors can edit/delete their own comments; moderators act according to explicit permissions.
5. The post author can request removal of their published post.
6. Confirm remote removal before saying it has been removed for others.

Retries do not duplicate comments or reactions. Removing a post should make associated comments/reactions inaccessible according to the database policy. Previously downloaded offline copies cannot be remotely erased until the receiving app reconnects.

## 13. Ask someone to pray

1. Choose a saved contact or care partner.
2. Prepare a prayer-request message from selected content.
3. Open the phone's messaging application, where supported.
4. Choose the actual recipient and send there.
5. Return to Ebenezer; optionally mark that you asked them.

Opening a composer is not proof of sending. Contact names alone are not phone numbers. Provide a copy-message fallback for desktop or unsupported devices. Preparing an external message should clearly state that selected content leaves the app when the user sends it.

## 14. Weekly reflection and group chat: extensions

Weekly reflection: choose a stone, write thanks/prayer request/what stood out, save privately, then separately choose whether to publish. Use the shared FormBuilder and draft persistence.

Group chat: members can read cached messages, compose pending messages, and send when online. Real room permissions, bounded history, and pending/accepted status are required. Do not present scripted prototype replies as real people. Meeting links must refer to actual configured meetings, not the Google Meet homepage.

Implement these after the hackathon's core offline/sync demonstration if time permits. Automated care-partner check-ins and scheduled push are deferred.

## 15. Settings, backup, and device cleanup

1. Change language or light/dark theme; bundled languages work offline.
2. Review local-only versus synced records and pending changes.
3. Export a journal file. Explain that the export contains personal information.
4. Import a file with schema validation, a preview, and duplicate handling.
5. Manage future synchronization separately from existing cloud deletion.
6. On sign-out or device-data removal, explain pending changes and offer sync/export before destructive clearing.

Browser data can be cleared or evicted, and private/incognito sessions may not preserve it. Local storage is not a guaranteed backup. Account deletion, cloud copy deletion, local deletion, and group-post removal must have distinct, explicit scopes.

## 16. Failure states that must be understandable

| Situation                         | User experience                                                      |
| --------------------------------- | -------------------------------------------------------------------- |
| No internet                       | Journal stays usable; online actions show pending/unavailable        |
| Backend waking or temporary error | Preserve local work and retry with clear status                      |
| Browser storage unavailable/full  | Explain save failure; preserve form text and offer recovery          |
| Expired login                     | Keep local edits and request sign-in for sync                        |
| Conflicting edits                 | Show both versions, never silently discard reflection text           |
| Lost membership                   | Reject new server actions and remove cached group data when detected |
| Failed unsharing                  | Say removal is pending/failed, not completed                         |
| Missing translation               | Fall back to English without breaking the screen                     |
| External messaging unsupported    | Offer copy text instead                                              |

## 17. Hackathon demonstration and acceptance criteria

Recommended demonstration:

1. Open on a phone and switch language.
2. Complete a reflection in airplane mode.
3. Save a stone and show Saved on this device.
4. Close/reopen or refresh and find it in My Story.
5. Reconnect and show Synced after server acknowledgement.
6. Sign into a second device and retrieve the stone.
7. Preview and publish approved fields to the demo group.
8. Show a comment or prayer reaction from another member.

Also verify draft recovery, duplicate-safe retry, private-field isolation, account switching, deletion propagation, export/import, accessible forms, and responsive desktop/mobile navigation. The complete critical journey is **open → choose language/privacy → reflect → save → revisit**, with cloud and community as explicit extensions.
