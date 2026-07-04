/* 회계·자금 마감 페이지 — FR-5.10 / FR-5.11
   APFS 인디고/블루 토큰 + Tailwind 유틸리티. JSX (Vite). */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ICellRendererParams } from 'ag-grid-community';
import { apfsTheme, numFmt } from './aggrid_theme';   // 공유 테마(회색 행선택)·포매터 SSOT
import './aggrid_shared.css';                          // floating-row opacity 보정 등 공유 보정 CSS

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, Card, ChartCard,
  SegTabs, FilterChip, Button, IconBtn, EmptyState, toneVar,
} = UI;
const { ComposedBars } = Charts;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ================================================================
 * 로컬 더미 데이터
 * ================================================================ */

const VOUCHERS = [
  { no: "JE-2026-0601", date: "2026-06-01", account: "운용보수 지급", debit: 48200000, credit: 0,       author: "김재현", status: "승인완료" },
  { no: "JE-2026-0602", date: "2026-06-02", account: "자금이체 수수료", debit: 0,        credit: 320000, author: "이미나", status: "승인대기" },
  { no: "JE-2026-0603", date: "2026-06-05", account: "투자평가손실",   debit: 12400000, credit: 0,       author: "박정수", status: "승인대기" },
  { no: "JE-2026-0604", date: "2026-06-10", account: "배당금 수익",     debit: 0,        credit: 8760000, author: "이미나", status: "반려" },
  { no: "JE-2026-0605", date: "2026-06-12", account: "임차료",          debit: 5500000,  credit: 0,       author: "한소영", status: "승인완료" },
  { no: "JE-2026-0606", date: "2026-06-14", account: "자산처분이익",    debit: 0,        credit: 3200000, author: "김재현", status: "승인대기" },
];

const PENDING = [
  { no: "PE-2026-0101", desc: "조합 출자금 정산 미완료",   amount: 152000000, created: "2026-05-20", manager: "이미나", due: "2026-06-10", overdue: true  },
  { no: "PE-2026-0102", desc: "운용보수 환입 처리 대기",   amount:   8700000, created: "2026-06-01", manager: "김재현", due: "2026-06-20", overdue: false },
  { no: "PE-2026-0103", desc: "국세청 원천징수 납부 확인", amount:   3420000, created: "2026-06-03", manager: "박정수", due: "2026-06-30", overdue: false },
  { no: "PE-2026-0104", desc: "자펀드 분배금 오류 정정",   amount:  62800000, created: "2026-05-28", manager: "한소영", due: "2026-06-08", overdue: true  },
  { no: "PE-2026-0105", desc: "투자기업 대여금 이자 수령",  amount:   1980000, created: "2026-06-11", manager: "이미나", due: "2026-07-05", overdue: false },
];

const NO_EVIDENCE = [
  { no: "JE-2026-0410", txDate: "2026-06-04", amount: 2200000, evType: "세금계산서", reason: "발행 지연 — 공급자 요청" },
  { no: "JE-2026-0428", txDate: "2026-06-07", amount:  480000, evType: "영수증",    reason: "현장결제 미수취" },
  { no: "JE-2026-0431", txDate: "2026-06-10", amount: 6840000, evType: "계약서",    reason: "계약 갱신 협의 중" },
  { no: "JE-2026-0447", txDate: "2026-06-13", amount: 1320000, evType: "세금계산서", reason: "분실 — 재발급 요청" },
];

const AUDIT_LOG = [
  { time: "오늘 14:23", user: "관리자", action: "전표 52건 일괄 승인", tone: "success" },
  { time: "오늘 11:05", user: "이미나",  action: "전표 3건 반려 처리",  tone: "warning" },
  { time: "어제 17:40", user: "시스템", action: "일자별 자동마감 완료", tone: "info"    },
  { time: "어제 09:15", user: "김재현", action: "미결계정 해소 5건",    tone: "success" },
  { time: "6/13",       user: "시스템", action: "월초 잔액 이월 처리 완료", tone: "info" },
];

