// Panther Pride Center check-in settings.
// Edit this file, save, and reload the app. Nothing else needs to change.
window.PPC_CONFIG = {
  // Kiosk endpoint: the Apps Script deployment with access "Anyone" (README step 4). The URL alone
  // can't add or read anything: every request needs a signed-in @parchmentschools.org staff account.
  // Leave it empty to run in test mode: check-ins are saved only on this device.
  SCRIPT_URL: "https://script.google.com/macros/s/AKfycbzneBQPNeLkP0xcEIERfIdeXWirEBYhfPIArTAnEFoOXQpBfmb7bQygDL9LthYzHLRJmQ/exec",

  // Admin dashboard sign-in (staff.html). A Google OAuth "Web application" Client ID
  // from Google Cloud Console (README step 5). Must also be set in Code.gs.
  GOOGLE_CLIENT_ID: "680243392561-vod2q88igf1v8mr84uc7b4h075lv6g5p.apps.googleusercontent.com",
  // Who can sign in: the people on the Sheet's "Access" tab (People & access on the principal
  // dashboard), plus PRINCIPAL_EMAILS and ADMIN_EMAILS in Code.gs, each with their own school
  // Google account (@parchmentschools.org, or a partner's such as @kresa.org). The script enforces
  // it; these only label the sign-in pages. Must match ALLOWED_DOMAIN in Code.gs.
  ALLOWED_DOMAIN: "parchmentschools.org",
  KIOSK_DOMAIN: "parchmentschools.org",

  // A label for this device so staff can tell kiosks apart in the Sheet.
  KIOSK_NAME: "Pride Center iPad",

  // Seconds the "You're checked in" screen stays up before returning to start. The kiosk never uses
  // less than 20 (an accessibility rule: people need time to read it), and "More time" adds 30.
  RESET_SECONDS: 8,

  // Seconds of no taps mid-flow before the app returns to start, so the next student never sees a
  // previous student's answers. 20 seconds before that it asks "Are you still there?"; any tap keeps going.
  IDLE_SECONDS: 120,

  // The Google Forms the original slide deck linked to. Leave a URL empty to hide
  // that button and finish in-app instead. Both forms require a KRESA Google login.
  // Incident reports are now filled out inside the app (see INCIDENT_TYPES below).
  // To ALSO show the old district Google Form button on the end screen, put its URL back:
  // "https://docs.google.com/forms/d/e/1FAIpQLSdje0uEmj6XIAjNtu8oVpvtO9ix5l7jL_QO7txhiTFJTzJg0g/viewform?usp=header"
  FORM_INCIDENT_URL: "",
  // The app records check-ins itself, so the old sign-in form (which asked students to
  // log in and sign in a second time) is off. To bring its button back, put this URL back:
  // "https://docs.google.com/forms/d/e/1FAIpQLSff7BwiBHnNVS7DDczWokE5al_T83F7ubH3DCsG_YAsfJCKXg/viewform?usp=header"
  FORM_SIGNIN_URL:   "",

  // Basic needs a student can request after tapping "I have a basic need".
  // Add, remove, or reorder freely. Students can pick more than one.
  // Avoid commas in labels: picks are stored comma-separated in the Sheet.
  // icon = a Lucide icon name (see icons.js); the design system uses no emoji.
  BASIC_NEEDS: [
    { icon: "apple", label: "Food or a snack" },
    { icon: "glass-water", label: "Water or a drink" },
    { icon: "shirt", label: "Clothing or shoes" },
    { icon: "droplets", label: "Hygiene items" },
    { icon: "package", label: "Period products" },
    { icon: "pencil", label: "School supplies" },
    { icon: "moon", label: "Rest or a quiet spot" },
    { icon: "stethoscope", label: "Nurse or medical help" },
    { icon: "message-circle", label: "Talk to a counselor or trusted adult" },
    { icon: "backpack", label: "Backpack" },
    { icon: "plug-zap", label: "Charger or tech help" },
    { icon: "circle-help", label: "Something else" },
  ],

  // Regulation stations, color-coded to the mood meter quadrants. The app suggests
  // the station matching the student's mood word, then lets them choose.
  STATIONS: [
    { color: "Red",    label: "Red station",    hint: "Move it out, then slow it down" },
    { color: "Yellow", label: "Yellow station", hint: "Put the energy to work" },
    { color: "Blue",   label: "Blue station",   hint: "Settle in, take your time" },
    { color: "Green",  label: "Green station",  hint: "Keep it steady" },
  ],

  // Alert words: the staff page shows "Staff should go to this student". On the iPad the student
  // goes on to the station picker like any word and sees nothing different. A student who checks
  // out with one of these words also raises the alert, again only on the staff page.
  STAFF_FIRST_WORDS: [
    "Enraged", "Livid", "Fuming", "Panicked", "Frightened",
    "Despair", "Hopeless", "Desolate", "Despondent", "Depressed",
  ],
  // Worrying words and phrases. If a student TYPES one (their own feeling word, or the story in an
  // incident report), or types one of the alert words above, the staff page raises the same alert.
  // The student sees nothing different. Matching ignores capitals and only matches whole words,
  // so "die" does not match "diet". Add or remove freely.
  WORRY_WORDS: [
    "die", "dying", "dead", "death", "kill", "killing", "kill myself", "kms", "kys",
    "suicide", "suicidal", "end it", "end my life", "want to disappear", "no reason to live",
    "hurt myself", "hurting myself", "cut myself", "cutting", "self harm", "self-harm", "overdose",
    "hate myself", "hate my life", "worthless", "not safe", "unsafe", "gun", "weapon",
    "abuse", "abused", "rape", "raped", "molested",
  ],

  // Check-out: what helped. Students can pick more than one.
  WHAT_HELPED: [
    { icon: "wind", label: "Breathing" },
    { icon: "footprints", label: "Moving my body" },
    { icon: "music", label: "Music" },
    { icon: "notebook-pen", label: "Writing or drawing" },
    { icon: "volume-x", label: "Quiet time alone" },
    { icon: "message-circle", label: "Talking to a staff member" },
    { icon: "hand", label: "Fidget or weighted item" },
    { icon: "apple", label: "Snack or water" },
    { icon: "puzzle", label: "A game or puzzle" },
    { icon: "circle-help", label: "Something else" },
    { icon: "circle-minus", label: "Nothing really helped" },
  ],

  // Incident report: what happened (multi-select) and where (single).
  INCIDENT_TYPES: [
    { icon: "frown", label: "Someone was mean to me" },
    { icon: "hand", label: "Someone hit or pushed me" },
    { icon: "triangle-alert", label: "Someone threatened me" },
    { icon: "smartphone", label: "Something happened online" },
    { icon: "shield-alert", label: "Someone touched me in a way I didn't like" },
    { icon: "eye", label: "I saw something happen to someone else" },
    { icon: "package-x", label: "Something was taken or broken" },
    { icon: "triangle-alert", label: "Something unsafe" },
    { icon: "circle-help", label: "Something else" },
  ],
  // Incident reports with any of these answers show on the staff page as urgent (red), with a
  // reminder about district reporting rules. The student sees nothing different.
  // Each must match a label in INCIDENT_TYPES exactly.
  SERIOUS_INCIDENT_TYPES: [
    "Someone hit or pushed me", "Someone threatened me",
    "Someone touched me in a way I didn't like", "Something unsafe",
  ],
  // Where and when, matching the district "Student Incident Report" Google Form.
  INCIDENT_PLACES: [
    { icon: "school", label: "Classroom" },
    { icon: "door-open", label: "Hallway" },
    { icon: "bus", label: "Bus/Bus Stop" },
    { icon: "trees", label: "Outside" },
    { icon: "dumbbell", label: "Gym" },
    { icon: "utensils", label: "Cafeteria" },
    { icon: "toilet", label: "Bathroom" },
    { icon: "footprints", label: "Stairwell" },
    { icon: "library", label: "Library" },
    { icon: "circle-help", label: "Other" },
  ],
  INCIDENT_PERIODS: [
    "Before School", "Breakfast", "1st Hour", "2nd Hour", "3rd Hour", "4th Hour", "Lunch", "Recess",
    "5th Hour", "6th Hour", "7th Hour", "8th Hour", "Passing Time", "Other",
  ],
  // Grade is no longer asked: it comes from the roster.

  // How many days of check-ins the staff dashboard loads.
  DASHBOARD_DAYS: 14,

  // Principal dashboard (principal.html). true = made-up demo students, nothing from the Sheet.
  // Set to false to use the live Sheet (needs the Google sign-in above and the current Code.gs).
  PRINCIPAL_DEMO: false,
  // Principal dashboard owners (PRINCIPAL_EMAILS in Code.gs). Others are added by the principal
  // under "People & access". The script enforces both; this copy only labels the sign-in page.
  PRINCIPAL_EMAILS: ["jeremy.andrick@parchmentschools.org", "ben.tomlinson@kresa.org"],
};
