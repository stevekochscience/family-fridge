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

## Marshall addition

Verified with a simulated backend: Marshall appears in the name picker,
his note can be edited and saved, and selection and text survive reload.
At 320, 390, and 1280px, his full-width note sits below the human 2 x 2
grid without horizontal overflow. No uncaught browser errors occurred.
The expanded production database rule still needs publishing in Firebase.


## Emoji reactions

Reaction UI checks use an isolated simulated backend, not live family data.
The expanded rules require publication in Firebase Console. Their JSON
structure was reviewed; this change was not run through the Firebase
emulator because its launcher was previously blocked by application control.
Live authenticated reaction saves still require a family check after rules
are published.

Browser checks passed with the simulated backend: simultaneous reactions
from two viewers, name popup, changing/removing only one's own reaction,
reload persistence, Marshall attribution, reaction reset after note
replacement, offline controls, denied-write feedback, and missing-rule
feedback that leaves note editing usable. Layout checks passed at 320,
390, and 1280px; no uncaught browser errors occurred.

## Firebase CLI deployment — October 27, 2026

Firebase CLI 15.34.1 authenticated successfully and listed the expected
project and database instance. Published rules were backed up and matched
the repository, including reactions. A rules-only deployment explicitly
targeting family-fridge-db4c3 passed Firebase's syntax check and completed
successfully. Stored messages and reactions were not modified. This proves
deployment access and rule publication; it is not an authenticated browser
reaction-save test.

## Permanent history — October 27, 2026

Passed with real Firebase Auth/Database emulators and the browser SDK:
- Migration preserves current text, timestamps and matching reactions;
  refuses to replace existing history and leaves its input unchanged.
- Signed-out/other UID access, oversized/unbounded list reads, legacy
  writes, invalid data, and rewriting/deleting historical notes are denied.
- Historical reactions can be added, changed and removed.
- Navigation crossed 27 earlier notes, with no 20-note cutoff.
- Latest/newer/older, earliest boundary, historical dates and editing
  restrictions work; new arrivals do not move the reader out of history.
- Per-note reactions and names survive new posts; new posts start fresh.
- Two simultaneous browser saves for the same person both survive.
- Phone/desktop widths 320, 390 and 1280px fit without horizontal overflow;
  history buttons are at least 44px high. Screenshot visually inspected.
- Reload/sign-in/name persistence, offline feedback and sign-out passed;
  no uncaught browser errors occurred.

The live migration was backed up, applied additively, and read back to
verify original data preservation. Production rules passed Firebase's
syntax validation and deployed successfully. Browser behavior above was
exercised against emulators, not by posting test notes to the live fridge.

## Custom reactions and shared ideas — October 29, 2026

Passed Firebase Auth/Database emulator and two-session Edge checks:

- Custom emoji/text reactions, legacy emoji compatibility, names popup,
  removal, literal HTML rendering, and per-note history persistence.
- Rules reject empty/oversized/malformed reactions, invalid authors and
  author changes; shared ideas still require the authorized account.
- Two different people can submit ideas and see updates automatically.
- Idea history preserves authors and reactions after newer posts and reload.
- Expanded reaction controls fit at 320, 390 and 1280px.
- Existing history, concurrent saves, offline handling, login persistence
  and sign-out regression checks passed with no uncaught browser errors.

These tests used isolated emulator data. Physical phone keyboard/paste
behavior and authenticated production saves need a family check.

## Compressed photo album — October 29, 2026

Passed isolated Firebase emulator and two-browser Edge tests:

- Signed-out/other-account photo reads denied; unauthorized writes, unknown
  names, non-JPEG data URLs, oversized data, extra/missing fields and future
  timestamps rejected. Valid replacements and removals allowed.
- A generated 2400 x 1800 PNG was resized and encoded to a JPEG within the
  stored size limit, previewed, then saved through the real browser SDK.
- Uploads appeared live in the other browser; separate people retained
  separate slots, replacing a photo kept only one slot, and carousel
  navigation and reload persistence worked.
- Preview/cancel, invalid-image feedback, offline upload controls, removal
  and sign-out passed. Existing notes/history/reactions tests also passed.
- No horizontal overflow at 320, 390 or 1280px. Album screenshot inspected.

No real family photos were used in automated testing. Physical phone file
selection, camera orientation and HEIC decoding remain to be checked on
family devices; unsupported formats produce a JPEG/PNG/WebP suggestion.
