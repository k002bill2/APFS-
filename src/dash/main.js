/* 메인 종합 대시보드 — 3개 레이아웃 시안 + 래퍼 */
(function (w) {
  const React = w.React;
  const { useState } = React;
  const Icon = w.Icon;
  const { StatCard, ChartCard, Card, Button, ColorChip, StatusBadge, DeltaBadge } = w.UI;
  const { Gauge, Sparkline, Donut } = w.Charts;
  const { ExecChart, StatusDonut, IndustryCard, ScheduleCard, MiniKpis, ShortcutGrid, RiskTrendCard } = w.MainWidgets;
  const { PageHeader } = w.Shell;
  const D = w.APFS_DATA;
  const h = React.createElement;

  const Grid = ({ children, gap = 16, style }) => h("div", { className: "dash-grid", style: { gap, ...style } }, children);
  const KpiRow = ({ children, min = 212 }) => h("div", { style: { display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 14 } }, children);
  const Stack = ({ children, gap = 16 }) => h("div", { style: { display: "flex", flexDirection: "column", gap } }, children);

  /* ===== 시안 A — 스탠다드 12컬럼 ===== */
  function VariantA({ s, onNav }) {
    return h(Stack, { gap: 18 },
      h(KpiRow, null, D.KPI.map((k, i) => h(StatCard, { key: k.id, kpi: k, emphasis: i === 0, onClick: () => {} }))),
      h(Grid, null,
        h(ExecChart, { ...s, span: 8 }),
        h(StatusDonut, { ...s, onNav, span: 4 })),
      h(Grid, null,
        h(IndustryCard, { onNav, span: 6, height: 360 }),
        h(ScheduleCard, { onNav, span: 6, scroll: true, maxH: 360 })),
      h("div", null,
        h("div", { className: "t-label", style: { textTransform: "none", marginBottom: 10 } }, "영역 바로가기"),
        h(ShortcutGrid, { onNav, cols: 5 })),
      h(MiniKpis, null));
  }

  /* ===== 시안 B — 임원 브리핑 (Hero) ===== */
  function HeroAUM({ onNav }) {
    const aum = D.KPI[0], exec = D.KPI[1], irr = D.KPI[2], alert = D.KPI[3];
    return h("div", { className: "hero-aum dcol-12", style: {
      borderRadius: 18, padding: 24, color: "#fff", position: "relative", overflow: "hidden",
      background: "linear-gradient(120deg,#1F5A34 0%,#1d6e6a 52%,#0A6F9E 100%)", boxShadow: "var(--shadow-md)",
      display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 22, alignItems: "center",
    } },
      h("div", { style: { position: "absolute", inset: 0, background: "radial-gradient(120% 140% at 100% 0%,rgba(255,255,255,.14),transparent 55%)", pointerEvents: "none" } }),
      h("div", { className: "hero-main", style: { position: "relative" } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 8, opacity: .9, fontSize: 12.5, fontWeight: 600 } },
          h(Icon, { name: "landmark", size: 16 }), "총 운용자산 (AUM)", h("span", { style: { fontSize: 10.5, opacity: .7 } }, aum.fr)),
        h("div", { style: { display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 } },
          h("span", { className: "tabular", style: { fontSize: 46, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 } }, aum.value),
          h("span", { style: { fontSize: 18, fontWeight: 600, opacity: .85 } }, aum.unit)),
        h("div", { style: { display: "flex", alignItems: "center", gap: 12, marginTop: 12 } },
          h("span", { style: { display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.18)", borderRadius: 8, padding: "4px 9px", fontSize: 12.5, fontWeight: 700 } },
            h(Icon, { name: "trending", size: 14 }), "+3.2% 전월 대비"),
          h("div", { style: { width: 120, opacity: .95 } }, h(Sparkline, { data: aum.trend, color: "#bdeaff", id: "hero", height: 34, area: false }))),
        h("div", { style: { display: "flex", gap: 8, marginTop: 18 } },
          h(Button, { variant: "outline", size: "sm", style: { background: "rgba(255,255,255,.16)", color: "#fff", borderColor: "rgba(255,255,255,.3)" }, leadingIcon: "download" }, "월간 리포트"),
          h(Button, { variant: "outline", size: "sm", style: { background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.3)" }, trailingIcon: "arrow-right", onClick: () => onNav("performance") }, "성과 상세"))),
      h("div", { style: { position: "relative", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.18)", paddingLeft: 18 } },
        h("div", { style: { fontSize: 12.5, fontWeight: 600, opacity: .9, marginBottom: 2 } }, "모태펀드 집행률"),
        h(GaugeLight, { value: 78 }),
        h("div", { style: { fontSize: 11.5, opacity: .8, marginTop: 2 } }, "목표 80% · 잔여 2%p")),
      h("div", { style: { position: "relative", display: "flex", flexDirection: "column", gap: 12 } },
        h(HeroStat, { icon: "trending", label: "전체 평균 IRR", value: irr.value, unit: "%", delta: "+0.8%p" }),
        h(HeroStat, { icon: "shield-alert", label: "활성 조기경보", value: alert.value, unit: "건", delta: "-2건", danger: true, onNav: () => onNav("risk") })));
  }
  function GaugeLight({ value }) {
    const r = 46, c = Math.PI * r;
    const off = c * (1 - value / 100);
    return h("svg", { width: 130, height: 78, viewBox: "0 0 130 78", style: { margin: "0 auto", display: "block" } },
      h("path", { d: "M19 70 A46 46 0 0 1 111 70", fill: "none", stroke: "rgba(255,255,255,.25)", strokeWidth: 11, strokeLinecap: "round" }),
      h("path", { d: "M19 70 A46 46 0 0 1 111 70", fill: "none", stroke: "#bff0c4", strokeWidth: 11, strokeLinecap: "round", strokeDasharray: c, strokeDashoffset: off }),
      h("text", { x: 65, y: 64, textAnchor: "middle", style: { fontSize: 26, fontWeight: 800, fill: "#fff" } }, value + "%"));
  }
  function HeroStat({ icon, label, value, unit, delta, danger, onNav }) {
    return h("button", { onClick: onNav, style: {
      border: "none", cursor: onNav ? "pointer" : "default", font: "inherit", textAlign: "left", color: "#fff",
      background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
    } },
      h("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.18)", flex: "0 0 auto" } }, h(Icon, { name: icon, size: 19 })),
      h("div", { style: { flex: 1 } },
        h("div", { style: { fontSize: 11.5, opacity: .9, fontWeight: 600 } }, label),
        h("div", { style: { display: "flex", alignItems: "baseline", gap: 4 } },
          h("span", { className: "tabular", style: { fontSize: 24, fontWeight: 800 } }, value),
          h("span", { style: { fontSize: 12, opacity: .85 } }, unit),
          h("span", { style: { fontSize: 11.5, fontWeight: 700, marginLeft: 4, color: danger ? "#ffd9d6" : "#bff0c4" } }, delta))));
  }

  function VariantB({ s, onNav }) {
    return h(Stack, { gap: 18 },
      h(Grid, null, h(HeroAUM, { onNav })),
      h(Grid, null,
        h(ExecChart, { ...s, span: 8 }),
        h(StatusDonut, { ...s, onNav, span: 4, height: 184 })),
      h(Grid, null,
        h(IndustryCard, { onNav, span: 7, height: 330 }),
        h(ScheduleCard, { onNav, span: 5, scroll: true, maxH: 330 })),
      h("div", null,
        h("div", { className: "t-label", style: { textTransform: "none", marginBottom: 10 } }, "영역 바로가기"),
        h(ShortcutGrid, { onNav, cols: 5 })));
  }

  /* ===== 시안 C — 운영 모니터 (Dense bento) ===== */
  function StatusBar() {
    const total = D.STATUS_DONUT.reduce((a, b) => a + b.value, 0);
    return h("div", { style: { display: "flex", gap: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 8, boxShadow: "var(--shadow-sm)" } },
      D.STATUS_DONUT.map((st) => h("div", { key: st.key, style: { flex: st.value, minWidth: 70, background: `color-mix(in srgb,${st.color} 13%,transparent)`, borderRadius: 8, padding: "8px 12px" } },
        h("div", { style: { display: "flex", alignItems: "center", gap: 6 } },
          h("span", { style: { width: 8, height: 8, borderRadius: 99, background: st.color } }),
          h("span", { style: { fontSize: 11.5, fontWeight: 700, color: st.color } }, st.name)),
        h("div", { style: { display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 } },
          h("span", { className: "tabular", style: { fontSize: 20, fontWeight: 800 } }, st.value),
          h("span", { className: "t-caption" }, ((st.value / total) * 100).toFixed(0) + "%")))));
  }
  function VariantC({ s, onNav }) {
    return h(Stack, { gap: 14 },
      h(StatusBar, null),
      h(KpiRow, { min: 190 }, D.KPI.map((k) => h(StatCard, { key: k.id, kpi: k, onClick: () => {} }))),
      h(Grid, { gap: 14 },
        h("div", { className: "dcol-8" },
          h(Stack, { gap: 14 },
            h(ExecChart, { ...s }),
            h(Grid, { gap: 14 },
              h(IndustryCard, { onNav, span: 6, height: 210 }),
              h(RiskTrendCard, { span: 6, height: 210 })))),
        h("div", { className: "dcol-4" },
          h(Stack, { gap: 14 },
            h(StatusDonut, { ...s, onNav, height: 176 }),
            h(ScheduleCard, { onNav, rows: 4 }),
            h(MiniKpis, { vertical: true })))),
      h("div", null,
        h("div", { className: "t-label", style: { textTransform: "none", marginBottom: 10 } }, "영역 바로가기"),
        h(ShortcutGrid, { onNav, cols: 5 })));
  }

  /* ===== 래퍼 ===== */
  const VARIANTS = [
    { id: "A", name: "스탠다드", desc: "12컬럼 정석 배치" },
    { id: "B", name: "임원 브리핑", desc: "Hero AUM 중심" },
    { id: "C", name: "운영 모니터", desc: "고밀도 벤토" },
  ];

  function Main({ onNav }) {
    const [variant, setVariant] = useState(() => localStorage.getItem("apfs.variant") || "A");
    const [period, setPeriod] = useState("분기");
    const [fund, setFund] = useState("전체");
    const [donutActive, setDonutActive] = useState(null);
    const setV = (v) => { setVariant(v); try { localStorage.setItem("apfs.variant", v); } catch (e) {} };
    const s = { period, setPeriod, fund, setFund, active: donutActive, setActive: setDonutActive };
    const V = { A: VariantA, B: VariantB, C: VariantC }[variant];
    return h("div", { style: { maxWidth: 1320, margin: "0 auto" } },
      h(PageHeader, {
        crumbs: ["홈", "메인 종합"], title: "메인 종합 대시보드",
        sub: "흩어진 핵심 지표를 단일 화면에서 — 2026-06-15 14:32 기준",
        actions: h(React.Fragment, null,
          h(Button, { variant: "outline", size: "sm", leadingIcon: "refresh" }, "새로고침"),
          h(Button, { variant: "primary", size: "sm", leadingIcon: "download" }, "리포트")),
      }),
      h("div", { style: { display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap", padding: "10px 14px", background: "var(--muted)", border: "1px dashed var(--border-strong)", borderRadius: 12 } },
        h("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--foreground)" } }, h(Icon, { name: "layers", size: 15 }), "레이아웃 시안"),
        h("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" } },
          VARIANTS.map((v) => h("button", {
            key: v.id, onClick: () => setV(v.id), style: {
              cursor: "pointer", font: "inherit", borderRadius: 9, padding: "6px 12px", textAlign: "left",
              border: `1.5px solid ${variant === v.id ? "var(--foreground)" : "var(--border-strong)"}`,
              background: variant === v.id ? "color-mix(in srgb,var(--foreground) 8%,var(--card))" : "var(--card)",
              color: variant === v.id ? "var(--foreground)" : "var(--muted-foreground)",
            },
          },
            h("span", { style: { fontSize: 12.5, fontWeight: 700 } }, "시안 " + v.id + " · " + v.name),
            h("span", { style: { fontSize: 10.5, marginLeft: 6, opacity: .8 } }, v.desc)))),
        h("span", { className: "t-caption", style: { marginLeft: "auto" } }, "3종 중 선택 — 동작 그대로 비교")),
      h("div", { key: variant, style: { animation: "dashFade .35s var(--ease) both" } },
        h(V, { s, onNav })));
  }

  w.Pages = w.Pages || {};
  w.Pages.Main = Main;
})(window);
