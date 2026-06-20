/* 메인 종합 대시보드 — 3개 레이아웃 시안 + 래퍼 */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Charts } from './charts';
import { MainWidgets } from './main_widgets';
import { Shell } from './shell';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';

const { useState } = React;
const { StatCard, ChartCard, Card, Button, ColorChip, StatusBadge, DeltaBadge } = UI;
const { Gauge, Sparkline, Donut } = Charts;
const { ExecChart, StatusDonut, IndustryCard, ScheduleCard, MiniKpis, ShortcutGrid, RiskTrendCard, RegionBarCard, QuickTasksBar } = MainWidgets;
const { PageHeader } = Shell;
const D = APFS_DATA;

const Grid = ({ children, gap = 16, style }: { children?: React.ReactNode; gap?: number; style?: React.CSSProperties }) => <div className="dash-grid" style={{ gap, ...style }}>{children}</div>;
const KpiRow = ({ children, min = 212 }: { children?: React.ReactNode; min?: number }) => <div
  style={{ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(${min}px,1fr))`, gap: 14 }}>{children}</div>;
const Stack = ({ children, gap = 16 }: { children?: React.ReactNode; gap?: number }) => <div style={{ display: "flex", flexDirection: "column", gap }}>{children}</div>;

/* ===== 시안 A — 스탠다드 12컬럼 ===== */
function VariantA({ s, onNav }) {
  return <Stack gap={18}><KpiRow>{D.KPI.map((k, i) => <StatCard key={k.id} kpi={k} emphasis={i === 0} onClick={() => {}} />)}</KpiRow><Grid><ExecChart {...s} span={8} /><StatusDonut {...s} onNav={onNav} span={4} /></Grid><Grid><IndustryCard onNav={onNav} span={6} height={360} /><ScheduleCard onNav={onNav} span={6} scroll={true} maxH={360} /></Grid><div><div className="t-label" style={{ textTransform: "none", marginBottom: 10 }}>영역 바로가기</div><ShortcutGrid onNav={onNav} cols={5} /></div><MiniKpis /></Stack>;
}

/* ===== 시안 B — 임원 브리핑 (Hero) ===== */
function HeroAUM({ onNav }) {
  const aum = D.KPI[0], exec = D.KPI[1], irr = D.KPI[2], alert = D.KPI[3];
  return (
    <div
      className="hero-aum dcol-12"
      style={{
        borderRadius: 18, padding: 24, color: "#fff", position: "relative", overflow: "hidden",
        background: "linear-gradient(120deg,#1F5A34 0%,#1d6e6a 52%,#0A6F9E 100%)", boxShadow: "var(--shadow-md)",
        display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 22, alignItems: "center",
      }}><div
        style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 140% at 100% 0%,rgba(255,255,255,.14),transparent 55%)", pointerEvents: "none" }} /><div className="hero-main" style={{ position: "relative" }}><div
          style={{ display: "flex", alignItems: "center", gap: 8, opacity: .9, fontSize: 12.5, fontWeight: 600 }}><Icon name="landmark" size={16} /><MT>총 운용자산 (AUM)</MT><span style={{ fontSize: 10.5, opacity: .7 }}><MT>{aum.fr}</MT></span></div><div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 8 }}><span
            className="tabular"
            style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-.02em", lineHeight: 1 }}>{mn(aum.value)}</span><span style={{ fontSize: 18, fontWeight: 600, opacity: .85 }}>{aum.unit}</span></div><div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}><span
            style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,.18)", borderRadius: 8, padding: "4px 9px", fontSize: 12.5, fontWeight: 700 }}><Icon name="trending" size={14} />{mn("+3.2% 전월 대비")}</span><div style={{ width: 120, opacity: .95 }}><Sparkline data={aum.trend} color="#bdeaff" id="hero" height={34} area={false} /></div></div><div style={{ display: "flex", gap: 8, marginTop: 18 }}><Button
            variant="outline"
            size="sm"
            style={{ background: "rgba(255,255,255,.16)", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}
            leadingIcon="download">월간 리포트</Button><Button
            variant="outline"
            size="sm"
            style={{ background: "transparent", color: "#fff", borderColor: "rgba(255,255,255,.3)" }}
            trailingIcon="arrow-right"
            onClick={() => onNav("performance")}>성과 상세</Button></div></div><div
        style={{ position: "relative", textAlign: "center", borderLeft: "1px solid rgba(255,255,255,.18)", paddingLeft: 18 }}><div style={{ fontSize: 12.5, fontWeight: 600, opacity: .9, marginBottom: 2 }}>모태펀드 집행률</div><GaugeLight value={78} /><div style={{ fontSize: 11.5, opacity: .8, marginTop: 2 }}>{mn("목표 80% · 잔여 2%p")}</div></div><div
        style={{ position: "relative", display: "flex", flexDirection: "column", gap: 12 }}><HeroStat
          icon="trending"
          label="전체 평균 IRR"
          value={irr.value}
          unit="%"
          delta="+0.8%p" /><HeroStat
          icon="shield-alert"
          label="활성 조기경보"
          value={alert.value}
          unit="건"
          delta="-2건"
          danger={true}
          onNav={() => onNav("risk")} /></div></div>
  );
}
function GaugeLight({ value }) {
  const r = 46, c = Math.PI * r;
  const off = c * (1 - value / 100);
  return (
    <svg
      width={130}
      height={78}
      viewBox="0 0 130 78"
      style={{ margin: "0 auto", display: "block" }}><path
        d="M19 70 A46 46 0 0 1 111 70"
        fill="none"
        stroke="rgba(255,255,255,.25)"
        strokeWidth={11}
        strokeLinecap="round" /><path
        d="M19 70 A46 46 0 0 1 111 70"
        fill="none"
        stroke="#bff0c4"
        strokeWidth={11}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={off} /><text
        x={65}
        y={64}
        textAnchor="middle"
        style={{ fontSize: 26, fontWeight: 800, fill: "#fff" }}>{mn(value + "%")}</text></svg>
  );
}
function HeroStat({ icon, label, value, unit, delta, danger, onNav }: { icon: string; label?: React.ReactNode; value?: React.ReactNode; unit?: string; delta?: React.ReactNode; danger?: boolean; onNav?: () => void }) {
  return (
    <button
      onClick={onNav}
      style={{
        border: "none", cursor: onNav ? "pointer" : "default", font: "inherit", textAlign: "left", color: "#fff",
        background: "rgba(255,255,255,.12)", borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "center", gap: 12,
      }}><span
        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,.18)", flex: "0 0 auto" }}><Icon name={icon} size={19} /></span><div style={{ flex: 1 }}><div style={{ fontSize: 11.5, opacity: .9, fontWeight: 600 }}><MT>{label}</MT></div><div style={{ display: "flex", alignItems: "baseline", gap: 4 }}><span className="tabular" style={{ fontSize: 24, fontWeight: 800 }}>{mn(value)}</span><span style={{ fontSize: 12, opacity: .85 }}>{unit}</span><span
            style={{ fontSize: 11.5, fontWeight: 700, marginLeft: 4, color: danger ? "#ffd9d6" : "#bff0c4" }}>{mn(delta)}</span></div></div></button>
  );
}

function VariantB({ s, onNav }) {
  return <Stack gap={18}><Grid><HeroAUM onNav={onNav} /></Grid><Grid><ExecChart {...s} span={8} /><StatusDonut {...s} onNav={onNav} span={4} height={184} /></Grid><Grid><IndustryCard onNav={onNav} span={7} height={330} /><ScheduleCard onNav={onNav} span={5} scroll={true} maxH={330} /></Grid><div><div className="t-label" style={{ textTransform: "none", marginBottom: 10 }}>영역 바로가기</div><ShortcutGrid onNav={onNav} cols={5} /></div></Stack>;
}

/* ===== 시안 C — 운영 모니터 (Dense bento) ===== */
function StatusBar() {
  const total = D.STATUS_DONUT.reduce((a, b) => a + b.value, 0);
  return (
    <div
      style={{ display: "flex", gap: 10, background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, padding: 8, boxShadow: "var(--shadow-sm)" }}>{D.STATUS_DONUT.map((st) => <div
        key={st.key}
        style={{ flex: st.value, minWidth: 70, background: `color-mix(in srgb,${st.color} 13%,transparent)`, borderRadius: 8, padding: "8px 12px" }}><div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 99, background: st.color }} /><span style={{ fontSize: 11.5, fontWeight: 700, color: st.color }}><MT>{st.name}</MT></span></div><div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}><span className="tabular" style={{ fontSize: 20, fontWeight: 800 }}>{mn(st.value)}</span><span className="t-caption">{mn(((st.value / total) * 100).toFixed(0) + "%")}</span></div></div>)}</div>
  );
}
function VariantC({ s, onNav }) {
  return <Stack gap={14}><StatusBar /><KpiRow min={190}>{D.KPI.map((k) => <StatCard key={k.id} kpi={k} onClick={() => {}} />)}</KpiRow><Grid gap={14}><div className="dcol-8"><Stack gap={14}><ExecChart {...s} /><Grid gap={14}><IndustryCard onNav={onNav} span={6} height={210} /><RiskTrendCard span={6} height={210} /></Grid><RegionBarCard height={240} /></Stack></div><div className="dcol-4"><Stack gap={14}><StatusDonut {...s} onNav={onNav} height={176} /><ScheduleCard onNav={onNav} rows={4} /><MiniKpis vertical={true} /></Stack></div></Grid><div><div className="t-label" style={{ textTransform: "none", marginBottom: 10 }}>영역 바로가기</div><ShortcutGrid onNav={onNav} cols={5} /></div></Stack>;
}

/* ===== 래퍼 ===== */
const VARIANTS = [
  { id: "A", name: "스탠다드", desc: "12컬럼 정석 배치" },
  { id: "B", name: "임원 브리핑", desc: "Hero AUM 중심" },
  { id: "C", name: "운영 모니터", desc: "고밀도 벤토" },
];

function Main({ onNav, navStyle, onNavStyle }: { onNav: any; navStyle?: string; onNavStyle?: (v: string) => void }) {
  const [variant, setVariant] = useState(() => localStorage.getItem("apfs.variant") || "A");
  const [period, setPeriod] = useState("분기");
  const [fund, setFund] = useState("전체");
  const [donutActive, setDonutActive] = useState(null);
  const setV = (v) => { setVariant(v); try { localStorage.setItem("apfs.variant", v); } catch (e) {} };
  const s = { period, setPeriod, fund, setFund, active: donutActive, setActive: setDonutActive };
  const V = { A: VariantA, B: VariantB, C: VariantC }[variant];
  return (
    <div style={{ maxWidth: 1320, margin: "0 auto" }}><PageHeader
        crumbs={["홈", "메인 종합"]}
        actions={<><Button variant="outline" size="sm" leadingIcon="refresh">새로고침</Button><Button variant="primary" size="sm" leadingIcon="download">리포트</Button></>} /><div
        style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap", padding: "10px 14px", background: "var(--muted)", border: "1px dashed var(--border-strong)", borderRadius: 12 }}><span
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "var(--foreground)" }}><Icon name="layers" size={15} />레이아웃 시안</span><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{VARIANTS.map((v) => <button
            key={v.id}
            onClick={() => setV(v.id)}
            style={{
                cursor: "pointer", font: "inherit", borderRadius: 9, padding: "6px 12px", textAlign: "left",
                border: `1.5px solid ${variant === v.id ? "var(--foreground)" : "var(--border-strong)"}`,
                background: variant === v.id ? "color-mix(in srgb,var(--foreground) 8%,var(--card))" : "var(--card)",
                color: variant === v.id ? "var(--foreground)" : "var(--muted-foreground)",
              }}><span style={{ fontSize: 12.5, fontWeight: 700 }}>{"시안 " + v.id + " · " + v.name}</span><span style={{ fontSize: 10.5, marginLeft: 6, opacity: .8 }}>{v.desc}</span></button>)}</div><span className="t-caption">3종 중 선택 — 동작 그대로 비교</span>{onNavStyle && <div style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: "auto" }}><span className="t-caption">네비게이션</span><div style={{ display: "flex", alignItems: "center", gap: 2, background: "var(--card)", border: "1px solid var(--border-strong)", borderRadius: 9, padding: 3 }}>{[["classic", "panel-left", "기본"], ["rail", "grid", "레일"]].map(([val, icon, label]) => <button
            key={val}
            onClick={() => onNavStyle(val)}
            aria-pressed={navStyle === val}
            title={label + " 네비게이션"}
            style={{
              display: "flex", alignItems: "center", gap: 5, cursor: "pointer", border: "none", font: "inherit",
              borderRadius: 7, padding: "5px 10px", fontSize: 11.5, fontWeight: 700,
              background: navStyle === val ? "color-mix(in srgb,var(--foreground) 9%,var(--card))" : "transparent",
              color: navStyle === val ? "var(--foreground)" : "var(--caption)", transition: "all .15s",
            }}><Icon name={icon} size={15} />{label}</button>)}</div></div>}</div>{variant !== "B" && <QuickTasksBar onNav={onNav} />}<div key={variant} style={{ animation: "dashFade .35s var(--ease) both" }}><V s={s} onNav={onNav} /></div></div>
  );
}

export { Main };
