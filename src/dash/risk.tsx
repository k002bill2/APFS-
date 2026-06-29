/* 조기경보 리스크 관리 페이지 — FR-5.6 / FR-5.7
   운용사 리스크 지수 추이 · 조기경보 목록 · 상태 분포 · 운용사별 현황 */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { apfsTheme } from './aggrid_theme';   // 공유 테마(회색 행선택) SSOT
import './aggrid_shared.css';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const { Sparkline, Donut, LineTrend, HBars, useMeasure, fmtEok } = Charts;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ───────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */
const KPI_RISK = [
  {
    id: "total",
    label: "총 활성 경보",
    value: 14,
    unit: "건",
    icon: "shield-alert",
    accent: "var(--danger)",
    delta: -2,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [21, 20, 19, 18, 17, 16, 16, 14],
  },
  {
    id: "warn",
    label: "경고 등급",
    value: 5,
    unit: "건",
    icon: "alert-triangle",
    accent: "var(--danger)",
    delta: +1,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [3, 3, 3, 4, 4, 4, 4, 5],
  },
  {
    id: "watch",
    label: "주의 등급",
    value: 9,
    unit: "건",
    icon: "eye",
    accent: "var(--warning)",
    delta: -3,
    deltaLabel: "전주 대비",
    invert: true,
    trend: [14, 13, 12, 11, 11, 10, 12, 9],
  },
  {
    id: "new",
    label: "이번 주 신규",
    value: 3,
    unit: "건",
    icon: "bell",
    accent: "var(--info)",
    delta: 0,
    deltaLabel: "전주 대비",
    invert: false,
    trend: [2, 4, 1, 3, 2, 5, 2, 3],
  },
];

/* 처리 단계 (5단계) */
const STEPS = ["감지", "분류", "배정", "처리", "완료"];

/* 조기경보 목록 */
const ALERTS = [
  {
    id: "AL-001",
    gp: "그린루트벤처스",
    gpCode: "GR",
    gpColor: "var(--chart-1)",
    type: "신용등급하락",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-14",
    step: 2, // 배정(index 2)
    manager: "김민준",
    desc: "NICE CB 신용등급 B+ → B 하락",
  },
  {
    id: "AL-002",
    gp: "코어밸류파트너스",
    gpCode: "CV",
    gpColor: "var(--chart-3)",
    type: "재무지표악화",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-10",
    step: 3, // 처리(index 3)
    manager: "이서연",
    desc: "부채비율 전기 대비 28%p 증가",
  },
  {
    id: "AL-003",
    gp: "아그리벤처스",
    gpCode: "AV",
    gpColor: "var(--chart-4)",
    type: "법규위반",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-08",
    step: 1, // 분류(index 1)
    manager: "박지호",
    desc: "자본시장법 의무보고 미제출",
  },
  {
    id: "AL-004",
    gp: "푸드인베스트",
    gpCode: "FI",
    gpColor: "var(--chart-5)",
    type: "운용인력변동",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-07",
    step: 3, // 처리(index 3)
    manager: "최유진",
    desc: "대표 GP 교체 신고 접수",
  },
  {
    id: "AL-005",
    gp: "그린루트벤처스",
    gpCode: "GR",
    gpColor: "var(--chart-1)",
    type: "재무지표악화",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-06-05",
    step: 4, // 완료(index 4)
    manager: "김민준",
    desc: "자기자본 20% 이상 감소 감지",
  },
  {
    id: "AL-006",
    gp: "바이오팜캐피탈",
    gpCode: "BP",
    gpColor: "var(--chart-2)",
    type: "신용등급하락",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-06-03",
    step: 2, // 배정(index 2)
    manager: "정하늘",
    desc: "한국신용평가 등급 BB → BB- 하락",
  },
  {
    id: "AL-007",
    gp: "아그리벤처스",
    gpCode: "AV",
    gpColor: "var(--chart-4)",
    type: "운용인력변동",
    grade: "주의",
    gradeTone: "warning",
    date: "2026-05-30",
    step: 4, // 완료(index 4)
    manager: "박지호",
    desc: "운용역 2인 동시 이직 보고",
  },
  {
    id: "AL-008",
    gp: "코어밸류파트너스",
    gpCode: "CV",
    gpColor: "var(--chart-3)",
    type: "법규위반",
    grade: "경고",
    gradeTone: "danger",
    date: "2026-05-28",
    step: 4, // 완료(index 4)
    manager: "이서연",
    desc: "회계감사 의견 '한정' 수령",
  },
];

