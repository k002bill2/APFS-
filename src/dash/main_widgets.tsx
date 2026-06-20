/* 메인 종합 대시보드 — 공유 위젯 (3개 시안이 재사용) */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA, MenuStore, useMenuSel } from './data';
import { mn, MT, useMask } from './mask';

const { ColorChip, StatusBadge, StatCard, ChartCard, Card, Button, FilterChip, SegTabs, CountPill } = UI;
const { ComposedBars, GroupedBars, Donut, Treemap, LineTrend, HBars, Gauge, Sparkline } = Charts;
const D = APFS_DATA;
const ALLMENU = D.ALLMENU;

const MoreBtn = () => <button
  aria-label="더보기"
  style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--caption)", display: "inline-flex", padding: 4, borderRadius: 7 }}><Icon name="more" size={18} /></button>;
const ExcelBtn = () => <Button variant="ghost" size="sm" leadingIcon="download">엑셀</Button>;

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
      right={<><SegTabs options={["분기", "연"]} value={period} onChange={setPeriod} size="sm" /><ExcelBtn /><MoreBtn /></>}
      footer={<div
        style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}><Legend color="var(--chart-grid)" label="계획" /><Legend color="var(--chart-1)" label="실적" /><Legend color="var(--chart-3)" label="집행률 %" line={true} /><span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>{funds.map((f) => <FilterChip key={f} active={fund === f} onClick={() => setFund(f)}>{f}</FilterChip>)}</span></div>}><ComposedBars data={data} height={270} /></ChartCard>
  );
}
function Legend({ color, label, line }: { color?: string; label?: React.ReactNode; line?: boolean }) {
  return (
    <span
      style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, fontWeight: 600, color: "var(--muted-foreground)" }}>{line ? <span style={{ width: 16, height: 2.5, borderRadius: 2, background: color }} /> : <span style={{ width: 10, height: 10, borderRadius: 3, background: color }} />}{label}</span>
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
        style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>{D.STATUS_DONUT.map((s) => <button
          key={s.key}
          onClick={() => setActive(active === s.key ? null : s.key)}
          style={{
            display: "flex", alignItems: "center", gap: 9, border: "none", cursor: "pointer", font: "inherit",
            background: active === s.key ? "var(--muted)" : "transparent", borderRadius: 8, padding: "6px 9px", textAlign: "left",
          }}><span style={{ width: 9, height: 9, borderRadius: 99, background: s.color }} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}><MT>{s.name}</MT></span><span className="tabular" style={{ fontSize: 13, fontWeight: 700 }}>{mn(s.value)}</span><span className="t-caption" style={{ width: 42, textAlign: "right" }}>{mn(((s.value / total) * 100).toFixed(0)) + "%"}</span></button>)}{active && <button
          onClick={() => onNav("risk")}
          style={{ marginTop: 4, border: "none", cursor: "pointer", font: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "color-mix(in srgb,var(--primary) 11%,transparent)", color: "var(--primary)", borderRadius: 8, padding: "8px", fontSize: 12.5, fontWeight: 700 }}>{"조기경보 대시보드에서 ‘" + D.STATUS_DONUT.find((x) => x.key === active).name + "’ 보기"}<Icon name="arrow-right" size={15} /></button>}</div></ChartCard>
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
  useMask();
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
          onClick={() => onNav("schedule")}>전체</Button></>}><div style={{ position: "relative" }}><div
          style={scroll
              ? { display: "flex", flexDirection: "column", maxHeight: maxH, overflowY: "auto", margin: "0 -6px", padding: "0 6px" }
              : { display: "flex", flexDirection: "column" }}>{list.map((s, i) => <button
            key={i}
            onClick={() => onNav("schedule")}
            style={{
              display: "flex", alignItems: "center", gap: 12, border: "none", cursor: "pointer", font: "inherit", textAlign: "left",
              padding: "11px 6px", borderBottom: i < list.length - 1 ? "1px solid var(--border)" : "none", background: "transparent", flex: "0 0 auto",
            }}><div style={{ width: 46, textAlign: "center", flex: "0 0 auto" }}><div style={{ fontSize: 13, fontWeight: 800, color: ddayColor(s.tone) }}>{mn(s.dday)}</div><div className="t-caption" style={{ fontSize: 10 }}>{mn(s.date.slice(5).replace("-", "/"))}</div></div><div style={{ width: 1, alignSelf: "stretch", background: "var(--border)" }} /><div style={{ flex: 1, minWidth: 0 }}><div
                style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><MT>{s.title}</MT></div><div style={{ display: "flex", gap: 7, marginTop: 3, alignItems: "center" }}><StatusBadge tone={s.tone} label={s.kind} size="sm" /><span className="t-caption"><MT>{s.to}</MT></span></div></div><Icon
              name="chevron-right"
              size={16}
              style={{ color: "var(--caption)", flex: "0 0 auto" }} /></button>)}{scroll && <div
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 28, pointerEvents: "none", background: "linear-gradient(transparent,var(--card))" }} />}</div></div></ChartCard>
  );
}

