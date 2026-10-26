# Family Fridge

Four little notes. Zero group-chat chaos.

- Website: https://stevekochscience.github.io/family-fridge/
- Repository: https://github.com/stevekochscience/family-fridge

## Use it

Open the website, enter the family password, and choose Sammy, Gracie,
Lisa, or Steve. Tap **Edit** on your own note, write up to 280 characters,
and tap **Save**. Saving replaces your previous message. Other open
fridges update automatically. **Switch name** lets someone else use
the same browser. **Sign out** closes access on a shared device.

Sign-in and the chosen name are remembered where browser storage permits.
Drafts are not saved across reloads. If a save is waiting for the server,
keep the page open until it says **Saved**. Two people editing the same
panel follow last-save-wins behavior; different panels save independently.

## How it works

GitHub Pages serves plain HTML, CSS, and JavaScript. There is no build step.
The Firebase JavaScript SDK loads from Google's CDN; optional Google Fonts
have system-font fallbacks. Firebase Authentication uses one shared
email/password account. Realtime Database holds one object per person at
`messages/sam`, `messages/grace`, `messages/lisa`, and `messages/steve`.
Each object has `text` and a server-generated `updatedAt` timestamp.

The source and `config.js` are public, including the Firebase API key,
shared email, and UID. These are client configuration, not administrator
credentials. The family password is entered only at sign-in and is never
included in the repository. Firebase manages the browser's saved session.
Messages are rendered as plain text.

`database.rules.json` permits only the configured shared UID to read the
notes and write the four allowed panels. It validates message length,
field names, and timestamps. All family members share access to all four
panels; choosing a name is an honor system, not individual authorization.
Other accounts, including newly registered accounts, have no note access.

Firebase project: `family-fridge-db4c3`, on **Spark** without billing.
No Cloud Functions, paid hosting, or paid Firebase products are required.
If free quotas are exhausted, service can become unavailable; do not
enable billing just to follow this README.

## Maintain it

- Edit colors and layout in `styles.css`, headings in `index.html`, and
  the names and interactions in `app.js`.
- Keep the IDs `sam`, `grace`, `lisa`, and `steve` consistent with the rules.
- Change the shared email in `config.js` if the Firebase login uses a
  different email from `family@example.com`.
- To change the password, open Firebase Console → Authentication → Users
  and edit the shared user. Never put the new password in code or a commit.
  Existing saved sessions may remain active; changing the password should
  not be treated as an instant sign-out on every device.
- If replacing the shared account, update `sharedUid` in `config.js` and
  the UID checks in `database.rules.json`, then publish the rules in
  Firebase Console → Realtime Database → Rules.
- Git commits do **not** automatically deploy Firebase rules. Publish
  those explicitly in Firebase Console and keep the repository copy in sync.
- Push site changes to `main`; GitHub Pages publishes from the root of
  that branch. Check repository Settings → Pages for deployment status.

## Run locally

Serve this folder with any static HTTP server, for example:

```sh
python -m http.server 8080
```

Open `http://localhost:8080`. Do not open `index.html` directly as a file.
Local development uses the live Firebase project unless you explicitly
configure Firebase emulators. Avoid overwriting real notes during tests.

## Verification

See `TESTING.md` for the prototype's tested behavior and remaining
real-device checks.