/* ================================================================
 * 캘린더 이벤트 매핑 (D.SCHEDULE → date key)
 * ================================================================ */
function buildCalMap(schedule) {
  const map = {};
  schedule.forEach((s) => {
    const k = s.date;
    if (!map[k]) map[k] = [];
    map[k].push(s);
  });
  return map;
}

/* ================================================================
 * KPI 미니카드
 * ================================================================ */
function KpiCard({ icon, label, value, unit, tone, delta, deltaLabel }: { icon?: string; label?: React.ReactNode; value?: React.ReactNode; unit?: string; tone?: string; delta?: number | null; deltaLabel?: React.ReactNode }) {
  const [color] = toneVar(tone);
  return (
    <div
      className="rounded-card border border-border bg-card px-4 py-3 shadow-sm flex items-center gap-3"><ColorChip icon={icon} color={color} size={38} iconSize={20} /><div className="flex-1 min-w-0"><div className="t-caption text-[12px]"><MT>{label}</MT></div><div className="flex items-baseline gap-1.5 mt-0.5"><span className="text-[22px] font-bold tabular leading-none" style={{ color }}>{mn(value)}</span><span className="text-[12px] text-caption">{unit}</span></div>{delta != null && <div className="mt-1"><DeltaBadge
            value={delta}
            label={deltaLabel}
            invert={tone === "warning" || tone === "danger"} /></div>}</div></div>
  );
}

/* ================================================================
 * 6월 캘린더
 * ================================================================ */
function CalendarView({ calMap }) {
  const TODAY = "2026-06-15";
  const YEAR = 2026, MONTH = 5; // JS: month 0-indexed (5 = June)
  const firstDow = new Date(YEAR, MONTH, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate(); // 30

  const DAYS_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
  // D-7 이내: 오늘(6/15) + 7일 = 6/22
  const todayDate = 15;
  const dPlus7 = 22;

  const cells = [];
  // leading blanks
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  // pad trailing
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  function dateKey(d) {
    return `2026-06-${String(d).padStart(2, "0")}`;
  }

  function DotRow({ events }) {
    return (
      <div className="flex flex-wrap gap-[3px] mt-[3px]"><span className="sr-only">일정 있음</span>{events.slice(0, 3).map((e, i) =>
          <span
            key={i}
            title={e.title}
            aria-hidden={true}
            className="shrink-0"
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: e.tone === "danger" ? "var(--danger)" : e.tone === "warning" ? "var(--warning)" : "var(--info)",
            }} />)}</div>
    );
  }

  return (
    <div className="select-none"><div
        className="grid gap-0.5 mb-1"
        style={{ gridTemplateColumns: "repeat(7,1fr)" }}>{DAYS_LABEL.map((dl) =>
          <div
            key={dl}
            className="text-center t-caption text-[11px] font-bold pb-1"
            style={{ color: dl === "일" ? "var(--danger)" : dl === "토" ? "var(--accent)" : "var(--muted-foreground)" }}>{dl}</div>)}</div><div className="flex flex-col gap-0.5">{weeks.map((week, wi) =>
          <div
            key={wi}
            className="grid gap-0.5"
            style={{ gridTemplateColumns: "repeat(7,1fr)" }}>{week.map((d, di) => {
              const isToday = d === todayDate;
              const inD7 = d !== null && d > todayDate && d <= dPlus7;
              const events = d ? (calMap[dateKey(d)] || []) : [];
              const colIndex = di; // 0=Sun, 6=Sat
              return (
                <div
                  key={di}
                  className={cx(
                    "rounded-[8px] p-1.5 min-h-[52px] flex flex-col",
                    d === null && "opacity-0 pointer-events-none",
                    isToday && "ring-2 ring-primary",
                    inD7 && !isToday && "bg-muted",
                  )}
                  style={isToday ? { background: "color-mix(in srgb,var(--primary) 10%,transparent)" } : undefined}>{d !== null && <><span
                      className={cx(
                        "text-[12px] font-bold leading-none self-start",
                        isToday ? "text-primary" : colIndex === 0 ? "" : colIndex === 6 ? "" : "",
                      )}
                      style={{
                        color: isToday ? "var(--primary)"
                          : colIndex === 0 ? "var(--danger)"
                          : colIndex === 6 ? "var(--accent)"
                          : undefined,
                      }}>{d}</span>{events.length > 0 && <DotRow events={events} />}</>}</div>
              );
            })}</div>)}</div></div>
  );
}

