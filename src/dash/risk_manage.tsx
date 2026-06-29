/* 조기경보 관리 페이지 — FR-5.6 운영 콘솔
   조기경보 처리 워크리스트 · 5단계 처리 상태 · 배정/소명/조치/종결 액션.
   ('조기경보' 대분류=risk 모니터링 대시보드와 분리된 처리(운영) 화면) */
import React from 'react';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { mn, MT } from './mask';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams, RowClickedEvent } from 'ag-grid-community';
import { apfsTheme } from './aggrid_theme';   // 공유 테마(회색 행선택) SSOT
import './aggrid_shared.css';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState,
} = UI;
const { Sparkline, HBars } = Charts;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* 기준일 2026-06-16 (Risk 페이지와 동일 기준) */

/* ───────────────────────────────────────────────
   KPI — 처리 관점 지표
─────────────────────────────────────────────── */
const KPI_MANAGE = [
  { id: "wait",  label: "처리 대기",        value: 4, unit: "건", icon: "inbox",          accent: "var(--danger)",  delta: +1, deltaLabel: "전주 대비", invert: true,  trend: [2, 3, 2, 4, 3, 5, 4, 4] },
  { id: "doing", label: "처리 중",          value: 6, unit: "건", icon: "activity",       accent: "var(--warning)", delta: -1, deltaLabel: "전주 대비", invert: true,  trend: [8, 7, 7, 6, 7, 6, 5, 6] },
  { id: "expl",  label: "소명 요청",        value: 3, unit: "건", icon: "file-check",     accent: "var(--info)",    delta: 0,  deltaLabel: "전주 대비", invert: false, trend: [2, 2, 3, 2, 3, 3, 2, 3] },
  { id: "due",   label: "기한 임박 (D-3↓)", value: 2, unit: "건", icon: "alert-triangle", accent: "var(--danger)",  delta: +1, deltaLabel: "전주 대비", invert: true,  trend: [0, 1, 1, 2, 1, 2, 3, 2] },
];

/* 처리 상태 도메인 (라이프사이클) */
const STATUS_DOMAIN = [
  { key: "처리대기", tone: "danger" },
  { key: "처리중",   tone: "warning" },
  { key: "소명요청", tone: "info" },
  { key: "종결",     tone: "success" },
] as const;
const statusToneOf = (s: string) => STATUS_DOMAIN.find((d) => d.key === s)?.tone ?? "info";

/* 상태별 1차 액션 라벨 */
const PRIMARY_ACTION: Record<string, string> = {
  처리대기: "배정",
  처리중: "조치 등록",
  소명요청: "소명 확인",
  종결: "상세보기",
};

