/* Principal dashboard: data layer.
 *
 * Two sources, one shape:
 *  - Demo: made-up students generated here, the same every time (seeded), for a
 *    whole school year. Nothing is read from or written to the Sheet.
 *  - Live: the Sheet, through the script's "dashboard" route with Google sign-in.
 * Switch with PRINCIPAL_DEMO in config.js. Everything on the page reads the
 * normalized tables below (visits, incidents), never the raw rows.
 */
window.PPD = (function () {
  const MOODS = ["Red", "Yellow", "Blue", "Green"];
  const PLEASANT = { Yellow: true, Green: true };
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const REASON_LABEL = { "Drop In: I need a reset": "Reset", "Scheduled Break": "Scheduled break", "Drop In: I have a need": "Has a need", "Break": "Break", "Defiance": "Defiance", "Sickness": "Sickness" };
  const REFERRAL_LABEL = { "Self Referred": "On their own", "Staff Referred": "Sent by staff" };

  const pad = n => String(n).padStart(2, "0");
  const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const monthKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  function weekStart(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; } // Monday
  const weekKey = d => dayKey(weekStart(d));
  const gradeShort = g => { const m = String(g || "").match(/(\d+)/); return m ? m[1] + "th" : ""; };
  const splitList = s => String(s || "").split(",").map(x => x.trim()).filter(Boolean);

  // ---------- Normalize ----------
  function visitFrom(r, grades) {
    const ts = new Date(r.timestamp);
    const moodIn = MOODS.includes(r.moodGroup) ? r.moodGroup : "";
    const moodOut = MOODS.includes(r.outMoodGroup) ? r.outMoodGroup : "";
    const minutes = r.minutes === "" || r.minutes == null ? null : Number(r.minutes);
    const hardIn = moodIn === "Red" || moodIn === "Blue";
    const alert = r.stationSuggested === "Staff first" || r.station === "Staff first";
    return {
      kind: "visit", ts, date: dayKey(ts), week: weekKey(ts), month: monthKey(ts), weekday: WEEKDAYS[ts.getDay()], hour: ts.getHours(),
      grade: gradeShort(r.grade) || (grades && grades[r.studentId]) || "",
      student: r.name || "", studentId: r.studentId || "",
      referral: REFERRAL_LABEL[r.referral] || r.referral || "", reason: r.outcome === "Incident Report" ? "Incident report" : r.need === "Basic Need" ? "Basic need" : (REASON_LABEL[r.reason] || r.reason || ""),
      outcome: r.outcome || "Check In", moodIn, wordIn: r.moodWord || "", energy: r.energy || "", happened: r.happened || "",
      station: r.station && r.station !== "Staff first" ? r.station : "", stationSuggested: r.stationSuggested || "", alert,
      basicNeeds: splitList(r.basicNeeds), checkedOut: !!r.checkoutTime, minutes: Number.isFinite(minutes) ? minutes : null,
      moodOut, wordOut: r.outMoodWord || "", helped: splitList(r.helped), checkedOutBy: /^staff/i.test(r.checkedOutBy || "") ? "Staff" : (r.checkoutTime ? "Student" : ""),
      arrivedHard: hardIn, leftPleasant: moodOut ? !!PLEASANT[moodOut] : null, improved: moodOut && hardIn ? !!PLEASANT[moodOut] : null,
      raw: r
    };
  }
  function incidentFrom(r, grades) {
    const ts = new Date(r.timestamp);
    const followedUp = !!r.reviewed;
    const open = !followedUp || r.status === "Needs more follow-up";
    let days = null;
    if (followedUp) { const m = String(r.reviewed).match(/(\d{4}-\d{2}-\d{2})/); if (m) days = Math.max(0, Math.round((new Date(m[1]) - ts) / 86400000)); }
    return {
      kind: "incident", ts, date: dayKey(ts), week: weekKey(ts), month: monthKey(ts), weekday: WEEKDAYS[ts.getDay()], hour: ts.getHours(),
      grade: gradeShort(r.grade) || (grades && grades[r.studentId]) || "", student: r.name || "", studentId: r.studentId || "",
      types: splitList(r.types), place: r.place || "", period: r.period || "", talk: r.talk === "Yes",
      followedUp, open, action: r.action || "", status: r.status || (followedUp ? "Resolved" : "Open"), daysToFollowUp: days, raw: r
    };
  }
  function normalize(data) {
    const grades = {};
    (data.incidents || []).forEach(r => { if (r.studentId && r.grade) grades[r.studentId] = gradeShort(r.grade); });
    (data.checkins || []).forEach(r => { if (r.studentId && r.grade) grades[r.studentId] = gradeShort(r.grade); });
    const incTimes = new Set((data.incidents || []).map(r => r.timestamp));
    const visits = (data.checkins || []).filter(r => r.timestamp && !(r.outcome === "Incident Report" && incTimes.has(r.timestamp))).map(r => visitFrom(r, grades));
    const incidents = (data.incidents || []).filter(r => r.timestamp).map(r => incidentFrom(r, grades));
    return { visits, incidents, source: data.source || "live", email: data.email || "", sheetUrl: data.sheetUrl || "" };
  }

  // ---------- Demo data: a whole school year of made-up students ----------
  function demoData(now) {
    now = now || new Date();
    let seed = 20260825;
    const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let x = Math.imul(seed ^ seed >>> 15, 1 | seed); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; };
    const pick = a => a[Math.floor(rnd() * a.length)];
    const weighted = pairs => { const t = rnd(); let acc = 0; for (const [v, w] of pairs) { acc += w; if (t <= acc) return v; } return pairs[pairs.length - 1][0]; };
    const WORDS = { Red: ["Frustrated", "Annoyed", "Stressed", "Angry", "Anxious", "Worried", "Nervous", "Irritated", "Furious", "Panicked"],
      Yellow: ["Hyper", "Excited", "Energized", "Happy", "Silly", "Upbeat", "Focused"], Blue: ["Tired", "Sad", "Bored", "Down", "Lonely", "Drained", "Hopeless", "Disappointed"],
      Green: ["Calm", "Okay", "Relaxed", "Content", "Chill", "Peaceful"] };
    const ALERT = ["Enraged", "Livid", "Fuming", "Panicked", "Frightened", "Despair", "Hopeless", "Desolate", "Despondent", "Depressed"];
    const ENERGY = { Red: "Moving Fast", Yellow: "Moving Fast", Blue: "Moving Slow", Green: "Moving Ok" };
    const STRATS = ["Breathing", "Moving my body", "Music", "Writing or drawing", "Quiet time alone", "Talking to a staff member", "Fidget or weighted item", "Snack or water", "A game or puzzle"];
    const NEEDS = ["Food or a snack", "Water or a drink", "Clothing or shoes", "Hygiene items", "School supplies", "Charger or tech help", "Nurse or medical help"];
    const CTX = ["With my Teacher", "At Home", "With a friend", "Just with myself", "Nothing happened", "Not sure right now"];
    const PLACES = ["Classroom", "Hallway", "Bus/Bus Stop", "Outside", "Gym", "Cafeteria", "Bathroom", "Stairwell", "Library", "Other"];
    const PERIODS = ["Before School", "Breakfast", "1st Hour", "2nd Hour", "3rd Hour", "4th Hour", "Lunch", "Recess", "5th Hour", "6th Hour", "7th Hour", "8th Hour", "Passing Time"];
    const ITYPES = ["Someone was mean to me", "Someone hit or pushed me", "Someone threatened me", "Something happened online", "I saw something happen to someone else", "Something was taken or broken", "Something unsafe"];
    const FIRST = ["Ava", "Jaden", "Sofia", "Marcus", "Noah", "Maya", "Lily", "Owen", "Zoe", "Ruby", "Isaac", "Chloe", "Mateo", "Emma", "Liam", "Aria", "Ethan", "Nora", "Caleb", "Layla", "Eli", "Mila", "Jonah", "Ivy", "Theo", "Luna", "Asher", "Hazel", "Miles", "Violet", "Leo", "Stella", "Ezra", "Jade", "Finn", "Elena", "Rowan", "Sage", "Kai", "Nina", "Omar", "Priya"];
    const LAST = "ABCDEFGHJKLMNPRSTVW";
    const students = FIRST.map((f, i) => {
      const grade = ["6th", "7th", "8th"][i % 3];
      const type = weighted([["regular", .2], ["occasional", .35], ["rare", .3], ["scheduled", .15]]);
      const home = weighted([["Red", .35], ["Blue", .35], ["Yellow", .15], ["Green", .15]]);
      return { id: String(100100 + i * 7), name: `${f} ${LAST[i % LAST.length]}.`, grade, type, home,
        rate: { regular: .55, occasional: .22, rare: .07, scheduled: .5 }[type], hours: [pick([8, 9, 10]), pick([9, 11, 13]), pick([12, 13, 14])],
        selfP: .35 + rnd() * .5, works: STRATS.filter(() => rnd() < .45).concat([pick(STRATS)]), helpP: .45 + rnd() * .45, needP: rnd() < .3 ? .25 : 0,
        incP: rnd() < .35 ? .07 : .01 };
    });
    const byId = {}; students.forEach(s => { byId[s.id] = s; });
    const start = new Date(now.getFullYear(), 7, 25); if (start > now) start.setFullYear(start.getFullYear() - 1); // school year starts Aug 25
    const checkins = [], incidents = [];
    const iso = d => d.toISOString();
    for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 1)) {
      const wd = d.getDay(); if (wd === 0 || wd === 6) continue;
      const m = d.getMonth(); if ((m === 11 && d.getDate() > 19) || (m === 0 && d.getDate() < 5) || (m === 2 && d.getDate() >= 23 && d.getDate() < 30)) continue; // breaks
      const seasonal = 1 + .25 * Math.sin((d - start) / 86400000 / 40) + (wd === 1 || wd === 5 ? .15 : 0);
      students.forEach(s => {
        if (rnd() > s.rate * .8 * seasonal) return;
        const t = new Date(d); t.setHours(pick(s.hours), Math.floor(rnd() * 60), Math.floor(rnd() * 60));
        if (t > now) return;
        const q = rnd() < .6 ? s.home : weighted([["Red", .3], ["Blue", .3], ["Yellow", .2], ["Green", .2]]);
        const alertWord = (q === "Red" || q === "Blue") && rnd() < .06;
        const word = alertWord ? pick(ALERT.filter(w => (q === "Red") === ["Enraged", "Livid", "Fuming", "Panicked", "Frightened"].includes(w))) : pick(WORDS[q]);
        const staffSent = s.type === "scheduled" ? rnd() < .7 : rnd() > s.selfP;
        const reason = staffSent ? (s.type === "scheduled" ? weighted([["Scheduled Break", .7], ["Break", .3]]) : weighted([["Break", .5], ["Defiance", .3], ["Sickness", .2]]))
          : (rnd() < s.needP ? "Drop In: I have a need" : (s.type === "scheduled" && rnd() < .5 ? "Scheduled Break" : "Drop In: I need a reset"));
        const basic = reason === "Drop In: I have a need";
        const station = rnd() < .82 ? q : pick(MOODS.filter(x => x !== q));
        const rec = { timestamp: iso(t), name: s.name, studentId: s.id, grade: s.grade + " Grade", referral: staffSent ? "Staff Referred" : "Self Referred", reason,
          energy: ENERGY[q], moodGroup: q, moodWord: word, happened: weighted([[CTX[0], .3], [CTX[1], .2], [CTX[2], .22], [CTX[3], .13], [CTX[4], .08], [CTX[5], .07]]),
          need: basic ? "Basic Need" : "", basicNeeds: basic ? pick(NEEDS) + (rnd() < .3 ? ", " + pick(NEEDS) : "") : "", outcome: basic ? "Basic Need" : "Check In",
          kiosk: "Demo", stationSuggested: alertWord ? "Staff first" : q, station };
        const roll = rnd();
        if (roll < .88) {
          const mins = 8 + Math.floor(rnd() * 28);
          const out = new Date(+t + mins * 60000);
          rec.checkoutTime = iso(out); rec.minutes = mins; rec.checkedOutBy = roll < .78 ? "Student" : "Staff: ms.hall@parchmentschools.org";
          if (roll < .8) {
            const used = [pick(STRATS)]; if (rnd() < .25) used.push(pick(STRATS));
            const worked = used.some(u => s.works.includes(u)) ? rnd() < s.helpP + .2 : rnd() < s.helpP - .25;
            const oq = PLEASANT[q] ? (rnd() < .9 ? q : "Blue") : worked ? (rnd() < .7 ? "Green" : "Yellow") : (rnd() < .75 ? q : (q === "Red" ? "Blue" : "Red"));
            rec.outEnergy = ENERGY[oq]; rec.outMoodGroup = oq; rec.outMoodWord = pick(WORDS[oq]); rec.helped = used.join(", ");
          }
        }
        checkins.push(rec);
        if (rnd() < s.incP) {
          const ti = new Date(+t + 2 * 60000);
          const types = [pick(ITYPES)]; if (rnd() < .3) types.push(pick(ITYPES.filter(x => x !== types[0])));
          const inc = { timestamp: iso(ti), name: s.name, studentId: s.id, grade: s.grade + " Grade", types: types.join(", "), place: weighted([["Hallway", .25], ["Classroom", .2], ["Cafeteria", .15], ["Bus/Bus Stop", .12], ["Outside", .1], ["Bathroom", .08], ["Gym", .05], ["Stairwell", .03], ["Library", .02]]),
            period: pick(PERIODS), story: "Made-up example.", who: "", witness: "", talk: rnd() < .5 ? "Yes" : "Not right now", kiosk: "Demo" };
          const ageDays = (now - ti) / 86400000;
          if (ageDays > 1 && rnd() < .85) {
            const after = Math.min(ageDays, Math.floor(rnd() * 4));
            const rd = new Date(+ti + after * 86400000);
            inc.reviewed = `ms.hall@parchmentschools.org · ${dayKey(rd)} 2:10 PM`;
            inc.action = weighted([["Talked it through", .55], ["Contacted family", .2], ["Referred to counselor", .12], ["Sent to office", .08], ["Other", .05]]);
            inc.status = rnd() < .8 ? "Resolved" : "Needs more follow-up";
          }
          incidents.push(inc);
          checkins.push({ timestamp: iso(ti), name: s.name, studentId: s.id, grade: s.grade + " Grade", referral: "Self Referred", reason: "Drop In: I have a need", need: "Incident Report", outcome: "Incident Report", kiosk: "Demo" });
        }
      });
    }
    checkins.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return { source: "demo", email: "", sheetUrl: "", checkins, incidents, feedback: [], students };
  }

  // ---------- Live data ----------
  async function liveData(scriptUrl, idToken, days) {
    const res = await fetch(scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ type: "principalData", idToken, days: days || 365 }), redirect: "follow" });
    const d = await res.json();
    if (!d.ok) throw new Error(/Bad token|Unknown request/.test(d.error || "") ? "The script in the Sheet needs the new Code.gs deployed (Deploy → Manage deployments → New version)." : (d.error || "Could not load"));
    d.source = "live";
    return d;
  }

  return { normalize, demoData, liveData, MOODS, WEEKDAYS, weekStart, dayKey, weekKey, monthKey };
})();