/* ================================================================
 * 전표 관리 테이블들
 * ================================================================ */
const STATUS_TONE = { 승인완료: "success", 승인대기: "warning", 반려: "danger" };

/* ── AG Grid 컬럼 정의 (수제 <table> → AgGridReact 전환) ──
   "축은 두고 데이터는 가린다": 헤더·StatusBadge는 비마스킹.
   텍스트(전표번호·계정·담당자·사유 등)=cellRenderer+<MT>, 날짜=valueFormatter+mn(),
   금액=우측정렬 숫자(numFmt: mn 내장 / 차·대변은 0을 '—'로). 초과/연체 행 강조는 모듈상수 getRowStyle. */
const dateFmt = (p: { value: any }) => (p.value ? mn(p.value) : "");
const amtDashFmt = (p: { value: any }) => (p.value ? mn(p.value.toLocaleString()) : "—");
const cellMid = { display: "flex", alignItems: "center" } as const;
const cellRight = { display: "flex", alignItems: "center", justifyContent: "flex-end", fontVariantNumeric: "tabular-nums" } as const;

type VoucherRow = (typeof VOUCHERS)[number];
const voucherColumns: ColDef<VoucherRow>[] = [
  { field: "no", headerName: "전표번호", flex: 1.1, minWidth: 132, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<VoucherRow>) => <span className="font-mono text-[12px]"><MT>{p.value}</MT></span> },
  { field: "date", headerName: "일자", flex: 0.9, minWidth: 104, valueFormatter: dateFmt,
    cellStyle: { ...cellMid, color: "var(--muted-foreground)" } },
  { field: "account", headerName: "계정과목", flex: 1.2, minWidth: 128, cellStyle: { ...cellMid, fontWeight: 600 },
    cellRenderer: (p: ICellRendererParams<VoucherRow>) => <MT>{p.value}</MT> },
  { field: "debit", headerName: "차변(원)", flex: 1, minWidth: 110, type: "rightAligned", valueFormatter: amtDashFmt, cellStyle: cellRight },
  { field: "credit", headerName: "대변(원)", flex: 1, minWidth: 110, type: "rightAligned", valueFormatter: amtDashFmt, cellStyle: cellRight },
  { field: "author", headerName: "작성자", flex: 0.8, minWidth: 90, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<VoucherRow>) => <MT>{p.value}</MT> },
  { field: "status", headerName: "상태", flex: 0.8, minWidth: 96, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<VoucherRow>) => <StatusBadge tone={STATUS_TONE[p.value] || "info"} label={p.value} size="sm" /> },
  { headerName: "액션", colId: "action", flex: 1, minWidth: 128, sortable: false, resizable: false, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<VoucherRow>) =>
      p.data?.status === "승인대기"
        ? <div className="flex gap-1.5"><Button variant="primary" size="sm" onClick={() => {}}>승인</Button><Button variant="outline" size="sm" onClick={() => {}}>반려</Button></div>
        : null },
];

