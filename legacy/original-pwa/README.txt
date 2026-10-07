EBENEZER - Progressive Web App (PWA)

What's in this folder
  index.html     the app
  manifest.json  lets phones install it like an app
  sw.js          makes it work offline after the first visit
  icon-*.png     app icons

How to put it online (free, about 2 minutes)
  Option A - Netlify Drop
    1. Go to https://app.netlify.com/drop and sign in (free).
    2. Drag this whole folder onto the page.
    3. You get a live https link. That is your Live URL.
  Option B - GitHub Pages
    1. Create a new public repository and upload these files.
    2. Settings > Pages > Deploy from branch > main > Save.
    3. Your link appears at the top of that page after a minute.

How to install it on a phone
  iPhone (Safari): open the link > Share > Add to Home Screen.
  Android (Chrome): open the link > menu > Install app (or Add to Home screen).

Notes
  - Stones, reminders and settings are saved on the phone and work offline.
  - The live community (shared stones, comments, prayers) runs inside the
    claude.ai version. In this hosted PWA, the community shows example posts.
