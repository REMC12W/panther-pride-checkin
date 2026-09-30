# Panther Pride Center – Student Check-In

A tap-through check-in kiosk for the Pride Center, rebuilt from the Google Slides version so that every check-in is recorded in a Google Sheet and staff can see who came in, why, and how they were feeling.

**What's in here**

| File | What it is |
|---|---|
| `index.html` | The student kiosk. Open this on the iPad. |
| `staff.html` | Staff dashboard behind a PIN. Today's check-ins, counts, CSV export. |
| `config.js` | The only file you edit: Apps Script URL, kiosk name, timers. |
| `apps-script/Code.gs` | Backend that lives inside your Google Sheet. |
| `apps-script/appsscript.json` | Optional Apps Script manifest (sets the Michigan time zone). |
| `assets/` | Panther logo and app icons. |

## The flow

1. Start → student types name or ID
2. Why are you here? (Sent by staff / Scheduled Break / Drop In: reset / Drop In: need)
3. **Drop In: I have a need** skips the feelings questions and goes straight to: Incident Report or Basic Need
4. Everyone else: How is your body + brain feeling? (Fast / Slow / Ok)
5. Which group of words describes how you feel? Fast shows the red and yellow grids, Slow shows blue, Ok shows green. Student taps one word.
6. What happened? (Home / Teacher / Friend / Myself)
7. End screen with the deck's CLICK HERE button: Incident Report opens the incident form, Check In and Basic Need open the sign-in form. Both forms need a KRESA Google login, exactly as before. Clear `FORM_INCIDENT_URL` or `FORM_SIGNIN_URL` in `config.js` to hide a button and finish in-app instead. The app resets for the next student after 30 seconds.

This matches the hyperlinks in the original slide deck.

Every check-in is saved the moment the last screen appears. If Wi-Fi drops, it's kept on the iPad and synced automatically when the connection returns.

## Setup (about 10 minutes)

### 1. Try it right now in test mode

Open `index.html` in a browser. With no Sheet connected the app runs in test mode: check-ins are saved on that device only, and `staff.html` shows them. Good for a first look and for training staff.

### 2. Create the Google Sheet

1. In your district Google account, create a new Google Sheet. Name it something like **Pride Center Check-Ins**.
2. Go to **Extensions → Apps Script**.
3. Delete the sample code and paste in everything from `apps-script/Code.gs`.
4. Near the top, change `STAFF_PIN` to a PIN of your choice. This is what staff type into the dashboard.
5. Click the **Save** icon.

### 3. Run setup once

1. In the function dropdown next to the Run button, pick **setup**, then click **Run**.
2. Google will ask you to authorize the script. Choose your account, click **Advanced → Go to (project name)**, then **Allow**. This is normal for a script you wrote yourself.
3. Switch back to the Sheet. You now have a **Check-Ins** tab with headers and a **Summary** tab with live counts.

Optional: run **testInsert** the same way to drop a fake check-in into the sheet and confirm it works. Delete that row afterward.

### 4. Deploy the web app

1. Click **Deploy → New deployment**.
2. Click the gear next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**. ("Anyone" means the kiosk can post without signing in. Nobody can read the sheet through it without the PIN.)
4. Click **Deploy**, then **Copy** the Web app URL. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

### 5. Connect the app

Open `config.js` and paste the URL:

```js
SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
```

Reload `index.html`. The yellow "test mode" banner disappears. Do a check-in and watch the row appear in the Sheet.

**If you later edit Code.gs** you must publish a new version: **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.

### 6. It is online (GitHub Pages)

The repo is https://github.com/REMC12W/panther-pride-checkin and GitHub Pages serves the `master` branch.

- Kiosk: https://remc12w.github.io/panther-pride-checkin/
- Dashboard: https://remc12w.github.io/panther-pride-checkin/staff.html

To publish a change, commit and push to `master`. Pages rebuilds in about a minute:

```bash
git add -A && git commit -m "Describe the change" && git push
```

Prefer a private repo? GitHub Pages on private repos needs a paid plan. Any static host works too: Netlify Drop, Google Sites embed, or your district web server. It's just files.

### 7. Set up the iPad

1. Open the URL in Safari.
2. Tap **Share → Add to Home Screen**. It becomes a full-screen app with the panther icon.
3. To lock the iPad to the app, enable **Settings → Accessibility → Guided Access**, open the app, then triple-click the top button. Guided Access stops students from leaving the app.

## Staff dashboard

Open `staff.html`, enter the PIN. You get:

- Tiles: check-ins, unique students, and counts by outcome
- Bars: reason, energy, mood group, what happened, top feelings
- A table of every check-in in the selected range
- CSV download of the current view
- Auto-refresh every minute

Ranges: Today, Yesterday, This week, or everything loaded (last 14 days by default, change `DASHBOARD_DAYS` in `config.js`).

The **Summary** tab in the Sheet has the same counts as formulas, so it works without the dashboard.

## Privacy notes

- Student names are stored only in your district Google Sheet. Nothing goes to any other service.
- The kiosk keeps a copy of the last 500 check-ins in the iPad browser's local storage so nothing is lost offline. Clear Safari website data on the iPad if you ever retire it.
- The PIN is checked by the Apps Script, not the web page, so the dashboard can't be opened by viewing the page source. The PIN still travels in the URL over HTTPS, so treat it like a shared door code and change it each year.
- If a student leaves mid-flow, the app returns to the start after two minutes so nobody sees their answers.

## Customizing

- **Timers, kiosk name, end-screen form links:** `config.js`
- **Question text and colors:** `index.html`, each screen is a `<section>`
- **Mood words:** the `GRIDS` object near the top of the script in `index.html`
- **Sheet columns:** `HEADERS` and `doPost` in `Code.gs` (re-run `setup` after changing headers on a fresh sheet)
