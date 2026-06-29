/* 메인 종합 대시보드 — 공유 위젯 (3개 시안이 재사용) */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA, MenuStore, useMenuSel } from './data';
import { mn, MT, useMask } from './mask';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';

const { ColorChip, StatusBadge, StatCard, ChartCard, Card, Button, FilterChip, SegTabs, CountPill } = UI;
const { ComposedBars, GroupedBars, Donut, Treemap, LineTrend, HBars, Gauge, Sparkline } = Charts;
const D = APFS_DATA;
const ALLMENU = D.ALLMENU;

const MoreBtn = () => <button
  aria-label="더보기"
  className="cursor-pointer text-caption inline-flex p-1"
  style={{ border: "none", background: "transparent", borderRadius: 7 }}><Icon name="more" size={18} /></button>;

/* 출자·집행 현황 */
function ExecChart({ period, setPeriod, fund, setFund, span }) {
  const data = period === "연" ? D.EXEC_Y : D.EXEC_Q;
  const funds = ["전체", "농식품 모태", "수산 모태"];
  return (
    <ChartCard
      title="출자·집행 현황"
      sub="계획 대비 실적 · 집행률(우축)"
      icon="landmark"
      accent="var(--chart-3)"
      span={span}
      right={<><SegTabs options={["분기", "연"]} value={period} onChange={setPeriod} size="sm" /><MoreBtn /></>}
      footer={<div
        className="flex items-center gap-4 flex-wrap"><Legend color="var(--chart-grid)" label={<MT>계획</MT>} /><Legend color="var(--chart-1)" label={<MT>실적</MT>} /><Legend color="var(--chart-3)" label={<MT>집행률 %</MT>} line={true} /><span className="flex gap-1.5" style={{ marginLeft: "auto" }}>{funds.map((f) => <FilterChip key={f} active={fund === f} onClick={() => setFund(f)}><MT>{f}</MT></FilterChip>)}</span></div>}><ComposedBars data={data} height={270} /></ChartCard>
  );
}
function Legend({ color, label, line }: { color?: string; label?: React.ReactNode; line?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground"
      style={{ fontSize: 11.5 }}>{line ? <span className="w-4" style={{ height: 2.5, borderRadius: 2, background: color }} /> : <span className="w-2.5 h-2.5" style={{ borderRadius: 3, background: color }} />}{label}</span>
  );
}

/* 상태 분포 도넛 */
function StatusDonut({ active, setActive, onNav, span, height = 200 }) {
  useMask();
  const total = D.STATUS_DONUT.reduce((s, d) => s + d.value, 0);
  return (
    <ChartCard
      title="자펀드·운용사 상태 분포"
      sub="조각 클릭 → 조기경보 필터 전달"
      icon="shield-check"
      accent="var(--primary)"
      span={span}
      right={<MoreBtn />}><Donut
        data={D.STATUS_DONUT}
        height={height}
        centerLabel="총 대상"
        centerValue={mn(total)}
        activeKey={active}
        onSlice={(s) => { setActive(active === s.key ? null : s.key); }} /><div
        className="flex flex-col mt-3"
        style={{ gap: 7 }}>{D.STATUS_DONUT.map((s) => <button
          key={s.key}
          onClick={() => setActive(active === s.key ? null : s.key)}
          className="flex items-center cursor-pointer text-left"
          style={{
            gap: 9, border: "none", font: "inherit",
            background: active === s.key ? "var(--muted)" : "transparent", borderRadius: 8, padding: "6px 9px",
          }}><span style={{ width: 9, height: 9, borderRadius: 99, background: s.color }} /><span className="flex-1 font-semibold" style={{ fontSize: 13 }}><MT>{s.name}</MT></span><span className="tabular font-bold" style={{ fontSize: 13 }}>{mn(s.value)}</span><span className="t-caption text-right" style={{ width: 42 }}>{mn(((s.value / total) * 100).toFixed(0)) + "%"}</span></button>)}{active && <button
          onClick={() => onNav("risk")}
          className="mt-1 cursor-pointer flex items-center justify-center gap-1.5 text-primary p-2"
          style={{ border: "none", font: "inherit", fontWeight: 700, background: "color-mix(in srgb,var(--primary) 11%,transparent)", borderRadius: 8, fontSize: 12.5 }}>{"조기경보 대시보드에서 ‘" + D.STATUS_DONUT.find((x) => x.key === active).name + "’ 보기"}<Icon name="arrow-right" size={15} /></button>}</div></ChartCard>
  );
}

