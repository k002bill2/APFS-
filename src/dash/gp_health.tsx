/* 운용사 건전성 서브페이지 — FR-5.5
   APFS forest-green 토큰 + Tailwind 유틸리티. JSX (Vite). */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const { Gauge, HBars } = Charts;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ───────────────────────── 로컬 더미 데이터 ───────────────────────── */

const GP_LIST = [
  {
    id: "gv", name: "그린루트벤처스", aum: 284.2, credit: "A+", health: "A",
    performance: "B+", warnings: 0, lastReport: "2026-05-31",
    kpi: {
      aum: "284.2억", creditRaw: "A+", creditNote: "안정적",
      perfGrade: "B+", staffCount: 8,
    },
  },
  {
    id: "cv", name: "코어밸류파트너스", aum: 312.5, credit: "AA-", health: "A",
    performance: "A", warnings: 1, lastReport: "2026-05-28",
    kpi: {
      aum: "312.5억", creditRaw: "AA-", creditNote: "긍정적",
      perfGrade: "A", staffCount: 11,
    },
  },
  {
    id: "av", name: "아그리벤처스", aum: 198.0, credit: "A", health: "B",
    performance: "B", warnings: 2, lastReport: "2026-05-20",
    kpi: {
      aum: "198.0억", creditRaw: "A", creditNote: "안정적",
      perfGrade: "B", staffCount: 6,
    },
  },
  {
    id: "fi", name: "푸드인베스트", aum: 156.8, credit: "A-", health: "B",
    performance: "B-", warnings: 3, lastReport: "2026-05-15",
    kpi: {
      aum: "156.8억", creditRaw: "A-", creditNote: "부정적 관찰",
      perfGrade: "B-", staffCount: 5,
    },
  },
  {
    id: "bp", name: "바이오팜파트너스", aum: 227.4, credit: "BBB+", health: "C",
    performance: "C+", warnings: 5, lastReport: "2026-04-30",
    kpi: {
      aum: "227.4억", creditRaw: "BBB+", creditNote: "부정적",
      perfGrade: "C+", staffCount: 7,
    },
  },
  {
    id: "sg", name: "스마트그린벤처", aum: 175.3, credit: "A", health: "A",
    performance: "A-", warnings: 0, lastReport: "2026-06-01",
    kpi: {
      aum: "175.3억", creditRaw: "A", creditNote: "안정적",
      perfGrade: "A-", staffCount: 9,
    },
  },
  {
    id: "nf", name: "농업미래펀드", aum: 241.6, credit: "A+", health: "B",
    performance: "B+", warnings: 1, lastReport: "2026-05-25",
    kpi: {
      aum: "241.6억", creditRaw: "A+", creditNote: "안정적",
      perfGrade: "B+", staffCount: 10,
    },
  },
];

/* 건전성 체크리스트 (선택된 운용사 기준 공통 더미) */
const CHECKLIST_BASE = [
  { id: "c1",  label: "법인등기부등본 갱신",    status: "ok",      icon: "check-circle" },
  { id: "c2",  label: "재무제표 제출",          status: "ok",      icon: "check-circle" },
  { id: "c3",  label: "운용인력 변동신고",       status: "warn",    icon: "clock" },
  { id: "c4",  label: "의무집행비율 달성",       status: "ok",      icon: "check-circle" },
  { id: "c5",  label: "조합원총회 개최",         status: "ok",      icon: "check-circle" },
  { id: "c6",  label: "수탁기관 잔액 대사",      status: "ok",      icon: "check-circle" },
  { id: "c7",  label: "이해충돌 확인서 제출",    status: "danger",  icon: "x-circle" },
  { id: "c8",  label: "내부통제 자체점검",       status: "ok",      icon: "check-circle" },
  { id: "c9",  label: "보험가입현황",            status: "ok",      icon: "check-circle" },
  { id: "c10", label: "외부감사 수감",           status: "ok",      icon: "check-circle" },
];

/* 보수정산 더미 상수 */
const FEE_PERIODS = ["2026년 1분기", "2026년 2분기", "2025년 4분기", "2025년 3분기", "2025년 2분기"];
const FEE_BASE_AMT = 284.2; /* 억원 */
const MGMT_RATE   = 0.018;  /* 1.8% */
const CARRY_RATE  = 0.20;   /* 20% */
const IRR_HURDLE  = 0.08;   /* 8% 허들 */
const IRR_ACTUAL  = 0.114;  /* 11.4% 실현 IRR */
const PENALTY_UNIT = 0.5;   /* 위반 1건당 0.5억 삭감 */
const VIOLATION_COUNT = 2;

