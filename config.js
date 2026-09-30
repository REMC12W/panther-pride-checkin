// Panther Pride Center check-in settings.
// Edit this file, save, and reload the app. Nothing else needs to change.
window.PPC_CONFIG = {
  // Paste the Google Apps Script "Web app" URL here (see README, step 4).
  // Leave it empty to run in test mode: check-ins are saved only on this device.
  SCRIPT_URL: "",

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

  // How many days of check-ins the staff dashboard loads.
  DASHBOARD_DAYS: 14,
};
