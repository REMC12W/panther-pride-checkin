# Panther Pride Center – Student Check-In

A tap-through check-in kiosk for the Pride Center, rebuilt from the Google Slides deck so that every check-in is recorded in a Google Sheet and admins can see who came in, why, and how they were feeling.

- **Kiosk (live):** https://remc12w.github.io/panther-pride-checkin/
- **Google Sheet:** [Pride Center Check-Ins](https://docs.google.com/spreadsheets/d/1CefuY4Uq8CgEqR6PQteZO4W02puMwbYvrsCOxdRQIgw/edit)
- **Repo:** https://github.com/REMC12W/panther-pride-checkin (GitHub Pages serves the `master` branch)

**What's in here**

| File | What it is |
|---|---|
| `index.html` | The student kiosk. Open this on the iPad. |
| `staff.html` | In test mode, a device-only dashboard. Once connected, it forwards staff to the admin dashboard. |
| `config.js` | The only file you edit: script URLs, kiosk name, timers, basic-needs list. |
| `apps-script/Code.gs` | Backend that lives inside the Google Sheet. Also serves the admin dashboard. |
| `apps-script/Dashboard.html` | The admin dashboard page, served by Apps Script behind a Google sign-in. |
| `apps-script/appsscript.json` | Optional manifest (sets the Michigan time zone). |
| `assets/` | Panther logo and app icons. |

## The flow

Matches the hyperlinks in the current PowerPoint deck.

1. Start → student types name or ID
2. Why are you here today? **Self Referred** (I have a need) or **Staff Referred** (a teacher sent me)
3. What do you need today? **Drop In: I need a reset**, **Scheduled Break**, or **I have a need… (medical, food, clothing)**
4. **I have a need** skips the feelings questions and goes to: Incident Report or Basic Need. Basic Need opens "What do you need?" where the student taps one or more items from `BASIC_NEEDS` in `config.js`.
5. Everyone else: How is your body + brain feeling? (Fast / Slow / Ok)
6. Which group of words describes how you feel? Fast shows the red and yellow grids, Slow shows blue, Ok shows green. Student taps one word.
7. What happened? (Home / Teacher / Friend / Myself)
8. End screen with the deck's CLICK HERE button: Incident Report opens the incident form, Check In and Basic Need open the sign-in form. Both need a KRESA Google login, exactly as before. Clear `FORM_INCIDENT_URL` or `FORM_SIGNIN_URL` in `config.js` to hide a button. The app resets for the next student after 30 seconds.

Every check-in is saved the moment the end screen appears. If Wi-Fi drops, it's kept on the iPad and synced automatically when the connection returns. If a student walks away mid-flow, the app returns to the start after two minutes so nobody sees their answers.

## Setup (about 15 minutes, one time)

### 1. Open the Google Sheet

The sheet already exists: [Pride Center Check-Ins](https://docs.google.com/spreadsheets/d/1CefuY4Uq8CgEqR6PQteZO4W02puMwbYvrsCOxdRQIgw/edit). It's empty until the script builds the tabs.

### 2. Add the script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete the sample code in `Code.gs` and paste in everything from `apps-script/Code.gs`.
3. Click the **+** next to Files → **HTML**, name it `Dashboard` (Apps Script adds `.html`), delete its sample content, and paste in everything from `apps-script/Dashboard.html`.
4. Optional: to limit the dashboard to specific people, add their emails to `ADMIN_EMAILS` near the top of `Code.gs`. Leave it empty to allow anyone with a kresa.org account.
5. Click **Save**.

### 3. Run setup once

1. In the function dropdown next to the Run button, pick **setup**, then click **Run**.
2. Google asks you to authorize. Choose your account, click **Advanced → Go to (project name)**, then **Allow**. This is normal for a script you wrote yourself.
3. Back in the Sheet you now have a **Check-Ins** tab with headers and a **Summary** tab with live counts.

Optional: run **testInsert** the same way to add a fake row and confirm it works. Delete that row afterward.

### 4. Deploy the kiosk endpoint

1. **Deploy → New deployment**. Click the gear next to "Select type" → **Web app**.
2. Description: `Kiosk`. **Execute as: Me**. **Who has access: Anyone**.
3. **Deploy**, then copy the Web app URL into `config.js`:

```js
SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
```

"Anyone" lets the iPad post without a login. Nobody can read data through this URL: opening it in a browser shows a "not authorized" page.

### 5. Deploy the admin dashboard

1. **Deploy → New deployment** again. Type: **Web app**.
2. Description: `Admin dashboard`. **Execute as: Me**. **Who has access: Anyone within kresa.org**.
3. **Deploy**, then copy this second URL into `config.js`:

```js
DASHBOARD_URL: "https://script.google.com/macros/s/AKfy...different.../exec",
```

Anyone opening this link is asked to sign in with a district Google account. Non-district accounts are turned away by Google. If `ADMIN_EMAILS` has entries, only those people get past the sign-in.

### 6. Publish the config

```bash
git add -A && git commit -m "Connect the Google Sheet" && git push
```

GitHub Pages updates in about a minute. The yellow "test mode" banner disappears from the kiosk, and `staff.html` now forwards to the admin dashboard.

**If you later edit Code.gs or Dashboard.html**, publish a new version of each deployment: **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URLs stay the same.

### 7. Set up the iPad

1. Open the kiosk URL in Safari.
2. Tap **Share → Add to Home Screen**. It becomes a full-screen app with the panther icon.
3. To lock the iPad to the app, enable **Settings → Accessibility → Guided Access**, open the app, then triple-click the top button.

## Admin dashboard

Sign in with a district account. You get:

- Tiles: check-ins, unique students, and counts by outcome
- Bars: referral, reason, energy, mood group, what happened, top feelings, basic needs requested
- A table of every check-in in the selected range
- CSV download of the current view, a link to the Sheet, and auto-refresh every minute

Ranges: Today, Yesterday, This week, or everything loaded (14 to 365 days).

The **Summary** tab in the Sheet has the same counts as formulas, so it works without the dashboard.

## Test mode

With `SCRIPT_URL` empty, the kiosk saves check-ins in the browser on that device only, and `staff.html` shows them. Good for a first look and for training staff before the Sheet is connected.

## Privacy notes

- Student names are stored only in the district Google Sheet. Nothing goes to any other service.
- The kiosk keeps a copy of the last 500 check-ins in the iPad browser's local storage so nothing is lost offline. Clear Safari website data on the iPad if you ever retire it.
- The dashboard login is Google's own. There is no password or PIN to manage. The `ADMIN_EMAILS` list in `Code.gs` controls who gets in.
- The repo is public (GitHub Pages needs that on a free plan). It contains no student data and no secrets. The script URLs in `config.js` are unguessable but not secret: the kiosk URL only accepts check-ins, and the dashboard URL requires a district sign-in.

## Customizing

- **Timers, kiosk name, form links, basic-needs list:** `config.js`
- **Question text and colors:** `index.html`, each screen is a `<section>`
- **Mood words:** the `GRIDS` object near the top of the script in `index.html`
- **Sheet columns:** `HEADERS` and `doPost` in `Code.gs`. If you change headers after the sheet has data, insert or rename the columns in the Sheet by hand to match.