/* 운용사별 경보 건수 (HBars용) */
const GP_BARS = [
  { name: "그린루트벤처스", value: 5, max: 5, color: "var(--chart-1)" },
  { name: "아그리벤처스",   value: 4, max: 5, color: "var(--chart-4)" },
  { name: "코어밸류파트너스", value: 3, max: 5, color: "var(--chart-3)" },
  { name: "바이오팜캐피탈", value: 2, max: 5, color: "var(--chart-2)" },
  { name: "푸드인베스트",   value: 1, max: 5, color: "var(--chart-5)" },
];

/* 경보 유형 FilterChip 목록 */
const TYPES = [
  { id: "신용등급하락", label: "신용등급 하락" },
  { id: "재무지표악화", label: "재무지표 악화" },
  { id: "법규위반",     label: "법규위반" },
  { id: "운용인력변동", label: "운용인력 변동" },
];

/* ───────────────────────────────────────────────
   KPI 미니카드
─────────────────────────────────────────────── */
function RiskKpiCard({ kpi }) {
  return (
    <div
      className="rounded-card border border-border bg-card shadow-sm px-[18px] py-[14px] flex flex-col gap-2 min-w-0"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2 min-w-0"><ColorChip icon={kpi.icon} color={kpi.accent} size={32} iconSize={17} /><span className="t-label truncate"><MT>{kpi.label}</MT></span></div><div className="shrink-0 w-[70px]"><Sparkline data={kpi.trend} color={kpi.accent} id={kpi.id} height={32} /></div></div><div className="flex items-baseline gap-1.5"><span
          className="t-display tabular"
          style={{ fontSize: 26, letterSpacing: "-.01em", color: kpi.accent }}>{mn(kpi.value)}</span><span
          className="text-[12.5px] font-semibold text-muted-foreground">{kpi.unit}</span></div><DeltaBadge value={kpi.delta} label={kpi.deltaLabel} invert={kpi.invert} /></div>
  );
}

/* ───────────────────────────────────────────────
   5단계 처리 스텝퍼
─────────────────────────────────────────────── */
function StepBadge({ stepIndex }) {
  return (
    <div className="inline-flex items-center gap-[3px]">{STEPS.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        const future = i > stepIndex;
        return (
          <div key={i} className="inline-flex flex-col items-center gap-[2px]"><div
              style={{
                width: i === stepIndex ? 20 : 14,
                height: 5,
                borderRadius: 3,
                background: active
                  ? "var(--primary)"
                  : done
                  ? "color-mix(in srgb,var(--primary) 40%,transparent)"
                  : "var(--border)",
                transition: "width .2s",
              }} />{active && <span
              className="text-[9.5px] font-bold whitespace-nowrap text-primary"
              style={{ lineHeight: 1 }}>{s}</span>}</div>
        );
      })}<span
        className="ml-1 text-[11px] font-semibold"
        style={{ color: stepIndex === 4 ? "var(--success)" : "var(--muted-foreground)" }}>{STEPS[stepIndex]}</span></div>
  );
}

/* ───────────────────────────────────────────────
   메인 Risk 페이지
─────────────────────────────────────────────── */
/* ───────────────────────────────────────────────
   AG Grid — 조기경보 목록 컬럼 정의 (수제 <table> 본체 대체)
   행선택 회색은 공유 테마(--row-selected)가 칠한다(인라인 선택색 제거).
─────────────────────────────────────────────── */
const vCenter = { display: "flex", alignItems: "center" } as const;