/* 산업별 투자 비중 트리맵 */
function IndustryCard({ span, onNav, height = 240 }) {
  return (
    <ChartCard
      title="산업별 투자 비중"
      sub="면적 = 투자금액 · 셀 클릭 시 드릴다운"
      icon="chart-bar"
      accent="var(--chart-2)"
      span={span}
      right={<><SegTabs options={["금액", "건수"]} value="금액" onChange={() => {}} size="sm" /><MoreBtn /></>}><Treemap data={D.INDUSTRY} height={height} onCell={() => onNav("performance")} /></ChartCard>
  );
}

/* 다가오는 일정/알림 */
function ScheduleCard({ span, onNav, rows = 5, scroll, maxH = 392 }: { span?: number | string; onNav?: (r: string) => void; rows?: number; scroll?: boolean; maxH?: number }) {
  const masked = useMask();
  const list = scroll ? D.SCHEDULE : D.SCHEDULE.slice(0, rows);
  const ddayColor = (t) => (t === "danger" ? "var(--danger)" : t === "warning" ? "var(--warning)" : "var(--accent)");
  return (
    <ChartCard
      title="다가오는 일정 · 알림"
      sub={"마감 임박순 · 전체 " + D.SCHEDULE.length + "건"}
      icon="calendar"
      accent="var(--warning)"
      span={span}
      right={<><CountPill count={D.SCHEDULE.length} /><Button
          variant="ghost"
          size="sm"
          trailingIcon="arrow-right"
          onClick={() => onNav("schedule")}>전체</Button></>}><div className="relative"><div
          className="flex flex-col"
          style={scroll
              ? { maxHeight: maxH, overflowY: "auto", margin: "0 -6px", padding: "0 6px" }
              : {}}>{list.map((s, i) => <button
            key={i}
            onClick={() => onNav("schedule")}
            className="flex items-center gap-3 cursor-pointer text-left shrink-0"
            style={{
              border: "none", font: "inherit",
              padding: "11px 6px", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none", background: "transparent",
            }}><div className="text-center shrink-0" style={{ width: 46 }}><div className="font-extrabold" style={{ fontSize: 13, color: ddayColor(s.tone) }}>{mn(s.dday)}</div><div className="t-caption" style={{ fontSize: 10 }}>{mn(s.date.slice(5).replace("-", "/"))}</div></div><div className="bg-border" style={{ width: 1, alignSelf: "stretch" }} /><div className="flex-1 min-w-0"><div
                className="font-semibold truncate" style={{ fontSize: 13 }}><MT>{s.title}</MT></div><div className="flex items-center" style={{ gap: 7, marginTop: 3 }}>{masked ? <MT w={s.kind.length * 14 + 20} /> : <StatusBadge tone={s.tone} label={s.kind} size="sm" />}<span className="t-caption"><MT>{s.to}</MT></span></div></div><Icon
              name="chevron-right"
              size={16}
              style={{ color: "var(--caption)", flex: "0 0 auto" }} /></button>)}{scroll && <div
            className="absolute left-0 right-0 bottom-0 h-7 pointer-events-none"
            style={{ background: "linear-gradient(transparent,var(--card))" }} />}</div></div></ChartCard>
  );
}

/* 보조 KPI 미니카드 */
function MiniKpis({ vertical }: { vertical?: boolean }) {
  useMask();
  const toneC = { warning: "var(--warning)", danger: "var(--danger)", success: "var(--success)" };
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: vertical ? "1fr" : "repeat(3,1fr)" }}>{D.MINI.map((m) => <div
        key={m.id}
        className="bg-card border border-border shadow-sm flex items-center justify-between gap-2"
        style={{
          borderRadius: 12, padding: "13px 15px",
        }}><div className="min-w-0"><div
            className="t-label truncate"
            style={{ textTransform: "none" }}><MT>{m.label}</MT></div><div className="flex mt-1" style={{ alignItems: "baseline", gap: 3 }}><span className="t-display tabular" style={{ fontSize: 24 }}>{mn(m.value)}</span><span
              className="font-semibold text-muted-foreground"
              style={{ fontSize: 12 }}>{m.unit}</span></div></div><ColorChip
          icon={m.tone === "success" ? "check-circle" : "file"}
          color={toneC[m.tone]}
          size={34}
          iconSize={18} /></div>)}</div>
  );
}

