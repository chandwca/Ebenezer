# Notification encounter checklist

Implemented and locally tested:

- [x] Morning invitation: “Breathe in the Word”.
- [x] Evening invitation: “Bring your day to Jesus”, with prayer and stone action.
- [x] Complete short YouVersion BSB verse, reference and attribution in opted-in previews.
- [x] Discreet defaults and explicit permission to expose Scripture on the lock screen.
- [x] Tap opens the originally delivered passage rather than a newly selected passage.
- [x] Received passages remain available offline, subject to device storage retention.
- [x] Carry a morning thought into the evening reflection locally; preserve existing drafts.
- [x] Morning/evening times, displayed time zone, reminder off control and EN/ES wording.
- [x] Concurrent delivery claims, same-day suppression, bounded delivery window and safe fallback.
- [x] Automated frontend, API, Edge Function and database checks.

Required deployment and real-world verification:

- [ ] Deploy the API with `YOUVERSION_APP_KEY` configured in Render.
- [ ] Apply hosted database migration `20261007110000_notification_encounters.sql`.
- [ ] Set `SCRIPTURE_API_URL` and deploy both Edge Functions; keep existing VAPID keys.
- [ ] Deploy the frontend and verify the public URL uses the updated service worker.
- [ ] On iPhone Home Screen and Android Chrome, enable reminders and send a morning test.
- [ ] Confirm discreet wording first; consent to Scripture preview and check full attribution.
- [ ] Close the app, tap the notification, then repeat offline after receiving it online.
- [ ] Save a thought, send an evening test and verify the same passage and thought in reflection.
- [ ] Change times, test Spanish wording, deny browser permission and turn reminders off.
- [ ] Verify a scheduled reminder on each phone, including the chosen time zone. Test delivery
      timing can vary with push services, scheduler intervals and device settings.
- [ ] Ask real international students new to faith to try the encounter. Record consented,
      anonymized evidence of the unmet need and whether the experience helps; do not invent findings.

## Judge demonstration

1. Scan a QR linking to https://ebenezer-24p.pages.dev and install the PWA if using iPhone.
2. In Settings, enable reminders and show the privacy choice.
3. Use “Try a reminder now” for morning. Show Scripture arriving outside the app.
4. Tap it, read the attributed verse and save a short thought.
5. Send an evening test, reopen the encounter and continue to reflection to build a stone.
6. Show the saved stone and explain that AI supports reflection, while Bible text comes from
   YouVersion. Do not describe the fixed notification invitation as AI-generated.

## Student validation record

For each willing participant, record: anonymous participant label; new-to-faith/international
student context; current difficulty engaging with Scripture; notification/privacy preference;
whether they could read, understand and carry the verse into reflection; one suggested change.
Summarize actual observations and limitations in the submission. Do not collect personal
prayers or sensitive journal text as evaluation evidence.
