# Panther Pride Center – Student Check-In

A tap-through check-in kiosk for the Pride Center, rebuilt from the Google Slides deck so that every check-in is recorded in a Google Sheet and admins can see who came in, why, and how they were feeling.

- **Kiosk (live):** https://remc12w.github.io/panther-pride-checkin/
- **Google Sheet:** [Pride Center Check-Ins](https://docs.google.com/spreadsheets/d/1CefuY4Uq8CgEqR6PQteZO4W02puMwbYvrsCOxdRQIgw/edit)
- **Repo:** https://github.com/REMC12W/panther-pride-checkin (GitHub Pages serves the `master` branch)

**What's in here**

| File | What it is |
|---|---|
| `index.html` | The student kiosk. Open this on the iPad. |
| `staff.html` | Admin dashboard behind "Sign in with Google". In test mode, shows device-only data. |
| `config.js` | The only file you edit: script URLs, kiosk name, timers, basic-needs list. |
| `apps-script/Code.gs` | Backend that lives inside the Google Sheet. Verifies dashboard sign-ins. |
| `apps-script/appsscript.json` | Optional manifest (sets the Michigan time zone). |
| `feedback.html` | Trial feedback portal. Switch off with `FEEDBACK_ENABLED` in `config.js`. |
| `sw.js` | Service worker. Lets the kiosk open with no Wi-Fi and keeps files fresh when online. |
| `ds.css` | Parchment Panthers Design System tokens (colors, Raleway type, buttons, corners) shared by every page. |
| `icons.js` | Lucide icons bundled for offline use. In `config.js`, an item's `icon` is a Lucide icon name. |
| `assets/` | District panther logo and app icons. |

## The flow

Matches the hyperlinks in the current PowerPoint deck.

1. Start → student types name or ID
2. Why are you here today? **Self Referred** (I have a need) or **Staff Referred** (a teacher sent me)
3. What do you need today? **Drop In: I need a reset**, **Scheduled Break**, or **I have a need… (medical, food, clothing)**
4. **I have a need** goes to: Incident Report or Basic Need. Incident Report opens a short in-app report that covers every question on the district "Student Incident Report" form: Are you safe right now? → Grade (6th/7th/8th) → What happened (multi-select from `INCIDENT_TYPES`) → Where (`INCIDENT_PLACES`, the district's list) → When (`INCIDENT_PERIODS`, the district's class hours) → Tell us what happened (own words, who was involved, witnesses) → Do you want to talk to someone today? The district form collects the student's Google email automatically; the kiosk can't, so the name typed at check-in is the identifier. A student who says they are not safe is routed to "a staff member is coming to you." Reports land in an **Incident Reports** tab in the Sheet with urgent rows highlighted, and in the admin dashboard. Basic Need opens "What do you need?" where the student taps one or more items from `BASIC_NEEDS` in `config.js`, then continues to the feelings questions below.
5. How is your body + brain feeling? (Fast / Slow / Ok)
6. "Pick the word that fits how you feel." Fast shows the red and yellow grids, Slow shows blue, Ok shows green. A student can tap one word, or tap "Just pick Red" (etc.) under a grid when no single word fits; the Sheet then records the color with no word.
7. What happened? (Home / Teacher / Friend / Myself)
8. Station suggestion. The mood word's color picks a regulation station (Red, Yellow, Blue, Green). The app says "The blue station is set up for how you're feeling. Go there, or pick another," and records both the suggestion and the choice. Words in `STAFF_FIRST_WORDS` (enraged, hopeless, and so on) skip the picker and show "A staff member is coming to you" instead.
9. End screen with the deck's CLICK HERE button: Incident Report opens the incident form, Check In and Basic Need open the sign-in form. Both need a KRESA Google login, exactly as before. Clear `FORM_INCIDENT_URL` or `FORM_SIGNIN_URL` in `config.js` to hide a button. The app resets for the next student after 30 seconds.

**Already checked in?** After typing their name, a student who already has an open check-in today on that iPad (within 4 hours, not checked out) sees "Welcome back" with two choices: check out, or start a new visit. A student who taps check-out without a check-in sees "We don't see a check-in for you today" with: check in, or check out anyway. So nobody answers the check-in questions twice by accident. This uses the iPad's own record, so a staff check-out from the dashboard isn't known to the iPad; "start a new visit" covers that case.

**Confirmation screens** lead with a big block in the color of the station they're headed to (or "A staff member is coming to you"), and on check-out the color they're leaving with.

**Check-out.** The start screen has a "Leaving? Tap here to check out" link. The student types their name, answers the body + brain question and the word grid again, then taps what helped (from `WHAT_HELPED` in `config.js`). The Sheet fills in the check-out columns on that student's check-in row: check-out time, minutes in room, mood at check-out, and what helped. The end screen tells the student "You came in Blue and you're leaving Green."

Every check-in is saved the moment the end screen appears. If Wi-Fi drops, it's kept on the iPad and synced automatically when the connection returns. If a student walks away mid-flow, the app returns to the start after two minutes so nobody sees their answers.

## Setup (about 15 minutes, one time)

### 1. Open the Google Sheet

The sheet already exists: [Pride Center Check-Ins](https://docs.google.com/spreadsheets/d/1CefuY4Uq8CgEqR6PQteZO4W02puMwbYvrsCOxdRQIgw/edit). It's empty until the script builds the tabs.

### 2. Add the script

1. In the Sheet, go to **Extensions → Apps Script**.
2. Delete the sample code in `Code.gs` and paste in everything from `apps-script/Code.gs`.
3. Dashboard access is `ALLOWED_DOMAIN` (any @parchmentschools.org Workspace account) plus the people in `ADMIN_EMAILS` (currently ben.tomlinson@kresa.org). Everyone else is refused. To lock it to named people only, list them in `ADMIN_EMAILS` and set `ALLOWED_DOMAIN` to `''`.
4. `KIOSK_TOKEN` must match `config.js`. They already match in this repo.
5. Click **Save**.

### 3. Run setup once

1. In the function dropdown next to the Run button, pick **setup**, then click **Run**.
2. Google asks you to authorize. Choose your account, click **Advanced → Go to (project name)**, then **Allow**. This is normal for a script you wrote yourself.
3. Back in the Sheet you now have a **Check-Ins** tab with headers and a **Summary** tab with live counts. Incident Reports and Feedback tabs appear on their first entry.

Optional: run **testInsert** the same way to add a fake row and confirm it works. Delete that row afterward.

### 4. Deploy the script (once)

1. **Deploy → New deployment**. Click the gear next to "Select type" → **Web app**.
2. **Execute as: Me**. **Who has access: Anyone**.
3. **Deploy**, then copy the Web app URL into `config.js`:

```js
SCRIPT_URL: "https://script.google.com/macros/s/AKfy.../exec",
```

"Anyone" lets the iPad post without a login. Nobody can read data through this URL without a verified Google sign-in (step 5). Opening it in a browser shows a plain notice page.

### 5. Set up "Sign in with Google" for the dashboard

The dashboard at `staff.html` uses Google's own sign-in. You need one OAuth Client ID, which takes about five minutes:

1. Go to https://console.cloud.google.com/ with your kresa.org account. Create a project (any name, for example "Pride Center").
2. **APIs & Services → OAuth consent screen**. User type **Internal** (only district accounts can sign in). Fill in the app name and your email, save.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**. Application type **Web application**.
4. Under **Authorized JavaScript origins** (the top box, not "Authorized redirect URIs") add `https://remc12w.github.io`. For local testing also add `http://localhost:8765`. Leave redirect URIs empty. If sign-in says "no registered origin," the address is in the wrong box.
5. **Create**, then copy the Client ID (it ends in `.apps.googleusercontent.com`).
6. Paste it into **both** places:
   - `config.js` → `GOOGLE_CLIENT_ID`
   - `Code.gs` → `GOOGLE_CLIENT_ID`, then **Deploy → Manage deployments → pencil → New version → Deploy**.

If Cloud Console is locked down in your district, ask your Google Workspace admin to create the Web application client with that origin, or to allow you to. Nothing else in the setup needs the console.

How it works: the sign-in button gives the browser a Google ID token. `staff.html` sends it with every data request, and `Code.gs` verifies it with Google, checks that the account is a @parchmentschools.org Workspace account or listed in `ADMIN_EMAILS`, and only then returns data. Tokens expire after an hour, at which point the page asks you to sign in again.

### 6. Publish the config

```bash
git add -A && git commit -m "Connect the Google Sheet" && git push
```

GitHub Pages updates in about a minute. The yellow "test mode" banner disappears from the kiosk, and `staff.html` shows the sign-in page.

**If you later edit Code.gs**, publish a new version: **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. The URL stays the same.

### 7. Set up the iPad

1. Open the kiosk URL in Safari.
2. Tap **Share → Add to Home Screen**. It becomes a full-screen app with the panther icon.
3. To lock the iPad to the app, enable **Settings → Accessibility → Guided Access**, open the app, then triple-click the top button.

## Admin dashboard

Open `staff.html` and sign in with a @parchmentschools.org staff account (or an account listed in `ADMIN_EMAILS`). It is built around what staff act on, top to bottom:

1. **Needs attention.** Safety first: incident reports where the student said they were not safe, students who picked a staff-first word today, then unreviewed incident reports, students who checked out still red or blue, and up to three patterns from the last 7 days (3+ drop-in visits, or 2+ red/blue arrivals; scheduled breaks don't count). Incident reports clear with **Mark reviewed**, which writes your email, the date, and an optional note into the Sheet. Other items clear with **Done** on that computer.
2. **In the room now.** Checked in within 3 hours and not checked out, with station, feeling word, basic needs, and minutes in the room. **Check out** lets staff check a student out with their own read of how the student seems (color, optional word, what helped). These are saved with "Staff: <email>" in the Checked Out By column; kiosk check-outs say "Student". Staff who aren't comfortable assigning a mood can choose **Check out, skip the read**, which records only the time the student left; those visits count toward time in the room but are left out of the mood-change numbers and never raise a "left still red or blue" alert. Check-out stays optional either way.
3. **Today.** Check-ins, red/blue arrivals, basic needs, and incident reports, each with a 14-school-day sparkline.
4. **How students arrived.** The Mood Meter as a 2x2, with counts, share, and top words per quadrant.
5. **Did the visit help?** For students who checked out: how many who came in red or blue left yellow or green, typical stay, and arrived vs. left bars.
6. **When.** Visits per school day, and check-ins by hour for staffing.
7. **What's behind the visits, what to keep stocked, what helped.**
8. **Referral, reason, energy, and station.** Station bars use the station colors and show how often students went where the app suggested.
9. **Visit log** with student search. Tap a name to see that student's visits and a row of mood dots, oldest to newest.
10. **Incident reports** (unreviewed first) and **trial feedback** (collapsed).

The **Today** button in the header (with today's check-in count) slides out a timeline of the day: every check-in, check-out, and incident report in order, grouped by hour, with chips for feeling word, reason, station, basic needs, minutes in the room, and what helped, plus a "Now" line. Filter it to check-ins, check-outs, items that need a staff member, or basic needs. Tap a name to jump to that student's history. Esc or a click outside closes it.

The window selector (7, 14, 30, 90 days) drives sections 4 through 9. Sections 1 through 3 are always about today and this week. Mood colors were checked for color-blind safety in light and dark mode, and every color is paired with a word.

## Badges, student IDs, and the roster

Students can scan their badge (or type their student ID) instead of typing a name. The kiosk then greets them by first name ("Hi, Riley!") and every check-in, check-out, and incident report carries the student ID, so visits match on ID instead of spelling.

**Scanner.** Use a USB or Bluetooth barcode scanner paired to the iPad in keyboard mode. On the start screen, a scan starts a check-in by itself. On the name screen, a scan fills the box and continues. Manual entry works the same way: type the ID, or type a first and last name.

**Roster.** The roster is a **Roster** tab in the main Sheet ([open it](https://docs.google.com/spreadsheets/d/1CefuY4Uq8CgEqR6PQteZO4W02puMwbYvrsCOxdRQIgw/edit?gid=1679508098#gid=1679508098)); `ROSTER_SHEET_GID` in `Code.gs` points at it. Columns: Student ID, First Name, Last Name, Grade. Running `setup` formats it: frozen header, IDs kept as text, a 6/7/8 grade dropdown, and instructions in a note on the Student ID header. Header names are matched loosely (Student Number, ID, Preferred Name, Surname, Grade Level all work), so a pasted export works too. Changes are picked up within 10 minutes, or right away after running **refreshRoster**. Anyone given edit access to fill in the roster can also see every other tab (check-ins, incident reports). To avoid that, set `ROSTER_SPREADSHEET_ID` to a separate spreadsheet and share only that. The roster never goes in this public repository.

**iPad sign-in.** Lookups only work on an iPad that a staff member has signed in, so nobody can pull names from the roster with the public kiosk token. On the start screen, tap **"Badge scanning is off. Staff: sign in this iPad"** (or tap the panther on the start screen 5 times) and sign in with Google. The script checks the account and gives the iPad its own pass for `KIOSK_SESSION_DAYS` (30). Students never see a login. **Only @parchmentschools.org staff accounts can sign an iPad in** (`KIOSK_DOMAIN` in `Code.gs` and `config.js`); the domain is re-checked on every lookup. `KIOSK_ACCOUNTS` can narrow it to specific people. Because Parchment accounts are outside the kresa.org Google Workspace that owns the sign-in app, its OAuth consent screen must be set to **External** (Google Cloud Console → Google Auth Platform → Audience → Make external, publishing status In production). To sign every iPad out, for example if one goes missing, run **signOutAllKiosks** in Apps Script. Sign the iPad in before turning on Guided Access, since the sign-in opens a Google popup.

If the iPad isn't signed in, is offline, or an ID isn't on the roster, the student is asked to type their name and the ID is still saved with the visit.

**Is this you?** After a badge or ID matches the roster, the kiosk shows the student's name and grade with "Yes, that's me" and "No, that's not me." No sends them back to scan their own badge or type their name. Typed names skip this screen.

**Staff confirm.** On the dashboard, each student under "In the room now" has **✓ Confirm** and **Not them**. Confirm records "Confirmed · your email · time" in the Staff Confirmed column. Not them flags the visit in the Sheet, the visit log, and the Today timeline, and puts a "Check-in not by this student" item in Needs attention so someone fixes the name. Flagged visits are not deleted and still count in the charts until the name is corrected.

## Trial feedback portal

`feedback.html` is a one-minute form for anyone trialing the app: who they are, what they tried, a five-face rating, what worked, what to change, anything else, and optional contact. Responses land in a **Feedback** tab in the Sheet and at the bottom of the admin dashboard. A "Provide feedback during trial" button floats in the bottom-right corner of every kiosk screen and the staff dashboard while `FEEDBACK_ENABLED` is true in `config.js`. Feedback records which screen it was started from, and the back link returns there. Set it to false when the trial ends.

## Offline and updates

The kiosk registers a service worker. After the first successful load, the app opens even with no Wi-Fi, and check-ins made offline are queued on the iPad and synced when the connection returns. When online, every file is revalidated on open, so a `config.js` change reaches the iPad the next time the app is opened, not a day later. The version number in the bottom-left corner of the kiosk comes from `APP_VERSION` in `index.html`; bump it when you change the app so staff can tell which version an iPad is running.

## Test mode

With `SCRIPT_URL` empty, the kiosk saves check-ins in the browser on that device only, and `staff.html` shows them. Good for a first look and for training staff before the Sheet is connected.

## Privacy notes

- **Sample data:** rows whose Kiosk column says `SAMPLE DATA` (names end in "(sample)") are demo rows for staff to explore. Run **deleteSampleData** in Apps Script to remove them all; real rows are untouched.
- Student names are stored only in the district Google Sheet. Nothing goes to any other service.
- The kiosk keeps a copy of the last 500 check-ins in the iPad browser's local storage so nothing is lost offline. Clear Safari website data on the iPad if you ever retire it.
- The dashboard login is Google's own "Sign in with Google", verified by the script on every request. There is no password or PIN to manage. `ALLOWED_DOMAIN` and the optional `ADMIN_EMAILS` list in `Code.gs` control who gets in.
- The repo is public (GitHub Pages needs that on a free plan). It contains no student data. The script URLs and the kiosk token in `config.js` are visible to anyone who reads the repo; the token stops casual junk rows, not a determined person. The kiosk URL only accepts check-ins, and the dashboard URL requires a district sign-in.

## Customizing

- **Timers, kiosk name, form links, basic-needs list, stations, staff-first words, what-helped list:** `config.js`
- **Question text and colors:** `index.html`, each screen is a `<section>`
- **Mood words:** the `GRIDS` object near the top of the script in `index.html`
- **Sheet columns:** `HEADERS` and `doPost` in `Code.gs`. If you change headers after the sheet has data, insert or rename the columns in the Sheet by hand to match.
