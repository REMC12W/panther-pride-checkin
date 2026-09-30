// Panther Pride Center check-in settings.
// Edit this file, save, and reload the app. Nothing else needs to change.
window.PPC_CONFIG = {
  // Kiosk endpoint: the Apps Script deployment with access "Anyone" (README step 4).
  // Leave it empty to run in test mode: check-ins are saved only on this device.
  SCRIPT_URL: "",

  // Admin dashboard: the Apps Script deployment with access "Anyone within kresa.org"
  // (README step 5). staff.html sends staff here; Google asks them to sign in.
  DASHBOARD_URL: "",

  // A label for this device so staff can tell kiosks apart in the Sheet.
  KIOSK_NAME: "Pride Center iPad",

  // Seconds the "You're checked in" screen stays up before returning to start.
  RESET_SECONDS: 8,

  // Seconds of no taps mid-flow before the app quietly returns to start,
  // so the next student never sees a previous student's answers.
  IDLE_SECONDS: 120,

  // The Google Forms the original slide deck linked to. Leave a URL empty to hide
  // that button and finish in-app instead. Both forms require a KRESA Google login.
  FORM_INCIDENT_URL: "https://docs.google.com/forms/d/e/1FAIpQLSdje0uEmj6XIAjNtu8oVpvtO9ix5l7jL_QO7txhiTFJTzJg0g/viewform?usp=header",
  FORM_SIGNIN_URL:   "https://docs.google.com/forms/d/e/1FAIpQLSff7BwiBHnNVS7DDczWokE5al_T83F7ubH3DCsG_YAsfJCKXg/viewform?usp=header",

  // Basic needs a student can request after tapping "I have a basic need".
  // Add, remove, or reorder freely. Students can pick more than one.
  BASIC_NEEDS: [
    { icon: "🍎", label: "Food or a snack" },
    { icon: "💧", label: "Water or a drink" },
    { icon: "🧥", label: "Clothing, coat, or shoes" },
    { icon: "🧼", label: "Hygiene items" },
    { icon: "🩷", label: "Period products" },
    { icon: "✏️", label: "School supplies" },
    { icon: "😴", label: "Rest or a quiet spot" },
    { icon: "🩹", label: "Nurse or medical help" },
    { icon: "💬", label: "Talk to a counselor or trusted adult" },
    { icon: "🎒", label: "Backpack" },
    { icon: "🔌", label: "Charger or tech help" },
    { icon: "❓", label: "Something else" },
  ],

  // Regulation stations, color-coded to the mood meter quadrants. The app suggests
  // the station matching the student's mood word, then lets them choose.
  STATIONS: [
    { color: "Red",    label: "Red station",    hint: "Move it out, then slow it down" },
    { color: "Yellow", label: "Yellow station", hint: "Put the energy to work" },
    { color: "Blue",   label: "Blue station",   hint: "Settle in, take your time" },
    { color: "Green",  label: "Green station",  hint: "Keep it steady" },
  ],

  // Mood words that mean a staff member should come to the student before any
  // station. The app shows "a staff member is coming to you" instead of the picker.
  STAFF_FIRST_WORDS: [
    "Enraged", "Livid", "Fuming", "Panicked", "Frightened",
    "Despair", "Hopeless", "Desolate", "Despondent", "Depressed",
  ],

  // Check-out: what helped. Students can pick more than one.
  WHAT_HELPED: [
    { icon: "🫁", label: "Breathing" },
    { icon: "🚶", label: "Moving my body" },
    { icon: "🎧", label: "Music" },
    { icon: "📓", label: "Writing or drawing" },
    { icon: "🤫", label: "Quiet time alone" },
    { icon: "💬", label: "Talking to a staff member" },
    { icon: "🧸", label: "Fidget or weighted item" },
    { icon: "🍎", label: "Snack or water" },
    { icon: "🎲", label: "A game or puzzle" },
    { icon: "❓", label: "Something else" },
    { icon: "🤷", label: "Nothing really helped" },
  ],

  // How many days of check-ins the staff dashboard loads.
  DASHBOARD_DAYS: 14,
};
