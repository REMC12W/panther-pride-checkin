/* Principal dashboard: boards, tiles, editor, layout, saving, exports. */
(function () {
  const D = window.PPD, C = window.PPC_CHARTS;
  const CFG = Object.assign({ SCRIPT_URL: "", GOOGLE_CLIENT_ID: "", ALLOWED_DOMAIN: "", PRINCIPAL_DEMO: true }, window.PPC_CONFIG || {});
  const DEMO = !!CFG.PRINCIPAL_DEMO || !CFG.SCRIPT_URL;
  const $ = s => document.querySelector(s);
  const esc = C.esc;
  const STORE_KEY = "ppc_principal_v1";
  const uid = () => Math.random().toString(36).slice(2, 9);
  let tables = null, state = null, idToken = sessionStorage.getItem("ppc_id_token") || "", views = {}, aggs = {}, saveTimer = null;

  // ---------- Starter boards ----------
  const tile = (o) => Object.assign({ id: uid(), dataset: "visit", measure: "count", dimension: "week", chart: "bar", range: "board", filters: [], compare: "none", w: 6, h: 4 }, o);
  function starterBoards() {
    return [
      { id: uid(), name: "Overview", layout: "grid", tiles: [
        tile({ title: "Students this period", chart: "number", measure: "students", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Visits", chart: "number", measure: "count", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Came in red or blue, left green or yellow", chart: "number", measure: "pctImproved", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Incidents followed up", chart: "number", dataset: "incident", measure: "pctFollowedUp", compare: "previous", w: 3, h: 3 }),
        tile({ title: "Visits by week", chart: "line", dimension: "week", compare: "previous", w: 8, h: 4 }),
        tile({ title: "Mood on arrival by grade", chart: "stacked", dimension: "grade", breakdown: "moodIn", w: 4, h: 4 }),
        tile({ title: "Busiest times", chart: "heatmap", dimension: "weekday", breakdown: "hour", w: 6, h: 4 }),
        tile({ title: "Mood in → mood out", chart: "sankey", w: 6, h: 4 }),
        tile({ title: "Why students come", chart: "barh", dimension: "reason", w: 4, h: 4 }),
        tile({ title: "What helped (share leaving green or yellow)", chart: "barh", dimension: "helped", measure: "pctLeftOk", w: 4, h: 4 }),
        tile({ title: "Incidents by place", chart: "bar", dataset: "incident", measure: "incidents", dimension: "place", w: 4, h: 4 }),
      ] },
      { id: uid(), name: "Incidents", layout: "grid", tiles: [
        tile({ title: "Incident reports by week", chart: "bar", dataset: "incident", measure: "incidents", dimension: "week", w: 8, h: 4 }),
        tile({ title: "Still open", chart: "number", dataset: "incident", measure: "pctOpen", w: 4, h: 3 }),
        tile({ title: "Days to follow-up", chart: "number", dataset: "incident", measure: "avgDaysFU", compare: "previous", w: 4, h: 3 }),
        tile({ title: "Where and when", chart: "heatmap", dataset: "incident", measure: "incidents", dimension: "period", breakdown: "place", w: 8, h: 5 }),
        tile({ title: "What happened", chart: "barh", dataset: "incident", measure: "incidents", dimension: "type", w: 4, h: 5 }),
        tile({ title: "Follow-up actions", chart: "donut", dataset: "incident", measure: "incidents", dimension: "action", w: 4, h: 4 }),
        tile({ title: "Incidents by grade", chart: "bar", dataset: "incident", measure: "incidents", dimension: "grade", w: 4, h: 4 }),
        tile({ title: "Report log by status", chart: "table", dataset: "incident", measure: "incidents", dimension: "status", w: 4, h: 4 }),
      ] },
      { id: uid(), name: "Support", layout: "grid", tiles: [
        tile({ title: "Students with the most visits", chart: "table", dimension: "student", top: 12, w: 4, h: 6 }),
        tile({ title: "Arriving red or blue, by student", chart: "barh", dimension: "student", measure: "pctHard", top: 12, w: 4, h: 6 }),
        tile({ title: "Alert words by week", chart: "bar", dimension: "week", measure: "pctAlert", w: 4, h: 3 }),
        tile({ title: "Sent by staff vs came on their own", chart: "area", dimension: "week", breakdown: "referral", compare: "groups", w: 4, h: 3 }),
        tile({ title: "Minutes in room vs visits, by student", chart: "scatter", dimension: "student", measure: "avgMinutes", compare: "measures", measure2: "count", top: 999, w: 6, h: 5 }),
        tile({ title: "Basic needs requested", chart: "donut", dimension: "basicNeed", w: 6, h: 5 }),
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
  ];

  // ---------- State ----------
  function defaultState() { return { boards: starterBoards(), active: null, locked: true, range: "year", custom: {}, grades: [] }; }
  function loadLocal() { try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); return s && Array.isArray(s.boards) && s.boards.length ? s : null; } catch { return null; } }
  function persist() {
    state.locked = true === state.locked;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch {}
    if (!DEMO && idToken) { clearTimeout(saveTimer); saveTimer = setTimeout(saveRemote, 1200); }
  }
  async function saveRemote() {
    try {
      const d = await post({ type: "boardSave", boards: state.boards });
      if (!d.ok) throw new Error(d.error || "");
      setStatus("Boards saved to the Sheet · " + new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    } catch (err) { setStatus("Boards are saved on this device. Saving to the Sheet failed: " + (err.message || err)); }
  }
  const board = () => state.boards.find(b => b.id === state.active) || state.boards[0];

  // ---------- Data ----------
  async function post(body) {
    const res = await fetch(CFG.SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ idToken }, body)), redirect: "follow" });
    return res.json();
  }
  async function loadData() {
    setStatus("Loading…");
    if (DEMO) {
      tables = D.normalize(D.demoData());
      $("#who").textContent = "Demo data · " + tables.visits.length + " visits, " + tables.incidents.length + " incident reports this school year";
      $("#demoNote").classList.remove("hidden");
    } else {
      const d = await D.liveData(CFG.SCRIPT_URL, idToken, 365);
      tables = D.normalize(d);
      $("#who").textContent = `Signed in as ${d.email} · ${tables.visits.length} visits, ${tables.incidents.length} incident reports in the last year`;
      if (d.sheetUrl) { $("#sheetLink").href = d.sheetUrl; $("#sheetLink").classList.remove("hidden"); }
      $("#signOutBtn").classList.remove("hidden");
      const remote = await post({ type: "boardLoad" }).catch(() => null);
      if (remote && remote.ok && Array.isArray(remote.boards) && remote.boards.length) { state.boards = remote.boards; state.active = remote.boards[0].id; }
    }
    const names = [...new Set(tables.visits.map(v => v.student).filter(Boolean))].sort();
    $("#studentList").innerHTML = names.map(n => `<option value="${esc(n)}">`).join("");
    setStatus("");
    renderAll();
  }
  function setStatus(t) { $("#status").textContent = t; }

  // ---------- Sign-in (live only) ----------
  function start() {
    state = loadLocal() || defaultState();
    if (!state.boards.length) state.boards = starterBoards();
    state.active = state.boards.some(b => b.id === state.active) ? state.active : state.boards[0].id;
    importShared();
    if (DEMO) { $("#app").classList.remove("hidden"); loadData(); return; }
    if (!CFG.GOOGLE_CLIENT_ID) { $("#gate").classList.remove("hidden"); $("#gateMsg").textContent = "Sign-in isn't set up: add GOOGLE_CLIENT_ID to config.js."; return; }
    if (idToken) { $("#app").classList.remove("hidden"); loadData().catch(err => signOut(err.message || String(err))); return; }
    $("#gate").classList.remove("hidden");
    const pending = sessionStorage.getItem("ppc_signin_msg"); if (pending) { $("#gateMsg").textContent = pending; sessionStorage.removeItem("ppc_signin_msg"); }
    const s = document.createElement("script"); s.src = "https://accounts.google.com/gsi/client"; s.async = true;
    s.onload = () => {
      google.accounts.id.initialize({ client_id: CFG.GOOGLE_CLIENT_ID, hd: CFG.ALLOWED_DOMAIN || undefined, auto_select: false, ux_mode: "popup", callback: resp => {
        idToken = resp.credential; sessionStorage.setItem("ppc_id_token", idToken);
        $("#gate").classList.add("hidden"); $("#app").classList.remove("hidden"); loadData().catch(err => signOut(err.message || String(err)));
      } });
      google.accounts.id.renderButton($("#gsiBtn"), { theme: "outline", size: "large", text: "signin_with", shape: "pill", width: 280 });
    };
    s.onerror = () => { $("#gateMsg").textContent = "Couldn't load Google sign-in. Check the network and try again."; };
    document.head.appendChild(s);
  }
  function signOut(msg) { idToken = ""; sessionStorage.removeItem("ppc_id_token"); if (msg) sessionStorage.setItem("ppc_signin_msg", msg); location.reload(); }
  $("#signOutBtn").addEventListener("click", () => signOut());
  $("#refreshBtn").addEventListener("click", () => loadData().catch(err => toast("Couldn't refresh: " + (err.message || err))));

  // ---------- Render ----------
  function renderAll() { renderTabs(); renderToolbar(); renderBoard(); }
  function renderTabs() {
    $("#tabs").innerHTML = state.boards.map(b => `<button class="tab ${b.id === state.active ? "on" : ""}" data-id="${b.id}">${esc(b.name)}</button>`).join("") + `<button class="tab add" id="addBoard">+ New board</button>`;
    $("#tabs").querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => { state.active = b.dataset.id; persist(); renderAll(); }));
    $("#addBoard").addEventListener("click", () => { const name = prompt("Name the new board:", "New board"); if (!name) return; const b = { id: uid(), name, layout: "grid", tiles: [] }; state.boards.push(b); state.active = b.id; persist(); renderAll(); });
  }
  function renderToolbar() {
    const sel = $("#rangeSel");
    sel.innerHTML = Object.entries(C.RANGE_LABELS).filter(([k]) => k !== "board").map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    sel.value = state.range || "year";
    const custom = sel.value === "custom";
    $("#customStart").classList.toggle("hidden", !custom); $("#customEnd").classList.toggle("hidden", !custom);
    $("#customStart").value = (state.custom && state.custom.start) || ""; $("#customEnd").value = (state.custom && state.custom.end) || "";
    const grades = ["6th", "7th", "8th"];
    $("#gradeFilter").innerHTML = grades.map(g => `<button type="button" class="btn sm ${state.grades.includes(g) ? "on" : ""}" data-g="${g}">${g}</button>`).join("");
    $("#gradeFilter").querySelectorAll("[data-g]").forEach(b => b.addEventListener("click", () => { const g = b.dataset.g; state.grades = state.grades.includes(g) ? state.grades.filter(x => x !== g) : state.grades.concat(g); persist(); renderAll(); }));
    $("#layoutSel").value = board().layout || "grid";
    $("#lockBtn").textContent = state.locked ? "🔒 Locked" : "🔓 Editing layout";
    $("#lockBtn").classList.toggle("on", !state.locked);
    $("#printTitle").textContent = `Pride Center · ${board().name} · ${C.RANGE_LABELS[state.range] || ""}${state.grades.length ? " · Grades " + state.grades.join(", ") : ""}`;
  }
  $("#rangeSel").addEventListener("change", e => { state.range = e.target.value; persist(); renderAll(); });
  ["#customStart", "#customEnd"].forEach(s => $(s).addEventListener("change", () => { state.custom = { start: $("#customStart").value, end: $("#customEnd").value }; persist(); renderBoard(); }));
  $("#layoutSel").addEventListener("change", e => { board().layout = e.target.value; persist(); renderBoard(); });
  $("#lockBtn").addEventListener("click", () => { state.locked = !state.locked; persist(); renderToolbar(); renderBoard(); if (!state.locked) toast(board().layout === "list" ? "Use the arrows to reorder. Lock when done." : "Drag a tile by its handle to move it, or drag the corner to resize. Lock when done."); });
  $("#addTileBtn").addEventListener("click", openGallery);

  const boardOpts = () => ({ range: state.range, custom: state.custom, filters: state.grades.length ? [{ dim: "grade", values: state.grades }] : [] });

  function tileTitle(t) {
    if (t.title) return t.title;
    const m = C.MEASURES[t.measure] ? C.MEASURES[t.measure].label : "Visits";
    const d = t.chart !== "number" && C.DIMENSIONS[t.dimension] ? " by " + C.DIMENSIONS[t.dimension].label.toLowerCase() : "";
    return m + d;
  }
  function tileSub(t) {
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
    b.tiles.forEach((t, i) => {
      const d = document.createElement("div");
      d.className = "tile" + (b.layout === "list" && t.w <= 6 ? " half" : "");
      d.dataset.id = t.id; d.dataset.w = String(t.w || 6);
      if (b.layout !== "list") { d.style.gridColumn = `span ${Math.min(12, Math.max(2, t.w || 6))}`; d.style.gridRow = `span ${Math.max(2, t.h || 4)}`; }
      d.innerHTML = `<div class="head"><span class="grip" title="Drag to move">⠿</span><h3>${esc(tileTitle(t))}<span class="sub">${esc(tileSub(t))}</span></h3>
        <span class="order"><button type="button" data-mv="-1" title="Move up">↑</button><button type="button" data-mv="1" title="Move down">↓</button><button type="button" data-half title="Half or full width">${t.w <= 6 ? "⇔" : "⇤"}</button></span>
        <div class="menu"><button type="button" class="kebab" aria-label="Tile menu">⋯</button><ul>
          <li><button type="button" data-act="edit">Edit…</button></li><li><button type="button" data-act="dup">Duplicate</button></li>
          <li><button type="button" data-act="csv">Download numbers (CSV)</button></li><li><button type="button" data-act="img">Copy as image</button></li>
          <li><button type="button" data-act="drill">See the records</button></li><li><button type="button" data-act="del">Delete</button></li></ul></div></div>
        <div class="body"><div class="vis"></div></div><div class="resize" title="Drag to resize"></div>`;
      el.appendChild(d);
      wireTile(d, t, i);
      renderTile(d, t);
    });
    const add = document.createElement("button"); add.type = "button"; add.className = "add-tile"; add.textContent = "+ Add tile"; add.addEventListener("click", openGallery); el.appendChild(add);
  }

  async function renderTile(d, t) {
    const vis = d.querySelector(".vis"), body = d.querySelector(".body");
    body.classList.toggle("scroll", t.chart === "table");
    let agg;
    try { agg = C.aggregate(tables, t, boardOpts()); } catch (err) { vis.innerHTML = `<div class="empty">Couldn't build this tile: ${esc(err.message || err)}</div>`; return; }
    aggs[t.id] = agg;
    if (!agg.totalN) { vis.innerHTML = `<div class="empty">No records in this date range.</div>`; return; }
    if (t.chart === "number") { vis.innerHTML = C.numberHTML(agg, t); vis.style.cursor = "pointer"; vis.onclick = () => drill(t, agg, null, null); return; }
    if (t.chart === "sankey") { vis.innerHTML = C.sankeySVG(agg.current, body.clientWidth - 20, body.clientHeight - 10); return; }
    if (t.chart === "table") { vis.innerHTML = C.tableHTML(agg); vis.querySelectorAll("tbody tr").forEach(tr => tr.addEventListener("click", () => drill(t, agg, tr.dataset.key, null))); return; }
    try {
      const spec = C.spec(agg, t);
      const res = await vegaEmbed(vis, spec, { actions: false, renderer: "canvas", tooltip: { theme: "light" } });
      views[t.id] = res.view;
      res.view.addEventListener("click", (ev, item) => { if (item && item.datum) drill(t, agg, item.datum.key, item.datum.series || null); });
    } catch (err) { vis.innerHTML = `<div class="empty">Chart error: ${esc(err.message || err)}</div>`; }
  }

  // ---------- Tile wiring: menu, order, drag, resize ----------
  function wireTile(d, t, i) {
    const menu = d.querySelector(".menu");
    menu.querySelector(".kebab").addEventListener("click", e => { e.stopPropagation(); document.querySelectorAll(".menu.open").forEach(m => m !== menu && m.classList.remove("open")); menu.classList.toggle("open"); });
    menu.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
      menu.classList.remove("open");
      const act = b.dataset.act, bd = board();
      if (act === "edit") openEditor(t);
      if (act === "dup") { const c = JSON.parse(JSON.stringify(t)); c.id = uid(); bd.tiles.splice(i + 1, 0, c); persist(); renderBoard(); }
      if (act === "del") { if (confirm(`Delete "${tileTitle(t)}"?`)) { bd.tiles = bd.tiles.filter(x => x.id !== t.id); persist(); renderBoard(); } }
      if (act === "csv") { const a = aggs[t.id]; if (a) download(tileTitle(t).replace(/[^\w]+/g, "-") + ".csv", C.csv(a), "text/csv"); }
      if (act === "img") copyImage(t);
      if (act === "drill") { const a = aggs[t.id]; if (a) drill(t, a, null, null); }
    }));
    d.querySelectorAll("[data-mv]").forEach(b => b.addEventListener("click", () => { const bd = board(), j = i + Number(b.dataset.mv); if (j < 0 || j >= bd.tiles.length) return; [bd.tiles[i], bd.tiles[j]] = [bd.tiles[j], bd.tiles[i]]; persist(); renderBoard(); }));
    const half = d.querySelector("[data-half]"); if (half) half.addEventListener("click", () => { t.w = t.w <= 6 ? 12 : 6; persist(); renderBoard(); });
    // Drag to reorder (grid layout, unlocked). Pointer events so it works with a finger on a tablet.
    const grip = d.querySelector(".grip");
    grip.addEventListener("pointerdown", e => {
      if (state.locked) return;
      e.preventDefault(); grip.setPointerCapture(e.pointerId);
      d.classList.add("dragging"); let over = null;
      const move = ev => { const el = document.elementFromPoint(ev.clientX, ev.clientY); const tt = el && el.closest(".tile"); document.querySelectorAll(".tile.over").forEach(x => x.classList.remove("over")); over = tt && tt !== d ? tt : null; if (over) over.classList.add("over"); };
      const up = () => {
        grip.removeEventListener("pointermove", move); grip.removeEventListener("pointerup", up); grip.removeEventListener("pointercancel", up);
        d.classList.remove("dragging"); document.querySelectorAll(".tile.over").forEach(x => x.classList.remove("over"));
        if (over) { const bd = board(), from = bd.tiles.findIndex(x => x.id === t.id), to = bd.tiles.findIndex(x => x.id === over.dataset.id); const [m] = bd.tiles.splice(from, 1); bd.tiles.splice(to, 0, m); persist(); renderBoard(); }
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
  document.addEventListener("click", () => document.querySelectorAll(".menu.open").forEach(m => m.classList.remove("open")));

  // ---------- Drill-down ----------
  function drill(t, agg, key, series) {
    let items;
    if (key == null) items = agg.current;
    else { const rows = agg.rows.filter(r => r.key === key && !r.previous && (series == null || r.series === series)); items = rows.length ? rows.flatMap(r => r.items) : []; }
    items = [...new Map(items.map(r => [r.ts.getTime() + r.student, r])).values()].sort((a, b) => b.ts - a.ts);
    const label = key == null ? "All records" : `${C.keyLabel(agg.dim, key)}${series && series !== "Current" ? " · " + series : ""}`;
    $("#drTitle").firstChild.textContent = tileTitle(t);
    $("#drSub").textContent = `${label} · ${items.length} record${items.length === 1 ? "" : "s"}`;
    const oneStudent = agg.dim === "student" && key != null ? key : null;
    $("#drCompare").classList.toggle("hidden", !oneStudent);
    $("#drCompare").onclick = () => { closeDrawer(); addTile(tile({ title: `${oneStudent} vs everyone`, chart: "grouped", dimension: "weekday", compare: "student", student: oneStudent, w: 6, h: 4 })); };
    const mc = m => m ? `<span class="chip"><i style="background:${C.MOOD_COLOR[m] || "#999"}"></i>${esc(m)}</span>` : "";
    $("#drBody").innerHTML = items.slice(0, 300).map(r => r.kind === "incident"
      ? `<div class="rec"><b>${esc(r.student)}</b>${r.grade ? " · " + esc(r.grade) : ""} · ${esc(r.ts.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}<div class="m">${esc(r.types.join(", "))}${r.place ? " · " + esc(r.place) : ""}${r.period ? " · " + esc(r.period) : ""}</div><div>${chip(r.status)}${r.action ? chip(r.action) : ""}${r.talk ? chip("Wanted to talk") : ""}</div></div>`
      : `<div class="rec"><b>${esc(r.student)}</b>${r.grade ? " · " + esc(r.grade) : ""} · ${esc(r.ts.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}<div class="m">${esc(r.reason)} · ${esc(r.referral)}${r.minutes != null ? " · " + r.minutes + " min" : ""}</div><div>${mc(r.moodIn)}${r.wordIn ? chip(r.wordIn) : ""}${r.moodOut ? "→ " + mc(r.moodOut) : ""}${r.helped.map(h => chip("Helped: " + h)).join("")}${r.basicNeeds.map(n => chip("Needs: " + n)).join("")}${r.alert ? chip("Alert word") : ""}</div></div>`).join("") + (items.length > 300 ? `<div class="empty">Showing the first 300.</div>` : "");
    $("#scrim").classList.add("show"); $("#drawer").classList.add("show");
  }
  const chip = s => `<span class="chip">${esc(s)}</span>`;
  function closeDrawer() { $("#scrim").classList.remove("show"); $("#drawer").classList.remove("show"); }
  $("#scrim").addEventListener("click", closeDrawer); $("#drClose").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

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
    $("#fW").value = String(t.w || 6); $("#fH").value = String(t.h || 4);
    refreshEditorFields(t);
    $("#editor").showModal();
  }
  function refreshEditorFields(t) {
    const ds = $("#fDataset").value, chart = $("#fChart").value, compare = $("#fCompare").value;
    const dims = Object.entries(C.DIMENSIONS).filter(([, d]) => d.for.includes(ds)).map(([k, d]) => [k, d.label]);
    const meas = Object.entries(C.MEASURES).filter(([, m]) => m.for.includes(ds)).map(([k, m]) => [k, m.label]);
    opts($("#fMeasure"), meas, t.measure); opts($("#fMeasure2"), meas, t.measure2);
    opts($("#fDimension"), dims, t.dimension); opts($("#fBreakdown"), dims, t.breakdown);
    if (!meas.some(([k]) => k === $("#fMeasure").value)) $("#fMeasure").value = meas[0][0];
    if (chart === "calendar") $("#fDimension").value = "date";
    const needsBreak = ["stacked", "grouped", "heatmap"].includes(chart) || compare === "groups";
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
  ["#fDataset", "#fChart", "#fCompare", "#fRange", "#fDimension"].forEach(s => $(s).addEventListener("change", () => { if (!editing) return; editing.filters = readFilters(); editing.measure = $("#fMeasure").value; editing.measure2 = $("#fMeasure2").value; editing.dimension = $("#fDimension").value; editing.breakdown = $("#fBreakdown").value; refreshEditorFields(editing); }));
  function readFilters() { return [...$("#fFilters").querySelectorAll(".frow")].map(row => ({ dim: row.dataset.dim, values: [...row.querySelectorAll('button[aria-pressed="true"]')].map(b => b.dataset.v) })).filter(f => f.values.length); }
  $("#edForm").addEventListener("submit", e => {
    e.preventDefault();
    const t = editing;
    Object.assign(t, { title: $("#fTitle").value.trim(), dataset: $("#fDataset").value, chart: $("#fChart").value, measure: $("#fMeasure").value, dimension: $("#fDimension").value,
      breakdown: $("#lBreakdown").classList.contains("hidden") ? null : $("#fBreakdown").value, compare: $("#fCompare").value, measure2: $("#fMeasure2").value, student: $("#fStudent").value.trim(),
      range: $("#fRange").value, custom: { start: $("#fStart").value, end: $("#fEnd").value }, top: Number($("#fTop").value), w: Number($("#fW").value), h: Number($("#fH").value), filters: readFilters() });
    if (t.chart === "calendar") t.dimension = "date";
    if (t.chart === "scatter" && t.compare === "none") t.compare = "measures";
    if (!C.MEASURES[t.measure] || !C.MEASURES[t.measure].for.includes(t.dataset)) t.measure = t.dataset === "incident" ? "incidents" : "count";
    $("#editor").close();
    const bd = board();
    if (editingNew) bd.tiles.push(t); else { const i = bd.tiles.findIndex(x => x.id === t.id); if (i >= 0) bd.tiles[i] = t; }
    persist(); renderBoard();
  });
  $("#edCancel").addEventListener("click", () => $("#editor").close());
  $("#edDelete").addEventListener("click", () => { const bd = board(); bd.tiles = bd.tiles.filter(x => x.id !== editing.id); $("#editor").close(); persist(); renderBoard(); });

  // ---------- Board menu ----------
  $("#boardMenuBtn").addEventListener("click", e => { e.stopPropagation(); const m = $("#boardMenu"); m.style.display = m.style.display === "none" ? "block" : "none"; });
  document.addEventListener("click", () => { $("#boardMenu").style.display = "none"; });
  $("#boardMenu").querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", () => {
    const act = b.dataset.act, bd = board();
    if (act === "rename") { const n = prompt("Board name:", bd.name); if (n) { bd.name = n; persist(); renderAll(); } }
    if (act === "print") window.print();
    if (act === "share") { const url = location.origin + location.pathname + "#share=" + b64(JSON.stringify(bd)); navigator.clipboard.writeText(url).then(() => toast("Link copied. Anyone who opens it can add this board to their own page."), () => prompt("Copy this link:", url)); }
    if (act === "duplicate") { const c = JSON.parse(JSON.stringify(bd)); c.id = uid(); c.name = bd.name + " (copy)"; c.tiles.forEach(t => t.id = uid()); state.boards.push(c); state.active = c.id; persist(); renderAll(); }
    if (act === "reset") { if (confirm("Restore the three starter boards? Your current boards stay; the starters are added again.")) { state.boards = state.boards.concat(starterBoards()); persist(); renderAll(); } }
    if (act === "delete") { if (state.boards.length === 1) return toast("Keep at least one board."); if (confirm(`Delete the board "${bd.name}"?`)) { state.boards = state.boards.filter(x => x.id !== bd.id); state.active = state.boards[0].id; persist(); renderAll(); } }
  }));
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, "+").replace(/_/g, "/"))));
  function importShared() {
    const m = location.hash.match(/share=([A-Za-z0-9_-]+)/); if (!m) return;
    try { const bd = JSON.parse(unb64(m[1])); if (!bd || !Array.isArray(bd.tiles)) return; bd.id = uid(); bd.tiles.forEach(t => t.id = uid()); bd.name = (bd.name || "Shared board"); if (confirm(`Add the shared board "${bd.name}" to your page?`)) { state.boards.push(bd); state.active = bd.id; persist(); } } catch {}
    history.replaceState(null, "", location.pathname);
  }

  // ---------- Exports ----------
  function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  async function copyImage(t) {
    const v = views[t.id];
    try {
      let blob;
      if (v) { const url = await v.toImageURL("png", 2); blob = await (await fetch(url)).blob(); }
      else { const el = document.querySelector(`.tile[data-id="${t.id}"] .vis svg`); if (!el) return toast("This tile can't be copied as an image. Use Download numbers instead."); blob = await svgToPng(el); }
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast("Image copied. Paste it into a slide or email.");
    } catch (err) {
      if (v) { const url = await v.toImageURL("png", 2); const a = document.createElement("a"); a.href = url; a.download = tileTitle(t).replace(/[^\w]+/g, "-") + ".png"; a.click(); toast("Copying isn't allowed here, so the image was downloaded instead."); }
      else toast("Couldn't copy: " + (err.message || err));
    }
  }
  function svgToPng(svg) {
    return new Promise((resolve, reject) => {
      const xml = new XMLSerializer().serializeToString(svg), img = new Image(), r = svg.getBoundingClientRect();
      img.onload = () => { const c = document.createElement("canvas"); c.width = r.width * 2; c.height = r.height * 2; const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height); c.toBlob(b => b ? resolve(b) : reject(new Error("no image")), "image/png"); };
      img.onerror = reject; img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
    });
  }
  let toastTimer;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3500); }

  // Re-render charts when the window changes size (charts size to their tile).
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (tables) renderBoard(); }, 250); });

  start();
})();
