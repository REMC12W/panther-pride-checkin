/* Principal dashboard: tile engine.
 * A tile = { dataset, measure, dimension, breakdown, chart, filters, compare, ... }.
 * aggregate() turns the normalized tables into rows of { key, series, value, n, items },
 * spec() turns those rows into a Vega-Lite spec (or a custom renderer for sankey / table / number).
 */
window.PPC_CHARTS = (function () {
  const D = window.PPD;
  const MOOD_COLOR = { Red: "#c1272d", Yellow: "#eda232", Blue: "#2b5090", Green: "#4c9a47" };
  // Brand maroon first, then the Mood Meter hues and distinct supporting colors.
  const PALETTE = ["#842D46", "#2b5090", "#4c9a47", "#eda232", "#6D6E70", "#1f8a9c", "#c75d9a", "#8a6d3b", "#231F20", "#9bbb59", "#e07b39", "#4472c4"];
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
    hour:     { label: "Hour of day", get: r => String(r.hour), fmt: k => { const h = Number(k); return h === 12 ? "12 pm" : h > 12 ? (h - 12) + " pm" : h + " am"; }, for: ["visit", "incident"] },
    grade:    { label: "Grade", order: GRADE_ORDER, get: r => r.grade || "Unknown", for: ["visit", "incident"] },
    student:  { label: "Student", get: r => r.student || "Unknown", for: ["visit", "incident"], sortByValue: true, personal: true },
    referral: { label: "How they came", get: r => r.referral || "Unknown", for: ["visit"] },
    reason:   { label: "Reason", get: r => r.reason || "Unknown", for: ["visit"] },
    outcome:  { label: "Outcome", get: r => r.outcome, for: ["visit"] },
    moodIn:   { label: "Mood on arrival", order: D.MOODS, mood: true, get: r => r.moodIn || "No word", for: ["visit"] },
    wordIn:   { label: "Feeling word on arrival", get: r => r.wordIn || "None", for: ["visit"], sortByValue: true },
    energy:   { label: "Energy", order: ["Moving Fast", "Moving Ok", "Moving Slow"], get: r => r.energy || "Unknown", for: ["visit"] },
    happened: { label: "What it involved", get: r => r.happened || "No answer", for: ["visit"] },
    station:  { label: "Station", order: D.MOODS, mood: true, get: r => r.station || "None", for: ["visit"] },
    basicNeed:{ label: "Basic need", multi: true, get: r => r.basicNeeds, for: ["visit"], sortByValue: true },
    moodOut:  { label: "Mood at check-out", order: D.MOODS, mood: true, get: r => r.moodOut || "No read", for: ["visit"] },
    helped:   { label: "What helped", multi: true, get: r => r.helped, for: ["visit"], sortByValue: true },
    checkedOutBy: { label: "Who checked them out", get: r => r.checkedOutBy || "Not checked out", for: ["visit"] },
    type:     { label: "Incident type", multi: true, get: r => r.types, for: ["incident"], sortByValue: true },
    place:    { label: "Where it happened", get: r => r.place || "Unknown", for: ["incident"], sortByValue: true },
    period:   { label: "Class period", order: PERIOD_ORDER, get: r => r.period || "Unknown", for: ["incident"] },
    status:   { label: "Follow-up status", order: ["Open", "Needs more follow-up", "Resolved"], get: r => r.status, for: ["incident"] },
    action:   { label: "Follow-up action", get: r => r.action || "None yet", for: ["incident"], sortByValue: true },
  };
  // Measures: a number for a set of records. pct measures return null when the base is empty.
  const pct = (num, den) => den ? Math.round(1000 * num / den) / 10 : null;
  const avg = a => a.length ? Math.round(10 * a.reduce((s, x) => s + x, 0) / a.length) / 10 : null;
  const MEASURES = {
    count:        { label: "Visits", unit: "", for: ["visit"], calc: rows => rows.length },
    students:     { label: "Different students", unit: "", for: ["visit", "incident"], calc: rows => new Set(rows.map(r => r.studentId || r.student)).size },
    perStudent:   { label: "Visits per student", unit: "", for: ["visit"], calc: rows => { const n = new Set(rows.map(r => r.studentId || r.student)).size; return n ? Math.round(10 * rows.length / n) / 10 : null; } },
    avgMinutes:   { label: "Average minutes in room", unit: " min", for: ["visit"], calc: rows => avg(rows.filter(r => r.minutes != null).map(r => r.minutes)) },
    pctHard:      { label: "% arriving red or blue", unit: "%", good: "down", for: ["visit"], calc: rows => { const b = rows.filter(r => r.moodIn); return pct(b.filter(r => r.arrivedHard).length, b.length); } },
    pctLeftOk:    { label: "% leaving green or yellow", unit: "%", good: "up", for: ["visit"], calc: rows => { const b = rows.filter(r => r.moodOut); return pct(b.filter(r => r.leftPleasant).length, b.length); } },
    pctImproved:  { label: "% who came in red or blue and left green or yellow", unit: "%", good: "up", for: ["visit"], calc: rows => { const b = rows.filter(r => r.improved != null); return pct(b.filter(r => r.improved).length, b.length); } },
    pctCheckedOut:{ label: "% checked out", unit: "%", good: "up", for: ["visit"], calc: rows => pct(rows.filter(r => r.checkedOut).length, rows.length) },
    pctAlert:     { label: "% starting with a concerning word", unit: "%", good: "down", for: ["visit"], calc: rows => pct(rows.filter(r => r.alert).length, rows.length) },
    pctStaffSent: { label: "% sent by staff", unit: "%", for: ["visit"], calc: rows => pct(rows.filter(r => r.referral === "Sent by staff").length, rows.length) },
    pctSuggested: { label: "% who used the suggested station", unit: "%", for: ["visit"], calc: rows => { const b = rows.filter(r => r.station && r.stationSuggested && r.stationSuggested !== "Staff first"); return pct(b.filter(r => r.station === r.stationSuggested).length, b.length); } },
    incidents:    { label: "Incident reports", unit: "", good: "down", for: ["incident"], calc: rows => rows.length },
    pctFollowedUp:{ label: "% followed up", unit: "%", good: "up", for: ["incident"], calc: rows => pct(rows.filter(r => r.followedUp).length, rows.length) },
    pctOpen:      { label: "% still needing follow-up", unit: "%", good: "down", for: ["incident"], calc: rows => pct(rows.filter(r => r.open).length, rows.length) },
    avgDaysFU:    { label: "Average days to follow-up", unit: " days", good: "down", for: ["incident"], calc: rows => avg(rows.filter(r => r.daysToFollowUp != null).map(r => r.daysToFollowUp)) },
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
  const DAY = 86400000;
  const shiftDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const endOf = d => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
  /** The period just before, built from the calendar (same weekdays, same days of the month, last school year), not a count of milliseconds. */
  function previousRange(r, preset) {
    switch (preset) {
      case "week": case "lastweek": return { start: shiftDays(r.start, -7), end: shiftDays(r.end, -7) };
      case "month": { const s = new Date(r.start.getFullYear(), r.start.getMonth() - 1, 1); const last = new Date(s.getFullYear(), s.getMonth() + 1, 0).getDate(); return { start: s, end: endOf(new Date(s.getFullYear(), s.getMonth(), Math.min(r.end.getDate(), last))) }; }
      case "lastmonth": { const s = new Date(r.start.getFullYear(), r.start.getMonth() - 1, 1); return { start: s, end: endOf(new Date(s.getFullYear(), s.getMonth() + 1, 0)) }; }
      case "year": return { start: new Date(r.start.getFullYear() - 1, r.start.getMonth(), r.start.getDate()), end: endOf(new Date(r.end.getFullYear() - 1, r.end.getMonth(), r.end.getDate())) };
      default: { const days = Math.round((new Date(r.end.getFullYear(), r.end.getMonth(), r.end.getDate()) - new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate())) / DAY) + 1; return { start: shiftDays(r.start, -days), end: shiftDays(r.end, -days) }; }
    }
  }
  /** Move a bucket key (day, week or month) forward by a number of calendar days so the earlier period lines up under the current one. */
  function shiftKey(temporal, key, days) {
    const d = shiftDays(new Date((temporal === "month" ? key + "-01" : key) + "T12:00:00"), days);
    return temporal === "month" ? D.monthKey(d) : temporal === "week" ? D.weekKey(d) : D.dayKey(d);
  }

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
  const natural = (a, b) => (isFinite(a) && isFinite(b)) ? a - b : String(a).localeCompare(String(b));
  function orderKeys(dimKey, keys, valueOf) {
    const dim = DIMENSIONS[dimKey];
    if (!dim) return keys;
    if (dim.temporal) return keys.slice().sort();
    if (dim.order) return dim.order.filter(k => keys.includes(k)).concat(keys.filter(k => !dim.order.includes(k)).sort(natural));
    if (dim.sortByValue && valueOf) return keys.slice().sort((a, b) => (valueOf(b) || 0) - (valueOf(a) || 0));
    return keys.slice().sort(natural);
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
    // Comparing one student with everyone takes over the grouping, so a leftover "break down by" is ignored.
    const breakdownKey = tile.compare !== "student" && (tile.chart === "heatmap" || tile.chart === "stacked" || tile.chart === "grouped" || tile.compare === "groups") && tile.breakdown ? tile.breakdown : null;
    const compare2 = tile.compare === "measures" && tile.measure2 && MEASURES[tile.measure2] ? MEASURES[tile.measure2] : null;
    out.measure2 = compare2;

    const buckets = bucket(current, dimKey);
    let keys = [...buckets.keys()];
    if (breakdownKey) {
      out.breakdown = breakdownKey;
      // Few series stay readable: keep the biggest and fold the rest into "Other".
      const maxSeries = tile.chart === "heatmap" ? 14 : 8;
      const sizes = new Map(); bucket(current, breakdownKey).forEach((its, s) => sizes.set(s, its.length));
      const keep = sizes.size > maxSeries ? new Set([...sizes.entries()].sort((a, b) => b[1] - a[1]).slice(0, maxSeries - 1).map(e => e[0])) : null;
      const seriesSet = new Set();
      buckets.forEach((items, key) => {
        let sub = bucket(items, breakdownKey);
        if (keep) { const folded = new Map(); sub.forEach((its, s) => { const k = keep.has(s) ? s : "Other"; folded.set(k, (folded.get(k) || []).concat(its)); }); sub = folded; }
        sub.forEach((its, s) => { seriesSet.add(s); push(key, s, its); });
      });
      out.series = orderKeys(breakdownKey, [...seriesSet].filter(s => s !== "Other")).concat(seriesSet.has("Other") ? ["Other"] : []);
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
      const pr = previousRange(r, inherit ? (opts.range || "year") : tile.range), prev = inRange(filtered, pr);
      const pb = bucket(prev, dimKey);
      const shift = DIMENSIONS[dimKey] && DIMENSIONS[dimKey].temporal; // line the earlier period up under the current one by date
      const offset = Math.round((new Date(r.start.getFullYear(), r.start.getMonth(), r.start.getDate()) - new Date(pr.start.getFullYear(), pr.start.getMonth(), pr.start.getDate())) / DAY);
      pb.forEach((items, key) => {
        const k = shift ? shiftKey(shift, key, offset) : key;
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
    return agg.rows.map(r => ({ key: r.key, label: keyLabel(agg.dim, r.key), series: agg.breakdown ? keyLabel(agg.breakdown, r.series) : r.series, seriesKey: r.series, value: r.value, n: r.n, prevKey: r.prevKey || null }));
  }
  const BASE = { config: { font: "Raleway, system-ui, sans-serif", axis: { labelFontSize: 11, titleFontSize: 11, labelColor: "#4A4647", titleColor: "#6D6E70", gridColor: "#EFEFF0", domainColor: "#BCBDBF", ticks: false, labelPadding: 4 }, legend: { labelFontSize: 11, titleFontSize: 11, title: null, orient: "bottom", symbolSize: 70 }, view: { stroke: null }, background: "transparent" }, autosize: { type: "fit", contains: "padding" }, width: "container", height: "container" };

  // opts.compact: the list layout's mini chart: no legend, no value axis, few labels.
  function spec(agg, tile, opts) {
    const s = fullSpec(agg, tile);
    s.encoding = s.encoding || {};
    // Axis titles repeat the tile title, so they go everywhere except the scatter plot.
    if (tile.chart !== "scatter") ["x", "y"].forEach(k => { if (s.encoding[k]) s.encoding[k].title = null; });
    if (s.encoding.color && s.encoding.color.title) s.encoding.color.title = null;
    if (!(opts && opts.compact)) {
      if (s.mark && s.mark.type === "line") {
        const hit = { mark: { type: "point", size: 700, opacity: 0, tooltip: true }, encoding: { x: s.encoding.x, y: s.encoding.y, color: s.encoding.color, tooltip: s.encoding.tooltip } };
        s.layer = [{ mark: s.mark, encoding: s.encoding }, hit]; delete s.mark; delete s.encoding;
      }
      return s;
    }
    s.config = JSON.parse(JSON.stringify(s.config));
    s.config.legend = { disable: true };
    s.config.axis = Object.assign(s.config.axis, { grid: false, domain: false, labelFontSize: 10, labelAngle: 0, labelOverlap: true, labelLimit: 70 });
    s.config.padding = 2;
    const valueAxis = tile.chart === "barh" ? "x" : "y";
    if (s.encoding[valueAxis] && s.encoding[valueAxis].type === "quantitative") s.encoding[valueAxis].axis = null;
    ["x", "y"].forEach(k => { const e = s.encoding[k]; if (e && e.axis) { e.axis = Object.assign({}, e.axis, { labelAngle: 0, labelLimit: 70, labelFontSize: 10 }); } });
    if (tile.chart === "heatmap" || tile.chart === "calendar") { if (s.encoding.y) s.encoding.y.axis = null; }
    if (tile.chart === "pie" || tile.chart === "donut") s.mark = Object.assign({}, s.mark, { innerRadius: tile.chart === "donut" ? 22 : 0 });
    if (s.mark && s.mark.point) s.mark = Object.assign({}, s.mark, { point: false });
    return s;
  }
  function fullSpec(agg, tile) {
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
    if (temporal && ["bar", "barh", "stacked", "grouped", "heatmap"].includes(chart)) {
      xField.type = "ordinal"; xField.sort = agg.keys.map(k => temporal === "month" ? k + "-01" : k); delete xField.axis.format;
      xField.axis.labelExpr = temporal === "month" ? "timeFormat(timeParse(datum.value, '%Y-%m-01'), '%b %Y')" : "timeFormat(timeParse(datum.value, '%Y-%m-%d'), '%b %d')";
      tooltip[0] = { field: "label", title: dim.label, type: "nominal" };
    }
    const s = Object.assign(JSON.parse(JSON.stringify(BASE)), { data: { values: vals } }); // own copy: heatmaps change config
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
        s.mark = { type: "arc", innerRadius: chart === "donut" ? 50 : 0, tooltip: true };
        s.config = Object.assign({}, s.config, { legend: Object.assign({}, s.config.legend, { orient: "right", labelLimit: 140 }) });
        // The hover text must not read the label as a date, or the colours stop matching their slices.
        tooltip[0] = { field: "label", title: dim ? dim.label : "Group", type: "nominal" };
        s.encoding = { theta: { field: "value", type: "quantitative", stack: true }, color: keyColorScale(agg), tooltip };
        s.data.values = vals.filter(v => !v.prevKey && v.series !== "Previous period").map(v => Object.assign({}, v, { label: keyLabel(agg.dim, v.key) }));
        return s;
      case "heatmap": {
        const bd = DIMENSIONS[agg.breakdown];
        s.mark = { type: "rect", tooltip: true };
        s.encoding = { x: Object.assign({}, xField, { type: "ordinal" }), y: { field: "series", type: "ordinal", title: bd ? bd.label : "", sort: agg.series.map(k => keyLabel(agg.breakdown, k)) },
          color: { field: "value", type: "quantitative", title: agg.measure.label, scale: { scheme: "reds" }, legend: { orient: "bottom", direction: "horizontal", gradientLength: 140, gradientThickness: 8 } }, tooltip };
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
  function fmt(v, unit) {
    if (v == null) return "–";
    const n = Number.isInteger(v) ? v : v.toFixed(1);
    if (unit === "%") return n + "%";
    if (unit === " days" && Number(v) === 1) return n + " day";
    return n + (unit || "");
  }

  /** Sankey: mood on arrival (left) to mood at check-out (right), from visits with both. */
  function sankeySVG(rows, width, height) {
    const pairs = rows.filter(r => r.moodIn && r.moodOut);
    if (!pairs.length) return `<div class="empty">No visits in this range have both an arrival and a check-out mood.</div>`;
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

  /** Size of a change, short: { text, dir, tone }. tone is good/bad when the measure has a good direction, else "". */
  function changeOf(measure, unit, now, before) {
    if (now == null || before == null) return null;
    const diff = now - before;
    if (Math.abs(diff) < 0.05) return { text: "No change", dir: "", tone: "" };
    const dir = diff > 0 ? "up" : "down";
    const text = unit === "%" ? fmt(Math.abs(Math.round(diff * 10) / 10), " pts") : before ? Math.round(Math.abs(diff) / Math.abs(before) * 100) + "%" : fmt(Math.abs(diff), unit);
    return { text, dir, tone: measure.good ? (dir === measure.good ? "good" : "bad") : "" };
  }
  function deltaOf(agg) {
    if (agg.compare !== "previous") return null;
    if (!agg.previousN) return { text: "No earlier data", dir: "", tone: "" };
    return changeOf(agg.measure, agg.unit, agg.total, agg.previousTotal) || { text: "No earlier data", dir: "", tone: "" };
  }
  /** The change as a small badge: a Lucide arrow, the size, and a tooltip saying what it is compared with. */
  function deltaHTML(d) {
    if (!d) return "";
    const icon = window.PPC_ICON && d.dir ? window.PPC_ICON(d.dir === "up" ? "trending-up" : "trending-down", 14) : "";
    return `<span class="delta ${d.tone || ""}" title="Compared with the period just before">${icon}<span>${esc(d.text)}</span></span>`;
  }
  function numberHTML(agg, tile) {
    const d = deltaOf(agg);
    return `<div class="bignum"><div class="v">${fmt(agg.total, agg.unit)}</div>${d ? deltaHTML(d) : ""}</div>`;
  }

  /** One headline for a tile: { value, label, delta, key, series } (key and series say which records the headline stands for). */
  function takeaway(agg, tile) {
    const chart = tile.chart || "bar";
    const live = agg.rows.filter(r => !r.previous && !r.secondary);
    if (chart === "number") return { value: fmt(agg.total, agg.unit), label: agg.unit === "%" ? "" : agg.measure.label.toLowerCase(), delta: deltaOf(agg), key: null };
    if (chart === "sankey") {
      const hard = agg.current.filter(r => r.improved != null), ok = hard.filter(r => r.improved).length;
      return hard.length ? { value: Math.round(100 * ok / hard.length) + "%", label: "red or blue who left green or yellow", key: null } : { value: "–", label: "no check-outs yet", key: null };
    }
    if (!live.length) return { value: "–", label: "no records", key: null };
    const dim = DIMENSIONS[agg.dim];
    if (chart === "heatmap" || chart === "calendar") {
      const top = live.reduce((a, b) => (b.value || 0) > (a.value || 0) ? b : a);
      const where = chart === "calendar" ? new Date(top.key + "T12:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }) : `${keyLabel(agg.dim, top.key)} · ${keyLabel(agg.breakdown, top.series)}`;
      return { value: where, label: "busiest", key: top.key, series: chart === "heatmap" ? top.series : null };
    }
    if (dim && dim.temporal) {
      // Latest period, and the change from the one before it.
      const byKey = new Map(); live.forEach(r => byKey.set(r.key, (byKey.get(r.key) || 0) + (r.value || 0)));
      const keys = [...byKey.keys()].sort(), last = keys[keys.length - 1], prev = keys[keys.length - 2];
      const v = byKey.get(last), p = prev != null ? byKey.get(prev) : null;
      return { value: fmt(Math.round(v * 10) / 10, agg.unit), label: "latest " + dim.label.toLowerCase(), delta: p != null ? changeOf(agg.measure, agg.unit, v, p) : null, key: last };
    }
    if (chart === "scatter") {
      const top = live.reduce((a, b) => (b.value || 0) > (a.value || 0) ? b : a);
      return { value: keyLabel(agg.dim, top.key), label: "highest " + agg.measure.label.toLowerCase(), key: top.key };
    }
    // Categories: the top one, as a share for counts or its own value for rates and averages.
    const byKey = new Map(); live.forEach(r => byKey.set(r.key, (byKey.get(r.key) || 0) + (r.value || 0)));
    // Lists the chart already ranks (students, places, strategies) lead with their own first entry, so a rate
    // like "100%" from a single visit doesn't beat the student with the most visits.
    const ranked = dim && dim.sortByValue && agg.keys && agg.keys.length ? agg.keys.find(k => byKey.has(k)) : null;
    const [topKey, topVal] = ranked != null ? [ranked, byKey.get(ranked)] : [...byKey.entries()].sort((a, b) => b[1] - a[1])[0];
    const rate = !!agg.unit || tile.measure === "perStudent";
    let label = "";
    if (rate) label = fmt(Math.round(topVal * 10) / 10, agg.unit);
    else {
      // Shares are of everything in range, not of the rows left after "Show top N".
      const denom = dim && dim.multi ? agg.totalN : (agg.total || 0);
      const what = tile.dataset === "incident" ? "reports" : tile.measure === "students" ? "students" : "visits";
      label = denom ? Math.round(100 * topVal / denom) + "% of " + what : "";
    }
    return { value: keyLabel(agg.dim, topKey), label, key: topKey };
  }

  // A spreadsheet runs a cell that starts with = + - or @ as a formula, and the text here comes from what students typed.
  const cell = v => { if (typeof v === "number") return String(v); let s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };
  const sheet = rows => "\uFEFF" + rows.map(r => r.map(cell).join(",")).join("\r\n") + "\r\n";
  function csv(agg) {
    const dim = DIMENSIONS[agg.dim], withEarlier = agg.rows.some(r => r.prevKey);
    const rows = [[dim ? dim.label : "Group", "Group", agg.measure.label, "Records"].concat(withEarlier ? ["Earlier date"] : [])];
    agg.rows.forEach(r => rows.push([keyLabel(agg.dim, r.key), agg.breakdown ? keyLabel(agg.breakdown, r.series) : r.series, r.value == null ? "" : r.value, r.n].concat(withEarlier ? [r.prevKey || ""] : [])));
    return sheet(rows);
  }
  /** The flow chart's own numbers: how many visits went from each arrival mood to each check-out mood. */
  function csvFlow(rows) {
    const n = {}; rows.filter(r => r.moodIn && r.moodOut).forEach(r => { const k = r.moodIn + "|" + r.moodOut; n[k] = (n[k] || 0) + 1; });
    const out = [["Mood on arrival", "Mood at check-out", "Visits"]];
    D.MOODS.forEach(a => D.MOODS.forEach(b => { if (n[a + "|" + b]) out.push([a, b, n[a + "|" + b]]); }));
    return sheet(out);
  }
  const csvFor = (agg, tile) => tile && tile.chart === "sankey" ? csvFlow(agg.current) : csv(agg);

  return { DIMENSIONS, MEASURES, CHARTS, DATASETS, FILTERABLE, RANGE_LABELS, MOOD_COLOR, range, aggregate, spec, takeaway, sankeySVG, tableHTML, numberHTML, deltaHTML, csv, csvFor, fmt, esc, keyLabel };
})();