/* 처리 워크리스트 */
const WORKITEMS = [
  { id: "AL-001", gp: "그린루트벤처스",   gpCode: "GR", gpColor: "var(--chart-1)", type: "신용등급하락", grade: "경고", gradeTone: "danger",  received: "2026-06-14", due: "2026-06-17", dday: "D-1",  status: "처리중",   manager: "김민준", desc: "NICE CB 신용등급 B+ → B 하락" },
  { id: "AL-003", gp: "아그리벤처스",     gpCode: "AV", gpColor: "var(--chart-4)", type: "법규위반",     grade: "경고", gradeTone: "danger",  received: "2026-06-08", due: "2026-06-16", dday: "D-0",  status: "처리대기", manager: "박지호", desc: "자본시장법 의무보고 미제출" },
  { id: "AL-006", gp: "바이오팜캐피탈",   gpCode: "BP", gpColor: "var(--chart-2)", type: "신용등급하락", grade: "경고", gradeTone: "danger",  received: "2026-06-03", due: "2026-06-15", dday: "지연", status: "처리대기", manager: "정하늘", desc: "한국신용평가 등급 BB → BB- 하락" },
  { id: "AL-002", gp: "코어밸류파트너스", gpCode: "CV", gpColor: "var(--chart-3)", type: "재무지표악화", grade: "주의", gradeTone: "warning", received: "2026-06-10", due: "2026-06-18", dday: "D-2",  status: "소명요청", manager: "이서연", desc: "부채비율 전기 대비 28%p 증가" },
  { id: "AL-004", gp: "푸드인베스트",     gpCode: "FI", gpColor: "var(--chart-5)", type: "운용인력변동", grade: "주의", gradeTone: "warning", received: "2026-06-07", due: "2026-06-20", dday: "D-4",  status: "처리중",   manager: "최유진", desc: "대표 GP 교체 신고 접수" },
  { id: "AL-009", gp: "그린루트벤처스",   gpCode: "GR", gpColor: "var(--chart-1)", type: "재무지표악화", grade: "주의", gradeTone: "warning", received: "2026-06-06", due: "2026-06-19", dday: "D-3",  status: "소명요청", manager: "김민준", desc: "영업현금흐름 2분기 연속 음수" },
  { id: "AL-005", gp: "그린루트벤처스",   gpCode: "GR", gpColor: "var(--chart-1)", type: "재무지표악화", grade: "주의", gradeTone: "warning", received: "2026-06-05", due: "2026-06-12", dday: "완료", status: "종결",     manager: "김민준", desc: "자기자본 20% 이상 감소 감지" },
  { id: "AL-007", gp: "아그리벤처스",     gpCode: "AV", gpColor: "var(--chart-4)", type: "운용인력변동", grade: "주의", gradeTone: "warning", received: "2026-05-30", due: "2026-06-08", dday: "완료", status: "종결",     manager: "박지호", desc: "운용역 2인 동시 이직 보고" },
  { id: "AL-008", gp: "코어밸류파트너스", gpCode: "CV", gpColor: "var(--chart-3)", type: "법규위반",     grade: "경고", gradeTone: "danger",  received: "2026-05-28", due: "2026-06-05", dday: "완료", status: "종결",     manager: "이서연", desc: "회계감사 의견 '한정' 수령" },
];

/* 경보 유형 필터 */
const TYPES = [
  { id: "신용등급하락", label: "신용등급 하락" },
  { id: "재무지표악화", label: "재무지표 악화" },
  { id: "법규위반",     label: "법규위반" },
  { id: "운용인력변동", label: "운용인력 변동" },
];

/* 처리 상태 분포 (HBars) */
const STATUS_BARS = [
  { name: "처리대기", value: 4, max: 6, color: "var(--danger)" },
  { name: "처리중",   value: 6, max: 6, color: "var(--warning)" },
  { name: "소명요청", value: 3, max: 6, color: "var(--info)" },
  { name: "종결",     value: 9, max: 9, color: "var(--success)" },
];
/* 담당자별 처리 부하 (HBars) */
const OWNER_BARS = [
  { name: "김민준", value: 5, max: 5, color: "var(--chart-1)" },
  { name: "이서연", value: 4, max: 5, color: "var(--chart-3)" },
  { name: "박지호", value: 3, max: 5, color: "var(--chart-4)" },
  { name: "최유진", value: 2, max: 5, color: "var(--chart-5)" },
  { name: "정하늘", value: 1, max: 5, color: "var(--chart-2)" },
];

/* ───────────────────────────────────────────────
   KPI 미니카드
─────────────────────────────────────────────── */
function KpiCard({ kpi }: { kpi: any }) {
  return (
    <div className="rounded-card border border-border bg-card shadow-sm px-[18px] py-[14px] flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ColorChip icon={kpi.icon} color={kpi.accent} size={32} iconSize={17} />
          <span className="t-label truncate"><MT>{kpi.label}</MT></span>
        </div>
        <div className="shrink-0 w-[70px]"><Sparkline data={kpi.trend} color={kpi.accent} id={kpi.id} height={32} /></div>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="t-display tabular" style={{ fontSize: 26, letterSpacing: "-.01em", color: kpi.accent }}>{mn(kpi.value)}</span>
        <span className="text-[12.5px] font-semibold text-muted-foreground">{kpi.unit}</span>
      </div>
      <DeltaBadge value={kpi.delta} label={kpi.deltaLabel} invert={kpi.invert} />
    </div>
  );
}

