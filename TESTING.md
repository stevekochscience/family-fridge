# Prototype verification

Tested October 26, 2026 using Firebase Authentication and Realtime Database
emulators, the real Firebase browser SDK, and automated Microsoft Edge.
Test credentials and messages were isolated from the live project.

Passed:

- Signed-out reads/writes and unrelated authenticated UIDs were denied.
- The configured shared UID could read and save notes.
- Unexpected panel names, extra/missing fields, non-string messages,
  messages over 280 characters, future timestamps, and panel deletion
  were denied. Empty messages were allowed.
- Simultaneous writes to different panels preserved both notes.
- Wrong passwords produced useful feedback.
- Two separate browser sessions signed in and received each other's
  saved messages automatically.
- HTML-looking message content appeared as literal text, without execution.
- Only the selected person's Edit button was visible.
- Sign-in, selected name, and messages survived reloads.
- At viewport widths 320, 390, 768, and 1280 pixels, the board retained
  two columns with no horizontal overflow and at least 44px-high buttons.
- A mobile screenshot at 390px was visually inspected.
- Going offline prevented a new save and preserved the typed draft.
- Signing out hid the board. No uncaught browser errors occurred.
- The live database returned HTTP 401 for an unauthenticated notes read.

The rule tests used the configured shared UID. The browser tests used a
temporary emulator account and substituted its UID in the emulator's
rules and browser configuration; production files were not changed.

Still to verify manually:

1. Sign in on the published site with the real family password. The code
   assumes the shared account email is `family@example.com`.
2. Choose Steve, save a note, and reload.
3. Open the link on a second phone/browser, choose a different person,
   and confirm changes appear on both devices.

Real iPhone/Android keyboards, Safari behavior, and the live shared
account's authenticated access have not been tested by the automated run.