type PendingRow = (typeof PENDING)[number];
const pendingColumns: ColDef<PendingRow>[] = [
  { field: "no", headerName: "전표번호", flex: 1, minWidth: 132, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<PendingRow>) => <span className="font-mono text-[12px]"><MT>{p.value}</MT></span> },
  { field: "desc", headerName: "미결내용", flex: 1.7, minWidth: 180, cellStyle: { ...cellMid, fontWeight: 600 },
    cellRenderer: (p: ICellRendererParams<PendingRow>) => <MT>{p.value}</MT> },
  { field: "amount", headerName: "금액(원)", flex: 1, minWidth: 120, type: "rightAligned", valueFormatter: numFmt, cellStyle: cellRight },
  { field: "created", headerName: "생성일", flex: 0.9, minWidth: 104, valueFormatter: dateFmt,
    cellStyle: { ...cellMid, color: "var(--muted-foreground)" } },
  { field: "manager", headerName: "담당자", flex: 0.8, minWidth: 90, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<PendingRow>) => <MT>{p.value}</MT> },
  { field: "due", headerName: "처리기한", flex: 1.1, minWidth: 130, cellStyle: { ...cellMid, gap: 8 },
    cellRenderer: (p: ICellRendererParams<PendingRow>) => (
      <>
        <span style={{ color: p.data?.overdue ? "var(--danger)" : "var(--foreground)", fontWeight: p.data?.overdue ? 700 : 400 }}>{mn(p.value)}</span>
        {p.data?.overdue && <StatusBadge tone="danger" label="기한초과" size="sm" />}
      </>
    ) },
];
const pendingRowStyle = (p: { data?: PendingRow }) =>
  p.data?.overdue ? { background: "color-mix(in srgb,var(--danger) 5%,transparent)" } : undefined;

const EV_ICON: Record<string, string> = { 세금계산서: "file-text", 영수증: "receipt", 계약서: "scroll" };
type EvidenceRow = (typeof NO_EVIDENCE)[number];
const evidenceColumns: ColDef<EvidenceRow>[] = [
  { field: "no", headerName: "전표번호", flex: 1, minWidth: 132, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<EvidenceRow>) => <span className="font-mono text-[12px]"><MT>{p.value}</MT></span> },
  { field: "txDate", headerName: "거래일", flex: 0.9, minWidth: 104, valueFormatter: dateFmt,
    cellStyle: { ...cellMid, color: "var(--muted-foreground)" } },
  { field: "amount", headerName: "금액(원)", flex: 1, minWidth: 120, type: "rightAligned", valueFormatter: numFmt, cellStyle: cellRight },
  { field: "evType", headerName: "증빙유형", flex: 1, minWidth: 120, cellStyle: cellMid,
    cellRenderer: (p: ICellRendererParams<EvidenceRow>) => (
      <div className="flex items-center gap-1.5">
        <Icon name={EV_ICON[p.value] || "file"} size={14} className="text-warning" />
        <span className="font-semibold"><MT>{p.value}</MT></span>
      </div>
    ) },
  { field: "reason", headerName: "미첨부 사유", flex: 1.7, minWidth: 180, cellStyle: { ...cellMid, color: "var(--muted-foreground)" },
    cellRenderer: (p: ICellRendererParams<EvidenceRow>) => <MT>{p.value}</MT> },
];

function VoucherTable() {
  return (
    <div>
      <AgGridReact<VoucherRow>
        theme={apfsTheme}
        rowData={VOUCHERS}
        columnDefs={voucherColumns}
        domLayout="autoHeight"
        rowHeight={46}
        defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} />
    </div>
  );
}

function PendingTable() {
  return (
    <div>
      <AgGridReact<PendingRow>
        theme={apfsTheme}
        rowData={PENDING}
        columnDefs={pendingColumns}
        getRowStyle={pendingRowStyle}
        domLayout="autoHeight"
        rowHeight={46}
        defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} />
    </div>
  );
}

function EvidenceTable() {
  return (
    <div>
      <AgGridReact<EvidenceRow>
        theme={apfsTheme}
        rowData={NO_EVIDENCE}
        columnDefs={evidenceColumns}
        domLayout="autoHeight"
        rowHeight={46}
        defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} />
    </div>
  );
}