/* 보조 KPI 미니카드 */
function MiniKpis({ vertical }: { vertical?: boolean }) {
  useMask();
  const toneC = { warning: "var(--warning)", danger: "var(--danger)", success: "var(--success)" };
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: vertical ? "1fr" : "repeat(3,1fr)", gap: 12 }}>{D.MINI.map((m) => <div
        key={m.id}
        style={{
          background: "var(--card)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "13px 15px", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
        }}><div style={{ minWidth: 0 }}><div
            className="t-label"
            style={{ textTransform: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><MT>{m.label}</MT></div><div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 4 }}><span className="t-display tabular" style={{ fontSize: 24 }}>{mn(m.value)}</span><span
              style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground)" }}>{m.unit}</span></div></div><ColorChip
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
      className="shortcut"
      style={{
        textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit",
        background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, padding: 16,
        boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 12, transition: "transform .18s,box-shadow .18s", position: "relative", overflow: "hidden",
      }}><div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><ColorChip icon={s.icon} color={c} size={40} iconSize={21} /><Icon name="arrow-right" size={17} style={{ color: "var(--caption)" }} /></div><div><div style={{ fontSize: 14.5, fontWeight: 700 }}>{s.title}</div><div className="t-caption" style={{ marginTop: 3, lineHeight: 1.4 }}>{s.desc}</div></div><div
        style={{ display: "flex", alignItems: "center", gap: 7, marginTop: "auto" }}><span style={{ fontSize: 12.5, fontWeight: 800, color: c }}>{s.metric}</span></div></button>
  );
}
function ShortcutGrid({ onNav, cols = 5 }) {
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 14 }}>{D.SHORTCUTS.map((s) => <ShortcutCard key={s.id} s={s} onNav={onNav} />)}</div>
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