function GpCell(p: ICellRendererParams) {
  const r = p.data; if (!r) return null;
  return (
    <div className="flex items-center gap-2.5">
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-[8px] text-white text-[11px] font-bold shrink-0" style={{ background: r.gpColor }}><MT>{r.gpCode}</MT></span>
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-foreground"><MT>{r.gp}</MT></div>
        <div className="t-caption text-[11px]"><MT>{r.id}</MT></div>
      </div>
    </div>
  );
}
function TypeCell(p: ICellRendererParams) {
  const r = p.data; if (!r) return null;
  return (
    <div className="min-w-0">
      <div className="text-[13px] font-semibold text-foreground"><MT>{r.type}</MT></div>
      <div className="t-caption text-[11px] mt-0.5 truncate"><MT>{r.desc}</MT></div>
    </div>
  );
}
function ManagerCell(p: ICellRendererParams) {
  const r = p.data; if (!r) return null;
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold shrink-0 bg-muted-foreground"><MT>{r.manager[0]}</MT></span>
      <span className="text-[13px] font-medium text-foreground"><MT>{r.manager}</MT></span>
    </div>
  );
}

const ALERT_COLS: ColDef[] = [
  { headerName: "운용사", field: "gp", flex: 1.6, minWidth: 180, cellStyle: vCenter, cellRenderer: GpCell },
  { headerName: "경보 유형", field: "type", flex: 2, minWidth: 190, cellStyle: vCenter, cellRenderer: TypeCell },
  { headerName: "등급", field: "grade", width: 96, cellStyle: vCenter, cellRenderer: (p: ICellRendererParams) => <StatusBadge tone={p.data.gradeTone} label={p.data.grade} size="md" /> },
  { headerName: "발생일", field: "date", width: 120, cellStyle: { ...vCenter, fontVariantNumeric: "tabular-nums", color: "var(--muted-foreground)", fontSize: 13 }, valueFormatter: (p: any) => mn(p.value) },
  { headerName: "처리 상태", field: "step", flex: 1.2, minWidth: 200, cellStyle: vCenter, cellRenderer: (p: ICellRendererParams) => <StepBadge stepIndex={p.data.step} /> },
  { headerName: "담당자", field: "manager", width: 132, cellStyle: vCenter, cellRenderer: ManagerCell },
  {
    headerName: "", colId: "action", width: 120, sortable: false, resizable: false, type: "rightAligned",
    cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" },
    cellRenderer: () => <Button variant="outline" size="sm" leadingIcon="external" onClick={(e: any) => e.stopPropagation()}>상세보기</Button>,
  },
];