/* ================================================================
 * 재무요약 카드
 * ================================================================ */
function FinanceRow({ label, value, tone }: { label?: React.ReactNode; value?: React.ReactNode; tone?: string }) {
  const [color] = tone ? toneVar(tone) : ["var(--foreground)"];
  return (
    <div
      className="flex items-center justify-between py-2 border-b border-border last:border-0"><span className="t-caption text-[13px]"><MT>{label}</MT></span><span className="text-[14px] font-bold tabular" style={{ color }}>{mn(value)}</span></div>
  );
}

function BsCard() {
  return (
    <div
      className="rounded-card border border-border bg-card px-4 py-4 shadow-sm flex-1"><div className="flex items-center gap-2 mb-3"><ColorChip icon="landmark" color="var(--accent)" size={30} iconSize={16} /><span className="text-[14px] font-bold">재무상태표 요약</span></div><FinanceRow label="자산 총계" value="2조 3,840억원" /><FinanceRow label="부채 총계" value="800억원" tone="danger" /><FinanceRow label="자본 총계" value="2조 3,040억원" tone="success" /><div
        className="mt-3 rounded-[8px] px-3 py-2"
        style={{ background: "color-mix(in srgb,var(--success) 10%,transparent)" }}><span className="text-[12px] font-bold text-success">{mn("부채비율 3.5% — 안정적")}</span></div></div>
  );
}

function PlCard() {
  return (
    <div
      className="rounded-card border border-border bg-card px-4 py-4 shadow-sm flex-1"><div className="flex items-center gap-2 mb-3"><ColorChip icon="trending" color="var(--primary)" size={30} iconSize={16} /><span className="text-[14px] font-bold">손익계산서 요약</span></div><FinanceRow label="총 수익" value="240억원" tone="success" /><FinanceRow label="총 비용" value="180억원" tone="danger" /><FinanceRow label="당기순이익" value="60억원" tone="primary" /><div
        className="mt-3 rounded-[8px] px-3 py-2"
        style={{ background: "color-mix(in srgb,var(--primary) 10%,transparent)" }}><span className="text-[12px] font-bold text-primary">{mn("순이익률 25.0%")}</span></div></div>
  );
}

/* ================================================================
 * 감사로그 타임라인
 * ================================================================ */
function AuditTimeline() {
  return (
    <div className="flex flex-col gap-0">{AUDIT_LOG.map((item, i) => {
        const [color, soft] = toneVar(item.tone);
        const iconName = item.tone === "success" ? "check-circle"
          : item.tone === "warning" ? "alert-triangle"
          : "info";
        return (
          <div key={i} className="flex gap-3 pb-4 relative">{// Vertical line
            i < AUDIT_LOG.length - 1 && <div
              className="absolute left-[15px] top-[28px] bottom-0 w-[2px] bg-border" />}<span
              className="shrink-0 inline-flex items-center justify-center rounded-full z-10"
              style={{ width: 30, height: 30, background: soft, color, border: `1.5px solid ${color}` }}><Icon name={iconName} size={15} stroke={2} /></span><div className="flex-1 pt-0.5"><div className="flex items-center justify-between gap-2 flex-wrap"><span className="text-[13px] font-semibold"><MT>{item.user}</MT></span><span className="t-caption text-[11.5px] whitespace-nowrap">{mn(item.time)}</span></div><span className="text-[12.5px] text-caption"><MT>{item.action}</MT></span></div></div>
        );
      })}</div>
  );
}

/* ================================================================
 * 메인 Accounting 컴포넌트
 * ================================================================ */