/* 메뉴 편집 모달 */
function MenuPickerModal({ open, onClose, initialTab }: { open: boolean; onClose: () => void; initialTab?: string }) {
  const tabs = [
    { kind: "quick", label: "퀵메뉴", icon: "grid", def: D.DEFAULT_QUICK, max: 8 },
    { kind: "fav", label: "즐겨찾기", icon: "star", def: D.DEFAULT_FAV, max: 6 },
  ];
  const [tab, setTab] = React.useState(initialTab || "quick");
  React.useEffect(() => { if (open) setTab(initialTab || "quick"); }, [open, initialTab]);
  const cur = tabs.find((t) => t.kind === tab)!;
  const accent = cur.kind === "fav" ? "var(--warning)" : "var(--primary)";
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
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, animation: "dashFade .16s var(--ease) both" }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" style={{ width: "min(960px,100%)", maxHeight: "84vh", display: "flex", flexDirection: "column", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 20, boxShadow: "var(--shadow-lg)", overflow: "hidden", animation: "dashPop .2s var(--ease) both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, padding: "20px 22px 14px" }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-.01em" }}>메뉴 편집</div>
            <div className="t-caption" style={{ marginTop: 3 }}>전체 메뉴에서 자주 쓰는 업무를 골라 바로가기를 구성하세요.</div>
          </div>
          <button onClick={onClose} aria-label="닫기" style={{ flex: "0 0 auto", border: "none", background: "var(--muted)", borderRadius: 9, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--muted-foreground)" }}><Icon name="x" size={17} /></button>
        </div>
        <div style={{ display: "flex", gap: 6, padding: "0 24px 12px", borderBottom: "1px solid var(--border)" }}>
          {tabs.map((t) => {
            const on = t.kind === tab;
            const tac = t.kind === "fav" ? "var(--warning)" : "var(--primary)";
            return <button key={t.kind} onClick={() => setTab(t.kind)} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "none", cursor: "pointer", font: "inherit", padding: "9px 14px", borderRadius: 10, background: on ? `color-mix(in srgb,${tac} 14%,var(--card))` : "transparent", color: on ? tac : "var(--caption)", fontSize: 13.5, fontWeight: 700, transition: "background .15s,color .15s" }}>
              <Icon name={t.icon} size={15} />{t.label}
            </button>;
          })}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 24px 10px", columnWidth: 248, columnGap: 28 }}>
          {cats.map((c: any) => <div key={c.cat} style={{ breakInside: "avoid", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 9 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: c.urgent ? "var(--danger)" : "var(--primary)", flex: "0 0 auto" }} />
              <span style={{ fontSize: 13.5, fontWeight: 800, letterSpacing: "-.01em" }}>{c.cat}</span>
            </div>
            {c.subs.map((s: any) => <div key={s.sub} style={{ marginBottom: 11, paddingLeft: 13, borderLeft: "1px solid var(--border)" }}>
              <div className="t-caption" style={{ fontWeight: 600, marginBottom: 7 }}>{s.sub}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {s.items.map((o: any) => {
                  const on = selSet.has(o.key);
                  const full = !on && sel.length >= cur.max;
                  return <button key={o.key} onClick={() => toggle(o.key)} disabled={full} title={full ? "최대 " + cur.max + "개까지 선택" : o.label} style={{ font: "inherit", cursor: full ? "not-allowed" : "pointer", opacity: full ? .4 : 1, display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid " + (on ? "transparent" : "var(--border)"), background: on ? `color-mix(in srgb,${accent} 16%,var(--card))` : "transparent", color: on ? accent : "var(--muted-foreground)", fontSize: 12.5, fontWeight: on ? 700 : 500, borderRadius: 9, padding: "6px 11px", whiteSpace: "nowrap", transition: "background .15s,color .15s,border-color .15s" }}>
                    {on && <Icon name={cur.kind === "fav" ? "star" : "check"} size={12} stroke={2.4} />}{o.label}
                  </button>;
                })}
              </div>
            </div>)}
          </div>)}
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
          <button onClick={() => MenuStore.set(cur.kind, cur.def)} style={{ border: "none", background: "transparent", cursor: "pointer", font: "inherit", fontSize: 12.5, fontWeight: 600, color: "var(--caption)", padding: "8px 4px", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="settings" size={14} />기본값으로 초기화</button>
          <Button variant="primary" size="md" onClick={onClose}>완료</Button>
        </div>
      </div>
    </div>
  );
}

/* 퀵메뉴 — 자주 쓰는 업무 바로가기 (GNB 팝오버 → 메인 인라인 바) */
function QuickTasksBar({ onNav }: { onNav: (r: string) => void }) {
  const [edit, setEdit] = React.useState(false);
  const keys = useMenuSel("quick", D.DEFAULT_QUICK || []);
  const items = MenuStore.resolve(keys);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", background: "var(--card)", border: "1px solid var(--border)", borderRadius: 14, boxShadow: "var(--shadow-sm)", padding: "12px 16px", marginBottom: 18 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 1, paddingRight: 14, borderRight: "1px solid var(--border)", flex: "0 0 auto" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700 }}><Icon name="grid" size={15} />퀵메뉴</span>
        <span className="t-caption" style={{ fontSize: 10.5 }}>자주 쓰는 업무</span>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flex: 1 }}>
        {items.length === 0
          ? <span className="t-caption" style={{ alignSelf: "center" }}>오른쪽 설정에서 바로가기를 추가하세요.</span>
          : items.map((q: any) => <button key={q.key} onClick={() => onNav(q.to)} title={q.label}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card-raised)"; e.currentTarget.style.borderColor = "var(--border)"; }}
              style={{ position: "relative", display: "flex", alignItems: "center", gap: 7, cursor: "pointer", border: "1px solid var(--border)", background: "var(--card-raised)", borderRadius: 11, padding: "8px 14px", font: "inherit", transition: "background .15s,border-color .15s" }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: q.urgent ? "var(--danger)" : "var(--foreground)" }}>{q.label}</span>
              {q.badge > 0 && <span style={{ minWidth: 17, height: 17, padding: "0 5px", borderRadius: 99, background: "var(--danger)", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{q.badge > 99 ? "99+" : q.badge}</span>}
            </button>)
        }
      </div>
      <button onClick={() => setEdit(true)} aria-label="퀵메뉴 편집" title="퀵메뉴 편집"
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--muted)"; e.currentTarget.style.color = "var(--foreground)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--caption)"; }}
        style={{ flex: "0 0 auto", marginLeft: "auto", width: 38, height: 38, borderRadius: 10, border: "1px solid var(--border)", background: "transparent", color: "var(--caption)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "background .15s,color .15s" }}>
        <Icon name="settings" size={18} />
      </button>
      <MenuPickerModal open={edit} onClose={() => setEdit(false)} />
    </div>
  );
}

function RegionBarCard({ span, height = 240 }: { span?: number | string; height?: number }) {
  return (
    <ChartCard title="지역별 출자·집행" sub="계획 대비 실적" icon="chart-bar" accent="var(--chart-2)" span={span}
      right={<><SegTabs options={["금액", "건수"]} value="금액" onChange={() => {}} size="sm" /><MoreBtn /></>}
      footer={<div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <Legend color="var(--chart-grid)" label="계획" />
        <Legend color="var(--chart-2)" label="실적" />
      </div>}>
      <GroupedBars data={D.REGION_BARS || []} height={height} />
    </ChartCard>
  );
}

export const MainWidgets = { ExecChart, StatusDonut, IndustryCard, ScheduleCard, MiniKpis, ShortcutGrid, ShortcutCard, RiskTrendCard, RegionBarCard, QuickTasksBar, MenuPickerModal, Legend };
