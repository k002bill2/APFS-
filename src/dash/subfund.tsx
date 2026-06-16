/* 자펀드 정보관리 페이지 — FR-5.3
   자펀드 목록·KPI·교차검증·산업별 비중·출자/분배 현황
   APFS forest-green 토큰 + Tailwind 유틸리티. */
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
const { Sparkline, Donut, ComposedBars, LineTrend, Treemap, HBars, Gauge, useMeasure, fmtEok } = Charts;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ──────────────────────────────
   로컬 더미 데이터
────────────────────────────── */

const SUBFUND_ROWS = [
  { code:"VC-SF01",  name:"스마트팜 그로스 1호",   gp:"그린루트벤처스",    est:"2021-03", aum:284.2,  exec:78.4, status:"운용중",  tone:"success", remain:3.2 },
  { code:"PEF-042",  name:"그린바이오 투자조합",    gp:"코어밸류파트너스",  est:"2020-06", aum:215.0,  exec:92.1, status:"운용중",  tone:"success", remain:1.8 },
  { code:"VC-FV02",  name:"수산벤처 2호",           gp:"아그리벤처스",      est:"2022-01", aum:128.4,  exec:61.3, status:"주의",   tone:"warning", remain:4.1 },
  { code:"AGF-110",  name:"푸드테크 액셀러레이터",  gp:"푸드인베스트",      est:"2021-09", aum:96.8,   exec:55.7, status:"운용중",  tone:"success", remain:2.6 },
  { code:"GSB-10Y",  name:"농식품 모태 직접출자",   gp:"바이오팜",          est:"2016-12", aum:1040.0, exec:99.1, status:"청산예정",tone:"danger",  remain:0.4 },
  { code:"VC-AG03",  name:"스마트농기계펀드",       gp:"그린루트벤처스",    est:"2023-04", aum:72.3,   exec:32.8, status:"결성중",  tone:"info",    remain:5.8 },
  { code:"PEF-018",  name:"축산대체단백투자조합",   gp:"코어밸류파트너스",  est:"2022-07", aum:168.0,  exec:74.2, status:"운용중",  tone:"success", remain:3.0 },
  { code:"VC-SW01",  name:"스마트팜 2호",           gp:"아그리벤처스",      est:"2024-01", aum:45.0,   exec:12.3, status:"결성중",  tone:"info",    remain:6.7 },
];

const CROSS_VERIFY = [
  { code:"PEF-042",  type:"잔액대사",   diff:0,       date:"2026-06-15 14:22", caseType:"A", note:"자동승인 완료" },
  { code:"VC-SF01",  type:"투자실적",   diff:0,       date:"2026-06-15 11:07", caseType:"A", note:"자동승인 완료" },
  { code:"GSB-10Y",  type:"수탁내역",   diff:28500,   date:"2026-06-14 09:45", caseType:"B", note:"불일치 — 검토 필요" },
  { code:"VC-FV02",  type:"잔액대사",   diff:0,       date:"2026-06-13 16:33", caseType:"A", note:"자동승인 완료" },
  { code:"AGF-110",  type:"투자실적",   diff:12000,   date:"2026-06-12 10:18", caseType:"B", note:"불일치 — 검토 필요" },
];

/* KPI 행 */
const KPI_CARDS = [
  { id:"total",   label:"전체 자펀드",      value:"237",  unit:"개",  accent:"var(--primary)",  icon:"layers",       delta:+5,  deltaLabel:"전분기 대비" },
  { id:"active",  label:"운용중",            value:"182",  unit:"개",  accent:"var(--success)",  icon:"check-circle", delta:+2,  deltaLabel:"전월 대비" },
  { id:"closing", label:"청산 예정 (1년 내)",value:"23",   unit:"개",  accent:"var(--warning)",  icon:"clock",        delta:+3,  deltaLabel:"전분기 대비", invert:true },
  { id:"verify",  label:"교차검증 대기",     value:"12",   unit:"건",  accent:"var(--danger)",   icon:"alert-circle", delta:-2,  deltaLabel:"전일 대비",   invert:true },
];

/* ──────────────────────────────
   서브 컴포넌트
────────────────────────────── */

/** 집행률 프로그레스 바 */
function ExecBar({ value, tone }) {
  const color = tone === "danger"
    ? "var(--danger)"
    : tone === "warning"
    ? "var(--warning)"
    : tone === "info"
    ? "var(--info)"
    : "var(--primary)";
  return (
    <div className="flex items-center gap-2"><div
        className="flex-1 h-[6px] rounded-full bg-muted overflow-hidden"
        style={{ minWidth: 64 }}><div
          className="h-full rounded-full transition-all"
          style={{ width: value + "%", background: color }} /></div><span
        className="text-[12px] font-bold tabular whitespace-nowrap"
        style={{ color, minWidth: 36, textAlign: "right" }}>{value.toFixed(1) + "%"}</span></div>
  );
}