function Accounting({ onNav }) {
  const [voucherTab, setVoucherTab] = useState("general");
  const calMap = useMemo(() => buildCalMap(D.SCHEDULE), []);

  const TAB_OPTIONS = [
    { value: "general",  label: "일반전표" },
    { value: "pending",  label: "미결계정" },
    { value: "evidence", label: "증빙미첨부" },
  ];

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "회계 관리", "회계·자금 마감"]}
        title="회계·자금 마감"
        sub="전표 승인·미결계정 관리·자금수지 현황 — 2026-06-15 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">내보내기</Button></>} /><div
        style={{ gridTemplateColumns: "repeat(4,1fr)" }}
        className="overflow-x-auto grid gap-3 mb-4"><KpiCard
          icon="file"
          label="미결 전표"
          value="23"
          unit="건"
          tone="danger"
          delta={+5}
          deltaLabel="전일 대비" /><KpiCard
          icon="file-text"
          label="증빙 미첨부"
          value="8"
          unit="건"
          tone="warning"
          delta={+2}
          deltaLabel="전일 대비" /><KpiCard
          icon="check-circle"
          label="일마감 완료율"
          value="91.3"
          unit="%"
          tone="success"
          delta={null} /><KpiCard
          icon="wallet"
          label="금월 자금집행"
          value="824"
          unit="억원"
          tone="info"
          delta={null} /></div><div
        className="grid gap-4 mb-4"
        style={{ gridTemplateColumns: "1.4fr 0.6fr" }}><div
          className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
            className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border"><div className="flex items-center gap-2.5"><ColorChip icon="calendar" color="var(--primary)" size={32} iconSize={17} /><div><div className="text-[16px] font-bold">6월 마감 캘린더</div><div className="t-caption text-[12px]">2026년 6월 — 마감·보고·실사 일정</div></div></div><div className="flex items-center gap-2"><div className="flex items-center gap-1.5"><span
                  className="inline-block w-2.5 h-2.5 rounded-full bg-danger" /><span className="t-caption text-[11px]">마감</span></div><div className="flex items-center gap-1.5"><span
                  className="inline-block w-2.5 h-2.5 rounded-full bg-warning" /><span className="t-caption text-[11px]">경고</span></div><div className="flex items-center gap-1.5"><span
                  className="inline-block w-2.5 h-2.5 rounded-full bg-info" /><span className="t-caption text-[11px]">정보</span></div></div></div><div className="px-5 py-4"><CalendarView calMap={calMap} /></div></div><div className="flex flex-col gap-3"><BsCard /><PlCard /></div></div><div
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden mb-4"><div className="flex items-center justify-between px-5 pt-5 pb-3"><div className="flex items-center gap-2.5"><ColorChip icon="file-text" color="var(--accent)" size={32} iconSize={17} /><span className="text-[16px] font-bold">전표 관리</span></div><SegTabs
            options={TAB_OPTIONS}
            value={voucherTab}
            onChange={setVoucherTab}
            size="sm" /></div><div className="border-t border-border px-1 py-1">{voucherTab === "general"  && <VoucherTable />}{voucherTab === "pending"  && <PendingTable />}{voucherTab === "evidence" && <EvidenceTable />}</div></div><div
        className="grid gap-4 mb-4"
        style={{ gridTemplateColumns: "1fr 1fr" }}><ChartCard
          title="분기별 자금수지 현황"
          sub="계획 vs 실적 (억원) + 집행률(%)"
          icon="wallet"
          accent="var(--primary)"
          minH={260}><ComposedBars
            data={D.EXEC_Q}
            height={220}
            planColor="var(--muted)"
            actualColor="var(--primary)"
            ariaLabel="분기별 자금수지 (계획 대비 실적) 막대 차트" /></ChartCard><div
          className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
            className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border"><div className="flex items-center gap-2.5"><ColorChip icon="shield-check" color="var(--info)" size={32} iconSize={17} /><div><div className="text-[16px] font-bold">감사 로그</div><div className="t-caption text-[12px]">최근 주요 처리 이력 (역순)</div></div></div><Button variant="ghost" size="sm" trailingIcon="chevron-right">전체 보기</Button></div><div className="px-5 py-4"><AuditTimeline /></div></div></div></div>
  );
}

export { Accounting };
