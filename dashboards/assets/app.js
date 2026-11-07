/* Shared helpers: layout, formatting, period filtering and small SVG chart library.
   No external dependencies — works from GitHub Pages or straight from disk. */
(function () {
  const D = window.DASHBOARD_DATA;
  const NS = "http://www.w3.org/2000/svg";

  const COLORS = {
    UZCARD: "#2563eb", HUMO: "#16a34a", VISA: "#7c3aed", MASTERCARD: "#f59e0b", UNIONPAY: "#dc2626",
  };
  const PALETTE = ["#2563eb", "#16a34a", "#7c3aed", "#f59e0b", "#dc2626", "#0891b2", "#db2777", "#64748b"];
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- formatting ---------- */
  const nf = (v, d = 0) => Number(v).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  function short(v, d = 1) {
    const a = Math.abs(v), s = v < 0 ? "−" : "";
    if (a >= 1e12) return s + nf(a / 1e12, d) + "T";
    if (a >= 1e9) return s + nf(a / 1e9, d) + "B";
    if (a >= 1e6) return s + nf(a / 1e6, d) + "M";
    if (a >= 1e3) return s + nf(a / 1e3, d) + "K";
    return s + nf(a, 0);
  }
  const uzs = (v, d = 1) => "UZS " + short(v, d);
  const pct = (v, d = 1) => nf(v, d) + "%";
  const dlabel = (iso) => { const [, m, d] = iso.split("-"); return `${+d} ${MONTHS[+m - 1]}`; };
  const mlabel = (ym) => MONTHS[+ym.split("-")[1] - 1];

  /* ---------- period handling ---------- */
  // value "all" = whole H1, otherwise "YYYY-MM"
  function periodRange(value) {
    if (value === "all") return { from: 0, to: D.dates.length - 1, label: "Jan – Jun 2026" };
    const idx = D.dates.map((d, i) => (d.startsWith(value) ? i : -1)).filter((i) => i >= 0);
    return { from: idx[0], to: idx[idx.length - 1], label: MONTHS[+value.split("-")[1] - 1] + " 2026" };
  }
  // comparison period: previous month, or Q1 vs Q2 for the whole half-year
  function comparison(value) {
    if (value === "all") {
      const q2 = D.dates.findIndex((d) => d >= "2026-04-01");
      return { cur: { from: q2, to: D.dates.length - 1 }, prev: { from: 0, to: q2 - 1 }, label: "Q2 vs Q1" };
    }
    const i = D.months.indexOf(value);
    if (i <= 0) return null;
    return { cur: periodRange(value), prev: periodRange(D.months[i - 1]), label: "vs " + mlabel(D.months[i - 1]) };
  }
  const inRange = (i, r) => i >= r.from && i <= r.to;
  const daysIn = (r) => r.to - r.from + 1;

  function delta(cur, prev, { invert = false, perDay = null } = {}) {
    if (prev == null || prev === 0) return "";
    let c = cur, p = prev;
    if (perDay) { c = cur / perDay[0]; p = prev / perDay[1]; }
    const ch = ((c - p) / Math.abs(p)) * 100;
    const good = invert ? ch < 0 : ch > 0;
    const cls = Math.abs(ch) < 0.05 ? "flat" : good ? "up" : "down";
    return `<span class="${cls}">${ch >= 0 ? "▲" : "▼"} ${nf(Math.abs(ch), 1)}%</span>`;
  }

  /* ---------- layout ---------- */
  const ICONS = {
    home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    card: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
    flow: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    check: '<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

  function layout(active) {
    const pages = [
      ["index.html", "home", "Overview"],
      ["cards.html", "card", "Card Transactions"],
      ["processing.html", "flow", "Types & Processing"],
      ["reconciliation.html", "check", "Clearing & Reconciliation"],
    ];
    const side = document.createElement("aside");
    side.className = "side";
    side.innerHTML = `
      <div class="brand"><div class="brand-mark">◆</div><div>Payments Analytics<small>Portfolio demo</small></div></div>
      <nav class="nav">${pages.map(([href, ic, name]) =>
        `<a href="${href}" class="${href === active ? "active" : ""}">${icon(ic)}${name}</a>`).join("")}
        <a href="https://github.com/dilshod1888/Bank_clearing_dashboard/tree/main/data/powerbi">${icon("data")}Datasets (CSV)</a>
      </nav>
      <div class="side-foot">Synthetic data · UZS<br>Period: 01.01.2026 – 30.06.2026<br>Built with HTML, SVG &amp; vanilla JS</div>`;
    document.querySelector(".app").prepend(side);
  }

  function periodSelect(el, onChange) {
    el.innerHTML = `<option value="all">H1 2026 (Jan – Jun)</option>` +
      D.months.map((m) => `<option value="${m}">${MONTHS[+m.split("-")[1] - 1]} 2026</option>`).join("");
    el.addEventListener("change", () => onChange(el.value));
  }

  /* ---------- tooltip ---------- */
  const tip = document.createElement("div");
  tip.className = "tip";
  document.addEventListener("DOMContentLoaded", () => document.body.appendChild(tip));
  function showTip(e, html) {
    tip.innerHTML = html;
    tip.style.opacity = 1;
    const x = Math.min(e.clientX + 14, window.innerWidth - tip.offsetWidth - 8);
    tip.style.left = x + "px";
    tip.style.top = e.clientY + 14 + "px";
  }
  const hideTip = () => (tip.style.opacity = 0);
  function hover(node, html) {
    node.addEventListener("mousemove", (e) => showTip(e, typeof html === "function" ? html() : html));
    node.addEventListener("mouseleave", hideTip);
  }

  /* ---------- svg helpers ---------- */
  function svgEl(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function canvas(el, h) {
    el.innerHTML = "";
    const w = Math.max(el.clientWidth, 240);
    const svg = svgEl("svg", { viewBox: `0 0 ${w} ${h}`, height: h }, el);
    return { svg, w, h };
  }
  // smallest "nice" step (1, 2, 2.5, 5 × 10^n) that is >= v
  function niceStep(v) {
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  // 5 ticks for maxima like 2.5 or 5 (steps of 0.5 / 1), otherwise 4
  function tickCount(max) {
    const lead = max / Math.pow(10, Math.floor(Math.log10(max)));
    return Math.abs(lead - 2.5) < 1e-9 || Math.abs(lead - 5) < 1e-9 ? 5 : 4;
  }
  // show every `step`-th axis label plus the last one, without crowding the last two
  function showLabel(i, n, step) {
    if (i === n - 1) return true;
    return i % step === 0 && n - 1 - i >= step * 0.6;
  }
  function legend(el, items) {
    el.innerHTML = items.map((s) => `<span><i style="background:${s.color}"></i>${s.name}</span>`).join("");
  }

  /* ---------- charts ---------- */
  const Charts = {};

  Charts.donut = function (el, listEl, items, { center = "", centerSub = "", fmt = short } = {}) {
    const size = 170, r = 74, rin = 50, cx = size / 2, cy = size / 2;
    el.innerHTML = "";
    const svg = svgEl("svg", { viewBox: `0 0 ${size} ${size}`, height: size }, el);
    const total = items.reduce((a, b) => a + b.value, 0) || 1;
    let a0 = -Math.PI / 2;
    items.forEach((it) => {
      const frac = it.value / total;
      const a1 = a0 + Math.max(frac * Math.PI * 2 - 0.004, 0.0001);
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const p = (rad, ang) => `${cx + rad * Math.cos(ang)},${cy + rad * Math.sin(ang)}`;
      const path = svgEl("path", {
        d: `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(rin, a1)} A${rin},${rin} 0 ${large} 0 ${p(rin, a0)}Z`,
        fill: it.color,
      }, svg);
      hover(path, `<b>${it.label}</b><br>${fmt(it.value)} · ${pct(frac * 100)}`);
      a0 += frac * Math.PI * 2;
    });
    const t1 = svgEl("text", { x: cx, y: cy + 2, "text-anchor": "middle", style: "font-size:17px;font-weight:700;fill:#101828" }, svg);
    t1.textContent = center;
    const t2 = svgEl("text", { x: cx, y: cy + 19, "text-anchor": "middle", style: "font-size:10.5px" }, svg);
    t2.textContent = centerSub;
    if (listEl) {
      listEl.innerHTML = items.map((it) => `<div><span><i class="swatch" style="background:${it.color}"></i>${it.label}</span>
        <b>${fmt(it.value)}</b><small>${pct((it.value / total) * 100)}</small></div>`).join("");
    }
  };

  // multi-series line chart
  Charts.lines = function (el, labels, series, { height = 230, fmt = short, area = false } = {}) {
    const { svg, w, h } = canvas(el, height);
    const m = { l: 52, r: 10, t: 8, b: 24 };
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const max = niceMax(Math.max(...series.flatMap((s) => s.values)));
    const x = (i) => m.l + (labels.length === 1 ? iw / 2 : (i / (labels.length - 1)) * iw);
    const y = (v) => m.t + ih - (v / max) * ih;
    const nt = tickCount(max);
    for (let k = 0; k <= nt; k++) {
      const v = (max / nt) * k;
      svgEl("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: "#eef0f3" }, svg);
      const t = svgEl("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, svg);
      t.textContent = fmt(v);
    }
    const step = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 62)));
    labels.forEach((lb, i) => {
      if (!showLabel(i, labels.length, step)) return;
      const t = svgEl("text", { x: x(i), y: h - 6, "text-anchor": "middle" }, svg);
      t.textContent = lb;
    });
    series.forEach((s) => {
      const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
      if (area) svgEl("polygon", { points: `${x(0)},${y(0)} ${pts} ${x(s.values.length - 1)},${y(0)}`, fill: s.color, opacity: 0.08 }, svg);
      svgEl("polyline", { points: pts, fill: "none", stroke: s.color, "stroke-width": 2, "stroke-linejoin": "round" }, svg);
    });
    // hover guide
    const guide = svgEl("line", { y1: m.t, y2: m.t + ih, stroke: "#98a2b3", "stroke-dasharray": "3 3", opacity: 0 }, svg);
    const hit = svgEl("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent" }, svg);
    hit.addEventListener("mousemove", (e) => {
      const box = svg.getBoundingClientRect();
      const px = ((e.clientX - box.left) / box.width) * w;
      const i = Math.max(0, Math.min(labels.length - 1, Math.round(((px - m.l) / iw) * (labels.length - 1))));
      guide.setAttribute("x1", x(i)); guide.setAttribute("x2", x(i)); guide.setAttribute("opacity", 1);
      showTip(e, `<b>${labels[i]}</b><br>` + series.map((s) => `<span style="color:${s.color}">●</span> ${s.name}: ${fmt(s.values[i])}`).join("<br>"));
    });
    hit.addEventListener("mouseleave", () => { guide.setAttribute("opacity", 0); hideTip(); });
  };

  // vertical bars; stacked when several series; supports negative values
  Charts.bars = function (el, labels, series, { height = 230, fmt = short, colorBySign = false, line = null } = {}) {
    const { svg, w, h } = canvas(el, height);
    const m = { l: 52, r: 10, t: 8, b: 24 };
    const iw = w - m.l - m.r, ih = h - m.t - m.b;
    const posTot = labels.map((_, i) => series.reduce((a, s) => a + Math.max(0, s.values[i]), 0));
    const negTot = labels.map((_, i) => series.reduce((a, s) => a + Math.min(0, s.values[i]), 0));
    const hiRaw = Math.max(...posTot, line ? Math.max(...line.values) : 0, 0);
    const loRaw = Math.min(...negTot, line ? Math.min(...line.values) : 0, 0);
    const stepV = niceStep((hiRaw - loRaw) / 4 || 1);
    const hi = Math.ceil(hiRaw / stepV) * stepV || stepV;
    const lo = Math.floor(loRaw / stepV) * stepV;
    const y = (v) => m.t + ((hi - v) / (hi - lo)) * ih;
    for (let v = lo; v <= hi + stepV / 2; v += stepV) {
      svgEl("line", { x1: m.l, x2: w - m.r, y1: y(v), y2: y(v), stroke: Math.abs(v) < stepV / 1e6 ? "#98a2b3" : "#eef0f3" }, svg);
      const t = svgEl("text", { x: m.l - 8, y: y(v) + 4, "text-anchor": "end" }, svg);
      t.textContent = fmt(Math.abs(v) < stepV / 1e6 ? 0 : v);
    }
    const bw = iw / labels.length;
    const step = Math.ceil(labels.length / Math.max(2, Math.floor(iw / 50)));
    labels.forEach((lb, i) => {
      let up = 0, down = 0;
      const g = svgEl("g", {}, svg);
      series.forEach((s) => {
        const v = s.values[i];
        const base = v >= 0 ? up : down;
        const top = base + v;
        const color = colorBySign ? (v >= 0 ? "#16a34a" : "#dc2626") : s.color;
        svgEl("rect", {
          x: m.l + i * bw + bw * 0.16, width: Math.max(bw * 0.68, 1),
          y: Math.min(y(base), y(top)), height: Math.max(Math.abs(y(base) - y(top)), 0.5), fill: color, rx: Math.min(3, bw * 0.15),
        }, g);
        if (v >= 0) up = top; else down = top;
      });
      const hit = svgEl("rect", { x: m.l + i * bw, y: m.t, width: bw, height: ih, fill: "transparent" }, g);
      hover(hit, `<b>${lb}</b><br>` + series.map((s) => `<span style="color:${colorBySign ? (s.values[i] >= 0 ? "#16a34a" : "#dc2626") : s.color}">●</span> ${s.name}: ${fmt(s.values[i])}`).join("<br>") +
        (line ? `<br><span style="color:${line.color}">●</span> ${line.name}: ${fmt(line.values[i])}` : ""));
      if (showLabel(i, labels.length, step)) {
        const t = svgEl("text", { x: m.l + i * bw + bw / 2, y: h - 6, "text-anchor": "middle" }, svg);
        t.textContent = lb;
      }
    });
    if (line) {
      const pts = line.values.map((v, i) => `${m.l + i * bw + bw / 2},${y(v)}`).join(" ");
      svgEl("polyline", { points: pts, fill: "none", stroke: line.color, "stroke-width": 2, "pointer-events": "none" }, svg);
      line.values.forEach((v, i) => svgEl("circle", { cx: m.l + i * bw + bw / 2, cy: y(v), r: labels.length > 40 ? 0 : 2.6, fill: line.color, "pointer-events": "none" }, svg));
    }
  };

  // horizontal bars
  Charts.hbars = function (el, items, { fmt = short, rowH = 30, valueWidth = 64 } = {}) {
    const h = items.length * rowH + 6;
    const { svg, w } = canvas(el, h);
    const lw = Math.max(...items.map((i) => i.label.length)) * 7.4 + 12, vw = valueWidth, iw = w - lw - vw;
    const max = Math.max(...items.map((i) => i.value)) || 1;
    items.forEach((it, k) => {
      const yy = k * rowH + 4;
      const t = svgEl("text", { x: 0, y: yy + rowH / 2 + 1, style: "fill:#344054;font-size:12px" }, svg);
      t.textContent = it.label;
      const bar = svgEl("rect", { x: lw, y: yy + 6, width: Math.max((it.value / max) * iw, 2), height: rowH - 14, rx: 4, fill: it.color }, svg);
      hover(bar, `<b>${it.label}</b><br>${fmt(it.value)}`);
      const v = svgEl("text", { x: lw + (it.value / max) * iw + 6, y: yy + rowH / 2 + 1, style: "fill:#101828;font-size:12px;font-weight:600" }, svg);
      v.textContent = fmt(it.value);
    });
  };

  /* ---------- aggregation helpers ---------- */
  // sum transactions with a predicate; returns {count, amount, commission, failed}
  function sumTx(pred) {
    const o = { count: 0, amount: 0, commission: 0, failed: 0 };
    for (const r of D.tx) if (pred(r)) { o.count += r[3]; o.amount += r[4]; o.commission += r[5]; o.failed += r[6]; }
    return o;
  }
  // group dates into buckets: daily for a month, weekly for the half-year
  function buckets(range) {
    const out = [];
    const weekly = daysIn(range) > 45;
    for (let i = range.from; i <= range.to; i += weekly ? 7 : 1) {
      const to = Math.min(i + (weekly ? 6 : 0), range.to);
      out.push({ from: i, to, label: weekly ? dlabel(D.dates[i]) : String(+D.dates[i].slice(8)) });
    }
    return { list: out, weekly };
  }

  function rerenderOnResize(fn) {
    let t;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(fn, 150); });
  }

  window.App = {
    D, COLORS, PALETTE, MONTHS, nf, short, uzs, pct, dlabel, mlabel, periodRange, comparison, inRange, daysIn,
    delta, layout, periodSelect, Charts, legend, sumTx, buckets, hover, rerenderOnResize,
  };
})();
