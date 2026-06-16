/* SVG 차트 프리미티브 — Recharts 동일 스펙(가로 그리드, 토큰색, 둥근 막대, 단일 진입 애니메이션). */
import React from 'react';

const { useRef, useState, useLayoutEffect, useEffect } = React;

/* ---- 측정 훅 ---- */
function useMeasure() {
  const ref = useRef(null);
  const [width, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    setW(ref.current.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

const niceMax = (v) => {
  if (v <= 0) return 10;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const s = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return s * p;
};
const fmtEok = (v) => (v >= 10000 ? (v / 10000).toFixed(1).replace(/\.0$/, "") + "조" : v.toLocaleString());

// 부드러운 라인 (Catmull-Rom → bezier)
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function Tip({ x, y, children, show }) {
  if (!show) return null;
  return React.createElement("div", {
    style: {
      position: "absolute", left: x, top: y, transform: "translate(-50%,-115%)",
      background: "var(--foreground)", color: "var(--bg)", padding: "7px 10px",
      borderRadius: 9, fontSize: 12, fontWeight: 600, pointerEvents: "none",
      whiteSpace: "nowrap", boxShadow: "var(--shadow-lg)", zIndex: 5, lineHeight: 1.5,
    },
  }, children);
}

/* ===================== Sparkline ===================== */
function Sparkline({ data, color = "var(--primary)", height = 34, area = true, id }) {
  const [ref, W] = useMeasure();
  const h = height, pad = 3;
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * (W - pad * 2),
    h - pad - ((v - min) / span) * (h - pad * 2),
  ]);
  const dline = pts.length ? smoothPath(pts) : "";
  const gid = "sp" + (id || color).replace(/[^a-z0-9]/gi, "");
  return React.createElement("div", { ref, style: { width: "100%", height: h } },
    W > 0 && React.createElement("svg", { width: W, height: h },
      React.createElement("defs", null,
        React.createElement("linearGradient", { id: gid, x1: 0, y1: 0, x2: 0, y2: 1 },
          React.createElement("stop", { offset: "0%", stopColor: color, stopOpacity: .22 }),
          React.createElement("stop", { offset: "100%", stopColor: color, stopOpacity: 0 }))),
      area && React.createElement("path", { d: `${dline} L${pts[pts.length-1][0]},${h} L${pts[0][0]},${h} Z`, fill: `url(#${gid})` }),
      React.createElement("path", { d: dline, fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" }),
      React.createElement("circle", { cx: pts[pts.length-1][0], cy: pts[pts.length-1][1], r: 2.6, fill: color })));
}

/* ===================== Donut ===================== */
function Donut({ data, height = 220, thickness = 26, centerLabel, onSlice, activeKey }) {
  const [ref, W] = useMeasure();
  const [hover, setHover] = useState(null);
  const size = Math.min(W || height, height);
  const cx = (W || size) / 2, cy = size / 2, r = size / 2 - 8;
  const total = data.reduce((s, d) => s + d.value, 0);
  let a0 = -Math.PI / 2;
  const gap = 0.03;
  const arcs = data.map((d) => {
    const frac = d.value / total;
    const a1 = a0 + frac * Math.PI * 2;
    const s = a0 + gap / 2, e = a1 - gap / 2;
    const large = e - s > Math.PI ? 1 : 0;
    const x0 = cx + r * Math.cos(s), y0 = cy + r * Math.sin(s);
    const x1 = cx + r * Math.cos(e), y1 = cy + r * Math.sin(e);
    const ri = r - thickness;
    const xi0 = cx + ri * Math.cos(e), yi0 = cy + ri * Math.sin(e);
    const xi1 = cx + ri * Math.cos(s), yi1 = cy + ri * Math.sin(s);
    const path = `M${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} L${xi0},${yi0} A${ri},${ri} 0 ${large} 0 ${xi1},${yi1} Z`;
    a0 = a1;
    return { ...d, path, mid: (s + e) / 2 };
  });
  return React.createElement("div", { ref, style: { position: "relative", width: "100%", height: size } },
    W > 0 && React.createElement("svg", { width: W, height: size, style: { display: "block" } },
      arcs.map((arc, i) => {
        const active = activeKey ? activeKey === arc.key : hover === i;
        const dim = (activeKey && activeKey !== arc.key) || (hover !== null && hover !== i);
        return React.createElement("path", {
          key: i, d: arc.path, fill: arc.color, opacity: dim ? .35 : 1,
          transform: active ? `translate(${Math.cos(arc.mid)*4} ${Math.sin(arc.mid)*4})` : "",
          style: { cursor: onSlice ? "pointer" : "default", transition: "opacity .2s,transform .2s" },
          onMouseEnter: () => setHover(i), onMouseLeave: () => setHover(null),
          onClick: () => onSlice && onSlice(arc),
        });
      }),
      React.createElement("text", { x: cx, y: cy - 6, textAnchor: "middle", style: { fontSize: 26, fontWeight: 800, fill: "var(--foreground)" }, className: "tabular" }, total),
      React.createElement("text", { x: cx, y: cy + 15, textAnchor: "middle", style: { fontSize: 12, fontWeight: 600, fill: "var(--caption)" } }, centerLabel || "총 건수")));
}

/* ===================== ComposedBars (계획 vs 실적 + 집행률 라인) ===================== */
function ComposedBars({ data, height = 280 }) {
  const [ref, W] = useMeasure();
  const [hi, setHi] = useState(null);
  const m = { t: 16, r: 44, b: 28, l: 46 };
  const iw = (W || 600) - m.l - m.r, ih = height - m.t - m.b;
  const maxAmt = niceMax(Math.max(...data.map((d) => Math.max(d.plan, d.actual))));
  const band = iw / data.length, bw = Math.min(20, band / 3.4);
  const yAmt = (v) => m.t + ih - (v / maxAmt) * ih;
  const yRate = (v) => m.t + ih - (v / 100) * ih;
  const ticks = [0, .25, .5, .75, 1].map((t) => t * maxAmt);
  const linePts = data.map((d, i) => [m.l + band * i + band / 2, yRate(d.rate)]);
  return React.createElement("div", { ref, style: { position: "relative", width: "100%", height } },
    W > 0 && React.createElement("svg", { width: W, height },
      React.createElement("defs", null,
        React.createElement("linearGradient", { id: "cbline", x1: 0, y1: 0, x2: 0, y2: 1 },
          React.createElement("stop", { offset: "0%", stopColor: "var(--chart-3)", stopOpacity: .25 }),
          React.createElement("stop", { offset: "100%", stopColor: "var(--chart-3)", stopOpacity: .02 }))),
      ticks.map((t, i) => React.createElement("g", { key: i },
        React.createElement("line", { x1: m.l, x2: m.l + iw, y1: yAmt(t), y2: yAmt(t), stroke: "var(--chart-grid)", strokeDasharray: "3 3" }),
        React.createElement("text", { x: m.l - 8, y: yAmt(t) + 4, textAnchor: "end", style: { fontSize: 10.5, fill: "var(--caption)" }, className: "tabular" }, fmtEok(t)))),
      [0, 50, 100].map((t, i) => React.createElement("text", { key: i, x: m.l + iw + 8, y: yRate(t) + 4, textAnchor: "start", style: { fontSize: 10.5, fill: "var(--caption)" }, className: "tabular" }, t + "%")),
      data.map((d, i) => {
        const x = m.l + band * i + band / 2;
        const active = hi === i;
        return React.createElement("g", { key: i, onMouseEnter: () => setHi(i), onMouseLeave: () => setHi(null) },
          React.createElement("rect", { x: m.l + band * i, y: m.t, width: band, height: ih, fill: active ? "var(--muted)" : "transparent", opacity: .6 }),
          React.createElement("rect", { x: x - bw - 2, y: yAmt(d.plan), width: bw, height: ih - (yAmt(d.plan) - m.t), rx: 5, fill: "var(--chart-grid)", style: { transformOrigin: `0 ${m.t + ih}px`, animation: "growbar .5s var(--ease) both", animationDelay: i * 60 + "ms" } }),
          React.createElement("rect", { x: x + 2, y: yAmt(d.actual), width: bw, height: ih - (yAmt(d.actual) - m.t), rx: 5, fill: "var(--chart-1)", style: { transformOrigin: `0 ${m.t + ih}px`, animation: "growbar .5s var(--ease) both", animationDelay: i * 60 + 80 + "ms" } }),
          React.createElement("text", { x, y: m.t + ih + 18, textAnchor: "middle", style: { fontSize: 11.5, fill: "var(--muted-foreground)", fontWeight: 600 } }, d.name));
      }),
      React.createElement("path", { d: smoothPath(linePts), fill: "none", stroke: "var(--chart-3)", strokeWidth: 2.5, strokeLinecap: "round" }),
      linePts.map((p, i) => React.createElement("circle", { key: i, cx: p[0], cy: p[1], r: hi === i ? 5 : 3.4, fill: "var(--card)", stroke: "var(--chart-3)", strokeWidth: 2.5 }))),
    hi !== null && React.createElement(Tip, { x: linePts[hi][0], y: Math.min(yAmt(data[hi].actual), linePts[hi][1]), show: true },
      React.createElement("div", null, data[hi].name),
      React.createElement("div", { style: { color: "color-mix(in srgb,var(--bg) 70%,var(--chart-1))" } }, "실적 ", fmtEok(data[hi].actual), "억 · 집행률 ", data[hi].rate, "%")));
}

/* ===================== LineTrend (임계선) ===================== */
function LineTrend({ data, threshold, height = 220, color = "var(--chart-1)" }) {
  const [ref, W] = useMeasure();
  const [hi, setHi] = useState(null);
  const m = { t: 14, r: 14, b: 24, l: 32 };
  const iw = (W || 600) - m.l - m.r, ih = height - m.t - m.b;
  const max = niceMax(Math.max(...data.map((d) => d.v), threshold || 0));
  const x = (i) => m.l + (i / (data.length - 1)) * iw;
  const y = (v) => m.t + ih - (v / max) * ih;
  const pts = data.map((d, i) => [x(i), y(d.v)]);
  const dline = smoothPath(pts);
  return React.createElement("div", { ref, style: { position: "relative", width: "100%", height } },
    W > 0 && React.createElement("svg", { width: W, height },
      React.createElement("defs", null,
        React.createElement("linearGradient", { id: "ltgrad", x1: 0, y1: 0, x2: 0, y2: 1 },
          React.createElement("stop", { offset: "0%", stopColor: color, stopOpacity: .22 }),
          React.createElement("stop", { offset: "100%", stopColor: color, stopOpacity: .02 }))),
      [0, .5, 1].map((t, i) => React.createElement("line", { key: i, x1: m.l, x2: m.l + iw, y1: m.t + ih * t, y2: m.t + ih * t, stroke: "var(--chart-grid)", strokeDasharray: "3 3" })),
      threshold && React.createElement("line", { x1: m.l, x2: m.l + iw, y1: y(threshold), y2: y(threshold), stroke: "var(--danger)", strokeWidth: 1.5, strokeDasharray: "5 4" }),
      threshold && React.createElement("text", { x: m.l + iw, y: y(threshold) - 5, textAnchor: "end", style: { fontSize: 10.5, fill: "var(--danger)", fontWeight: 700 } }, "임계 " + threshold),
      React.createElement("path", { d: `${dline} L${pts[pts.length-1][0]},${m.t+ih} L${pts[0][0]},${m.t+ih} Z`, fill: "url(#ltgrad)" }),
      React.createElement("path", { d: dline, fill: "none", stroke: color, strokeWidth: 2.5, strokeLinecap: "round" }),
      pts.map((p, i) => React.createElement("circle", {
        key: i, cx: p[0], cy: p[1], r: hi === i ? 5 : 0,
        fill: "var(--card)", stroke: data[i].v >= (threshold || 1e9) ? "var(--danger)" : color, strokeWidth: 2.5,
      })),
      data.map((d, i) => d.v >= (threshold || 1e9) && React.createElement("circle", { key: "x" + i, cx: x(i), cy: y(d.v), r: 3.4, fill: "var(--danger)" })),
      data.map((d, i) => React.createElement("rect", {
        key: "h" + i, x: x(i) - iw / data.length / 2, y: m.t, width: iw / data.length, height: ih,
        fill: "transparent", onMouseEnter: () => setHi(i), onMouseLeave: () => setHi(null),
      })),
      data.filter((_, i) => i % 2 === 0).map((d, i) => React.createElement("text", { key: "t" + i, x: x(i * 2), y: height - 6, textAnchor: "middle", style: { fontSize: 10, fill: "var(--caption)" } }, d.name))),
    hi !== null && React.createElement(Tip, { x: pts[hi][0], y: pts[hi][1], show: true }, data[hi].name + " · 지수 " + data[hi].v));
}

/* ===================== Treemap (squarified) ===================== */
function squarify(items, x, y, w, h) {
  const total = items.reduce((s, d) => s + d.value, 0);
  const scale = (w * h) / total;
  const nodes = items.map((d) => ({ ...d, area: d.value * scale }));
  const out = [];
  let row = [], rx = x, ry = y, rw = w, rh = h;
  const worst = (r, len) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    const mn = Math.min(...r.map((b) => b.area)), mx = Math.max(...r.map((b) => b.area));
    return Math.max((len * len * mx) / (s * s), (s * s) / (len * len * mn));
  };
  let i = 0;
  while (i < nodes.length) {
    const len = Math.min(rw, rh);
    const next = nodes[i];
    if (row.length === 0 || worst([...row, next], len) <= worst(row, len)) {
      row.push(next); i++;
    } else { layout(); }
    if (i === nodes.length) layout();
  }
  function layout() {
    const s = row.reduce((a, b) => a + b.area, 0);
    if (rw >= rh) {
      const cw = s / rh; let cy2 = ry;
      row.forEach((b) => { const bh = b.area / cw; out.push({ ...b, x: rx, y: cy2, w: cw, h: bh }); cy2 += bh; });
      rx += cw; rw -= cw;
    } else {
      const ch = s / rw; let cx2 = rx;
      row.forEach((b) => { const bw2 = b.area / ch; out.push({ ...b, x: cx2, y: ry, w: bw2, h: ch }); cx2 += bw2; });
      ry += ch; rh -= ch;
    }
    row = [];
  }
  return out;
}
function Treemap({ data, height = 240, onCell }) {
  const [ref, W] = useMeasure();
  const [hi, setHi] = useState(null);
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const cells = W > 0 ? squarify(sorted, 0, 0, W, height) : [];
  const total = data.reduce((s, d) => s + d.value, 0);
  return React.createElement("div", { ref, style: { position: "relative", width: "100%", height } },
    cells.map((c, i) => {
      const pct = ((c.value / total) * 100).toFixed(1);
      const big = c.w > 78 && c.h > 44;
      return React.createElement("div", {
        key: i, onMouseEnter: () => setHi(i), onMouseLeave: () => setHi(null), onClick: () => onCell && onCell(c),
        style: {
          position: "absolute", left: c.x + 1, top: c.y + 1, width: Math.max(0, c.w - 2), height: Math.max(0, c.h - 2),
          background: c.color, borderRadius: 7, padding: "8px 9px", overflow: "hidden", cursor: onCell ? "pointer" : "default",
          color: "#fff", boxShadow: hi === i ? "inset 0 0 0 2px rgba(255,255,255,.85)" : "none",
          transition: "box-shadow .15s", display: "flex", flexDirection: "column", justifyContent: "space-between",
        },
      },
        big && React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, lineHeight: 1.25, textShadow: "0 1px 2px rgba(0,0,0,.25)" } }, c.name),
        big && React.createElement("div", { style: { textShadow: "0 1px 2px rgba(0,0,0,.25)" } },
          React.createElement("span", { className: "tabular", style: { fontSize: 15, fontWeight: 800 } }, pct),
          React.createElement("span", { style: { fontSize: 10, opacity: .9 } }, "%")));
    }),
    hi !== null && React.createElement(Tip, { x: cells[hi].x + cells[hi].w / 2, y: cells[hi].y + cells[hi].h / 2, show: true },
      cells[hi].name + " · " + cells[hi].value.toLocaleString() + "억원"));
}