function Risk({ onNav }) {
  const [period, setPeriod] = useState("월간");
  const [activeTypes, setActiveTypes] = useState({});
  const [selectedRow, setSelectedRow] = useState(null);

  const toggleType = (id) =>
    setActiveTypes((prev) => ({ ...prev, [id]: !prev[id] }));

  const anyTypeActive = Object.values(activeTypes).some(Boolean);

  const filteredAlerts = useMemo(() => {
    if (!anyTypeActive) return ALERTS;
    return ALERTS.filter((a) => activeTypes[a.type]);
  }, [activeTypes, anyTypeActive]);

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "조기경보", "리스크 모니터링"]}
        title="조기경보 리스크 관리"
        sub="운용사 리스크 지수 추이 · 조기경보 발생 현황 · 5단계 처리 — 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">내보내기</Button></>} /><div className="flex items-center gap-3 flex-wrap mb-4 px-0.5"><span className="t-label text-[12.5px]">기간</span><SegTabs
          options={[
            { value: "주간", label: "주간" },
            { value: "월간", label: "월간" },
            { value: "분기별", label: "분기별" },
          ]}
          value={period}
          onChange={setPeriod}
          size="sm" /><div className="h-5 bg-border" style={{ width: 1 }} /><span className="t-label text-[12.5px]">유형</span>{TYPES.map((t) =>
          <FilterChip
            key={t.id}
            active={!!activeTypes[t.id]}
            onClick={() => toggleType(t.id)}
            dot={activeTypes[t.id] ? "var(--primary)" : undefined}>{t.label}</FilterChip>)}{anyTypeActive && <button
          onClick={() => setActiveTypes({})}
          className="text-[12px] font-semibold cursor-pointer text-muted-foreground p-0"
          style={{ background: "none", border: "none" }}>필터 초기화</button>}</div><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">{KPI_RISK.map((kpi) => <RiskKpiCard key={kpi.id} kpi={kpi} />)}</div><ChartCard
        title="리스크 지수 추이"
        sub="월별 리스크 지수 · 임계선 60 초과 시 즉시 대응"
        icon="trending"
        accent="var(--danger)"
        right={<div className="flex items-center gap-2"><span
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-danger"><span
              className="inline-block h-0.5"
              style={{
                width: 18,
                borderTop: "2px dashed var(--danger)",
                borderRadius: 2,
              }} />임계선 60</span><IconBtn icon="more" label="더보기" size={34} /></div>}><LineTrend
          data={D.RISK_TREND}
          threshold={D.RISK_THRESHOLD}
          height={220}
          color="var(--danger)" /></ChartCard><div
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mt-4 mb-4"><div
          className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 pt-5 pb-4 border-b border-border"><div className="flex items-center gap-2.5"><ColorChip icon="shield-alert" color="var(--danger)" size={34} iconSize={18} /><div><div className="t-cardtitle">조기경보 목록</div><div className="t-caption mt-px"><span className="text-danger font-bold">{mn(filteredAlerts.length + "건")}</span>표시 중 (전체 {mn(ALERTS.length)}건)</div></div></div><div className="flex items-center gap-2"><StatusBadge
              tone="danger"
              label={"경고 " + mn(ALERTS.filter((a) => a.gradeTone === "danger").length) + "건"} /><StatusBadge
              tone="warning"
              label={"주의 " + mn(ALERTS.filter((a) => a.gradeTone === "warning").length) + "건"} /><IconBtn icon="refresh" label="새로고침" size={34} /><IconBtn icon="download" label="내보내기" size={34} /></div></div><div className="overflow-x-auto"><AgGridReact
              theme={apfsTheme}
              rowData={filteredAlerts}
              columnDefs={ALERT_COLS}
              getRowId={(p) => p.data.id}
              domLayout="autoHeight"
              rowHeight={56}
              defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
              rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
              onRowClicked={(e: RowClickedEvent) => setSelectedRow(e.data?.id ?? null)}
              overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">선택한 유형의 경보가 없습니다</span>'}
            /><div
            className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-3.5 border-t border-border"><span className="t-caption">총 <b className="text-foreground">{mn(ALERTS.length + "건")}</b>중 {mn(filteredAlerts.length + "건 표시")}</span><div className="flex items-center gap-1.5"><IconBtn icon="chevron-left" label="이전" size={32} /><span
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-bold text-primary"
                style={{ background: "color-mix(in srgb,var(--primary) 12%,transparent)" }}>1</span><IconBtn icon="chevron-right" label="다음" size={32} /></div></div></div></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4"><ChartCard
          title="운용사 상태 분포"
          sub="전체 237개 운용사 · 자펀드 기준"
          icon="pie-chart"
          accent="var(--primary)"
          right={<IconBtn icon="more" label="더보기" size={34} />}
          footer={<div className="flex items-center gap-5 flex-wrap">{D.STATUS_DONUT.map((d) =>
              <div key={d.key} className="flex items-center gap-1.5"><span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ background: d.color }} /><span className="t-caption text-[12px]"><MT>{d.name}</MT></span><span className="text-[13px] font-bold tabular" style={{ color: d.color }}>{mn(d.value)}</span></div>)}</div>}><Donut data={D.STATUS_DONUT} height={220} /></ChartCard><ChartCard
          title="운용사별 조기경보 현황"
          sub="경보 건수 상위 5개 운용사"
          icon="building"
          accent="var(--warning)"
          right={<div className="flex items-center gap-1"><StatusBadge tone="warning" label="이번 달" size="sm" /><IconBtn icon="more" label="더보기" size={34} /></div>}><HBars data={GP_BARS} height={220} /></ChartCard></div></div>
  ); // end root div
}

export { Risk };
