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

function quickColor(q: any) {
  return QUICK_TONE[q.tone] || "var(--primary)";
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
  const size = Math.round(68 * scale);
  const svgSize = Math.round(34 * scale);
  const strokeWidth = 2.15;
  const strongWidth = 2.55;
  const strokeProps = {
    fill: "none",
    stroke: "#fff",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const strongProps = { ...strokeProps, strokeWidth: strongWidth };
  return (
    <span
      aria-hidden={true}
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        width: size,
        height: size,
        flex: "0 0 auto",
      }}>
      <span
        style={{
          position: "absolute",
          inset: Math.round(-6 * scale),
          background: `radial-gradient(circle at 50% 55%, color-mix(in srgb,${color} 36%,transparent), transparent 62%)`,
          filter: "blur(4px)",
          pointerEvents: "none",
        }} />
      <span
        style={{
          position: "absolute",
          width: Math.round(54 * scale),
          height: Math.round(54 * scale),
          borderRadius: Math.round(14 * scale),
          top: Math.round(6 * scale),
          left: "50%",
          transform: "translateX(-58%) rotate(-8deg)",
          background: `linear-gradient(140deg,color-mix(in srgb,${color} 28%,transparent),color-mix(in srgb,${color} 8%,transparent))`,
          border: `1px solid color-mix(in srgb,${color} 28%,transparent)`,
          backdropFilter: "blur(4px)",
        }} />
      <span
        style={{
          position: "absolute",
          width: Math.round(54 * scale),
          height: Math.round(54 * scale),
          borderRadius: Math.round(14 * scale),
          bottom: Math.round(4 * scale),
          left: "50%",
          transform: "translateX(-42%) rotate(6deg)",
          background: `linear-gradient(135deg,color-mix(in srgb,${color} 72%,white),color-mix(in srgb,${color} 42%,transparent) 60%,color-mix(in srgb,${color} 64%,white))`,
          boxShadow: `inset 0 ${1.5 * scale}px 0 rgba(255,255,255,.55), inset 0 ${-1.5 * scale}px 0 color-mix(in srgb,${color} 42%,transparent), 0 ${10 * scale}px ${18 * scale}px ${-8 * scale}px color-mix(in srgb,${color} 60%,transparent)`,
        }}>
        <span
          style={{
            position: "absolute",
            inset: 1,
            borderRadius: Math.max(1, Math.round(13 * scale)),
            background: "linear-gradient(180deg,rgba(255,255,255,.38),rgba(255,255,255,0) 36%)",
            pointerEvents: "none",
          }} />
      </span>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 36 36"
        fill="none"
        style={{ position: "relative", zIndex: 3, transform: `translate(${2 * scale}px, ${2 * scale}px)`, filter: "drop-shadow(0 1px 1px rgba(15,21,48,.14))" }}>
        {icon === "plus" && <>
          <path d="M8 26 L8 22" {...strokeProps} />
          <path d="M14 26 L14 18" {...strokeProps} />
          <path d="M20 26 L20 14" {...strokeProps} />
          <path d="M26 26 L26 10" {...strokeProps} />
          <path d="M6 26 L28 26" {...strokeProps} />
          <circle cx="26" cy="10" r="1.7" fill="#fff" />
          <path d="M26 7 L26 5 M24 6 L23 5 M28 6 L29 5" {...strokeProps} />
        </>}
        {icon === "file" && <>
          <path d="M11 6 H22 L26 10 V28 a2 2 0 0 1 -2 2 H11 a2 2 0 0 1 -2 -2 V8 a2 2 0 0 1 2 -2 Z" {...strokeProps} />
          <path d="M22 6 V10 H26" {...strokeProps} />
          <path d="M17.5 22 V15 M14.5 18 L17.5 15 L20.5 18" {...strongProps} />
        </>}
        {icon === "shield-alert" && <>
          <path d="M18 6 L26 9 V18 c0 5 -3.5 9 -8 11 c-4.5 -2 -8 -6 -8 -11 V9 Z" {...strokeProps} />
          <path d="M11 17 H14 L16 13 L19 21 L21 17 H25" {...strongProps} />
        </>}
        {icon === "activity" && <>
          <path d="M8 23 a10 10 0 0 1 20 0" {...strokeProps} />
          <path d="M18 23 L24 14" {...strongProps} />
          <circle cx="18" cy="23" r="1.6" fill="#fff" />
          <path d="M11 27 H25" {...strokeProps} />
        </>}
        {icon === "wallet" && <>
          <path d="M9 8 a2 2 0 0 1 2 -2 H25 V28 H11 a2 2 0 0 1 -2 -2 Z" {...strokeProps} />
          <path d="M9 26 a2 2 0 0 1 2 -2 H25" {...strokeProps} />
          <path d="M14 14 L17 17 L22 12" {...strongProps} />
        </>}
        {icon === "inbox" && <>
          <path d="M8 8 L11 19 H25 L28 8" {...strokeProps} />
          <path d="M6 19 V26 a2 2 0 0 0 2 2 H28 a2 2 0 0 0 2 -2 V19 H22 a4 4 0 0 1 -8 0 Z" {...strokeProps} />
        </>}
      </svg>
    </span>
  );
}

function ConceptLayeredGlass({ items, onNav }: { items: any[]; onNav: (r: string) => void }) {
  return (
    <div className="grid" style={{ gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(min(178px,100%),1fr))" }}>
      {items.map((q, i) => {
        const color = quickColor(q);
        return (
          <button
            key={i}
            onClick={() => onNav(q.to)}
            title={q.label}
            className="text-left cursor-pointer bg-card border border-border shadow-sm relative overflow-hidden flex flex-col"
            style={{
              font: "inherit",
              color: "inherit",
              borderRadius: 16,
              minHeight: 170,
              padding: "22px 20px 20px",
              transition: "transform .25s var(--ease),box-shadow .25s var(--ease),border-color .25s var(--ease)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.transform = "translateY(-3px)";
              e.currentTarget.style.boxShadow = "0 12px 28px -12px rgba(15,21,48,.18),0 2px 6px rgba(15,21,48,.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "";
            }}>
            <span
              aria-hidden={true}
              className="absolute inset-0 pointer-events-none"
              style={{ background: `radial-gradient(120% 80% at 50% 0%,color-mix(in srgb,${color} 8%,transparent),transparent 60%)` }} />
            <span className="relative flex items-start justify-between gap-3">
              <span className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
                <span className="font-bold whitespace-nowrap overflow-hidden" style={{ display: "block", textOverflow: "ellipsis", fontSize: 14, letterSpacing: "-.01em" }}>{q.label}</span>
                <QuickBadge q={q} />
              </span>
              <span
                className="inline-flex items-center justify-center shrink-0"
                style={{ width: 22, height: 22, borderRadius: 99, color: "var(--caption)", transition: "color .2s,transform .2s" }}>
                <Icon name="arrow-right" size={14} />
              </span>
            </span>
            <span
              className="relative flex-1 grid place-items-center overflow-hidden"
              style={{ minHeight: 80, margin: "6px 0 10px", borderRadius: 12 }}>
              <QuickIllustration icon={q.icon} color={color} scale={1} />
            </span>
            <span className="relative t-caption block" style={{ lineHeight: 1.45, fontSize: 11.5 }}>{q.desc}</span>
          </button>
        );
      })}
    </div>
  );
}

function QuickTasksBar({ onNav }: { onNav: (r: string) => void }) {
  const items: any[] = D.QUICKMENU || [];
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ animation: "dashFade .22s var(--ease) both" }}>
        <ConceptLayeredGlass items={items} onNav={onNav} />
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