/* 처리기한 D-day 배지 — 임박/지연 톤 */
function DueBadge({ dday, date }: { dday: string; date: string }) {
  const overdue = dday === "지연";
  const done = dday === "완료";
  const n = parseInt(String(dday).replace(/[^0-9]/g, ""), 10);
  const color = done
    ? "var(--muted-foreground)"
    : overdue || n <= 0
    ? "var(--danger)"
    : n <= 3
    ? "var(--warning)"
    : "var(--muted-foreground)";
  return (
    <div className="flex flex-col" style={{ lineHeight: 1.2 }}>
      <span className="font-extrabold tabular text-[13px]" style={{ color }}>{done ? "완료" : overdue ? "지연" : mn(dday)}</span>
      <span className="t-caption text-[11px] tabular">{mn(date.slice(5).replace("-", "/"))}</span>
    </div>
  );
}

/* ───────────────────────────────────────────────
   메인 페이지
─────────────────────────────────────────────── */
/* ───────────────────────────────────────────────
   AG Grid — 처리 워크리스트 컬럼 정의 (수제 <table> 본체 대체)
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

const WORK_COLS: ColDef[] = [
  { headerName: "운용사", field: "gp", flex: 1.6, minWidth: 180, cellStyle: vCenter, cellRenderer: GpCell },
  { headerName: "경보 유형", field: "type", flex: 2, minWidth: 190, cellStyle: vCenter, cellRenderer: TypeCell },
  { headerName: "등급", field: "grade", width: 84, cellStyle: vCenter, cellRenderer: (p: ICellRendererParams) => <StatusBadge tone={p.data.gradeTone} label={p.data.grade} size="md" /> },
  { headerName: "접수일", field: "received", width: 112, cellStyle: { ...vCenter, fontVariantNumeric: "tabular-nums", color: "var(--muted-foreground)", fontSize: 13 }, valueFormatter: (p: any) => mn(p.value) },
  { headerName: "처리기한", field: "due", width: 108, cellStyle: vCenter, cellRenderer: (p: ICellRendererParams) => <DueBadge dday={p.data.dday} date={p.data.due} /> },
  { headerName: "처리 상태", field: "status", width: 112, cellStyle: vCenter, cellRenderer: (p: ICellRendererParams) => <StatusBadge tone={statusToneOf(p.data.status)} label={p.data.status} size="md" /> },
  { headerName: "담당자", field: "manager", width: 132, cellStyle: vCenter, cellRenderer: ManagerCell },
  {
    headerName: "", colId: "action", width: 124, sortable: false, resizable: false, type: "rightAligned",
    cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" },
    cellRenderer: (p: ICellRendererParams) => (
      <Button
        variant={p.data.status === "종결" ? "outline" : "primary"}
        size="sm"
        leadingIcon={p.data.status === "종결" ? "external" : "check"}
        onClick={(e: any) => e.stopPropagation()}>{PRIMARY_ACTION[p.data.status]}</Button>
    ),
  },
];

function RiskManage({ onNav }: { onNav: (r: string) => void }) {
  const [tab, setTab] = useState("전체");
  const [activeTypes, setActiveTypes] = useState<Record<string, boolean>>({});
  const [selectedRow, setSelectedRow] = useState<string | null>(null);

  const toggleType = (id: string) => setActiveTypes((p) => ({ ...p, [id]: !p[id] }));
  const anyTypeActive = Object.values(activeTypes).some(Boolean);

  const filtered = useMemo(() => {
    return WORKITEMS.filter((w) => {
      if (tab !== "전체" && w.status !== tab) return false;
      if (anyTypeActive && !activeTypes[w.type]) return false;
      return true;
    });
  }, [tab, activeTypes, anyTypeActive]);

  const countOf = (s: string) => WORKITEMS.filter((w) => w.status === s).length;

  return (
    <div className="max-w-[1320px] mx-auto" style={{ animation: "dashFade .35s var(--ease) both" }}>
      <PageHeader
        crumbs={["홈", "조기경보", "조기경보 관리"]}
        title="조기경보 관리"
        sub="발생한 조기경보의 배정·소명·조치·종결을 처리하는 운영 콘솔 — 2026-06-16 기준"
        actions={<>
          <Button variant="outline" size="sm" leadingIcon="shield-alert" onClick={() => onNav("risk")}>모니터링 대시보드</Button>
          <Button variant="primary" size="sm" leadingIcon="download">내보내기</Button>
        </>} />

      {/* 툴바: 상태 탭 + 유형 필터 */}
      <div className="flex items-center gap-3 flex-wrap mb-4 px-0.5">
        <span className="t-label text-[12.5px]">상태</span>
        <SegTabs
          options={[
            { value: "전체", label: "전체" },
            { value: "처리대기", label: "처리대기" },
            { value: "처리중", label: "처리중" },
            { value: "소명요청", label: "소명요청" },
            { value: "종결", label: "종결" },
          ]}
          value={tab}
          onChange={setTab}
          size="sm" />
        <div className="h-5 bg-border" style={{ width: 1 }} />
        <span className="t-label text-[12.5px]">유형</span>
        {TYPES.map((t) =>
          <FilterChip
            key={t.id}
            active={!!activeTypes[t.id]}
            onClick={() => toggleType(t.id)}
            dot={activeTypes[t.id] ? "var(--primary)" : undefined}>{t.label}</FilterChip>)}
        {anyTypeActive && <button
          onClick={() => setActiveTypes({})}
          className="text-[12px] font-semibold cursor-pointer text-muted-foreground p-0"
          style={{ background: "none", border: "none" }}>필터 초기화</button>}
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {KPI_MANAGE.map((kpi) => <KpiCard key={kpi.id} kpi={kpi} />)}
      </div>

      {/* 처리 워크리스트 */}
      <div className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4">
        <div className="flex items-center justify-between gap-3 flex-wrap px-5 sm:px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <ColorChip icon="inbox" color="var(--primary)" size={34} iconSize={18} />
            <div>
              <div className="t-cardtitle">처리 워크리스트</div>
              <div className="t-caption mt-px"><span className="text-primary font-bold">{mn(filtered.length + "건")}</span> 표시 중 (전체 {mn(WORKITEMS.length)}건)</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge tone="danger"  label={"처리대기 " + mn(countOf("처리대기")) + "건"} />
            <StatusBadge tone="warning" label={"처리중 " + mn(countOf("처리중")) + "건"} />
            <IconBtn icon="refresh" label="새로고침" size={34} />
            <IconBtn icon="download" label="내보내기" size={34} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <AgGridReact
            theme={apfsTheme}
            rowData={filtered}
            columnDefs={WORK_COLS}
            getRowId={(p) => p.data.id}
            domLayout="autoHeight"
            rowHeight={56}
            defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
            rowSelection={{ mode: "singleRow", checkboxes: false, enableClickSelection: true }}
            onRowClicked={(e: RowClickedEvent) => setSelectedRow(e.data?.id ?? null)}
            overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 처리 항목이 없습니다</span>'}
          />

          <div className="flex items-center justify-between gap-4 flex-wrap px-5 sm:px-6 py-3.5 border-t border-border">
            <span className="t-caption">총 <b className="text-foreground">{mn(WORKITEMS.length + "건")}</b> 중 {mn(filtered.length + "건 표시")}</span>
            <div className="flex items-center gap-1.5">
              <IconBtn icon="chevron-left" label="이전" size={32} />
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-[13px] font-bold text-primary" style={{ background: "color-mix(in srgb,var(--primary) 12%,transparent)" }}>1</span>
              <IconBtn icon="chevron-right" label="다음" size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* 하단: 처리 상태 분포 + 담당자별 부하 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="처리 상태 분포"
          sub="라이프사이클 단계별 건수"
          icon="activity"
          accent="var(--primary)"
          right={<IconBtn icon="more" label="더보기" size={34} />}><HBars data={STATUS_BARS} height={200} /></ChartCard>
        <ChartCard
          title="담당자별 처리 부하"
          sub="진행 중 배정 건수 상위"
          icon="users"
          accent="var(--warning)"
          right={<IconBtn icon="more" label="더보기" size={34} />}><HBars data={OWNER_BARS} height={200} /></ChartCard>
      </div>
    </div>
  );
}

export { RiskManage };
