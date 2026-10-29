# Family Fridge

Four humans. One very good boy. Zero group-chat chaos.

- Website: https://stevekochscience.github.io/family-fridge/
- Repository: https://github.com/stevekochscience/family-fridge

## Use it

Enter the family password and choose Sammy, Gracie, Lisa, Steve, or Marshall.
Marshall gets a special full-width note; choose him to speak on his behalf.
Tap **Edit** on your latest note, write up to 280 characters, and **Save**.
Every save posts a new note and keeps the previous one. Other open fridges
update automatically. Two people saving for the same name keep both notes.

**Earlier notes** appears only when a person has history. While browsing,
use **Older**, **Newer**, or **Latest**. Older notes show their date and cannot
be edited. New arrivals do not interrupt your browsing. Opening/reloading
the page starts on everyone's latest note. There is no automatic history
deletion or arbitrary note-count limit; Firebase's storage quotas still apply.

**React** offers quick emojis plus a text box for any emoji or short reaction
(up to 32 characters). Paste from your keyboard or type something like `cool!`. Each selected name gets one reaction per note;
choose another to change it, or choose the same emoji again to remove it.
Use **Remove mine** to clear a custom reaction. Tap a reaction/count badge to see who reacted. Reactions stay attached to the
specific note, and you can react to older notes too. Your reaction is outlined.

**Ideas**, the shared purple note at the bottom, lets everyone **Add an idea**
(up to 280 characters). Each suggestion keeps its author, date, history, and
reactions. Suggestions are recorded for Steve to review; they never trigger
automatic code changes or AI spending.

**Switch name** lets another family member use the browser. **Sign out**
closes access on a shared device. Sign-in and chosen name are remembered
when browser storage permits. Drafts do not survive reloads; keep the page
open until saving finishes. Choosing names is an honor system.

## How it works

GitHub Pages serves plain HTML, CSS, and JavaScript without a build step.
Firebase Authentication uses one shared email/password account. The SDK
loads from Google's CDN; optional Google Fonts have system-font fallbacks.

Realtime Database stores each note at `boards/{person}/{noteId}`. Firebase
push IDs give independent saves their own sortable keys. Each note has
immutable `text` and server-generated `updatedAt` fields, plus an optional
`reactions/{person}` object containing `text` (old emoji keys still display).
The shared `boards/ideas/{noteId}` stack also has an immutable `author`. Latest queries fetch only two notes per person;
history navigation fetches one or two at a time. A displayed older note has
its own live listener, so its reactions update without loading the full stack.

The source and `config.js` are public. The client API key, shared email, and
UID are not administrator credentials. The password and CLI credentials are
not in the repository. Rules allow only the shared UID, validate content and
reaction names, prohibit rewriting/deleting saved notes, and bound list reads.
Messages are rendered as plain text. Firebase project: `family-fridge-db4c3`
on Spark, without billing, Cloud Functions, or a server to maintain.

## Maintain it

- Colors/layout: `styles.css`; page wording: `index.html`.
- Board interactions/names: `app.js`; browsing: `history.js`;
  reactions: `reactions.js`; Firebase calls: `backend.js`.
- Keep the IDs `sam`, `grace`, `lisa`, `steve`, and `marshall` consistent
  plus the shared `ideas` panel with `database.rules.json` and the latest-note subscriptions in `backend.js`.
- Change the shared user's password in Firebase Console → Authentication →
  Users, never in source. Existing sessions may not sign out immediately.
- Push site changes to `main`; GitHub Pages publishes the repository root.
- Rules deploy separately. Compare console edits with the repository before
  deploying, because deployment replaces the live rules.

From this repository, after `firebase login`:

```sh
firebase deploy --only database --project family-fridge-db4c3
```

On this Windows computer if Firebase is not on PATH:

```powershell
& "$env:APPDATA\npm\firebase.cmd" deploy --only database --project family-fridge-db4c3
```

## Migration from the original board

The October 27 history upgrade preserves each currently saved note and its
matching reactions as the first entry. Previously overwritten messages were
not recoverable. Legacy `messages` and `reactions` remain in the database as
a read-only fallback; the new app uses `boards`. Old browser tabs must reload
before saving. Do not restore the old app/rules after new history is in use.

`scripts/migrate-history.cjs` transforms a private database snapshot into an
additive update; it does not connect to Firebase and refuses snapshots with
existing history. Backup files contain private messages and must stay outside
this public repository. Never rerun a migration against an existing stack.

## Local development and testing

Serve this folder over HTTP, for example `python -m http.server 8080`, and
open `http://localhost:8080`. Production configuration targets the live project;
use Firebase emulators for destructive tests. See `TESTING.md` for evidence
and the distinction between emulator/browser tests and real-phone checks.