/* ───────────────────────── 소형 서브 컴포넌트 ───────────────────────── */

function KpiPill({ icon, label, value, tone }) {
  const color = tone || "var(--primary)";
  return (
    <div
      className="flex items-center gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm flex-1"
      style={{ minWidth: 0 }}><ColorChip icon={icon} color={color} size={34} iconSize={18} /><div className="min-w-0"><div className="t-caption text-[11.5px] mb-0.5">{label}</div><div
          className="text-[15px] font-bold leading-tight truncate"
          style={{ color: "var(--foreground)" }}>{value}</div></div></div>
  );
}

function ChecklistRow({ item }) {
  const toneMap = { ok: "success", warn: "warning", danger: "danger" };
  const iconMap  = { ok: "check-circle", warn: "clock", danger: "x-circle" };
  const colorMap = { ok: "var(--success)", warn: "var(--warning)", danger: "var(--danger)" };
  const tone  = toneMap[item.status];
  const color = colorMap[item.status];
  const iconName = iconMap[item.status];
  return (
    <div
      className="flex items-center gap-3 py-2.5 border-b border-border last:border-b-0"><Icon name={iconName} size={18} style={{ color, flexShrink: 0 }} /><span
        className="flex-1 text-[13.5px] font-medium"
        style={{ color: "var(--foreground)" }}>{item.label}</span><StatusBadge
        tone={tone}
        label={tone === "success" ? "완료" : tone === "warning" ? "경고" : "미완"}
        size="sm" /></div>
  );
}

function FeeRow({ label, value, sub, highlight }: { label?: React.ReactNode; value?: React.ReactNode; sub?: React.ReactNode; highlight?: string }) {
  return (
    <div
      className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0"><div><div
          className="text-[13.5px] font-semibold"
          style={{ color: "var(--foreground)" }}>{label}</div>{sub && <div className="t-caption text-[11.5px] mt-0.5">{sub}</div>}</div><div
        className="text-[15px] font-bold tabular"
        style={{ color: highlight || "var(--foreground)" }}>{value}</div></div>
  );
}

/* ───────────────────────── 메인 컴포넌트 ───────────────────────── */

