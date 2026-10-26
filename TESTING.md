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

User-confirmed live check (October 26, 2026):

Steve opened the app on his computer, added a test note, and then opened
it successfully on his phone. This confirms the live shared login and
cross-device data flow. The phone model and browser were not recorded.

Optional follow-up checks:

1. Save from the phone while the computer's board stays open, and confirm
   the note updates without reloading.
2. Try the remaining family members' phones when sharing the link.

The automated run did not test physical iPhone/Android devices or Safari;
the successful phone check above was performed by Steve.