/** KPI 미니 카드 */
function KpiCard({ kpi }) {
  return (
    <div
      className="rounded-card border border-border bg-card shadow-sm px-[18px] py-4 flex flex-col gap-2.5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-[9px] min-w-0"><ColorChip icon={kpi.icon} color={kpi.accent} size={32} iconSize={18} /><span className="t-label truncate">{kpi.label}</span></div><span className="t-caption text-[10px] opacity-70 whitespace-nowrap">FR-5.3</span></div><div className="flex items-end justify-between gap-2"><div className="flex items-baseline gap-1"><span
            className="font-extrabold tabular"
            style={{ fontSize: 26, letterSpacing: "-.01em", color: kpi.accent }}>{kpi.value}</span><span className="text-[12.5px] font-semibold text-muted-foreground">{kpi.unit}</span></div><DeltaBadge value={kpi.delta} label={kpi.deltaLabel} invert={kpi.invert} /></div></div>
  );
}

/** 교차검증 행 */
function CrossRow({ row }) {
  const isA = row.caseType === "A";
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
      style={{ background: isA ? "transparent" : "color-mix(in srgb,var(--danger) 4%,transparent)" }}><div className="w-[90px] shrink-0"><span
          className="text-[12px] font-bold font-mono"
          style={{ color: "var(--foreground)" }}>{row.code}</span></div><div className="flex-1 min-w-0"><div className="flex items-center gap-2 flex-wrap"><span
            className="text-[11px] font-bold px-2 py-0.5 rounded-[5px]"
            style={{
              background: "color-mix(in srgb,var(--info) 12%,transparent)",
              color: "var(--info)",
            }}>{row.type}</span><span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-[5px]"
            style={{
              background: isA
                ? "color-mix(in srgb,var(--success) 12%,transparent)"
                : "color-mix(in srgb,var(--danger) 12%,transparent)",
              color: isA ? "var(--success)" : "var(--danger)",
            }}>{"CASE " + row.caseType}</span></div><div className="t-caption mt-0.5">{row.date}</div></div><div className="text-right shrink-0" style={{ minWidth: 130 }}>{isA
          ? <StatusBadge tone="success" label="자동승인 완료" size="sm" />
          : <div className="flex flex-col items-end gap-1"><StatusBadge tone="danger" label="검토 필요" size="sm" />{row.diff > 0 && <span
            className="text-[11px] font-bold tabular"
            style={{ color: "var(--danger)" }}>{"차이 " + row.diff.toLocaleString() + "원"}</span>}</div>}</div></div>
  );
}

/** 자펀드 테이블 행 */
function SubFundRow({ row, selected, onSelect }) {
  return (
    <tr
      onClick={() => onSelect(selected ? null : row.code)}
      className="border-t border-border transition-colors cursor-pointer"
      style={selected
        ? { background: "color-mix(in srgb,var(--primary) 6%,transparent)" }
        : undefined}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = "transparent"; }}><td className="px-4 pl-5 py-3 whitespace-nowrap"><span
          className="text-[12px] font-bold font-mono"
          style={{ color: "var(--muted-foreground)" }}>{row.code}</span></td><td className="px-3 py-3 min-w-[160px]"><span
          className="text-[13.5px] font-semibold"
          style={{ color: "var(--foreground)" }}>{row.name}</span></td><td
        className="px-3 py-3 whitespace-nowrap text-[13px]"
        style={{ color: "var(--muted-foreground)" }}>{row.gp}</td><td
        className="px-3 py-3 whitespace-nowrap tabular text-[13px]"
        style={{ color: "var(--muted-foreground)" }}>{row.est}</td><td className="px-3 py-3 text-right whitespace-nowrap"><span
          className="text-[13.5px] font-bold tabular"
          style={{ color: "var(--foreground)" }}>{row.aum.toFixed(1)}</span><span
          className="text-[11px] ml-0.5"
          style={{ color: "var(--muted-foreground)" }}>억</span></td><td className="px-3 py-3" style={{ minWidth: 140 }}><ExecBar value={row.exec} tone={row.tone} /></td><td className="px-3 py-3 whitespace-nowrap"><StatusBadge tone={row.tone} label={row.status} size="sm" /></td><td className="px-3 py-3 text-right whitespace-nowrap"><span
          className="text-[13px] font-semibold tabular"
          style={{ color: row.remain < 1 ? "var(--danger)" : row.remain < 2 ? "var(--warning)" : "var(--foreground)" }}>{row.remain.toFixed(1) + "년"}</span></td><td className="px-3 pr-5 py-3 text-right"><div className="flex items-center justify-end gap-1"><IconBtn icon="file" label="상세보기" size={30} /><IconBtn icon="edit" label="편집" size={30} /></div></td></tr>
  );
}