/* ===================== HBars (수평 순위) ===================== */
function HBars({ data, height = 220, unit = "%" }) {
  const [ref, W] = useMeasure();
  const max = Math.max(...data.map((d) => d.value));
  const rowH = height / data.length;
  const labelW = 110, valW = 52;
  const bw = (W || 400) - labelW - valW;
  return React.createElement("div", { ref, style: { width: "100%", height } },
    W > 0 && data.map((d, i) =>
      React.createElement("div", { key: i, style: { display: "flex", alignItems: "center", height: rowH, gap: 8 } },
        React.createElement("div", { style: { width: labelW, fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--foreground)" } }, d.name),
        React.createElement("div", { style: { flex: 1, height: 16, background: "var(--muted)", borderRadius: 5, overflow: "hidden" } },
          React.createElement("div", { style: { width: (d.value / max) * 100 + "%", height: "100%", background: d.color || "var(--chart-1)", borderRadius: 5, transformOrigin: "left", animation: "growbar .5s var(--ease) both", animationDelay: i * 50 + "ms" } })),
        React.createElement("div", { className: "tabular", style: { width: valW, textAlign: "right", fontSize: 13, fontWeight: 700 } }, d.value + unit))));
}

/* ===================== Gauge (반원) ===================== */
function Gauge({ value, max = 100, label, height = 150, color = "var(--primary)" }) {
  const [ref, W] = useMeasure();
  const cx = (W || 200) / 2, cy = height - 14, r = Math.min(cx - 14, height - 28);
  const frac = Math.min(1, value / max);
  const a = Math.PI * (1 - frac);
  const arc = (start, end) => {
    const x0 = cx + r * Math.cos(start), y0 = cy + r * Math.sin(start);
    const x1 = cx + r * Math.cos(end), y1 = cy + r * Math.sin(end);
    return `M${x0},${y0} A${r},${r} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
  };
  return React.createElement("div", { ref, style: { width: "100%", height, position: "relative" } },
    W > 0 && React.createElement("svg", { width: W, height },
      React.createElement("path", { d: arc(Math.PI, 2 * Math.PI), fill: "none", stroke: "var(--muted)", strokeWidth: 14, strokeLinecap: "round" }),
      React.createElement("path", { d: arc(Math.PI, Math.PI + frac * Math.PI), fill: "none", stroke: color, strokeWidth: 14, strokeLinecap: "round" }),
      React.createElement("text", { x: cx, y: cy - 6, textAnchor: "middle", style: { fontSize: 28, fontWeight: 800, fill: "var(--foreground)" }, className: "tabular" }, value + (max === 100 ? "%" : "")),
      label && React.createElement("text", { x: cx, y: cy + 12, textAnchor: "middle", style: { fontSize: 11.5, fill: "var(--caption)", fontWeight: 600 } }, label)));
}

export const Charts = { Sparkline, Donut, ComposedBars, LineTrend, Treemap, HBars, Gauge, useMeasure, fmtEok };