/* 영역 바로가기 카드 5종 */
function ShortcutCard({ s, onNav }) {
  const toneC = { danger: "var(--danger)", primary: "var(--primary)", warning: "var(--warning)", success: "var(--success)", info: "var(--accent)" };
  const c = toneC[s.tone];
  return (
    <button
      onClick={() => onNav(s.to)}
      className="shortcut text-left cursor-pointer bg-card border border-border p-4 shadow-sm flex flex-col gap-3 relative overflow-hidden"
      style={{
        font: "inherit", color: "inherit",
        borderRadius: 14, transition: "transform .18s,box-shadow .18s",
      }}><div
        className="flex items-center justify-between"><ColorChip icon={s.icon} color={c} size={40} iconSize={21} /><Icon name="arrow-right" size={17} style={{ color: "var(--caption)" }} /></div><div><div className="font-bold" style={{ fontSize: 14.5 }}>{s.title}</div><div className="t-caption" style={{ marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div></div><div
        className="flex items-center" style={{ gap: 7, marginTop: "auto" }}><span className="font-extrabold" style={{ fontSize: 12.5, color: c }}><MT>{s.metric}</MT></span></div></button>
  );
}
function ShortcutGrid({ onNav, cols = 5 }) {
  return (
    <div
      className="grid gap-3.5"
      style={{ gridTemplateColumns: `repeat(${cols},1fr)` }}>{D.SHORTCUTS.map((s) => <ShortcutCard key={s.id} s={s} onNav={onNav} />)}</div>
  );
}

/* 리스크 지수 추이 (B/C 시안용) */
function RiskTrendCard({ span, height = 200 }) {
  return (
    <ChartCard
      title="리스크 지수 추이"
      sub="임계선 초과 시 강조"
      icon="activity"
      accent="var(--danger)"
      span={span}
      right={<SegTabs options={["1M", "3M", "1Y"]} value="1Y" onChange={() => {}} size="sm" />}><LineTrend
        data={D.RISK_TREND}
        threshold={D.RISK_THRESHOLD}
        height={height}
        color="var(--chart-1)" /></ChartCard>
  );
}

/* 즐겨찾기 편집 모달 (개인설정 — 즐겨찾기 전용) */
function MenuPickerModal({ open, onClose }: { open: boolean; onClose: () => void; initialTab?: string }) {
  const cur = { kind: "fav", def: D.DEFAULT_FAV, max: 6 };
  const accent = "var(--warning)";
  const sel = useMenuSel(cur.kind, cur.def);
  const selSet = new Set(sel);
  const toggle = (key: string) => {
    let next: string[];
    if (selSet.has(key)) next = sel.filter((k) => k !== key);
    else { if (sel.length >= cur.max) return; next = [...sel, key]; }
    MenuStore.set(cur.kind, next);
  };
  const cats: any[] = [];
  (ALLMENU || []).forEach((o: any) => {
    let c = cats.find((x: any) => x.cat === o.cat);
    if (!c) { c = { cat: o.cat, urgent: o.urgent, subs: [] }; cats.push(c); }
    let s = c.subs.find((x: any) => x.sub === o.sub);
    if (!s) { s = { sub: o.sub, items: [] }; c.subs.push(s); }
    s.items.push(o);
  });
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent hideClose className="max-w-[calc(100vw-32px)] max-h-[84vh] rounded-[20px]" style={{ width: "min(960px,100%)" }}>
        <div className="flex items-start justify-between gap-3" style={{ padding: "20px 22px 14px" }}>
          <div>
            <DialogTitle className="font-extrabold inline-flex items-center gap-2" style={{ fontSize: 17, letterSpacing: "-.01em" }}><Icon name="star" size={17} style={{ color: "var(--warning)" }} />즐겨찾기 편집</DialogTitle>
            <DialogDescription className="t-caption" style={{ marginTop: 3 }}>전체 메뉴에서 자주 쓰는 화면을 골라 즐겨찾기에 등록하세요. (최대 {cur.max}개)</DialogDescription>
          </div>
          <button onClick={onClose} aria-label="닫기" className="shrink-0 bg-muted w-8 h-8 flex items-center justify-center cursor-pointer text-muted-foreground" style={{ border: "none", borderRadius: 9 }}><Icon name="x" size={17} /></button>
        </div>
        <div className="flex-1 overflow-y-auto border-t border-border" style={{ padding: "18px 24px 10px", columnWidth: 248, columnGap: 28 }}>
          {cats.map((c: any) => <div key={c.cat} className="mb-5" style={{ breakInside: "avoid" }}>
            <div className="flex items-center" style={{ gap: 7, marginBottom: 9 }}>
              <span className="w-1.5 h-1.5 shrink-0" style={{ borderRadius: 99, background: c.urgent ? "var(--danger)" : "var(--primary)" }} />
              <span className="font-extrabold" style={{ fontSize: 13.5, letterSpacing: "-.01em" }}>{c.cat}</span>
            </div>
            {c.subs.map((s: any) => <div key={s.sub} className="border-l border-border" style={{ marginBottom: 11, paddingLeft: 13 }}>
              <div className="t-caption font-semibold" style={{ marginBottom: 7 }}>{s.sub}</div>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map((o: any) => {
                  const on = selSet.has(o.key);
                  const full = !on && sel.length >= cur.max;
                  return <button key={o.key} onClick={() => toggle(o.key)} disabled={full} title={full ? "최대 " + cur.max + "개까지 선택" : o.label} className="inline-flex items-center whitespace-nowrap" style={{ font: "inherit", cursor: full ? "not-allowed" : "pointer", opacity: full ? .4 : 1, gap: 5, border: "1px solid " + (on ? "transparent" : "var(--border)"), background: on ? `color-mix(in srgb,${accent} 16%,var(--card))` : "transparent", color: on ? accent : "var(--muted-foreground)", fontSize: 12.5, fontWeight: on ? 700 : 500, borderRadius: 9, padding: "6px 11px", transition: "background .15s,color .15s,border-color .15s" }}>
                    {on && <Icon name="star" size={12} stroke={2.4} />}{o.label}
                  </button>;
                })}
              </div>
            </div>)}
          </div>)}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border" style={{ padding: "14px 22px" }}>
          <button onClick={() => MenuStore.set(cur.kind, cur.def)} className="cursor-pointer text-caption py-2 px-1 inline-flex items-center gap-1.5" style={{ border: "none", background: "transparent", font: "inherit", fontWeight: 600, fontSize: 12.5 }}><Icon name="settings" size={14} />기본값으로 초기화</button>
          <Button variant="primary" size="md" onClick={onClose}>완료</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* 퀵메뉴 — SVG 일러스트 기반 리디자인 시안 */
const QUICK_TONE: any = { danger: "var(--danger)", primary: "var(--primary)", warning: "var(--warning)", success: "var(--success)", info: "var(--accent)" };
const QUICK_CONCEPTS = [
  { id: "command", label: "시안 1", name: "커맨드 카드", desc: "기존 밀도 유지", icon: "grid" },
  { id: "tile", label: "시안 2", name: "일러스트 타일", desc: "시각 인지 우선", icon: "layers" },
  { id: "priority", label: "시안 3", name: "리스크 우선", desc: "긴급 업무 강조", icon: "shield-alert" },
  { id: "rail", label: "시안 4", name: "프로세스 레일", desc: "흐름형 바로가기", icon: "activity" },
];

function quickColor(q: any) {
  return QUICK_TONE[q.tone] || "var(--primary)";
}

function quickFillText(q: any) {
  return q.tone === "warning" || q.tone === "success" ? "var(--foreground)" : "var(--on-brand-solid)";
}

function QuickBadge({ q }: { q: any }) {
  if (!(q.badge > 0)) return null;
  return (
    <span
      className="bg-danger font-extrabold inline-flex items-center justify-center shrink-0"
      style={{ minWidth: 18, height: 18, padding: "0 6px", borderRadius: 99, color: "var(--destructive-foreground)", fontSize: 10 }}>{mn(q.badge > 99 ? "99+" : String(q.badge))}</span>
  );
}

function QuickIllustration({ icon, color, scale = 1 }: { icon: string; color: string; scale?: number }) {
  const stroke = color;
  const soft = color;
  const common = {
    fill: "none",
    stroke,
    strokeWidth: 2.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      viewBox="0 0 112 82"
      width={Math.round(112 * scale)}
      height={Math.round(82 * scale)}
      aria-hidden={true}
      style={{ display: "block", maxWidth: "100%", height: "auto" }}>
      <rect x="6" y="9" width="100" height="64" rx="18" fill={soft} opacity=".08" />
      {icon === "plus" && <>
        <path d="M22 57c16-22 33-31 55-31" {...common} opacity=".45" />
        <rect x="21" y="46" width="18" height="14" rx="5" fill={soft} opacity=".18" />
        <rect x="47" y="35" width="18" height="25" rx="5" fill={soft} opacity=".22" />
        <rect x="73" y="23" width="18" height="37" rx="5" fill={soft} opacity=".28" />
        <path d="M56 22c4.6-8 12.6-12.5 23-12-1 11.8-8 18.4-20.5 19.5" {...common} />
        <path d="M55 22c-8.5-3.6-15.5-2.5-21 3.5 7.4 6.8 15 7.7 23 2.5" {...common} opacity=".75" />
        <path d="M56 30v29" {...common} />
      </>}
      {icon === "file" && <>
        <path d="M34 16h28l16 16v34H34z" fill="var(--card)" stroke={stroke} strokeWidth="2.6" strokeLinejoin="round" />
        <path d="M62 16v17h16" {...common} />
        <path d="M44 43h24M44 52h22" {...common} opacity=".55" />
        <rect x="22" y="34" width="29" height="24" rx="9" fill={soft} opacity=".15" />
        <path d="M30 46l6 6 11-13" {...common} />
        <circle cx="82" cy="55" r="11" fill={soft} opacity=".16" />
        <path d="M78 55h8" {...common} />
      </>}
      {icon === "shield-alert" && <>
        <path d="M56 12l31 12v20c0 17.5-12.4 27-31 33-18.6-6-31-15.5-31-33V24z" fill="var(--card)" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round" />
        <path d="M56 27v18M56 56h.01" {...common} />
        <path d="M17 45h16l6-11 9 25 8-14h39" {...common} opacity=".52" />
        <circle cx="84" cy="24" r="10" fill="var(--danger)" opacity=".18" />
        <path d="M84 19v6M84 29h.01" {...common} />
      </>}
      {icon === "activity" && <>
        <rect x="22" y="17" width="68" height="51" rx="15" fill="var(--card)" stroke={stroke} strokeWidth="2.6" />
        <path d="M42 23h28" {...common} opacity=".55" />
        <path d="M37 38h7l5-12 11 28 6-16h10" {...common} />
        <circle cx="38" cy="57" r="6" fill={soft} opacity=".22" />
        <circle cx="56" cy="57" r="6" fill={soft} opacity=".26" />
        <circle cx="74" cy="57" r="6" fill={soft} opacity=".32" />
        <path d="M35 13h42" {...common} opacity=".28" />
      </>}
      {icon === "wallet" && <>
        <rect x="23" y="25" width="66" height="39" rx="13" fill="var(--card)" stroke={stroke} strokeWidth="2.7" />
        <path d="M28 31l45-15c7-2.4 12 1.4 12 7.4v7.2" {...common} opacity=".5" />
        <rect x="67" y="37" width="24" height="15" rx="7.5" fill={soft} opacity=".18" stroke={stroke} strokeWidth="2.4" />
        <path d="M34 42h22M34 52h14" {...common} opacity=".48" />
        <circle cx="76" cy="44.5" r="2.2" fill={stroke} />
        <path d="M81 59l10 10M91 59 81 69" {...common} opacity=".55" />
      </>}
      {icon === "inbox" && <>
        <rect x="21" y="22" width="70" height="48" rx="14" fill="var(--card)" stroke={stroke} strokeWidth="2.7" />
        <path d="M21 48h20l6 10h18l6-10h20" {...common} />
        <path d="M35 34h42M39 42h34" {...common} opacity=".45" />
        <path d="M70 16l13 9M83 16 70 25" {...common} opacity=".58" />
        <circle cx="33" cy="20" r="8" fill={soft} opacity=".16" />
      </>}
    </svg>
  );
}

function QuickConceptButton({ concept, active, onClick }: { concept: any; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer text-left inline-flex items-center gap-2"
      style={{
        border: "1px solid " + (active ? "var(--foreground)" : "var(--border-strong)"),
        background: active ? "color-mix(in srgb,var(--foreground) 8%,var(--card))" : "var(--card)",
        color: active ? "var(--foreground)" : "var(--muted-foreground)",
        borderRadius: 9,
        font: "inherit",
        padding: "7px 10px",
        transition: "background .16s var(--ease),border-color .16s var(--ease),color .16s var(--ease)",
      }}>
      <Icon name={concept.icon} size={14} />
      <span className="inline-flex flex-col" style={{ gap: 1 }}>
        <span className="font-extrabold" style={{ fontSize: 11.5 }}>{concept.label + " · " + concept.name}</span>
        <span style={{ fontSize: 10.5, lineHeight: 1.2 }}>{concept.desc}</span>
      </span>
    </button>
  );
}

function QuickTitle({ q, color, compact }: { q: any; color: string; compact?: boolean }) {
  return (
    <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
      <span
        className="font-extrabold whitespace-nowrap overflow-hidden"
        style={{ display: "block", maxWidth: "100%", fontSize: compact ? 12.5 : 13.5, textOverflow: "ellipsis", color: q.urgent ? "var(--danger)" : "var(--foreground)" }}>{q.label}</span>
      <QuickBadge q={q} />
      {q.urgent && !q.badge && <span style={{ width: 7, height: 7, borderRadius: 99, background: color }} />}
    </div>
  );
}

function ConceptCommand({ items, onNav }: { items: any[]; onNav: (r: string) => void }) {
  return (
    <div className="grid" style={{ gap: "clamp(9px,1.4vw,14px)", gridTemplateColumns: "repeat(auto-fill,minmax(min(248px,100%),1fr))" }}>
      {items.map((q, i) => {
        const color = quickColor(q);
        return (
          <button
            key={i}
            onClick={() => onNav(q.to)}
            title={q.label}
            className="text-left cursor-pointer bg-card border border-border shadow-sm flex items-center gap-3 relative overflow-hidden"
            style={{ font: "inherit", color: "inherit", borderRadius: "var(--radius)", minHeight: 90, padding: "13px 13px 13px 11px", transition: "transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s var(--ease)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 12px 28px -18px " + color; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = ""; }}>
            <span
              className="shrink-0 inline-flex items-center justify-center"
              style={{ width: 72, height: 58, borderRadius: 12, background: `color-mix(in srgb,${color} 9%,var(--card))` }}>
              <QuickIllustration icon={q.icon} color={color} scale={.62} />
            </span>
            <span className="flex-1" style={{ minWidth: 0 }}>
              <QuickTitle q={q} color={color} />
              <span className="t-caption block" style={{ marginTop: 4, lineHeight: 1.36, fontSize: 11.5 }}>{q.desc}</span>
            </span>
            <Icon name="arrow-right" size={16} style={{ color: "var(--caption)", flexShrink: 0 }} />
          </button>
        );
      })}
    </div>
  );
}

function ConceptTile({ items, onNav }: { items: any[]; onNav: (r: string) => void }) {
  return (
    <div className="grid" style={{ gap: 13, gridTemplateColumns: "repeat(auto-fit,minmax(min(182px,100%),1fr))" }}>
      {items.map((q, i) => {
        const color = quickColor(q);
        return (
          <button
            key={i}
            onClick={() => onNav(q.to)}
            title={q.label}
            className="text-left cursor-pointer bg-card border border-border shadow-sm relative overflow-hidden flex flex-col"
            style={{ font: "inherit", color: "inherit", borderRadius: "var(--radius)", minHeight: 168, padding: "14px 14px 13px", transition: "transform .18s var(--ease),box-shadow .18s var(--ease),border-color .18s var(--ease)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.transform = "none"; }}>
            <span
              aria-hidden={true}
              className="absolute"
              style={{ inset: 0, background: `linear-gradient(145deg,color-mix(in srgb,${color} 13%,transparent),transparent 58%)`, pointerEvents: "none" }} />
            <span className="relative flex items-start justify-between gap-2">
              <QuickTitle q={q} color={color} />
              <Icon name="arrow-right" size={15} style={{ color: "var(--caption)" }} />
            </span>
            <span className="relative flex-1 flex items-center justify-center" style={{ minHeight: 78 }}>
              <QuickIllustration icon={q.icon} color={color} scale={.9} />
            </span>
            <span className="relative t-caption block" style={{ lineHeight: 1.38, fontSize: 11.5 }}>{q.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function ConceptPriority({ items, onNav }: { items: any[]; onNav: (r: string) => void }) {
  const urgent = items.find((q) => q.urgent) || items[0];
  const regular = items.filter((q) => q !== urgent);
  const urgentColor = quickColor(urgent);
  return (
    <div className="grid" style={{ gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(min(340px,100%),1fr))" }}>
      <button
        onClick={() => onNav(urgent.to)}
        title={urgent.label}
        className="text-left cursor-pointer border shadow-sm relative overflow-hidden flex flex-wrap"
        style={{
          font: "inherit",
          color: "inherit",
          borderRadius: "var(--radius-lg)",
          borderColor: "color-mix(in srgb,var(--danger) 42%,var(--border))",
          background: "linear-gradient(135deg,color-mix(in srgb,var(--danger) 14%,var(--card)),var(--card))",
          minHeight: 182,
          padding: 18,
          gap: 16,
        }}>
        <span className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          <span className="inline-flex items-center gap-2 font-extrabold text-danger" style={{ fontSize: 12.5 }}>
            <Icon name="shield-alert" size={15} />긴급 확인
          </span>
          <span className="flex items-center gap-2" style={{ marginTop: 9 }}>
            <span className="font-extrabold" style={{ fontSize: 20 }}>{urgent.label}</span>
            <QuickBadge q={urgent} />
          </span>
          <span className="t-caption" style={{ marginTop: 6, maxWidth: 310, lineHeight: 1.48 }}>{urgent.desc}</span>
          <span className="inline-flex items-center gap-1.5 font-bold text-danger" style={{ marginTop: "auto", fontSize: 12.5 }}>
            바로 처리하기 <Icon name="arrow-right" size={15} />
          </span>
        </span>
        <span className="shrink-0 self-center">
          <QuickIllustration icon={urgent.icon} color={urgentColor} scale={1.12} />
        </span>
      </button>
      <div className="grid" style={{ gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(min(176px,100%),1fr))" }}>
        {regular.map((q, i) => {
          const color = quickColor(q);
          return (
            <button
              key={i}
              onClick={() => onNav(q.to)}
              title={q.label}
              className="text-left cursor-pointer bg-card border border-border shadow-sm flex items-center gap-2.5"
              style={{ font: "inherit", color: "inherit", borderRadius: "var(--radius)", minHeight: 84, padding: 12 }}>
              <span className="inline-flex items-center justify-center shrink-0" style={{ width: 58, height: 48, borderRadius: 11, background: `color-mix(in srgb,${color} 9%,transparent)` }}>
                <QuickIllustration icon={q.icon} color={color} scale={.5} />
              </span>
              <span style={{ minWidth: 0, flex: "1 1 auto" }}>
                <QuickTitle q={q} color={color} compact={true} />
                <span className="t-caption block" style={{ marginTop: 3, fontSize: 11, lineHeight: 1.32 }}>{q.desc}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ConceptRail({ items, onNav }: { items: any[]; onNav: (r: string) => void }) {
  return (
    <div className="grid" style={{ gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(min(174px,100%),1fr))" }}>
      {items.map((q, i) => {
        const color = quickColor(q);
        return (
          <button
            key={i}
            onClick={() => onNav(q.to)}
            title={q.label}
            className="text-left cursor-pointer bg-card border border-border shadow-sm relative overflow-hidden"
            style={{ font: "inherit", color: "inherit", borderRadius: "var(--radius)", minHeight: 148, padding: 13 }}>
            <span className="flex items-center justify-between gap-2">
              <span
                className="inline-flex items-center justify-center font-extrabold"
                style={{ width: 26, height: 26, borderRadius: 99, background: color, color: quickFillText(q), fontSize: 11 }}>{String(i + 1).padStart(2, "0")}</span>
              <Icon name="arrow-right" size={15} style={{ color: "var(--caption)" }} />
            </span>
            <span className="flex items-center justify-center" style={{ height: 62, margin: "2px 0 4px" }}>
              <QuickIllustration icon={q.icon} color={color} scale={.68} />
            </span>
            <QuickTitle q={q} color={color} compact={true} />
            <span className="t-caption block" style={{ marginTop: 4, fontSize: 11, lineHeight: 1.32 }}>{q.desc}</span>
            <span aria-hidden={true} className="absolute left-0 right-0 bottom-0" style={{ height: 3, background: color, opacity: .75 }} />
          </button>
        );
      })}
    </div>
  );
}

function QuickTasksBar({ onNav }: { onNav: (r: string) => void }) {
  const items: any[] = D.QUICKMENU || [];
  const [concept, setConcept] = React.useState(() => {
    try { return localStorage.getItem("apfs.quickmenu.concept") || "command"; }
    catch (e) { return "command"; }
  });
  const setQuickConcept = (id: string) => {
    setConcept(id);
    try { localStorage.setItem("apfs.quickmenu.concept", id); } catch (e) {}
  };
  const selected = QUICK_CONCEPTS.find((c) => c.id === concept) || QUICK_CONCEPTS[0];
  const body = selected.id === "tile"
    ? <ConceptTile items={items} onNav={onNav} />
    : selected.id === "priority"
      ? <ConceptPriority items={items} onNav={onNav} />
      : selected.id === "rail"
        ? <ConceptRail items={items} onNav={onNav} />
        : <ConceptCommand items={items} onNav={onNav} />;
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="flex items-start justify-between flex-wrap" style={{ gap: 12, marginBottom: 12 }}>
        <div>
          <div className="flex items-center flex-wrap" style={{ gap: "4px 8px" }}>
            <span className="inline-flex items-center gap-1.5 font-bold" style={{ fontSize: 13.5 }}><Icon name="grid" size={15} style={{ color: "var(--primary)" }} />퀵메뉴 리디자인</span>
            <span className="t-caption" style={{ fontSize: 11.5 }}>업무별 SVG 일러스트를 적용한 4가지 시안</span>
          </div>
          <div className="t-caption" style={{ marginTop: 3, fontSize: 11 }}>현재 선택: {selected.name} · {selected.desc}</div>
        </div>
        <div className="flex flex-wrap" style={{ gap: 6 }}>
          {QUICK_CONCEPTS.map((c) => <QuickConceptButton key={c.id} concept={c} active={selected.id === c.id} onClick={() => setQuickConcept(c.id)} />)}
        </div>
      </div>
      <div key={selected.id} style={{ animation: "dashFade .22s var(--ease) both" }}>
        {body}
      </div>
    </div>
  );
}

function RegionBarCard({ span, height = 240 }: { span?: number | string; height?: number }) {
  return (
    <ChartCard title="지역별 출자·집행" sub="계획 대비 실적" icon="chart-bar" accent="var(--chart-2)" span={span}
      right={<><SegTabs options={["금액", "건수"]} value="금액" onChange={() => {}} size="sm" /><MoreBtn /></>}
      footer={<div className="flex items-center gap-4">
        <Legend color="var(--chart-grid)" label="계획" />
        <Legend color="var(--chart-2)" label="실적" />
      </div>}>
      <GroupedBars data={D.REGION_BARS || []} height={height} />
    </ChartCard>
  );
}

export const MainWidgets = { ExecChart, StatusDonut, IndustryCard, ScheduleCard, MiniKpis, ShortcutGrid, ShortcutCard, RiskTrendCard, RegionBarCard, QuickTasksBar, MenuPickerModal, Legend };
