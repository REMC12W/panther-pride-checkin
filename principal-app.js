/* Principal dashboard: boards, tiles, editor, layout, saving, exports. */
(function () {
  const D = window.PPD, C = window.PPC_CHARTS, R = window.PPR;
  const CFG = Object.assign({ SCRIPT_URL: "", GOOGLE_CLIENT_ID: "", ALLOWED_DOMAIN: "", PRINCIPAL_DEMO: true }, window.PPC_CONFIG || {});
  // Sample (made-up school year) or Live (the Sheet). PRINCIPAL_DEMO sets the default; the header switch remembers the choice per browser.
  const SOURCE_KEY = "ppc_principal_source";
  let source = (() => { if (!CFG.SCRIPT_URL) return "sample"; try { const s = localStorage.getItem(SOURCE_KEY); if (s === "sample" || s === "live") return s; } catch {} return CFG.PRINCIPAL_DEMO ? "sample" : "live"; })();
  let loadSeq = 0, boardsOk = false, dirty = false, pendingShare = null, studentNames = new Set();
  const DIRTY_KEY = "ppc_principal_dirty";
  const dirtyOnLoad = (() => { try { return localStorage.getItem(DIRTY_KEY) === "1"; } catch { return false; } })();
  const $ = s => document.querySelector(s);
  // Lucide icons from icons.js (the design system uses no emoji).
  const IC = (name, size, label) => window.PPC_ICON ? window.PPC_ICON(name, size, label) : "";
  const esc = C.esc;
  const STORE_KEY = "ppc_principal_v1";
  const uid = () => Math.random().toString(36).slice(2, 9);
  let tables = null, state = null, idToken = sessionStorage.getItem("ppc_id_token") || "", views = {}, aggs = {}, saveTimer = null;

  // ---------- Starter boards ----------
  const tile = (o) => Object.assign({ id: uid(), dataset: "visit", measure: "count", dimension: "week", chart: "bar", range: "board", filters: [], compare: "none", w: 6, h: 4 }, o);
  const notice = focus => tile({ title: "What the research says", chart: "research", focus, w: 12, h: 1 });
  // Boards saved before titles were shortened: rename tiles still carrying an old starter title.
  const OLD_TITLES = {
    "Students this period": ["Students", null],
    "Came in red or blue, left green or yellow": ["Recovered", "Came in red or blue and left green or yellow"],
    "Incidents followed up": ["Followed up", "Incident reports with a follow-up recorded"],
    "Mood on arrival by grade": ["Arrival mood by grade", null],
    "Mood in → mood out": ["Mood in → out", "Mood on arrival to mood at check-out"],
    "What helped (share leaving green or yellow)": ["What helped", "Share leaving green or yellow after using each strategy"],
    "Incidents by place": ["Where incidents happen", null],
    "Incident reports by week": ["Reports by week", null],
    "Incidents by grade": ["Reports by grade", null],
    "Report log by status": ["Follow-up status", null],
    "Students with the most visits": ["Most visits", null],
    "Arriving red or blue, by student": ["Arriving red or blue", "Share of each student's visits that started red or blue"],
    "Alert words by week": ["Alert words", "Share of visits that started with an alert word, by week"],
    "Sent by staff vs came on their own": ["Sent vs on their own", "Visits sent by staff compared with students coming on their own"],
    "Minutes in room vs visits, by student": ["Minutes vs visits", "Average minutes in the room against number of visits, one dot per student"],
    "Basic needs requested": ["Basic needs", null]
  };
  function starterBoards() {
    return [
      { id: uid(), name: "Overview", layout: "grid", noticeSeeded: true, tiles: [
        notice("overview"),
        tile({ title: "Students", chart: "number", measure: "students", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Visits", chart: "number", measure: "count", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Recovered", hint: "Came in red or blue and left green or yellow", chart: "number", measure: "pctImproved", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Followed up", hint: "Incident reports with a follow-up recorded", chart: "number", dataset: "incident", measure: "pctFollowedUp", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Visits by week", chart: "line", dimension: "week", compare: "previous", w: 8, h: 4 }),
        tile({ title: "Arrival mood by grade", chart: "stacked", dimension: "grade", breakdown: "moodIn", w: 4, h: 4 }),
        tile({ title: "Busiest times", chart: "heatmap", dimension: "weekday", breakdown: "hour", w: 6, h: 4 }),
        tile({ title: "Mood in → out", hint: "Mood on arrival to mood at check-out", chart: "sankey", w: 6, h: 4 }),
        tile({ title: "Why students come", chart: "barh", dimension: "reason", w: 4, h: 4 }),
        tile({ title: "What helped", hint: "Share leaving green or yellow after using each strategy", chart: "barh", dimension: "helped", measure: "pctLeftOk", w: 4, h: 4 }),
        tile({ title: "Where incidents happen", chart: "bar", dataset: "incident", measure: "incidents", dimension: "place", w: 4, h: 4 }),
      ] },
      { id: uid(), name: "Incidents", layout: "grid", noticeSeeded: true, tiles: [
        notice("incidents"),
        tile({ title: "Reports by week", chart: "bar", dataset: "incident", measure: "incidents", dimension: "week", w: 8, h: 4 }),
        tile({ title: "Still open", chart: "number", dataset: "incident", measure: "pctOpen", w: 4, h: 3 }),
        tile({ title: "Days to follow-up", chart: "number", dataset: "incident", measure: "avgDaysFU", compare: "previous", w: 4, h: 3 }),
        tile({ title: "Where and when", chart: "heatmap", dataset: "incident", measure: "incidents", dimension: "period", breakdown: "place", w: 8, h: 5 }),
        tile({ title: "What happened", chart: "barh", dataset: "incident", measure: "incidents", dimension: "type", w: 4, h: 5 }),
        tile({ title: "Follow-up actions", chart: "donut", dataset: "incident", measure: "incidents", dimension: "action", w: 4, h: 4 }),
        tile({ title: "Reports by grade", chart: "bar", dataset: "incident", measure: "incidents", dimension: "grade", w: 4, h: 4 }),
        tile({ title: "Follow-up status", chart: "table", dataset: "incident", measure: "incidents", dimension: "status", w: 4, h: 4 }),
      ] },
      { id: uid(), name: "Support", layout: "grid", noticeSeeded: true, tiles: [
        notice("support"),
        tile({ title: "Most visits", chart: "table", dimension: "student", top: 12, w: 4, h: 6 }),
        tile({ title: "Arriving red or blue", hint: "Share of each student's visits that started red or blue", chart: "barh", dimension: "student", measure: "pctHard", top: 12, w: 4, h: 6 }),
        tile({ title: "Alert words", hint: "Share of visits that started with an alert word, by week", chart: "bar", dimension: "week", measure: "pctAlert", w: 4, h: 3 }),
        tile({ title: "Sent vs on their own", hint: "Visits sent by staff compared with students coming on their own", chart: "area", dimension: "week", breakdown: "referral", compare: "groups", w: 4, h: 3 }),
        tile({ title: "Minutes vs visits", hint: "Average minutes in the room against number of visits, one dot per student", chart: "scatter", dimension: "student", measure: "avgMinutes", compare: "measures", measure2: "count", top: 999, w: 6, h: 5 }),
        tile({ title: "Basic needs", chart: "donut", dimension: "basicNeed", w: 6, h: 5 }),
      ] },
    ];
  }
  const GALLERY = [
    ["Visits by week", "Line, compared with the previous period", { chart: "line", dimension: "week", compare: "previous" }],
    ["Visits by day of week", "Bars", { chart: "bar", dimension: "weekday" }],
    ["Busiest hours", "Heatmap of day of week by hour", { chart: "heatmap", dimension: "weekday", breakdown: "hour" }],
    ["Calendar of visits", "One square per school day", { chart: "calendar", dimension: "date", h: 3 }],
    ["Mood on arrival by grade", "Stacked bars", { chart: "stacked", dimension: "grade", breakdown: "moodIn" }],
    ["Mood in → out", "Flow from arrival to check-out", { chart: "sankey" }],
    ["What helped", "Share leaving green or yellow per strategy", { chart: "barh", dimension: "helped", measure: "pctLeftOk" }],
    ["Stations: did they go where suggested?", "Big number", { chart: "number", measure: "pctSuggested", w: 3, h: 3 }],
    ["Why students come", "Horizontal bars", { chart: "barh", dimension: "reason" }],
    ["Did something happen", "Donut", { chart: "donut", dimension: "happened" }],
    ["Incidents by place", "Bars", { dataset: "incident", measure: "incidents", chart: "bar", dimension: "place" }],
    ["Incidents: where by when", "Heatmap", { dataset: "incident", measure: "incidents", chart: "heatmap", dimension: "period", breakdown: "place", h: 5 }],
    ["Follow-up status", "Table", { dataset: "incident", measure: "incidents", chart: "table", dimension: "status" }],
    ["Repeat visitors", "Table of students by visits", { chart: "table", dimension: "student", top: 12, h: 5 }],
    ["Grade 6 vs 7 vs 8 over time", "Grouped lines by grade", { chart: "line", dimension: "week", breakdown: "grade", compare: "groups" }],
    ["One student vs everyone", "Pick a student in the editor", { chart: "grouped", dimension: "weekday", compare: "student" }],
    ["What the research says", "A notice tied to this board's data, with a research card", { chart: "research", focus: "all", w: 12, h: 1 }],
  ];
  // Boards saved before the research library existed get their notice once; deleting it afterwards sticks.
  function ensureNotices() {
    let changed = false;
    state.boards.forEach(b => b.tiles.forEach(t => { const m = OLD_TITLES[t.title]; if (m) { t.title = m[0]; if (m[1] && !t.hint) t.hint = m[1]; changed = true; } }));
    state.boards.forEach(b => {
      if (b.noticeSeeded) return;
      b.noticeSeeded = true; changed = true;
      const focus = { Overview: "overview", Incidents: "incidents", Support: "support" }[b.name];
      if (focus && !b.tiles.some(t => t.chart === "research")) b.tiles.unshift(notice(focus));
    });
    if (changed) persist();
  }

  // ---------- Cleaning what comes from outside (the Sheet, a share link, old saved state) ----------
  const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const clampInt = (v, lo, hi, d) => { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : d; };
  const strOf = (v, max, d) => typeof v === "string" ? v.slice(0, max) : d;
  const cleanName = (n, d) => String(n == null ? "" : n).replace(/\s+/g, " ").trim().slice(0, 60) || d;
  function cleanTile(t) {
    if (!t || typeof t !== "object" || Array.isArray(t)) return null;
    const o = tile({});
    o.id = strOf(t.id, 24, "") || o.id;
    o.title = strOf(t.title, 120, ""); if (typeof t.hint === "string") o.hint = t.hint.slice(0, 200);
    o.chart = t.chart === "research" || (typeof t.chart === "string" && has(C.CHARTS, t.chart)) ? t.chart : "bar";
    o.dataset = typeof t.dataset === "string" && has(C.DATASETS, t.dataset) ? t.dataset : "visit";
    o.measure = typeof t.measure === "string" && has(C.MEASURES, t.measure) && C.MEASURES[t.measure].for.includes(o.dataset) ? t.measure : (o.dataset === "incident" ? "incidents" : "count");
    if (typeof t.measure2 === "string" && has(C.MEASURES, t.measure2)) o.measure2 = t.measure2;
    o.dimension = typeof t.dimension === "string" && has(C.DIMENSIONS, t.dimension) ? t.dimension : "week";
    o.breakdown = typeof t.breakdown === "string" && has(C.DIMENSIONS, t.breakdown) ? t.breakdown : null;
    o.compare = ["none", "previous", "groups", "measures", "student"].includes(t.compare) ? t.compare : "none";
    if (typeof t.student === "string") o.student = t.student.slice(0, 80);
    o.range = typeof t.range === "string" && has(C.RANGE_LABELS, t.range) ? t.range : "board";
    if (t.custom && typeof t.custom === "object") o.custom = { start: strOf(t.custom.start, 10, ""), end: strOf(t.custom.end, 10, "") };
    if (t.top != null) o.top = clampInt(t.top, 1, 999, 12);
    o.filters = Array.isArray(t.filters) ? t.filters.filter(f => f && typeof f.dim === "string" && has(C.DIMENSIONS, f.dim) && Array.isArray(f.values)).slice(0, 12).map(f => ({ dim: f.dim, values: f.values.filter(v => typeof v === "string").slice(0, 40).map(v => v.slice(0, 80)) })).filter(f => f.values.length) : [];
    o.w = clampInt(t.w, 2, 12, 6); o.h = clampInt(t.h, 1, 10, 4);
    if (o.chart === "research") { o.focus = ["overview", "incidents", "support", "all"].includes(t.focus) ? t.focus : "all"; if (typeof t.cardId === "string") o.cardId = t.cardId.slice(0, 40); }
    return o;
  }
  function cleanBoards(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.filter(b => b && typeof b === "object" && Array.isArray(b.tiles)).slice(0, 30).map(b => ({ id: strOf(b.id, 24, "") || uid(), name: cleanName(b.name, "Board"), layout: b.layout === "list" ? "list" : "grid", noticeSeeded: !!b.noticeSeeded, tiles: b.tiles.slice(0, 80).map(cleanTile).filter(Boolean) }));
  }
  // Grades come from what's in the data, not a fixed 6-7-8 list.
  const gradeNum = g => g === "K" ? 0 : parseInt(g, 10);
  function gradesPresent() {
    if (!tables) return [];
    const set = new Set(); tables.visits.forEach(r => r.grade && set.add(r.grade)); tables.incidents.forEach(r => r.grade && set.add(r.grade));
    return [...set].sort((a, b) => gradeNum(a) - gradeNum(b));
  }
  const hasUnknownGrade = () => !!tables && gradesPresent().length > 0 && (tables.visits.some(r => !r.grade) || tables.incidents.some(r => !r.grade));
  const effectiveGrades = () => { const p = gradesPresent(); return state.grades.filter(g => p.includes(g) || (g === "Unknown" && hasUnknownGrade())); };
  // Undo: remember the boards before a delete, then offer to put them back.
  let undoData = null;
  const snapshot = () => { undoData = JSON.stringify({ boards: state.boards, active: state.active }); };
  function undoable(msg) {
    const snap = undoData;
    toast(msg, { label: "Undo", fn: () => { try { const s = JSON.parse(snap); state.boards = s.boards; state.active = s.active; persist(); renderAll(); toast("Put back."); } catch {} } }, 8000);
  }
  function deleteTile(id) { snapshot(); const bd = board(); bd.tiles = bd.tiles.filter(x => x.id !== id); persist(); renderBoard(); undoable("Tile deleted."); }
  const safeName = s => String(s).normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "tile";

  // ---------- State ----------
  function defaultState() { return { boards: starterBoards(), active: null, locked: true, range: "year", custom: {}, grades: [] }; }
  function loadLocal() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); return s && Array.isArray(s.boards) && s.boards.length ? s : null; } catch { return null; } }
  // Boards: always saved on this device; also saved to the Sheet once the saved boards have been read (so a failed read can't be overwritten).
  function persist() {
    state.locked = true === state.locked;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
    if (CFG.SCRIPT_URL && idToken && boardsOk) { markDirty(true); clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRemote(), 700); }
  }
  function markDirty(v) { dirty = v; try { v ? localStorage.setItem(DIRTY_KEY, "1") : localStorage.removeItem(DIRTY_KEY); } catch {} }
  async function saveRemote(keepalive) {
    if (!boardsOk || !dirty || !idToken) return;
    clearTimeout(retryTimer);
    try {
      const d = await post({ type: "boardSave", boards: state.boards }, keepalive ? { keepalive: true } : null);
      if (!d.ok) throw fail(d);
      markDirty(false);
      setStatus("Saved to the Sheet", 2500);
    } catch (err) {
      if (err.auth) return expiredBanner();
      setStatus("Not saved to the Sheet yet. Your changes are kept on this device and we'll keep trying.");
      retryTimer = setTimeout(() => saveRemote(), 20000);
    }
  }
  let retryTimer = null;
  window.addEventListener("online", () => saveRemote());
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") saveRemote(); else if (dirty) saveRemote(true); });
  window.addEventListener("pagehide", () => { if (dirty) saveRemote(true); });
  const board = () => state.boards.find(b => b.id === state.active) || state.boards[0];

  // ---------- Data ----------
  const fail = d => D.scriptError(d);
  async function post(body, extra) { return D.postScript(CFG.SCRIPT_URL, Object.assign({ idToken }, body), extra); }
  const OLD_SCRIPT = /Bad token|Unknown request/;
  const hasGradeRows = () => !!(tables && gradesPresent().length);

  // A banner stays on screen until it's answered. Used for load problems and an expired sign-in.
  function showBanner(msg, actions) {
    $("#bannerMsg").textContent = msg;
    const box = $("#bannerActs"); box.innerHTML = "";
    (actions || []).forEach(a => { const b = document.createElement("button"); b.type = "button"; b.className = "btn sm"; b.textContent = a.label; b.addEventListener("click", a.fn); box.appendChild(b); });
    $("#banner").classList.remove("hidden");
  }
  const hideBanner = () => $("#banner").classList.add("hidden");
  function expiredBanner() { showBanner("Your sign-in ran out. Your changes are safe on this device.", [{ label: "Sign in again", fn: () => signOut() }]); }
  /** Sign-in problems send the person to the login page. Anything else (no Wi-Fi, a slow Sheet, an old script) keeps them here with a way to retry. */
  function handleLoadError(err) {
    if (err && err.auth) return signOut(err.message);
    const acts = [{ label: "Try again", fn: () => reload() }];
    if (source === "live") acts.push({ label: "Use sample data", fn: () => switchTo("sample") });
    showBanner((err && err.message) || "Something went wrong. Try again.", acts);
    setStatus("");
  }
  async function reload(fresh) { try { await loadData({ fresh }); } catch (err) { handleLoadError(err); } }
  /** Returns true when this load's result was shown, false when a newer load took over. */
  async function loadData(opt) {
    const my = ++loadSeq, mine = () => my === loadSeq;
    setStatus("Loading…"); hideBanner();
    $("#signOutBtn").classList.remove("hidden"); $("#refreshBtn").disabled = true;
    renderSource();
    let fresh, who, sheetUrl = null;
    try {
      if (source === "sample") {
        // Sample data is made up, but the page is still limited to the principal: the script checks the sign-in.
        const a = await post({ type: "principalAuth" });
        if (!a.ok) throw fail(a);
        fresh = D.normalize(D.demoData()); who = `${a.email} · Sample data (a made-up school year)`;
      } else {
        const d = await D.liveData(CFG.SCRIPT_URL, idToken, 365);
        fresh = D.normalize(d); who = `${d.email} · Live from the Sheet`; sheetUrl = d.sheetUrl || null;
      }
      if (!mine()) return false;
      // Saved boards are the same in both modes. Read them once per visit (and again on an explicit Refresh when nothing is waiting to be saved).
      let boardsNote = null;
      if (CFG.SCRIPT_URL && (!boardsOk || (opt && opt.fresh && !dirty))) {
        let remote = null; try { remote = await post({ type: "boardLoad" }); } catch (err) { remote = null; }
        if (!mine()) return false;
        if (remote && remote.ok && Array.isArray(remote.boards)) {
          const had = boardsOk; boardsOk = true;
          const good = cleanBoards(remote.boards);
          if (dirtyOnLoad && !had && !dirty) { markDirty(true); saveRemote(); }          // edits from last time that never reached the Sheet win
          else if (good.length && (!had || JSON.stringify(good) !== JSON.stringify(state.boards))) { state.boards = good; state.active = good.some(b => b.id === state.active) ? state.active : good[0].id; try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {} }
        } else boardsNote = "We couldn't read your saved boards. Changes you make now stay on this device only until this works.";
      }
      tables = fresh; $("#who").textContent = who;
      if (sheetUrl) { $("#sheetLink").href = sheetUrl; $("#sheetLink").classList.remove("hidden"); } else $("#sheetLink").classList.add("hidden");
      studentNames = new Set(tables.visits.map(v => v.student).filter(Boolean));
      $("#studentList").innerHTML = [...studentNames].sort().map(n => `<option value="${esc(n)}">`).join("");
      setStatus("");
      renderAll();
      if (boardsNote) showBanner(boardsNote, [{ label: "Try again", fn: () => reload() }]);
      applyShared();
      return true;
    } catch (err) {
      if (!mine()) return false;
      throw err;
    } finally {
      if (mine()) { $("#refreshBtn").disabled = false; }
    }
  }
  let statusTimer;
  function setStatus(t, ms) { $("#status").textContent = t; clearTimeout(statusTimer); if (ms) statusTimer = setTimeout(() => { if ($("#status").textContent === t) $("#status").textContent = ""; }, ms); }
  function renderSource() {
    const box = $("#sourceSwitch"); if (!box) return;
    box.classList.toggle("hidden", !CFG.SCRIPT_URL);
    box.querySelectorAll("[data-src]").forEach(b => { const on = b.dataset.src === source; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  }
  /** Switch between Sample and Live. The choice is only kept once the new data actually loaded. */
  async function switchTo(next) {
    if (next === source) return;
    const prev = source; source = next; renderSource();
    try { const ok = await loadData(); if (ok) { try { localStorage.setItem(SOURCE_KEY, source); } catch {} } }
    catch (err) { source = prev; renderSource(); if (err && err.auth) return signOut(err.message); showBanner((err && err.message) || "Couldn't switch.", [{ label: "OK", fn: hideBanner }]); setStatus(""); }
  }
  document.querySelectorAll("#sourceSwitch [data-src]").forEach(b => b.addEventListener("click", () => switchTo(b.dataset.src)));

  // ---------- Sign-in (live only) ----------
  function start() {
    state = loadLocal() || defaultState();
    state.boards = cleanBoards(state.boards); if (!state.boards.length) state.boards = starterBoards();
    state.active = state.boards.some(b => b.id === state.active) ? state.active : state.boards[0].id;
    if (!idToken && /share=/.test(location.hash)) { try { sessionStorage.setItem("ppc_share_hash", location.hash); } catch {} }
    pendingShare = parseShared();
    $("#gateText").textContent = "This page is for the principal and the people the principal adds. Sign in with your school Google account.";
    if (!CFG.GOOGLE_CLIENT_ID || !CFG.SCRIPT_URL) { $("#gate").classList.remove("hidden"); $("#gateMsg").textContent = "Sign-in isn't set up: add GOOGLE_CLIENT_ID and SCRIPT_URL to config.js."; return; }
    if (idToken) { $("#app").classList.remove("hidden"); renderTabs(); renderToolbar(); renderSkeleton(); reload(); return; }
    // One sign-in page for everyone: it sends people back here if they have principal access.
    if (!window.PPD_NO_LOGIN_REDIRECT) { location.replace("login.html?next=principal"); return; }
    $("#gate").classList.remove("hidden");
    const pending = sessionStorage.getItem("ppc_signin_msg"); if (pending) { $("#gateMsg").textContent = pending; sessionStorage.removeItem("ppc_signin_msg"); }
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, auto_select: false, ux_mode: "popup", callback: resp => {
        idToken = resp.credential; sessionStorage.setItem("ppc_id_token", idToken);
        $("#gate").classList.add("hidden"); $("#app").classList.remove("hidden"); renderTabs(); renderToolbar(); renderSkeleton(); reload();
      } });
      google.accounts.id.renderButton($("#gsiBtn"), { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 280 });
    };
    s.onerror = () => { const m = $("#gateMsg"); m.textContent = (m.textContent ? m.textContent + " " : "") + "Couldn't load Google sign-in. Check the network and try again."; };
    document.head.appendChild(s);
  }
  function signOut(msg) { idToken = ""; sessionStorage.removeItem("ppc_id_token"); if (msg) sessionStorage.setItem("ppc_signin_msg", msg); location.replace(window.PPD_NO_LOGIN_REDIRECT ? location.href : "login.html?next=principal"); }
  // Signing out on purpose also clears the boards kept on this device (they can name students), unless something is still waiting to be saved.
  $("#signOutBtn").addEventListener("click", () => { if (!dirty) { try { localStorage.removeItem(STORE_KEY); } catch {} } signOut(); });
  $("#refreshBtn").addEventListener("click", () => reload(true));
  function renderSkeleton() { if (!tables) $("#board").innerHTML = `<div class="tile skeleton"></div>`.repeat(6); }

  // ---------- Render ----------
  function renderAll() { ensureNotices(); renderTabs(); renderToolbar(); renderBoard(); }
  function renderTabs() {
    $("#tabs").innerHTML = state.boards.map(b => `<button class="tab ${b.id === state.active ? "on" : ""}" data-id="${b.id}"${b.id === state.active ? ' aria-current="true"' : ""}>${esc(b.name)}</button>`).join("") + `<button class="tab add" id="addBoard">${IC("plus", 16)}New board</button>`;
    $("#tabs").querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => { state.active = b.dataset.id; persist(); renderAll(); }));
    $("#addBoard").addEventListener("click", () => { const name = cleanName(prompt("Name the new board:", "New board"), ""); if (!name) return; const b = { id: uid(), name, layout: "grid", tiles: [] }; state.boards.push(b); state.active = b.id; persist(); renderAll(); });
  }
  function renderToolbar() {
    const sel = $("#rangeSel");
    sel.innerHTML = Object.entries(C.RANGE_LABELS).filter(([k]) => k !== "board").map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    sel.value = state.range || "year";
    const custom = sel.value === "custom";
    $("#customStart").classList.toggle("hidden", !custom); $("#customEnd").classList.toggle("hidden", !custom);
    $("#customStart").value = (state.custom && state.custom.start) || ""; $("#customEnd").value = (state.custom && state.custom.end) || "";
    const present = gradesPresent(), on = effectiveGrades();
    if (!tables) $("#gradeFilter").innerHTML = "";
    else if (!present.length) $("#gradeFilter").innerHTML = `<span class="lbl">No grades yet. Add students in the Sheet's Roster tab.</span>`;
    else $("#gradeFilter").innerHTML = present.concat(hasUnknownGrade() ? ["Unknown"] : []).map(g => `<button type="button" class="btn sm ${on.includes(g) ? "on" : ""}" aria-pressed="${on.includes(g)}" data-g="${esc(g)}">${g === "Unknown" ? "No grade" : esc(g)}</button>`).join("");
    $("#gradeFilter").querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => { const g = b.dataset.g, cur = effectiveGrades(); state.grades = cur.includes(g) ? cur.filter(x => x !== g) : cur.concat(g); persist(); renderAll(); }));
    $("#layoutSel").value = board().layout || "grid";
    $("#lockBtn").innerHTML = state.locked ? IC("lock", 16) + "Unlock to rearrange" : IC("lock-open", 16) + "Done rearranging";
    $("#lockBtn").classList.toggle("on", !state.locked); $("#lockBtn").setAttribute("aria-pressed", String(!state.locked));
    const eg = effectiveGrades();
    $("#rangeSel").title = rangeText();
    $("#printTitle").textContent = `Pride Center · ${board().name} · ${rangeText()}${eg.length ? " · Grades " + eg.join(", ") : ""} · ${source === "sample" ? "Sample data" : "Live data"}`;
  }
  /** "This week (Oct 19 to Oct 24)": what the board is actually showing. */
  function rangeText() {
    const r = C.range(state.range, new Date(), state.custom), f = d => d.toLocaleDateString([], { month: "short", day: "numeric", year: d.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
    return `${C.RANGE_LABELS[state.range] || ""} (${f(r.start)} to ${f(r.end)})`;
  }
  $("#rangeSel").addEventListener("change", e => { state.range = e.target.value; persist(); renderAll(); });
  ["#customStart", "#customEnd"].forEach(s => $(s).addEventListener("change", () => {
    const a = $("#customStart").value, b = $("#customEnd").value;
    if (a && b && a > b) { toast("The start date is after the end date."); $("#customStart").value = (state.custom && state.custom.start) || ""; $("#customEnd").value = (state.custom && state.custom.end) || ""; return; }
    state.custom = { start: a, end: b }; persist(); renderAll();
  }));
  $("#layoutSel").addEventListener("change", e => { board().layout = e.target.value; persist(); renderBoard(); });
  $("#lockBtn").addEventListener("click", () => { state.locked = !state.locked; persist(); renderToolbar(); renderBoard(); if (!state.locked) toast(board().layout === "list" ? "Use the arrows to reorder. Tap Done rearranging when finished." : "Drag a tile by its handle to move it, or drag the corner to resize. Tap Done rearranging when finished."); });
  $("#addTileBtn").addEventListener("click", openGallery);

  const boardOpts = () => { const g = effectiveGrades(); return { range: state.range, custom: state.custom, filters: g.length ? [{ dim: "grade", values: g }] : [] }; };
  const hasFilters = t => effectiveGrades().length > 0 || (t.filters || []).length > 0;

  function tileTitle(t) {
    if (t.title) return t.title;
    if (t.chart === "research") return "What the research says";
    const m = C.MEASURES[t.measure] ? C.MEASURES[t.measure].label : "Visits";
    const d = t.chart !== "number" && C.DIMENSIONS[t.dimension] ? " by " + C.DIMENSIONS[t.dimension].label.toLowerCase() : "";
    return m + d;
  }
  // Small chips beside the title instead of a subtitle line: only what changes how to read the tile.
  function tileChips(t) {
    if (t.chart === "research") return "";
    const chips = [];
    if (t.range && t.range !== "board") chips.push([IC("calendar-days", 12) + esc(C.RANGE_LABELS[t.range] || ""), "Date range for this tile"]);
    if (t.compare === "previous") chips.push([IC("history", 12), "Compared with the period just before"]);
    if (t.compare === "student" && t.student) chips.push([IC("user", 12) + esc(t.student), t.student + " compared with everyone"]);
    (t.filters || []).forEach(f => { if (f.values && f.values.length && C.DIMENSIONS[f.dim]) chips.push([esc(f.values.length > 2 ? C.DIMENSIONS[f.dim].label + ": " + f.values.length : f.values.join(", ")), C.DIMENSIONS[f.dim].label + ": " + f.values.join(", ")]); });
    return chips.map(([h, title]) => `<span class="tchip" title="${esc(title)}">${h}</span>`).join("");
  }
  function tileSub(t) {
    if (t.chart === "research") return t.cardId ? "Pinned from the research library" : "Matched to this board's date range and filters";
    const bits = [];
    if (t.range && t.range !== "board") bits.push(C.RANGE_LABELS[t.range]);
    if (t.compare === "previous") bits.push("vs previous period");
    if (t.compare === "student" && t.student) bits.push(t.student + " vs everyone");
    if (t.compare === "measures" && t.measure2 && C.MEASURES[t.measure2]) bits.push("with " + C.MEASURES[t.measure2].label.toLowerCase());
    (t.filters || []).forEach(f => { if (f.values && f.values.length) bits.push(C.DIMENSIONS[f.dim].label + ": " + f.values.join(", ")); });
    return bits.join(" · ");
  }

  function renderBoard() {
    const b = board(), el = $("#board");
    Object.values(views).forEach(v => { try { v.finalize(); } catch {} }); views = {}; aggs = {};
    el.className = "board" + (b.layout === "list" ? " list" : "") + (state.locked ? "" : " unlocked");
    el.innerHTML = "";
    if (tables && !tables.visits.length && !tables.incidents.length) {
      // Nothing in the Sheet yet: say so once instead of filling the board with empty tiles.
      el.className = "board";
      el.innerHTML = `<div class="emptyboard"><h3>No check-ins yet</h3><p>Charts appear here after students use the Pride Center iPad. Until then you can look around with sample data.</p><div class="eb-acts"><button type="button" class="btn primary" id="ebSample">Explore sample data</button></div></div>`;
      $("#ebSample").addEventListener("click", () => switchTo("sample"));
      return;
    }
    if (tables && source === "live" && tables.visits.length > 0 && tables.visits.length < 10) setStatus(`Only ${tables.visits.length} visit${tables.visits.length === 1 ? "" : "s"} so far, so charts will look sparse until more check-ins arrive.`);
    b.tiles.forEach((t, i) => {
      const d = document.createElement("div");
      d.className = "tile" + (t.chart === "research" ? " research" : "");
      d.dataset.id = t.id; d.dataset.w = String(t.w || 6); d.dataset.chart = t.chart;
      if (b.layout !== "list") { d.style.gridColumn = `span ${Math.min(12, Math.max(2, t.w || 6))}`; d.style.gridRow = `span ${Math.max(t.chart === "research" ? 1 : 2, t.h || 4)}`; }
      d.innerHTML = `<div class="head"><span class="grip" title="Drag to move">${IC("grip-vertical", 18)}</span><h3 title="${esc(t.hint || tileTitle(t))}">${esc(tileTitle(t))}</h3>${tileChips(t)}
        <span class="order"><button type="button" data-mv="-1" title="Move up" aria-label="Move up">${IC("arrow-up", 16)}</button><button type="button" data-mv="1" title="Move down" aria-label="Move down">${IC("arrow-down", 16)}</button></span>
        <div class="menu"><button type="button" class="kebab" aria-label="Tile menu">${IC("ellipsis", 18)}</button><ul>
          <li><button type="button" data-act="edit">Edit…</button></li><li><button type="button" data-act="dup">Duplicate</button></li>
          <li><button type="button" data-act="csv">Download numbers (CSV)</button></li><li><button type="button" data-act="img">Copy as image</button></li>
          <li><button type="button" data-act="drill">See the records</button></li><li><button type="button" data-act="del">Delete</button></li></ul></div></div>
        <div class="take"></div><div class="body"><div class="vis"></div></div><div class="resize" title="Drag to resize"></div>`;
      el.appendChild(d);
      wireTile(d, t, i);
      renderTile(d, t);
    });
    const add = document.createElement("button"); add.type = "button"; add.className = "add-tile"; add.innerHTML = IC("plus", 18) + "Add tile"; add.addEventListener("click", openGallery); el.appendChild(add);
  }

  async function renderTile(d, t) {
    const vis = d.querySelector(".vis"), body = d.querySelector(".body");
    body.classList.toggle("scroll", t.chart === "table");
    if (t.chart === "research") return renderResearch(vis, t);
    let agg;
    try { agg = C.aggregate(tables, t, boardOpts()); } catch (err) { console.error(err); vis.innerHTML = `<div class="empty">This tile couldn't be drawn. Try Refresh, or Edit the tile.</div>`; return; }
    aggs[t.id] = agg;
    if (!agg.totalN) { vis.innerHTML = `<div class="empty">${hasFilters(t) ? "No records match these filters." : "No records in this date range."}</div>`; return; }
    if (board().layout === "list") return renderRow(d, t, agg);
    if (t.chart === "number") { vis.innerHTML = C.numberHTML(agg, t); vis.style.cursor = "pointer"; vis.onclick = () => drill(t, agg, null, null); return; }
    if (t.chart === "sankey") { vis.innerHTML = C.sankeySVG(agg.current, body.clientWidth - 20, body.clientHeight - 10); return; }
    if (t.chart === "table") { vis.innerHTML = C.tableHTML(agg); vis.querySelectorAll("tbody tr").forEach(tr => tr.addEventListener("click", () => drill(t, agg, tr.dataset.key, null))); return; }
    try {
      const k = C.takeaway(agg, t);
      vis.setAttribute("role", "img"); vis.setAttribute("aria-label", `${tileTitle(t)}. ${k.value}${k.label ? " " + k.label : ""}${k.delta ? ", " + k.delta.text : ""}. Open the tile menu and choose See the records for the details.`);
      const spec = C.spec(agg, t);
      const res = await vegaEmbed(vis, spec, { actions: false, renderer: "canvas", tooltip: { theme: "light" } });
      views[t.id] = res.view;
      markClick(res.view, vis, t, agg);
    } catch (err) { console.error(err); vis.innerHTML = `<div class="empty">This tile couldn't be drawn. Try Refresh, or Edit the tile.</div>`; }
  }
  /** Tap or click a mark to see the records behind it. */
  function markClick(view, vis, t, agg) {
    if (t.chart === "area") return; // an area has no single week to point at
    view.addEventListener("click", (ev, item) => { const d = item && item.datum; if (!d) return; drill(t, agg, d.key, d.seriesKey != null ? d.seriesKey : (d.series || null)); });
    // A finger gives the chart no pointer position before the tap lands, and Vega only clicks what was under the pointer first: hand it one.
    vis.addEventListener("pointerdown", ev => { if (ev.pointerType !== "touch") return; const c = vis.querySelector("canvas"); if (!c) return; const at = { clientX: ev.clientX, clientY: ev.clientY, bubbles: true }; c.dispatchEvent(new PointerEvent("pointermove", Object.assign({ pointerType: "mouse" }, at))); c.dispatchEvent(new MouseEvent("mousemove", at)); }, true);
    // A lifted finger sends pointerout before the click, which would make Vega forget what was tapped.
    vis.addEventListener("pointerout", ev => { if (ev.pointerType === "touch") ev.stopPropagation(); }, true);
  }

  // List layout: one row per tile. Headline on the left, a compact chart on the right, tap to see the records.
  async function renderRow(d, t, agg) {
    const vis = d.querySelector(".vis"), take = d.querySelector(".take");
    const k = C.takeaway(agg, t);
    take.innerHTML = `<button type="button" class="go" aria-label="See the records">
      <span class="tv">${esc(k.value)}</span><span class="tl">${esc(k.label || "")}</span>${k.delta ? C.deltaHTML(k.delta) : ""}${IC("chevron-right", 18)}</button>`;
    take.querySelector(".go").addEventListener("click", () => drill(t, agg, k.key != null ? k.key : null, k.series != null ? k.series : null));
    if (t.chart === "sankey") { vis.innerHTML = moodBars(agg.current); return; }
    if (t.chart === "table") {
      const live = agg.rows.filter(r => !r.previous && !r.secondary).sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 4);
      vis.innerHTML = `<ol class="mini">${live.map(r => `<li><span>${esc(C.keyLabel(agg.dim, r.key))}</span><b>${esc(C.fmt(r.value, agg.unit))}</b></li>`).join("")}</ol>`;
      return;
    }
    let a = agg, tt = t;
    if (t.chart === "number") {
      // A big number gets its weekly trend as the mini chart.
      tt = Object.assign({}, t, { chart: "area", dimension: "week", compare: "none" });
      try { a = C.aggregate(tables, tt, boardOpts()); } catch (err) { return; }
    }
    try {
      const res = await vegaEmbed(vis, C.spec(a, tt, { compact: true }), { actions: false, renderer: "canvas", tooltip: { theme: "light" } });
      views[t.id] = res.view;
      if (a === agg) markClick(res.view, vis, t, agg);
    } catch (err) { console.error(err); vis.innerHTML = `<div class="empty">This tile couldn't be drawn. Try Refresh, or Edit the tile.</div>`; }
  }
  // Mood on arrival and at check-out as two thin stacked bars (the list layout's version of the flow chart).
  function moodBars(rows) {
    const both = rows.filter(r => r.moodIn && r.moodOut); if (!both.length) return `<div class="empty">No check-outs yet.</div>`;
    const bar = key => { const n = {}; both.forEach(r => { n[r[key]] = (n[r[key]] || 0) + 1; });
      return D.MOODS.filter(m => n[m]).map(m => `<span style="flex:${n[m]};background:${C.MOOD_COLOR[m]}" title="${m}: ${Math.round(100 * n[m] / both.length)}%"></span>`).join(""); };
    return `<div class="moodbars"><div><small>In</small><div class="mb">${bar("moodIn")}</div></div><div><small>Out</small><div class="mb">${bar("moodOut")}</div></div></div>`;
  }

  // ---------- Tile wiring: menu, order, drag, resize ----------
  function wireTile(d, t, i) {
    const menu = d.querySelector(".menu");
    const kebab = menu.querySelector(".kebab"), ul = menu.querySelector("ul");
    kebab.setAttribute("aria-haspopup", "true"); kebab.setAttribute("aria-expanded", "false");
    kebab.addEventListener("click", e => {
      e.stopPropagation(); const was = menu.classList.contains("open"); closeMenus(); if (was) return;
      menu.classList.add("open"); kebab.setAttribute("aria-expanded", "true");
      // Fixed position, so a short tile can't clip the menu. It opens upward near the bottom of the screen.
      const r = kebab.getBoundingClientRect(), h = ul.offsetHeight, w = ul.offsetWidth;
      ul.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w)) + "px";
      ul.style.top = (r.bottom + 4 + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4) + "px";
      const first = [...ul.querySelectorAll("button")].find(b => b.offsetParent); if (first) first.focus();
    });
    menu.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      menu.classList.remove("open");
      const act = b.dataset.act, bd = board();
      if (act === "edit") { if (t.chart === "research") openLibrary(t); else openEditor(t); }
      if (act === "dup") { const c = JSON.parse(JSON.stringify(t)); c.id = uid(); bd.tiles.splice(i + 1, 0, c); persist(); renderBoard(); }
      if (act === "del") deleteTile(t.id);
      if (act === "csv") { const a = aggs[t.id]; if (!a) return; if (a.dim === "student" && !confirm("This file lists student names. Keep it somewhere private. Download it?")) return; download(safeName(tileTitle(t)) + ".csv", C.csvFor(a, t), "text/csv;charset=utf-8"); }
      if (act === "img") copyImage(t);
      if (act === "drill") { const a = aggs[t.id]; if (a) drill(t, a, null, null); }
    }));
    d.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => { const bd = board(), j = i + Number(b.dataset.mv); if (j < 0 || j >= bd.tiles.length) return; [bd.tiles[i], bd.tiles[j]] = [bd.tiles[j], bd.tiles[i]]; persist(); renderBoard(); }));
    // Drag to reorder (grid layout, unlocked). Pointer events so it works with a finger on a tablet.
    const grip = d.querySelector(".grip");
    grip.addEventListener("pointerdown", e => {
      if (state.locked) return;
      e.preventDefault(); closeMenus(); grip.setPointerCapture(e.pointerId);
      d.classList.add("dragging"); let over = null, cancelled = false, lx = e.clientX, ly = e.clientY, dy = 0;
      const clearOver = () => document.querySelectorAll(".tile.over").forEach(x => x.classList.remove("over"));
      const mark = () => { const el = document.elementFromPoint(lx, ly); const tt = el && el.closest(".tile"); clearOver(); over = tt && tt !== d ? tt : null; if (over) over.classList.add("over"); };
      const move = ev => { lx = ev.clientX; ly = ev.clientY; dy = ly < 90 ? -18 : ly > window.innerHeight - 90 ? 18 : 0; mark(); };
      // Holding a tile near the top or bottom edge scrolls the page so it can reach tiles that are off screen.
      const scroller = setInterval(() => { if (dy) { window.scrollBy(0, dy); mark(); } }, 16);
      const onKey = ev => { if (ev.key === "Escape") { cancelled = true; over = null; clearOver(); } };
      document.addEventListener("keydown", onKey);
      const up = () => {
        clearInterval(scroller); document.removeEventListener("keydown", onKey);
        grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
        d.classList.remove("dragging"); clearOver();
        if (over && !cancelled) { const bd = board(), from = bd.tiles.findIndex(x => x.id === t.id), to = bd.tiles.findIndex(x => x.id === over.dataset.id); const [m] = bd.tiles.splice(from, 1); bd.tiles.splice(to, 0, m); persist(); renderBoard(); }
      };
      grip.addEventListener("pointermove", move); grip.addEventListener("pointerup", up); grip.addEventListener("pointercancel", up);
    });
    // Drag the corner to resize.
    const rs = d.querySelector(".resize");
    rs.addEventListener("pointerdown", e => {
      if (state.locked) return;
      e.preventDefault(); rs.setPointerCapture(e.pointerId);
      const bd = $("#board"), colW = (bd.clientWidth - 36 + 14) / 12, rowH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--row")) + 14;
      const startX = e.clientX, startY = e.clientY, w0 = t.w || 6, h0 = t.h || 4;
      const move = ev => { const w = Math.min(12, Math.max(2, Math.round(w0 + (ev.clientX - startX) / colW))), h = Math.min(10, Math.max(2, Math.round(h0 + (ev.clientY - startY) / rowH))); if (w !== t.w || h !== t.h) { t.w = w; t.h = h; d.style.gridColumn = `span ${w}`; d.style.gridRow = `span ${h}`; } };
      const up = () => { rs.removeEventListener("pointermove", move); rs.removeEventListener("pointerup", up); persist(); renderTile(d, t); };
      rs.addEventListener("pointermove", move); rs.addEventListener("pointerup", up);
    });
  }
  function closeMenus() {
    document.querySelectorAll(".menu.open").forEach(m => { m.classList.remove("open"); const k = m.querySelector(".kebab"); if (k) k.setAttribute("aria-expanded", "false"); });
    document.querySelectorAll(".popmenu.open").forEach(m => m.classList.remove("open"));
    document.querySelectorAll("[data-menu]").forEach(b => b.setAttribute("aria-expanded", "false"));
  }
  document.addEventListener("click", closeMenus);

  // ---------- Drill-down ----------
  function drill(t, agg, key, series) {
    let items;
    if (key == null) items = agg.current;
    else { const prev = series === "Previous period"; const rows = agg.rows.filter(r => r.key === key && (prev ? r.previous : !r.previous) && (series == null || prev || String(r.series) === String(series))); items = rows.flatMap(r => r.items); }
    if (key == null && t.chart === "sankey") items = items.filter(r => r.moodIn && r.moodOut);
    items = [...new Map(items.map(r => [r.ts.getTime() + r.student, r])).values()].sort((a, b) => b.ts - a.ts);
    const seriesLabel = series != null && agg.breakdown && series !== "Previous period" ? C.keyLabel(agg.breakdown, series) : series;
    const label = key == null ? "Everything in range" : `${C.keyLabel(agg.dim, key)}${seriesLabel && seriesLabel !== "Current" ? " · " + seriesLabel : ""}`;
    $("#drTitle").firstChild.textContent = tileTitle(t);
    const noun = t.dataset === "incident" ? "report" : "visit", people = new Set(items.map(r => r.studentId || r.student)).size;
    const counts = items.length > 300 ? `showing 300 of ${items.length} ${noun}s` : `${items.length} ${noun}${items.length === 1 ? "" : "s"}`;
    $("#drSub").textContent = `${label} · ${counts}${t.measure === "students" || agg.dim === "student" ? ` · ${people} student${people === 1 ? "" : "s"}` : ""}`;
    const oneStudent = agg.dim === "student" && key != null ? key : null;
    $("#drCompare").classList.toggle("hidden", !oneStudent);
    $("#drCompare").onclick = () => { closeDrawer(); addTile(tile({ title: `${oneStudent} vs everyone`, chart: "grouped", dimension: "weekday", compare: "student", student: oneStudent, w: 6, h: 4 })); };
    const mc = m => m ? `<span class="chip"><i style="background:${C.MOOD_COLOR[m] || "#999"}"></i>${esc(m)}</span>` : "";
    $("#drBody").innerHTML = items.slice(0, 300).map(r => r.kind === "incident"
      ? `<div class="rec"><b>${esc(r.student)}</b>${r.grade ? " · " + esc(r.grade) : ""} · ${esc(r.ts.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}<div class="m">${esc(r.types.join(", "))}${r.place ? " · " + esc(r.place) : ""}${r.period ? " · " + esc(r.period) : ""}</div><div>${chip(r.status)}${r.action ? chip(r.action) : ""}${r.talk ? chip("Wanted to talk") : ""}</div></div>`
      : `<div class="rec"><b>${esc(r.student)}</b>${r.grade ? " · " + esc(r.grade) : ""} · ${esc(r.ts.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}<div class="m">${esc(r.reason)} · ${esc(r.referral)}${r.minutes != null ? " · " + r.minutes + " min" : ""}</div><div>${mc(r.moodIn)}${r.wordIn ? chip(r.wordIn) : ""}${r.moodOut ? "→ " + mc(r.moodOut) : ""}${r.helped.map(h => chip("Helped: " + h)).join("")}${r.basicNeeds.map(n => chip("Needs: " + n)).join("")}${r.alert ? chip("Alert word") : ""}</div></div>`).join("") + (items.length > 300 ? `<div class="empty">Showing the first 300.</div>` : "");
    openDrawer();
  }
  const chip = s => `<span class="chip">${esc(s)}</span>`;
  // The records drawer is a dialog: hidden from assistive tech and the Tab key while closed, focus moves in on open and back on close.
  let drawerOpener = null;
  function openDrawer() {
    drawerOpener = document.activeElement; const d = $("#drawer");
    d.removeAttribute("inert"); d.setAttribute("aria-hidden", "false"); $("#scrim").classList.add("show"); d.classList.add("show"); $("#drClose").focus();
  }
  function closeDrawer() {
    const d = $("#drawer"); if (!d.classList.contains("show")) return;
    $("#scrim").classList.remove("show"); d.classList.remove("show"); d.setAttribute("aria-hidden", "true"); d.setAttribute("inert", "");
    if (drawerOpener && document.contains(drawerOpener)) drawerOpener.focus(); drawerOpener = null;
  }
  $("#drawer").setAttribute("inert", "");
  $("#scrim").addEventListener("click", closeDrawer); $("#drClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    const trigger = document.querySelector(".menu.open .kebab") || document.querySelector('[data-menu][aria-expanded="true"]');
    closeMenus(); if (trigger) trigger.focus();
    closeDrawer();
  });

  // ---------- Gallery and editor ----------
  function addTile(t) { board().tiles.push(t); persist(); renderBoard(); setTimeout(() => { const el = document.querySelector(`.tile[data-id="${t.id}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 50); }
  function openGallery() {
    $("#galleryGrid").innerHTML = GALLERY.map(([n, s], i) => `<button type="button" data-i="${i}">${esc(n)}<small>${esc(s)}</small></button>`).join("");
    $("#galleryGrid").querySelectorAll("[data-i]").forEach(b => b.addEventListener("click", () => { const [n, , o] = GALLERY[Number(b.dataset.i)]; $("#galleryDlg").close(); addTile(tile(Object.assign({ title: n }, o))); }));
    $("#galleryDlg").showModal();
  }
  $("#galleryClose").addEventListener("click", () => $("#galleryDlg").close());
  $("#galleryBlank").addEventListener("click", () => { $("#galleryDlg").close(); const t = tile({}); openEditor(t, true); });

  let editing = null, editingNew = false;
  const opts = (sel, pairs, val) => { sel.innerHTML = pairs.map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join(""); if (val != null && pairs.some(([k]) => k === val)) sel.value = val; };
  function openEditor(t, isNew) {
    editing = JSON.parse(JSON.stringify(t)); editingNew = !!isNew;
    $("#edTitle").textContent = isNew ? "New tile" : "Edit tile";
    $("#edDelete").classList.toggle("hidden", !!isNew);
    $("#fTitle").value = t.title || "";
    opts($("#fDataset"), Object.entries(C.DATASETS), t.dataset);
    opts($("#fChart"), Object.entries(C.CHARTS), t.chart);
    opts($("#fCompare"), [...$("#fCompare").options].map(o => [o.value, o.textContent]), t.compare || "none");
    opts($("#fRange"), Object.entries(C.RANGE_LABELS), t.range || "board");
    $("#fStart").value = (t.custom && t.custom.start) || ""; $("#fEnd").value = (t.custom && t.custom.end) || "";
    $("#fStudent").value = t.student || "";
    $("#fTop").value = String(t.top || 12);
    for (const [id, v] of [["#fW", t.w || 6], ["#fH", t.h || 4]]) { const sel = $(id); if (![...sel.options].some(o => o.value === String(v))) sel.add(new Option(`${v} ${id === "#fW" ? "columns" : "rows"}`, String(v))); sel.value = String(v); }
    refreshEditorFields(t);
    $("#editor").showModal();
  }
  function refreshEditorFields(t) {
    $("#edHelp").classList.remove("err");
    const ds = $("#fDataset").value;
    // The flow chart reads visits, so it isn't offered for incident reports.
    opts($("#fChart"), Object.entries(C.CHARTS).filter(([k]) => !(k === "sankey" && ds === "incident")), (t && t.chart) || $("#fChart").value);
    const chart = $("#fChart").value, compare = $("#fCompare").value;
    const dims = Object.entries(C.DIMENSIONS).filter(([, d]) => d.for.includes(ds)).map(([k, d]) => [k, d.label]);
    const meas = Object.entries(C.MEASURES).filter(([, m]) => m.for.includes(ds)).map(([k, m]) => [k, m.label]);
    opts($("#fMeasure"), meas, t.measure); opts($("#fMeasure2"), meas, t.measure2);
    opts($("#fDimension"), dims, t.dimension); opts($("#fBreakdown"), dims, t.breakdown);
    if (!meas.some(([k]) => k === $("#fMeasure").value)) $("#fMeasure").value = ds === "incident" ? "incidents" : "count";
    if (chart === "calendar") $("#fDimension").value = "date";
    const needsBreak = (["stacked", "grouped", "heatmap"].includes(chart) || compare === "groups") && compare !== "student";
    $("#lDimension").classList.toggle("hidden", chart === "number" || chart === "sankey");
    $("#lBreakdown").classList.toggle("hidden", !needsBreak);
    $("#lMeasure2").classList.toggle("hidden", !(compare === "measures" || chart === "scatter"));
    $("#lStudent").classList.toggle("hidden", compare !== "student");
    $("#lCustom").classList.toggle("hidden", $("#fRange").value !== "custom");
    const dim = C.DIMENSIONS[$("#fDimension").value];
    $("#lTop").classList.toggle("hidden", !(dim && dim.sortByValue) || chart === "number" || chart === "sankey");
    $("#edHelp").textContent = chart === "sankey" ? "Shows every visit in the range that has a mood on arrival and at check-out. Filters still apply." :
      chart === "scatter" ? "One dot per group: the measure across, the second measure (or record count) up." :
      chart === "calendar" ? "One square per school day. Groups by day automatically." :
      compare === "previous" ? "Adds the same measure for the period before this one, for the same length of time." :
      compare === "groups" ? "Pick what to break the measure down by, for example grade or how they came." :
      compare === "student" ? "Shows the student's numbers next to everyone's. Names come from the roster." : "";
    // Filters: chips of values present in the data
    const base = ds === "incident" ? tables.incidents : tables.visits;
    const cur = (editing && editing.filters) || [];
    $("#fFilters").innerHTML = C.FILTERABLE.filter(k => C.DIMENSIONS[k].for.includes(ds)).map(k => {
      const d = C.DIMENSIONS[k]; const vals = [...new Set(base.map(d.get).flat().filter(Boolean))];
      const ordered = d.order ? d.order.filter(v => vals.includes(v)).concat(vals.filter(v => !d.order.includes(v))) : vals.sort();
      const on = new Set((cur.find(f => f.dim === k) || {}).values || []);
      return `<div class="frow" data-dim="${k}"><span class="fl">${esc(d.label)}</span>${ordered.map(v => `<button type="button" data-v="${esc(v)}" aria-pressed="${on.has(v)}">${esc(v)}</button>`).join("")}</div>`;
    }).join("");
    $("#fFilters").querySelectorAll("button").forEach(b => b.addEventListener("click", () => b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") !== "true")));
  }
  // Changing the chart type or the data resets the choices that only made sense for the old one (a week-by-week heatmap or a 40-colour stack).
  const LOW_CARD = new Set(["moodIn", "moodOut", "station", "grade", "referral", "reason", "weekday", "outcome", "energy", "status", "place", "period", "checkedOutBy"]);
  function chartDefaults(t, what) {
    if (what !== "chart" && what !== "dataset") return;
    const ds = t.dataset, dim = C.DIMENSIONS[t.dimension], bdim = C.DIMENSIONS[t.breakdown];
    if (t.chart === "sankey" && ds !== "visit") t.dataset = "visit";
    if ((t.chart === "pie" || t.chart === "donut") && (!dim || dim.temporal || t.dimension === "student")) t.dimension = ds === "incident" ? "place" : "reason";
    if (t.chart === "heatmap") { if (!bdim || bdim.temporal || t.breakdown === "student" || t.breakdown === t.dimension) t.breakdown = ds === "incident" ? "place" : "hour"; if (t.breakdown === t.dimension) t.dimension = "weekday"; }
    if ((t.chart === "stacked" || t.chart === "grouped") && !LOW_CARD.has(t.breakdown)) t.breakdown = ds === "incident" ? "status" : "moodIn";
    if ((t.chart === "stacked" || t.chart === "grouped" || t.chart === "heatmap") && t.breakdown === t.dimension) t.breakdown = null;
    if (t.chart === "table" || t.chart === "sankey") t.compare = "none";
    if (t.compare === "student" && !["bar", "barh", "grouped", "line", "area"].includes(t.chart)) t.compare = "none"; // one-student-vs-everyone needs a chart that can put two series side by side
    if (t.chart === "number" && t.compare !== "previous") t.compare = "none";
    if (what === "dataset") t.filters = []; // filter chips belong to one dataset
  }
  [["#fDataset", "dataset"], ["#fChart", "chart"], ["#fCompare", "compare"], ["#fRange", "range"], ["#fDimension", "dimension"]].forEach(([sel, what]) => $(sel).addEventListener("change", () => {
    if (!editing) return;
    editing.filters = readFilters(); editing.measure = $("#fMeasure").value; editing.measure2 = $("#fMeasure2").value; editing.dimension = $("#fDimension").value; editing.breakdown = $("#fBreakdown").value;
    editing.dataset = $("#fDataset").value; editing.chart = $("#fChart").value; editing.compare = $("#fCompare").value;
    chartDefaults(editing, what);
    $("#fDataset").value = editing.dataset; $("#fCompare").value = editing.compare;
    refreshEditorFields(editing);
  }));
  function readFilters() { return [...$("#fFilters").querySelectorAll(".frow")].map(row => ({ dim: row.dataset.dim, values: [...row.querySelectorAll('button[aria-pressed="true"]')].map(b => b.dataset.v) })).filter(f => f.values.length); }
  $("#edForm").addEventListener("submit", e => {
    e.preventDefault();
    if (!editing) return; // a second tap on Save
    const t = editing;
    Object.assign(t, { title: $("#fTitle").value.trim(), dataset: $("#fDataset").value, chart: $("#fChart").value, measure: $("#fMeasure").value, dimension: $("#fDimension").value,
      breakdown: $("#lBreakdown").classList.contains("hidden") ? null : $("#fBreakdown").value, compare: $("#fCompare").value, measure2: $("#fMeasure2").value, student: $("#fStudent").value.trim(),
      range: $("#fRange").value, custom: { start: $("#fStart").value, end: $("#fEnd").value }, top: Number($("#fTop").value), w: Number($("#fW").value), h: Number($("#fH").value), filters: readFilters() });
    if (t.chart === "calendar") t.dimension = "date";
    if (t.chart === "scatter" && t.compare === "none") t.compare = "measures";
    if (!C.MEASURES[t.measure] || !C.MEASURES[t.measure].for.includes(t.dataset)) t.measure = t.dataset === "incident" ? "incidents" : "count";
    if (t.compare === "student") {
      if (!t.student) return edError("Type a student's name to compare.");
      if (!studentNames.has(t.student)) return edError(`There is no student called "${t.student}" in this data. Pick a name from the list.`);
      t.breakdown = null;
    }
    editing = null;
    $("#editor").close();
    const bd = board();
    if (editingNew) bd.tiles.push(t); else { const i = bd.tiles.findIndex(x => x.id === t.id); if (i >= 0) bd.tiles[i] = t; }
    persist(); renderBoard();
  });
  $("#edCancel").addEventListener("click", () => $("#editor").close());
  $("#edDelete").addEventListener("click", () => { const id = editing && editing.id; editing = null; $("#editor").close(); if (id) deleteTile(id); });
  $("#editor").addEventListener("close", () => { editing = null; });
  function edError(msg) { $("#edHelp").textContent = msg; $("#edHelp").classList.add("err"); }

  // ---------- Board menu ----------
  // Header menus (Account, Board): fixed under their button so nothing clips them.
  document.querySelectorAll("[data-menu]").forEach(btn => {
    btn.setAttribute("aria-haspopup", "true"); btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", e => {
      e.stopPropagation(); const m = document.getElementById(btn.dataset.menu), was = m.classList.contains("open"); closeMenus();
      if (was) return;
      m.classList.add("open"); btn.setAttribute("aria-expanded", "true");
      const r = btn.getBoundingClientRect();
      m.style.top = (r.bottom + 4) + "px"; m.style.left = Math.max(8, Math.min(window.innerWidth - m.offsetWidth - 8, r.right - m.offsetWidth)) + "px";
      const f = [...m.querySelectorAll("button, a")].find(x => x.offsetParent); if (f) f.focus();
    });
  });
  // A shared link carries the board's layout, never a student's name.
  const stripPeople = bd => Object.assign({}, bd, { tiles: bd.tiles.map(t => (t.student || t.compare === "student") ? Object.assign({}, t, { student: undefined, compare: t.compare === "student" ? "none" : t.compare }) : t) });
  function addStarters() {
    const have = new Set(state.boards.map(b => b.name)), add = starterBoards().filter(b => !have.has(b.name));
    if (!add.length) return toast("All three starter boards are already here.");
    snapshot(); state.boards = state.boards.concat(add); state.active = add[0].id; persist(); renderAll(); undoable(`Added ${add.map(b => b.name).join(", ")}.`);
  }
  $("#boardMenu").querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    closeMenus();
    const act = b.dataset.act, bd = board();
    if (act === "rename") { const n = cleanName(prompt("Board name:", bd.name), ""); if (n) { bd.name = n; persist(); renderAll(); } }
    if (act === "print") window.print();
    if (act === "share") { const url = location.origin + location.pathname + "#share=" + b64(JSON.stringify(stripPeople(bd))); navigator.clipboard.writeText(url).then(() => toast("Link copied. It shares this board's layout only, not student names or records. The person must be on the access list."), () => prompt("Copy this link:", url)); }
    if (act === "duplicate") { const c = JSON.parse(JSON.stringify(bd)); c.id = uid(); c.name = cleanName(bd.name + " (copy)", "Copy"); c.tiles.forEach(t => t.id = uid()); state.boards.push(c); state.active = c.id; persist(); renderAll(); }
    if (act === "reset") addStarters();
    if (act === "delete") { if (state.boards.length === 1) return toast("Keep at least one board."); if (confirm(`Delete the board "${bd.name}"?`)) { snapshot(); state.boards = state.boards.filter(x => x.id !== bd.id); state.active = state.boards[0].id; persist(); renderAll(); undoable("Board deleted."); } }
  }));
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  /** Reads a #share= link (or one saved across the sign-in page), validates it, and clears it from the address bar. */
  function parseShared() {
    let h = location.hash;
    if (!/share=/.test(h)) { try { h = sessionStorage.getItem("ppc_share_hash") || ""; if (h) sessionStorage.removeItem("ppc_share_hash"); } catch { h = ""; } }
    const m = h.match(/share=([A-Za-z0-9_-]+)/);
    if (/share=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    if (!m) return null;
    try {
      const raw = JSON.parse(unb64(m[1])), [bd] = cleanBoards([raw]);
      if (!bd) return null;
      bd.id = uid(); bd.tiles.forEach(t => t.id = uid()); bd.name = cleanName(raw && raw.name, "Shared board");
      return bd;
    } catch { return null; }
  }
  /** Offers the shared board once the person's own saved boards are in place, so the Sheet can't replace it. */
  function applyShared() {
    const bd = pendingShare; pendingShare = null; if (!bd) return;
    if (confirm(`Add the shared board "${bd.name}" to your page?`)) { state.boards.push(bd); state.active = bd.id; persist(); renderAll(); }
  }

  // ---------- People & access ----------
  // The list lives on the Access tab in the Sheet; the script enforces it on every request.
  let acc = null;
  async function openAccess() {
    $("#accErr").textContent = ""; $("#accRows").innerHTML = `<tr><td colspan="4" class="empty">Loading…</td></tr>`; $("#accessDlg").showModal();
    try {
      const d = await post({ type: "accessList" });
      if (!d.ok) throw fail(d);
      acc = d; acc.original = sigOf(d.people); renderAccess();
    } catch (err) { $("#accRows").innerHTML = ""; $("#accErr").textContent = "Couldn't load the list: " + (err.message || err); }
  }
  function renderAccess() {
    const owners = (acc.owners || []).map(e => e.toLowerCase());
    $("#accIntro").innerHTML = (acc.started
      ? `Only the people below can open the staff dashboard or this page. Changes apply on their next page load.`
      : `<b>Right now any @${esc(acc.domain || "district")} staff account can open the staff dashboard.</b> Saving this list limits it to the people below.`)
      + ` Each person signs in with their school Google account.`;
    const fixed = owners.map(e => `<tr><td>${esc(e)}</td><td class="c">${IC("check", 18, "Yes")}</td><td class="c">${IC("check", 18, "Yes")}</td><td class="fixed">Owner</td></tr>`).join("");
    $("#accRows").innerHTML = fixed + acc.people.filter(p => !owners.includes(p.email)).map((p, i) => `<tr data-i="${i}"><td>${esc(p.email)}</td>
      <td class="c"><input type="checkbox" data-k="staff" ${p.staff ? "checked" : ""} aria-label="Staff dashboard for ${esc(p.email)}"></td>
      <td class="c"><input type="checkbox" data-k="principal" ${p.principal ? "checked" : ""} aria-label="Principal dashboard for ${esc(p.email)}"></td>
      <td><button type="button" class="btn sm" data-rm="${i}">Remove</button></td></tr>`).join("");
    const list = acc.people.filter(p => !owners.includes(p.email));
    $("#accRows").querySelectorAll("input[data-k]").forEach(cb => cb.addEventListener("change", () => { list[Number(cb.closest("tr").dataset.i)][cb.dataset.k] = cb.checked; }));
    $("#accRows").querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", () => { const p = list[Number(b.dataset.rm)]; acc.people = acc.people.filter(x => x !== p); renderAccess(); }));
  }
  $("#accessBtn").addEventListener("click", openAccess);
  const sigOf = ps => JSON.stringify((ps || []).map(p => [p.email, !!p.staff, !!p.principal]).sort());
  const accDirty = () => !!acc && sigOf(acc.people) !== acc.original;
  $("#accClose").addEventListener("click", () => { if (accDirty() && !confirm("Close without saving your changes?")) return; $("#accessDlg").close(); });
  $("#accessDlg").addEventListener("cancel", e => { if (accDirty() && !confirm("Close without saving your changes?")) e.preventDefault(); });
  const addPerson = () => {
    const e = $("#accEmail").value.trim().toLowerCase().replace(/\.+$/, "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { $("#accErr").textContent = "Type a full email address."; return; }
    if (e.split("@")[0].includes("+")) { $("#accErr").textContent = "Use the person's main address, without a + part."; return; }
    const okDomains = [acc.domain].concat((acc.owners || []).map(o => o.split("@")[1])).filter(Boolean).map(x => x.toLowerCase());
    if (!okDomains.includes(e.split("@")[1]) && !confirm(`${e} isn't a @${acc.domain} account, so they may not be able to sign in. Add them anyway?`)) return;
    if (acc.people.some(p => p.email === e) || (acc.owners || []).map(x => x.toLowerCase()).includes(e)) { $("#accErr").textContent = e + " is already on the list."; return; }
    acc.people.push({ email: e, staff: true, principal: false }); $("#accEmail").value = ""; $("#accErr").textContent = ""; renderAccess();
  };
  $("#accAdd").addEventListener("click", addPerson);
  $("#accEmail").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); addPerson(); } });
  $("#accSave").addEventListener("click", async () => {
    const owners = (acc.owners || []).map(e => e.toLowerCase());
    const people = acc.people.filter(p => !owners.includes(p.email));
    const listed = people.filter(p => p.staff || p.principal).map(p => p.email);
    const lost = JSON.parse(acc.original || "[]").filter(([email, s, pr]) => (s || pr) && !listed.includes(email)).map(x => x[0]);
    if (!acc.started) { if (!confirm(`After saving, only these people can open the staff dashboard:\n\n${owners.concat(listed).join("\n")}\n\nAnyone else, including other Pride Center staff, will be locked out. Save?`)) return; }
    else if (lost.length && !confirm(`These people will lose access:\n\n${lost.join("\n")}\n\nSave?`)) return;
    $("#accSave").disabled = true; $("#accSave").textContent = "Saving…";
    try {
      const d = await post({ type: "accessSave", people });
      if (!d.ok) throw new Error(d.error);
      $("#accessDlg").close(); toast(`Access list saved: ${d.saved} ${d.saved === 1 ? "person" : "people"} plus the owners.`);
    } catch (err) { $("#accErr").textContent = "Couldn't save: " + (err.message || err); }
    finally { $("#accSave").disabled = false; $("#accSave").textContent = "Save list"; }
  });

  // ---------- Exports ----------
  function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  async function copyImage(t) {
    const v = views[t.id]; let blob;
    try {
      if (v) { const url = await v.toImageURL("png", 2); blob = await (await fetch(url)).blob(); }
      else { const el = document.querySelector(`.tile[data-id="${t.id}"] .vis svg`); if (!el) return toast("This tile can't be copied as an image. Use Download numbers instead."); blob = await svgToPng(el); }
    } catch (err) { return toast("Couldn't make the image. Try Download numbers instead."); }
    try { await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); toast("Image copied. Paste it into a slide or email."); }
    catch (err) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = safeName(tileTitle(t)) + ".png"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast("Copying isn't allowed here, so the image was downloaded instead."); }
  }
  function svgToPng(svg) {
    return new Promise((resolve, reject) => {
      const xml = new XMLSerializer().serializeToString(svg), img = new Image(), r = svg.getBoundingClientRect();
      img.onload = () => { const c = document.createElement("canvas"); c.width = r.width * 2; c.height = r.height * 2; const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? resolve(b) : reject(new Error("no image")), "image/png"); };
      img.onerror = reject; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    });
  }
  let toastTimer;
  // ---------- Research library ----------
  // The notice reads the same rows the board's tiles use: date range, grade chips, and filters.
  function boardRows() {
    const pick = dataset => { try { return C.aggregate(tables, { dataset, chart: "number", measure: dataset === "incident" ? "incidents" : "count", filters: [] }, boardOpts()).current; } catch (err) { return []; } };
    return { visits: pick("visit"), incidents: pick("incident") };
  }
  // The end of the range on screen (never later than now), so "the last four weeks" means the last four weeks of that range.
  const rangeEnd = () => new Date(Math.min(C.range(state.range, new Date(), state.custom).end.getTime(), Date.now()));
  function renderResearch(vis, t) {
    if (!R) { vis.innerHTML = `<div class="empty">The research library didn't load.</div>`; return; }
    let picks;
    if (t.cardId && R.card(t.cardId)) {
      const live = R.notices(t.focus || "all", boardRows(), rangeEnd()).find(n => n.card && n.card.id === t.cardId);
      picks = [{ card: R.card(t.cardId), noticed: live ? live.noticed : "" }];
    } else picks = R.notices(t.focus || "all", boardRows(), rangeEnd());
    const [top, ...rest] = picks;
    if (!top.card) { vis.innerHTML = `<div class="notice"><span class="ni">${IC("book-open", 18)}</span><span class="seen">${esc(top.noticed)}</span></div>`; return; }
    vis.innerHTML = `<div class="notice">
      <span class="ni">${IC("book-open", 18)}</span>
      <span class="seen" title="${esc(top.noticed || "")}">${esc(top.noticed || "A good place to start")}</span>
      <button type="button" class="try" data-read="${top.card.id}" title="${esc(top.card.title)}">${esc(top.card.short)}${IC("arrow-right", 16)}</button>
      ${rest.length ? `<button type="button" class="more" title="${esc(rest.map(n => n.card.short).join(", "))}">${rest.length} more idea${rest.length === 1 ? "" : "s"}</button>` : ""}
    </div>`;
    const more = vis.querySelector(".more"); if (more) more.addEventListener("click", () => openLibrary(null));
    const noticedFor = id => (picks.find(n => n.card.id === id) || {}).noticed || "";
    vis.querySelectorAll("[data-read], [data-card]").forEach(b => b.addEventListener("click", () => { const id = b.dataset.read || b.dataset.card; openCard(R.card(id), noticedFor(id)); }));
  }
  function cardHTML(card, noticed) {
    const li = xs => xs.map(x => `<li>${esc(x)}</li>`).join("");
    return `<div class="rcard">
      <span class="ev ${esc(card.evidence)}">${esc(R.EVIDENCE[card.evidence] || card.evidence)}</span>
      ${noticed ? `<div class="seen">${esc(noticed)}</div>` : ""}
      <h4>When to reach for this</h4><p>${esc(card.signal)}</p>
      <h4>What the research says</h4><ul>${li(card.says)}</ul>
      <h4>Try this</h4><ul>${li(card.tryThis)}</ul>
      <h4>Sources</h4><ul class="src">${card.sources.map(s => `<li>${esc(s.t)}${s.u ? ` <a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.u.replace(/^https?:\/\//, ""))}</a>` : ""}</li>`).join("")}</ul>
    </div>`;
  }
  function openCard(card, noticed) {
    if (!card) return;
    $("#drTitle").firstChild.textContent = card.title;
    $("#drSub").textContent = card.tagline;
    $("#drCompare").classList.add("hidden");
    $("#drBody").innerHTML = cardHTML(card, noticed);
    openDrawer();
  }
  let libTag = "";
  // forTile: when opened from a notice tile's menu, "Use here" pins the card to that tile.
  function openLibrary(forTile) {
    if (!R) return;
    const rows = boardRows(), live = {}; R.notices("all", rows, rangeEnd()).forEach(n => { if (n.card) live[n.card.id] = n.noticed; });
    $("#libTags").innerHTML = [`<button type="button" class="btn sm ${libTag ? "" : "on"}" data-tag="">All</button>`].concat(R.TAGS.map(t => `<button type="button" class="btn sm ${libTag === t ? "on" : ""}" data-tag="${esc(t)}">${esc(t)}</button>`)).join("");
    $("#libTags").querySelectorAll("[data-tag]").forEach(b => b.addEventListener("click", () => { libTag = b.dataset.tag; openLibrary(forTile); }));
    const cards = R.CARDS.filter(c => !libTag || c.tag === libTag);
    $("#libraryGrid").innerHTML = cards.map(c => `<div class="lc" data-id="${c.id}">
      <span class="tag">${esc(c.tag)}</span><b>${esc(c.title)}</b><p>${esc(c.tagline)}</p>
      ${live[c.id] ? `<div class="seen">${esc(live[c.id])}</div>` : ""}
      <div class="la"><button type="button" class="btn sm primary" data-read>${IC("book-open", 16)}Read</button><button type="button" class="btn sm" data-pin>${IC(forTile ? "check" : "plus", 16)}${forTile ? "Use here" : "Pin to board"}</button></div>
    </div>`).join("");
    $("#libraryGrid").querySelectorAll(".lc").forEach(el => {
      const c = R.card(el.dataset.id);
      el.querySelector("[data-read]").addEventListener("click", () => { $("#libraryDlg").close(); openCard(c, live[c.id]); });
      el.querySelector("[data-pin]").addEventListener("click", () => {
        $("#libraryDlg").close();
        if (forTile) { forTile.cardId = c.id; forTile.title = c.title; persist(); renderBoard(); }
        else addTile(tile({ title: c.title, chart: "research", focus: "all", cardId: c.id, w: 12, h: 1 }));
      });
    });
    $("#libAuto").classList.toggle("hidden", !forTile);
    $("#libAuto").onclick = () => { $("#libraryDlg").close(); delete forTile.cardId; forTile.title = "What the research says"; persist(); renderBoard(); };
    $("#libraryDlg").showModal();
  }
  $("#libraryBtn").addEventListener("click", () => openLibrary(null));
  $("#libraryClose").addEventListener("click", () => $("#libraryDlg").close());

  /** A short message at the bottom. With an action (like Undo) it stays a little longer and its button works. */
  function toast(msg, act, ms) {
    const t = $("#toast"); t.textContent = msg; t.classList.toggle("act", !!act);
    if (act) { const b = document.createElement("button"); b.type = "button"; b.textContent = act.label; b.addEventListener("click", () => { t.classList.remove("show"); act.fn(); }); t.appendChild(b); }
    t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms || 3500);
  }

  // Re-render charts when the window changes size (charts size to their tile).
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (tables) renderBoard(); }, 250); });

  start();
})();