/** 선택된 자펀드 상세 요약 카드 */
function SelectedDetail({ row }) {
  if (!row) {
    return (
      <div
        className="rounded-card border border-border bg-card shadow-sm flex items-center justify-center"
        style={{ minHeight: 220 }}><div className="text-center"><Icon
            name="mouse-pointer"
            size={32}
            style={{ color: "var(--muted-foreground)", margin: "0 auto 8px" }} /><p className="t-caption text-[13px]">테이블에서 자펀드를 클릭하면</p><p className="t-caption text-[13px]">상세 정보가 여기 표시됩니다.</p></div></div>
    );
  }
  return (
    <div
      className="rounded-card border border-border bg-card shadow-sm p-5 flex flex-col gap-4"
      style={{ animation: "dashFade .3s var(--ease) both" }}><div className="flex items-start justify-between gap-3"><div><div
            className="text-[11px] font-bold font-mono mb-0.5"
            style={{ color: "var(--muted-foreground)" }}>{row.code}</div><div
            className="text-[16px] font-bold leading-tight"
            style={{ color: "var(--foreground)" }}>{row.name}</div><div className="t-caption mt-1">{row.gp + " · 설립 " + row.est}</div></div><StatusBadge tone={row.tone} label={row.status} size="sm" /></div><div className="grid grid-cols-2 gap-3">{[
          { label: "AUM", value: row.aum.toFixed(1) + " 억원" },
          { label: "집행률", value: row.exec.toFixed(1) + "%" },
          { label: "잔존기간", value: row.remain.toFixed(1) + " 년" },
          { label: "만기예정", value: (parseInt(row.est.split("-")[0]) + Math.ceil(row.remain + (2026 - parseInt(row.est.split("-")[0])))).toString() + "년" },
        ].map(({ label, value }) =>
          <div
            key={label}
            className="rounded-[8px] p-3"
            style={{ background: "color-mix(in srgb,var(--muted) 50%,transparent)" }}><div className="t-caption text-[11px] mb-0.5">{label}</div><div
              className="text-[15px] font-bold tabular"
              style={{ color: "var(--foreground)" }}>{value}</div></div>)}</div><div><div className="t-caption text-[11px] mb-1.5">집행률 진행</div><ExecBar value={row.exec} tone={row.tone} /></div><div className="flex items-center gap-2 pt-1"><Button variant="outline" size="sm" leadingIcon="file">보고서</Button><Button variant="primary" size="sm" leadingIcon="edit">수정</Button></div></div>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */

function SubFund({ onNav }) {
  const [statusFilter, setStatusFilter] = useState("전체");
  const [search, setSearch] = useState("");
  const [selectedCode, setSelectedCode] = useState(null);

  const STATUS_OPTIONS = ["전체", "운용중", "주의", "청산예정", "결성중"];

  const filteredRows = useMemo(() => {
    return SUBFUND_ROWS.filter((r) => {
      const matchStatus = statusFilter === "전체" || r.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchSearch = !q || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q) || r.gp.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [statusFilter, search]);

  const selectedRow = selectedCode ? SUBFUND_ROWS.find((r) => r.code === selectedCode) : null;

  const crossA = CROSS_VERIFY.filter((c) => c.caseType === "A");
  const crossB = CROSS_VERIFY.filter((c) => c.caseType === "B");

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "투자자산관리", "자펀드 정보관리"]}
        title="자펀드 정보관리"
        sub="모태펀드 자펀드 현황·집행률·교차검증 — FR-5.3 · 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">내보내기</Button></>} /><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{KPI_CARDS.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4"><ChartCard
          title="교차검증 현황"
          sub="잔액대사·투자실적·수탁내역 자동/수동 검증"
          icon="shield-check"
          accent="var(--accent)"
          right={<div className="flex items-center gap-2"><StatusBadge tone="success" label={"자동승인 " + crossA.length + "건"} size="sm" /><StatusBadge tone="danger" label={"검토필요 " + crossB.length + "건"} size="sm" /></div>}><div className="flex flex-col divide-y" style={{ margin: "-18px" }}>{CROSS_VERIFY.map((row, i) =>
              <div key={i}><CrossRow row={row} />{row.caseType === "B" && <div className="px-4 pb-3 flex justify-end"><Button variant="primary" size="sm" leadingIcon="bell" style={{ fontSize: 11 }}>즉시알림</Button></div>}</div>)}</div></ChartCard><ChartCard
          title="산업별 투자 비중"
          sub="운용 자산 기준 업종 분류"
          icon="layers"
          accent="var(--chart-1)"
          right={<span className="t-caption text-[11px]">단위: 억원</span>}>{D.INDUSTRY && <Treemap data={D.INDUSTRY} height={220} />}</ChartCard></div><section
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4"><div
          className="flex items-center justify-between gap-4 flex-wrap px-5 pt-4 pb-3 border-b border-border"><div className="flex items-center gap-2.5"><ColorChip icon="list" color="var(--primary)" size={32} iconSize={18} /><div><div className="t-cardtitle">자펀드 목록</div><div className="t-caption">{"총 " + SUBFUND_ROWS.length + "개 자펀드 · 필터 후 " + filteredRows.length + "개"}</div></div></div><div className="flex items-center gap-2"><IconBtn icon="refresh" label="새로고침" size={34} /><IconBtn icon="download" label="내보내기" size={34} /></div></div><div
          className="flex items-center gap-2 flex-wrap px-5 py-3 border-b border-border">{STATUS_OPTIONS.map((s) =>
            <FilterChip key={s} active={statusFilter === s} onClick={() => setStatusFilter(s)}>{s}</FilterChip>)}<div className="flex-1 min-w-[180px]" /><div className="relative"><input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="자펀드명·코드·운용사 검색"
              className="text-[13px] rounded-[8px] border border-border bg-muted pl-8 pr-3 py-2 outline-none transition-colors"
              style={{
                width: 230,
                color: "var(--foreground)",
                fontFamily: "inherit",
              }} /><span
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><Icon name="search" size={15} style={{ color: "var(--muted-foreground)" }} /></span></div></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[860px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{["자펀드코드", "자펀드명", "운용사", "설립일", "AUM(억원)", "집행률", "상태", "잔존기간", "액션"].map((col, i) =>
                  <th
                    key={col}
                    className={cx(
                      "t-label font-semibold px-3 py-3 whitespace-nowrap text-left",
                      i === 0 && "pl-5",
                      (i === 4 || i === 7) && "text-right",
                      i === 8 && "text-right pr-5")}>{col}</th>)}</tr></thead><tbody>{filteredRows.length === 0
                ? <tr><td colSpan={9} className="py-12 text-center t-caption">조건에 맞는 자펀드가 없습니다.</td></tr>
                : filteredRows.map((row) =>
                    <SubFundRow
                      key={row.code}
                      row={row}
                      selected={selectedCode === row.code}
                      onSelect={setSelectedCode} />)}</tbody></table></div><div
          className="flex items-center justify-between gap-4 flex-wrap px-5 py-3.5 border-t border-border"><span className="t-caption"><b style={{ color: "var(--foreground)" }}>{filteredRows.length + "개"}</b>자펀드 표시 중 (전체 237개)</span><div className="flex items-center gap-1.5"><IconBtn icon="chevron-left" label="이전 페이지" size={30} /><span
              className="text-[13px] font-semibold px-2"
              style={{ color: "var(--foreground)" }}>1 / 30</span><IconBtn icon="chevron-right" label="다음 페이지" size={30} /></div></div></section><div className="grid grid-cols-1 lg:grid-cols-2 gap-4"><ChartCard
          title="연도별 출자·분배 현황"
          sub="계획 대비 실적 (단위: 억원)"
          icon="trending"
          accent="var(--chart-2)"
          right={<div className="flex items-center gap-3"><span className="flex items-center gap-1 t-caption text-[11.5px]"><span
                className="inline-block w-2.5 h-2.5 rounded-[3px]"
                style={{ background: "color-mix(in srgb,var(--primary) 40%,transparent)", border: "1.5px solid var(--primary)" }} />계획</span><span className="flex items-center gap-1 t-caption text-[11.5px]"><span
                className="inline-block w-2.5 h-2.5 rounded-[3px]"
                style={{ background: "var(--chart-2)" }} />실적</span></div>}>{D.EXEC_Y && <ComposedBars data={D.EXEC_Y} height={200} />}</ChartCard><SelectedDetail row={selectedRow} /></div></div>
  );
}

export { SubFund };
