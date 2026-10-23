/* Principal dashboard: tile engine.
 * A tile = { dataset, measure, dimension, breakdown, chart, filters, compare, ... }.
 * aggregate() turns the normalized tables into rows of { key, series, value, n, items },
 * spec() turns those rows into a Vega-Lite spec (or a custom renderer for sankey / table / number).
 */
window.PPC_CHARTS = (function () {
  const D = window.PPD;
  const MOOD_COLOR = { Red: "#c1272d", Yellow: "#eda232", Blue: "#2b5090", Green: "#4c9a47" };
  const PALETTE = ["#d61f26", "#2b5090", "#4c9a47", "#eda232", "#7e6bb0", "#1f8a9c", "#c75d9a", "#8a6d3b", "#555", "#9bbb59", "#e07b39", "#4472c4"];
  const PREV_COLOR = "#b8b8b8";
  const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const HOUR_ORDER = Array.from({ length: 11 }, (_, i) => 7 + i); // 7am to 5pm
  const PERIOD_ORDER = ["Before School", "Breakfast", "1st Hour", "2nd Hour", "3rd Hour", "4th Hour", "Lunch", "Recess", "5th Hour", "6th Hour", "7th Hour", "8th Hour", "Passing Time", "Other"];
  const GRADE_ORDER = ["6th", "7th", "8th"];

  // ---------- Field catalog ----------
  // Dimensions: how to bucket a record. multi = one record can land in several buckets.
  const DIMENSIONS = {
    date:     { label: "Day", temporal: "day", get: r => r.date, for: ["visit", "incident"] },
    week:     { label: "Week", temporal: "week", get: r => r.week, for: ["visit", "incident"] },
    month:    { label: "Month", temporal: "month", get: r => r.month, for: ["visit", "incident"] },
    weekday:  { label: "Day of week", order: WEEKDAY_ORDER, get: r => r.weekday, for: ["visit", "incident"] },
    hour:     { label: "Hour of day", order: HOUR_ORDER.map(String), get: r => String(r.hour), fmt: k => { const h = Number(k); return h === 12 ? "12 pm" : h > 12 ? (h - 12) + " pm" : h + " am"; }, for: ["visit", "incident"] },
    grade:    { label: "Grade", order: GRADE_ORDER, get: r => r.grade || "Unknown", for: ["visit", "incident"] },
    student:  { label: "Student", get: r => r.student || "Unknown", for: ["visit", "incident"], sortByValue: true, personal: true },
    referral: { label: "How they came", get: r => r.referral || "Unknown", for: ["visit"] },
    reason:   { label: "Reason", get: r => r.reason || "Unknown", for: ["visit"] },
    outcome:  { label: "Outcome", get: r => r.outcome, for: ["visit"] },
    moodIn:   { label: "Mood on arrival", order: D.MOODS, mood: true, get: r => r.moodIn || "No word", for: ["visit"] },
    wordIn:   { label: "Feeling word on arrival", get: r => r.wordIn || "None", for: ["visit"], sortByValue: true },
    energy:   { label: "Energy", order: ["Moving Fast", "Moving Ok", "Moving Slow"], get: r => r.energy || "Unknown", for: ["visit"] },
    happened: { label: "Did something happen", get: r => r.happened || "No answer", for: ["visit"] },
    station:  { label: "Station", order: D.MOODS, mood: true, get: r => r.station || "None", for: ["visit"] },
    basicNeed:{ label: "Basic need", multi: true, get: r => r.basicNeeds, for: ["visit"], sortByValue: true },
    moodOut:  { label: "Mood at check-out", order: D.MOODS, mood: true, get: r => r.moodOut || "No read", for: ["visit"] },
    helped:   { label: "What helped", multi: true, get: r => r.helped, for: ["visit"], sortByValue: true },
    checkedOutBy: { label: "Checked out by", get: r => r.checkedOutBy || "Not checked out", for: ["visit"] },
    type:     { label: "Incident type", multi: true, get: r => r.types, for: ["incident"], sortByValue: true },
    place:    { label: "Where", get: r => r.place || "Unknown", for: ["incident"], sortByValue: true },
    period:   { label: "When (hour)", order: PERIOD_ORDER, get: r => r.period || "Unknown", for: ["incident"] },
    status:   { label: "Follow-up status", order: ["Open", "Needs more follow-up", "Resolved"], get: r => r.status, for: ["incident"] },
    action:   { label: "Follow-up action", get: r => r.action || "None yet", for: ["incident"], sortByValue: true },
  };
  // Measures: a number for a set of records. pct measures return null when the base is empty.
  const pct = (num, den) => den ? Math.round(1000 * num / den) / 10 : null;
  const avg = a => a.length ? Math.round(10 * a.reduce((s, x) => s + x, 0) / a.length) / 10 : null;
  const MEASURES = {
    count:        { label: "Visits", unit: "", for: ["visit"], calc: rows => rows.length },
    students:     { label: "Students (unique)", unit: "", for: ["visit", "incident"], calc: rows => new Set(rows.map(r => r.studentId || r.student)).size },
    perStudent:   { label: "Visits per student", unit: "", for: ["visit"], calc: rows => { const n = new Set(rows.map(r => r.studentId || r.student)).size; return n ? Math.round(10 * rows.length / n) / 10 : null; } },
    avgMinutes:   { label: "Average minutes in room", unit: " min", for: ["visit"], calc: rows => avg(rows.filter(r => r.minutes != null).map(r => r.minutes)) },
    pctHard:      { label: "% arriving red or blue", unit: "%", for: ["visit"], calc: rows => { const b = rows.filter(r => r.moodIn); return pct(b.filter(r => r.arrivedHard).length, b.length); } },
    pctLeftOk:    { label: "% leaving green or yellow", unit: "%", for: ["visit"], calc: rows => { const b = rows.filter(r => r.moodOut); return pct(b.filter(r => r.leftPleasant).length, b.length); } },
    pctImproved:  { label: "% who came in red/blue and left green/yellow", unit: "%", for: ["visit"], calc: rows => { const b = rows.filter(r => r.improved != null); return pct(b.filter(r => r.improved).length, b.length); } },
    pctCheckedOut:{ label: "% checked out", unit: "%", for: ["visit"], calc: rows => pct(rows.filter(r => r.checkedOut).length, rows.length) },
    pctAlert:     { label: "% alert words", unit: "%", for: ["visit"], calc: rows => pct(rows.filter(r => r.alert).length, rows.length) },
    pctStaffSent: { label: "% sent by staff", unit: "%", for: ["visit"], calc: rows => pct(rows.filter(r => r.referral === "Sent by staff").length, rows.length) },
    pctSuggested: { label: "% went to suggested station", unit: "%", for: ["visit"], calc: rows => { const b = rows.filter(r => r.station && r.stationSuggested && r.stationSuggested !== "Staff first"); return pct(b.filter(r => r.station === r.stationSuggested).length, b.length); } },
    incidents:    { label: "Incident reports", unit: "", for: ["incident"], calc: rows => rows.length },
    pctFollowedUp:{ label: "% followed up", unit: "%", for: ["incident"], calc: rows => pct(rows.filter(r => r.followedUp).length, rows.length) },
    pctOpen:      { label: "% still open", unit: "%", for: ["incident"], calc: rows => pct(rows.filter(r => r.open).length, rows.length) },
    avgDaysFU:    { label: "Average days to follow-up", unit: " days", for: ["incident"], calc: rows => avg(rows.filter(r => r.daysToFollowUp != null).map(r => r.daysToFollowUp)) },
    pctTalk:      { label: "% wanted to talk", unit: "%", for: ["incident"], calc: rows => pct(rows.filter(r => r.talk).length, rows.length) },
  };
  const CHARTS = {
    bar: "Bars", barh: "Horizontal bars", stacked: "Stacked bars", grouped: "Grouped bars", line: "Line", area: "Area", pie: "Pie", donut: "Donut",
    heatmap: "Heatmap", calendar: "Calendar", scatter: "Scatter", table: "Table", number: "Big number", sankey: "Flow (mood in → out)"
  };
  const FILTERABLE = ["grade", "referral", "reason", "outcome", "moodIn", "station", "moodOut", "place", "period", "status", "weekday"];
  const DATASETS = { visit: "Visits", incident: "Incident reports" };

  // ---------- Date ranges ----------
  function range(preset, now, custom) {
    now = now || new Date();
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    const start = new Date(now); start.setHours(0, 0, 0, 0);
    const sy = new Date(now.getFullYear(), 7, 1); if (sy > now) sy.setFullYear(sy.getFullYear() - 1);
    switch (preset) {
      case "week": return { start: D.weekStart(now), end };
      case "lastweek": { const s = D.weekStart(now); s.setDate(s.getDate() - 7); const e = new Date(s); e.setDate(e.getDate() + 6); e.setHours(23, 59, 59, 999); return { start: s, end: e }; }
      case "30": start.setDate(start.getDate() - 29); return { start, end };
      case "month": return { start: new Date(now.getFullYear(), now.getMonth(), 1), end };
      case "lastmonth": return { start: new Date(now.getFullYear(), now.getMonth() - 1, 1), end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999) };
      case "90": start.setDate(start.getDate() - 89); return { start, end };
      case "custom": return { start: custom && custom.start ? new Date(custom.start + "T00:00:00") : sy, end: custom && custom.end ? new Date(custom.end + "T23:59:59") : end };
      case "year": default: return { start: sy, end };
    }
  }
  const RANGE_LABELS = { board: "Same as the board", week: "This week", lastweek: "Last week", 30: "Last 30 days", month: "This month", lastmonth: "Last month", 90: "Last 90 days", year: "This school year", custom: "Custom dates" };
  function previousRange(r) { const len = r.end - r.start + 1; return { start: new Date(r.start - len), end: new Date(r.end - len) }; }

  // ---------- Filtering and aggregation ----------
  function applyFilters(rows, filters) {
    (filters || []).forEach(f => {
      const dim = DIMENSIONS[f.dim]; if (!dim || !f.values || !f.values.length) return;
      const set = new Set(f.values);
      rows = rows.filter(r => { const v = dim.get(r); return Array.isArray(v) ? v.some(x => set.has(x)) : set.has(v); });
    });
    return rows;
  }
  function inRange(rows, r) { return rows.filter(x => x.ts >= r.start && x.ts <= r.end); }
  function bucket(rows, dimKey) {
    const dim = DIMENSIONS[dimKey]; const m = new Map();
    if (!dim) { m.set("All", rows); return m; }
    rows.forEach(r => { const v = dim.get(r); (Array.isArray(v) ? v : [v]).forEach(k => { if (!m.has(k)) m.set(k, []); m.get(k).push(r); }); });
    return m;
  }
  function orderKeys(dimKey, keys, valueOf) {
    const dim = DIMENSIONS[dimKey];
    if (!dim) return keys;
    if (dim.temporal) return keys.slice().sort();
    if (dim.order) return dim.order.filter(k => keys.includes(k)).concat(keys.filter(k => !dim.order.includes(k)).sort());
    if (dim.sortByValue && valueOf) return keys.slice().sort((a, b) => (valueOf(b) || 0) - (valueOf(a) || 0));
    return keys.slice().sort();
  }
  /** Returns { rows: [{key, series, value, n, items}], keys, series, measure, dim, breakdown, compare } */
  function aggregate(tables, tile, opts) {
    opts = opts || {};
    const now = opts.now || new Date();
    const base = tile.dataset === "incident" ? tables.incidents : tables.visits;
    const measure = MEASURES[tile.measure] || MEASURES[tile.dataset === "incident" ? "incidents" : "count"];
    const inherit = !tile.range || tile.range === "board";
    const r = range(inherit ? (opts.range || "year") : tile.range, now, inherit ? opts.custom : tile.custom);
    const filtered = applyFilters(base, (opts.filters || []).concat(tile.filters || []));
    const current = inRange(filtered, r);
    const dimKey = tile.chart === "number" ? null : tile.dimension;
    const out = { rows: [], measure, dim: dimKey, breakdown: null, compare: tile.compare || "none", range: r, unit: measure.unit };

    const push = (key, series, items) => { const v = measure.calc(items); out.rows.push({ key, series, value: v, n: items.length, items }); };
    const breakdownKey = (tile.chart === "heatmap" || tile.chart === "stacked" || tile.chart === "grouped" || tile.compare === "groups") && tile.breakdown ? tile.breakdown : null;
    const compare2 = tile.compare === "measures" && tile.measure2 && MEASURES[tile.measure2] ? MEASURES[tile.measure2] : null;
    out.measure2 = compare2;

    const buckets = bucket(current, dimKey);
    let keys = [...buckets.keys()];
    if (breakdownKey) {
      out.breakdown = breakdownKey;
      const seriesSet = new Set();
      buckets.forEach((items, key) => { const sub = bucket(items, breakdownKey); sub.forEach((its, s) => { seriesSet.add(s); push(key, s, its); }); });
      out.series = orderKeys(breakdownKey, [...seriesSet]);
    } else if (compare2) {
      buckets.forEach((items, key) => { push(key, measure.label, items); const v = compare2.calc(items); out.rows.push({ key, series: compare2.label, value: v, n: items.length, items, secondary: true }); });
      out.series = [measure.label, compare2.label];
    } else if (tile.compare === "student" && tile.student) {
      buckets.forEach((items, key) => { push(key, "Everyone", items); push(key, tile.student, items.filter(x => x.student === tile.student)); });
      out.series = ["Everyone", tile.student];
    } else {
      buckets.forEach((items, key) => push(key, "Current", items));
      out.series = ["Current"];
    }
    if (tile.compare === "previous") {
      const pr = previousRange(r), prev = inRange(filtered, pr);
      const pb = bucket(prev, dimKey);
      const shift = DIMENSIONS[dimKey] && DIMENSIONS[dimKey].temporal; // line up previous period by position, not by date
      const prevKeys = orderKeys(dimKey, [...pb.keys()]);
      const curKeys = orderKeys(dimKey, keys);
      pb.forEach((items, key) => {
        const k = shift ? (curKeys[prevKeys.indexOf(key)] || null) : key;
        if (k == null) return;
        const v = measure.calc(items); out.rows.push({ key: k, series: "Previous period", value: v, n: items.length, items, previous: true, prevKey: key });
        if (!keys.includes(k)) keys.push(k);
      });
      out.series = (out.series || []).concat(["Previous period"]);
      out.previousTotal = measure.calc(prev);
      out.previousN = prev.length;
    }
    // Rates and averages rank by how many records back them, so a 100% from two visits doesn't top the list.
    const byRecords = !!measure.unit;
    const totalOf = k => out.rows.filter(x => x.key === k && !x.previous && !x.secondary).reduce((s, x) => s + (byRecords ? x.n : (x.value || 0)), 0);
    keys = orderKeys(dimKey, keys, totalOf);
    if (DIMENSIONS[dimKey] && DIMENSIONS[dimKey].sortByValue && (tile.top || 12) && !DIMENSIONS[dimKey].temporal) keys = keys.slice(0, tile.top || 12);
    out.keys = keys;
    out.rows = out.rows.filter(x => keys.includes(x.key));
    out.total = measure.calc(current);
    out.totalN = current.length;
    out.current = current;
    return out;
  }

  // ---------- Vega-Lite specs ----------
  function keyLabel(dimKey, k) { const dim = DIMENSIONS[dimKey]; return dim && dim.fmt ? dim.fmt(k) : k; }
  function colorScale(agg, tile) {
    const field = agg.breakdown || (agg.series && agg.series.length > 1 ? "series" : null);
    if (!field) return { value: tile.color || PALETTE[0] };
    const dimForColor = agg.breakdown ? DIMENSIONS[agg.breakdown] : null;
    const rangeC = agg.series.map((s, i) => s === "Previous period" ? PREV_COLOR : (dimForColor && dimForColor.mood && MOOD_COLOR[s]) ? MOOD_COLOR[s] : PALETTE[i % PALETTE.length]);
    const domain = agg.series.map(s => agg.breakdown ? keyLabel(agg.breakdown, s) : s);
    return { field: "series", type: "nominal", title: agg.breakdown ? DIMENSIONS[agg.breakdown].label : null, scale: { domain, range: rangeC }, legend: { orient: "bottom", columns: 4 } };
  }
  function keyColorScale(agg) {
    const dim = DIMENSIONS[agg.dim];
    const domain = agg.keys;
    const rangeC = domain.map((k, i) => dim && dim.mood && MOOD_COLOR[k] ? MOOD_COLOR[k] : PALETTE[i % PALETTE.length]);
    return { field: "label", type: "nominal", title: null, scale: { domain: domain.map(k => keyLabel(agg.dim, k)), range: rangeC }, legend: { orient: "right" } };
  }
  function values(agg) {
    return agg.rows.map(r => ({ key: r.key, label: keyLabel(agg.dim, r.key), series: agg.breakdown ? keyLabel(agg.breakdown, r.series) : r.series, value: r.value, n: r.n, prevKey: r.prevKey || null }));
  }
  const BASE = { config: { font: "Fredoka, Avenir Next, Segoe UI, sans-serif", axis: { labelFontSize: 12, titleFontSize: 12, labelColor: "#444", titleColor: "#666", gridColor: "#eee", domainColor: "#ccc" }, legend: { labelFontSize: 12, titleFontSize: 12 }, view: { stroke: null }, background: "transparent" }, autosize: { type: "fit", contains: "padding" }, width: "container", height: "container" };

  function spec(agg, tile) {
    const dim = DIMENSIONS[agg.dim];
    const temporal = dim && dim.temporal;
    const vals = values(agg);
    const title = agg.measure.label + (agg.unit === "%" ? " (%)" : "");
    const xField = { field: "label", type: temporal ? "temporal" : "ordinal", title: dim ? dim.label : null,
      sort: temporal ? null : agg.keys.map(k => keyLabel(agg.dim, k)), axis: { labelAngle: temporal || agg.keys.length > 6 || agg.keys.some(k => String(keyLabel(agg.dim, k)).length > 9) ? -35 : 0, labelLimit: 120, format: temporal === "month" ? "%b %Y" : temporal ? "%b %d" : undefined } };
    if (temporal) vals.forEach(v => { v.label = temporal === "month" ? v.key + "-01" : v.key; });
    const yField = { field: "value", type: "quantitative", title, axis: { grid: true } };
    const tooltip = [{ field: "label", title: dim ? dim.label : "Group", type: temporal ? "temporal" : "nominal", format: temporal ? "%b %d, %Y" : undefined }, { field: "series", title: "Series" }, { field: "value", title: agg.measure.label }, { field: "n", title: "Records" }];
    const color = colorScale(agg, tile);
    const multi = agg.series.length > 1;
    const chart = tile.chart || "bar";
    // Bars on a date axis: evenly spaced columns, labelled as dates, instead of hairlines on a time scale.
    if (temporal && ["bar", "barh", "stacked", "grouped"].includes(chart)) {
      xField.type = "ordinal"; xField.sort = agg.keys.map(k => keyLabel(agg.dim, k)); delete xField.axis.format;
      xField.axis.labelExpr = temporal === "month" ? "timeFormat(timeParse(datum.value, '%Y-%m-01'), '%b %Y')" : "timeFormat(timeParse(datum.value, '%Y-%m-%d'), '%b %d')";
      tooltip[0] = { field: "label", title: dim.label, type: "nominal" };
    }
    const s = Object.assign({}, BASE, { data: { values: vals } });
    switch (chart) {
      case "line": case "area":
        s.mark = { type: chart, point: chart === "line" ? { size: 50 } : false, tooltip: true, interpolate: "monotone", opacity: chart === "area" ? 0.75 : 1 };
        s.encoding = { x: xField, y: yField, color, tooltip, strokeDash: agg.compare === "previous" ? { field: "series", legend: null } : undefined };
        if (multi && chart === "area") s.encoding.y.stack = agg.compare === "previous" ? null : "zero";
        return s;
      case "barh":
        s.mark = { type: "bar", tooltip: true, cornerRadiusEnd: 3 };
        s.encoding = { y: Object.assign({}, xField, { axis: { labelLimit: 180 } }), x: yField, color, tooltip };
        if (multi && agg.compare !== "none" && !agg.breakdown) s.encoding.yOffset = { field: "series" };
        return s;
      case "stacked":
        s.mark = { type: "bar", tooltip: true };
        s.encoding = { x: xField, y: Object.assign({}, yField, { stack: "zero" }), color, tooltip };
        return s;
      case "grouped":
        s.mark = { type: "bar", tooltip: true, cornerRadiusEnd: 3 };
        s.encoding = { x: xField, y: yField, color, xOffset: { field: "series" }, tooltip };
        return s;
      case "pie": case "donut":
        s.mark = { type: "arc", innerRadius: chart === "donut" ? 55 : 0, tooltip: true };
        s.encoding = { theta: { field: "value", type: "quantitative", stack: true }, color: keyColorScale(agg), tooltip };
        s.data.values = vals.filter(v => !v.prevKey && v.series !== "Previous period");
        return s;
      case "heatmap": {
        const bd = DIMENSIONS[agg.breakdown];
        s.mark = { type: "rect", tooltip: true };
        s.encoding = { x: Object.assign({}, xField, { type: "ordinal" }), y: { field: "series", type: "ordinal", title: bd ? bd.label : "", sort: agg.series.map(k => keyLabel(agg.breakdown, k)) },
          color: { field: "value", type: "quantitative", title: agg.measure.label, scale: { scheme: "reds" }, legend: { orient: "bottom", direction: "horizontal", gradientLength: 180 } }, tooltip };
        s.config.axis.grid = false;
        return s;
      }
      case "calendar": {
        // Day dimension drawn as weeks across, weekdays down.
        const days = vals.filter(v => v.series !== "Previous period").map(v => { const d = new Date(v.key + "T12:00:00"); return Object.assign(v, { week: D.weekKey(d), wd: D.WEEKDAYS[d.getDay()], dateLabel: d.toLocaleDateString([], { month: "short", day: "numeric" }) }); });
        s.data.values = days;
        s.mark = { type: "rect", tooltip: true, stroke: "#fff", strokeWidth: 2 };
        s.encoding = { x: { field: "week", type: "ordinal", title: "Week of", axis: { labelAngle: -40, labelExpr: "timeFormat(toDate(datum.value), '%b %d')" } },
          y: { field: "wd", type: "ordinal", title: null, sort: WEEKDAY_ORDER.slice(0, 5) },
          color: { field: "value", type: "quantitative", title: agg.measure.label, scale: { scheme: "blues" }, legend: { orient: "bottom", direction: "horizontal", gradientLength: 180 } },
          tooltip: [{ field: "dateLabel", title: "Day" }, { field: "value", title: agg.measure.label }, { field: "n", title: "Records" }] };
        s.config.axis.grid = false;
        return s;
      }
      case "scatter": {
        // One point per bucket: x = measure, y = second measure (or record count).
        const byKey = {};
        agg.rows.forEach(r => { if (r.previous) return; const o = byKey[r.key] = byKey[r.key] || { key: r.key, label: keyLabel(agg.dim, r.key), n: r.n }; if (r.secondary) o.y = r.value; else o.x = r.value; });
        const pts = Object.values(byKey).map(o => ({ key: o.key, label: o.label, x: o.x, y: o.y == null ? o.n : o.y, n: o.n }));
        s.data.values = pts;
        s.mark = { type: "circle", size: 140, opacity: 0.8, tooltip: true };
        s.encoding = { x: { field: "x", type: "quantitative", title: agg.measure.label }, y: { field: "y", type: "quantitative", title: agg.measure2 ? agg.measure2.label : "Records" },
          color: keyColorScale(agg), tooltip: [{ field: "label", title: dim ? dim.label : "Group" }, { field: "x", title: agg.measure.label }, { field: "y", title: agg.measure2 ? agg.measure2.label : "Records" }] };
        if (pts.length > 12) s.encoding.color = { value: PALETTE[1] };
        return s;
      }
      case "bar": default:
        s.mark = { type: "bar", tooltip: true, cornerRadiusEnd: 3 };
        s.encoding = { x: xField, y: yField, color, tooltip };
        if (multi) s.encoding.xOffset = { field: "series" };
        return s;
    }
  }

  // ---------- Custom renderers ----------
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  function fmt(v, unit) { if (v == null) return "–"; return (Number.isInteger(v) ? v : v.toFixed(1)) + (unit === "%" ? "%" : (unit || "")); }

  /** Sankey: mood on arrival (left) to mood at check-out (right), from visits with both. */
  function sankeySVG(rows, width, height) {
    const pairs = rows.filter(r => r.moodIn && r.moodOut);
    if (!pairs.length) return `<div class="empty">No check-outs with a mood read in this range.</div>`;
    const L = D.MOODS, R = D.MOODS.concat();
    const flow = {}; pairs.forEach(r => { const k = r.moodIn + "|" + r.moodOut; flow[k] = (flow[k] || 0) + 1; });
    const lt = {}, rt = {}; pairs.forEach(r => { lt[r.moodIn] = (lt[r.moodIn] || 0) + 1; rt[r.moodOut] = (rt[r.moodOut] || 0) + 1; });
    const W = width || 520, H = height || 300, pad = 14, nodeW = 16, gap = 10, labelW = 118;
    const total = pairs.length, usable = H - pad * 2 - gap * 3;
    const place = (counts) => { let y = pad; const pos = {}; D.MOODS.forEach(m => { const h = (counts[m] || 0) / total * usable; pos[m] = { y, h }; y += h + gap; }); return pos; };
    const lp = place(lt), rp = place(rt);
    const x0 = labelW, x1 = W - labelW - nodeW;
    let out = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" role="img" aria-label="Mood on arrival to mood at check-out">`;
    const lOff = {}, rOff = {};
    L.forEach(a => R.forEach(b => {
      const n = flow[a + "|" + b]; if (!n) return;
      const h = n / total * usable;
      const ya = lp[a].y + (lOff[a] || 0), yb = rp[b].y + (rOff[b] || 0);
      lOff[a] = (lOff[a] || 0) + h; rOff[b] = (rOff[b] || 0) + h;
      const xa = x0 + nodeW, xb = x1, c = (xa + xb) / 2;
      out += `<path d="M${xa},${ya} C${c},${ya} ${c},${yb} ${xb},${yb} L${xb},${yb + h} C${c},${yb + h} ${c},${ya + h} ${xa},${ya + h} Z" fill="${MOOD_COLOR[b]}" opacity="0.45"><title>${a} → ${b}: ${n} (${Math.round(100 * n / total)}%)</title></path>`;
    }));
    D.MOODS.forEach(m => {
      if (lt[m]) out += `<rect x="${x0}" y="${lp[m].y}" width="${nodeW}" height="${lp[m].h}" fill="${MOOD_COLOR[m]}" rx="3"/><text x="${x0 - 8}" y="${lp[m].y + lp[m].h / 2 + 4}" text-anchor="end" font-size="13" fill="#333">${m} in · ${lt[m]}</text>`;
      if (rt[m]) out += `<rect x="${x1}" y="${rp[m].y}" width="${nodeW}" height="${rp[m].h}" fill="${MOOD_COLOR[m]}" rx="3"/><text x="${x1 + nodeW + 8}" y="${rp[m].y + rp[m].h / 2 + 4}" font-size="13" fill="#333">${m} out · ${rt[m]}</text>`;
    });
    return out + "</svg>";
  }

  function tableHTML(agg) {
    const dim = DIMENSIONS[agg.dim];
    const multi = agg.series.length > 1;
    const head = `<tr><th>${esc(dim ? dim.label : "")}</th>${multi ? agg.series.map(s => `<th>${esc(s)}</th>`).join("") : `<th>${esc(agg.measure.label)}</th><th>Records</th>`}</tr>`;
    const body = agg.keys.map(k => {
      const cells = multi ? agg.series.map(s => { const r = agg.rows.find(x => x.key === k && x.series === s); return `<td class="num">${r ? fmt(r.value, agg.unit) : "–"}</td>`; }).join("")
        : (() => { const r = agg.rows.find(x => x.key === k); return `<td class="num">${r ? fmt(r.value, agg.unit) : "–"}</td><td class="num">${r ? r.n : 0}</td>`; })();
      return `<tr data-key="${esc(k)}"><td>${esc(keyLabel(agg.dim, k))}</td>${cells}</tr>`;
    }).join("");
    return `<table class="tile-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
  }

  function numberHTML(agg, tile) {
    const v = agg.total;
    let delta = "";
    if (agg.compare === "previous" && !agg.previousN) delta = `<div class="delta">No data in the previous period to compare</div>`;
    else if (agg.compare === "previous" && agg.previousTotal != null && v != null) {
      const diff = v - agg.previousTotal;
      const up = diff > 0, flat = Math.abs(diff) < 0.05;
      delta = `<div class="delta ${flat ? "" : up ? "up" : "down"}">${flat ? "No change" : (up ? "▲ " : "▼ ") + fmt(Math.abs(diff), agg.unit === "%" ? " pts" : agg.unit)} vs previous period</div>`;
    }
    return `<div class="bignum"><div class="v">${fmt(v, agg.unit)}</div><div class="l">${esc(agg.measure.label)}</div>${delta}<div class="sub">${agg.totalN} record${agg.totalN === 1 ? "" : "s"}</div></div>`;
  }

  function csv(agg) {
    const dim = DIMENSIONS[agg.dim];
    const rows = [[dim ? dim.label : "Group", "Series", agg.measure.label, "Records"]];
    agg.rows.forEach(r => rows.push([keyLabel(agg.dim, r.key), r.series, r.value == null ? "" : r.value, r.n]));
    return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  }

  return { DIMENSIONS, MEASURES, CHARTS, DATASETS, FILTERABLE, RANGE_LABELS, MOOD_COLOR, range, aggregate, spec, sankeySVG, tableHTML, numberHTML, csv, fmt, esc, keyLabel };
})();