function GpHealth({ onNav }) {
  const [selectedGpId, setSelectedGpId] = useState("gv");
  const [feePeriod, setFeePeriod] = useState(FEE_PERIODS[0]);

  const gp = useMemo(() => GP_LIST.find((g) => g.id === selectedGpId) || GP_LIST[0], [selectedGpId]);

  /* 보수정산 계산 */
  const mgmtFee = FEE_BASE_AMT * MGMT_RATE;
  const excessIrr = Math.max(0, IRR_ACTUAL - IRR_HURDLE);
  const carryFee = FEE_BASE_AMT * excessIrr * CARRY_RATE;
  const penalty = VIOLATION_COUNT * PENALTY_UNIT;
  const totalFee = mgmtFee + carryFee - penalty;

  /* 체크리스트 요약 */
  const okCount     = CHECKLIST_BASE.filter((c) => c.status === "ok").length;
  const totalCount  = CHECKLIST_BASE.length;
  const failedItems = CHECKLIST_BASE.filter((c) => c.status !== "ok");

  /* AUM HBars 데이터 */
  const AUM_COLORS = [
    "var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)",
    "var(--chart-5)", "var(--chart-6)", "var(--chart-7)",
  ];
  const hbarsData = GP_LIST.map((g, i) => ({
    name: g.name,
    value: g.aum,
    max: 400,
    color: AUM_COLORS[i % AUM_COLORS.length],
  }));

  /* 건전성 등급 → StatusBadge tone */
  const healthTone = (grade) =>
    grade === "A" ? "success" : grade === "B" ? "info" : "danger";

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "운용관리", "운용사 건전성"]}
        title="운용사 건전성"
        sub="GP별 건전성 체크리스트·의무집행·보수정산 종합 현황 — 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">보고서 내보내기</Button></>} /><div className="flex flex-wrap items-start gap-3 mb-4"><div
          className="relative flex items-center gap-2 rounded-card border border-border bg-card px-4 py-3 shadow-sm"
          style={{ minWidth: 220 }}><Icon
            name="building"
            size={18}
            style={{ color: "var(--primary)", flexShrink: 0 }} /><select
            value={selectedGpId}
            onChange={(e) => setSelectedGpId(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              fontSize: 14, fontWeight: 700, color: "var(--foreground)", fontFamily: "inherit",
              appearance: "none", cursor: "pointer",
            }}>{GP_LIST.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><Icon
            name="chevron-down"
            size={16}
            style={{ color: "var(--muted-foreground)", flexShrink: 0, pointerEvents: "none" }} /></div><KpiPill icon="wallet" label="AUM" value={gp.kpi.aum} tone="var(--primary)" /><KpiPill
          icon="shield-check"
          label="신용등급"
          value={gp.kpi.creditRaw + " (" + gp.kpi.creditNote + ")"}
          tone="var(--accent)" /><KpiPill icon="star" label="성과평가등급" value={gp.kpi.perfGrade} tone="var(--chart-3)" /><KpiPill
          icon="users"
          label="운용인력"
          value={gp.kpi.staffCount + "명"}
          tone="var(--secondary)" /></div><div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "2fr 1fr" }}><ChartCard
          title="건전성 체크리스트"
          sub={gp.name + " 기준 " + totalCount + "항목"}
          icon="clipboard-list"
          accent="var(--primary)"
          right={<div className="flex items-center gap-2"><StatusBadge tone="success" label={"완료 " + okCount + "/" + totalCount} />{failedItems.length > 0 && <CountPill count={failedItems.length} urgent={true} />}</div>}><div className="divide-y" style={{ margin: "0 -18px", padding: "0 18px" }}>{CHECKLIST_BASE.map((item) => <ChecklistRow key={item.id} item={item} />)}</div></ChartCard><ChartCard title="의무투자비율" sub="달성현황" icon="target" accent="var(--primary)"><div className="flex flex-col items-center gap-4 pt-2"><Gauge value={78} max={100} color="var(--primary)" height={140} label="집행률" /><div
              className="flex items-center justify-center gap-2 text-[12.5px] font-semibold"
              style={{ color: "var(--warning)" }}><Icon name="alert-triangle" size={14} /><span>목표 80%까지 <b>2.0%p</b>잔여</span></div><div className="flex items-center gap-3"><div className="text-center"><div
                  className="text-[28px] font-extrabold tabular"
                  style={{ color: "var(--primary)" }}>78%</div><div className="t-caption text-[11.5px]">당분기 집행률</div></div><div className="w-px h-8 bg-border" /><div className="text-center"><DeltaBadge value="+2.4%" label="전분기 대비" /></div></div><div className="w-full"><div className="flex justify-between t-caption text-[11px] mb-1"><span>0%</span><span style={{ color: "var(--warning)" }}>▼ 목표 80%</span><span>100%</span></div><div className="relative h-3 rounded-full bg-muted overflow-hidden"><div
                  style={{
                    width: "78%", height: "100%", background: "var(--primary)",
                    borderRadius: "9999px", transition: "width .6s var(--ease)",
                  }} /><div
                  style={{
                    position: "absolute", left: "80%", top: 0, bottom: 0,
                    width: 2, background: "var(--warning)",
                  }} /></div></div></div></ChartCard></div><div className="grid gap-4 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}><ChartCard
          title="보수정산 계산기"
          sub={gp.name + " · " + feePeriod}
          icon="calculator"
          accent="var(--accent)"
          right={<div className="relative"><select
              value={feePeriod}
              onChange={(e) => setFeePeriod(e.target.value)}
              style={{
                background: "var(--muted)", border: "1px solid var(--border)", borderRadius: 8,
                padding: "5px 28px 5px 10px", fontSize: 12.5, fontWeight: 600,
                color: "var(--foreground)", fontFamily: "inherit", appearance: "none", cursor: "pointer", outline: "none",
              }}>{FEE_PERIODS.map((p) => <option key={p} value={p}>{p}</option>)}</select><Icon
              name="chevron-down"
              size={14}
              style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} /></div>}><div><div
              className="flex items-center gap-2 rounded-[8px] px-3 py-2 mb-3 text-[12px] font-semibold"
              style={{ background: "color-mix(in srgb,var(--info) 10%,transparent)", color: "var(--info)" }}><Icon name="info" size={14} /><span>{"기준금액 " + FEE_BASE_AMT + "억원 · IRR " + (IRR_ACTUAL * 100).toFixed(1) + "% · 허들 " + (IRR_HURDLE * 100).toFixed(0) + "% · 캐리율 " + (CARRY_RATE * 100).toFixed(0) + "%"}</span></div><FeeRow
              label="관리보수"
              sub={FEE_BASE_AMT + "억 × " + (MGMT_RATE * 100).toFixed(1) + "%"}
              value={mgmtFee.toFixed(2) + "억"} /><FeeRow
              label="성과보수 (캐리)"
              sub={"초과IRR " + (excessIrr * 100).toFixed(1) + "% × 캐리율 " + (CARRY_RATE * 100) + "%"}
              value={carryFee.toFixed(2) + "억"}
              highlight="var(--success)" /><FeeRow
              label="삭감 (위반)"
              sub={"위반 " + VIOLATION_COUNT + "건 × 단가 " + PENALTY_UNIT + "억"}
              value={"−" + penalty.toFixed(1) + "억"}
              highlight="var(--danger)" /><div className="my-3 border-t border-border-strong" /><div className="flex items-center justify-between"><div><div
                  className="text-[13px] font-bold"
                  style={{ color: "var(--muted-foreground)" }}>정산 보수 합계</div><div className="t-caption text-[11.5px] mt-0.5">{feePeriod + " 기준"}</div></div><div className="text-right"><div
                  className="text-[24px] font-extrabold tabular"
                  style={{ color: "var(--primary)" }}>{totalFee.toFixed(2) + "억"}</div><div className="t-caption text-[11.5px] mt-0.5">VAT 별도</div></div></div></div></ChartCard><ChartCard
          title="운용사 AUM 순위"
          sub="전체 GP 비교 (억원 기준)"
          icon="bar-chart-2"
          accent="var(--chart-2)"><HBars data={hbarsData} height={210} unit="억" /></ChartCard></div><section
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-6"><div
          className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border"><div className="flex items-center gap-2.5"><ColorChip icon="list" color="var(--primary)" size={32} iconSize={17} /><h2 className="t-cardtitle">전체 운용사 현황</h2><CountPill count={GP_LIST.length} /></div><div className="flex items-center gap-2"><IconBtn icon="refresh" label="새로고침" size={34} /><IconBtn icon="download" label="내보내기" size={34} /></div></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[860px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{[
                  ["운용사명",    "left",   "pl-5 sm:pl-6"],
                  ["AUM(억원)",   "right",  ""],
                  ["신용등급",    "left",   ""],
                  ["건전성등급",  "left",   ""],
                  ["성과평가",    "left",   ""],
                  ["조기경보건수","right",  ""],
                  ["최종보고일",  "left",   ""],
                  ["상세",        "center", "pr-5 sm:pr-6"],
                ].map((c, i) =>
                  <th
                    key={i}
                    className={cx(
                      "t-label font-semibold px-4 py-3 whitespace-nowrap",
                      c[1] === "right" ? "text-right" : c[1] === "center" ? "text-center" : "text-left",
                      c[2],
                    )}>{c[0]}</th>)}</tr></thead><tbody>{GP_LIST.map((row, i) =>
                <tr
                  key={row.id}
                  className={cx(
                    "border-t border-border transition-colors",
                    row.id === selectedGpId && "bg-muted",
                  )}
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedGpId(row.id)}
                  onMouseEnter={(e) => {
                    if (row.id !== selectedGpId)
                      e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)";
                  }}
                  onMouseLeave={(e) => {
                    if (row.id !== selectedGpId)
                      e.currentTarget.style.background = "transparent";
                  }}><td className="px-4 pl-5 sm:pl-6 py-3.5"><div className="flex items-center gap-2.5"><span
                        className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] text-white text-[11px] font-bold shrink-0"
                        style={{ background: AUM_COLORS[i % AUM_COLORS.length] }}>{row.name.slice(0, 2)}</span><span
                        className="text-[14px] font-semibold"
                        style={{ color: "var(--foreground)" }}>{row.name}</span></div></td><td
                    className="px-4 py-3.5 text-right tabular text-[14px] font-bold"
                    style={{ color: "var(--foreground)" }}>{row.aum.toFixed(1)}</td><td
                    className="px-4 py-3.5 text-[13.5px] font-semibold"
                    style={{ color: "var(--accent)" }}>{row.credit}</td><td className="px-4 py-3.5"><StatusBadge tone={healthTone(row.health)} label={row.health} /></td><td
                    className="px-4 py-3.5 text-[13.5px] font-semibold"
                    style={{ color: "var(--foreground)" }}>{row.performance}</td><td className="px-4 py-3.5 text-right">{row.warnings > 0
                      ? <CountPill count={row.warnings} urgent={row.warnings >= 3} />
                      : <span className="text-[13px] font-semibold" style={{ color: "var(--success)" }}>0</span>}</td><td
                    className="px-4 py-3.5 t-caption text-[12.5px]"
                    style={{ color: "var(--muted-foreground)" }}>{row.lastReport}</td><td className="px-4 pr-5 sm:pr-6 py-3.5 text-center"><Button
                      variant={row.id === selectedGpId ? "primary" : "outline"}
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); setSelectedGpId(row.id); }}>상세</Button></td></tr>)}</tbody></table></div></section></div>
  );
}

export { GpHealth };
