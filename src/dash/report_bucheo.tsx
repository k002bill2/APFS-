/* 부처보고 전용 페이지 — FR-5.8
   APFS 인디고/블루 토큰 + Tailwind 유틸리티. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
import './aggrid_shared.css';
import { apfsTheme } from './aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';

const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, Card, Button, IconBtn, CountPill, toneVar,
} = UI;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */

const MINISTRY_REPORTS = [
  {
    id: "MR01", name: "2분기 운용현황 보고", type: "정기", org: "농식품부",
    date: "2026-06-18", status: "접수", manager: "김재현", action: "접수",
  },
  {
    id: "MR02", name: "투자기업 육성실적 보고", type: "정기", org: "농금원",
    date: "2026-07-10", status: "작성중", manager: "이미나", action: "작성",
  },
  {
    id: "MR03", name: "모태펀드 집행실적 보고", type: "정기", org: "농식품부",
    date: "2026-06-29", status: "승인대기", manager: "김재현", action: "보기",
  },
  {
    id: "MR04", name: "수시보고 — 운용사 조기경보 처리결과", type: "수시", org: "농금원",
    date: "2026-06-12", status: "확정", manager: "박수진", action: "조회",
  },
  {
    id: "MR05", name: "1분기 확정 보고", type: "정기", org: "농식품부",
    date: "2026-04-15", status: "확정(Lock)", manager: "시스템", action: "-",
  },
];

/* ─────────────────────────────────────────────
   헬퍼: 상태 → tone
─────────────────────────────────────────────── */
function reportTone(status: string) {
  if (status === "작성중") return "info";
  if (status === "접수") return "warning";
  if (status === "승인대기") return "warning";
  if (status === "확정") return "success";
  if (status === "확정(Lock)") return "cyan";
  return "info";
}

/* ─────────────────────────────────────────────
   4단계 승인 스텝퍼
─────────────────────────────────────────────── */
const STEPS = ["작성", "접수", "승인", "확정"];

function Stepper({ activeStep }: { activeStep: number }) {
  return (
    <div className="flex items-center gap-0" aria-label="보고 승인 단계">{STEPS.map((label, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        const [color] = toneVar(active ? "primary" : done ? "success" : "info");
        return (
          <React.Fragment key={label}><div className="flex flex-col items-center gap-1" aria-current={active ? "step" : undefined}><div
                className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[12px] font-bold transition-all"
                style={{
                  background: done
                    ? "color-mix(in srgb,var(--success) 15%,transparent)"
                    : active
                      ? "color-mix(in srgb,var(--primary) 15%,transparent)"
                      : "var(--muted)",
                  color: done ? "var(--success)" : active ? "var(--primary)" : "var(--muted-foreground)",
                  border: active ? "2px solid var(--primary)" : done ? "2px solid var(--success)" : "2px solid var(--border)",
                }}>{done
                  ? <Icon name="check" size={14} stroke={2.5} />
                  : <span>{i + 1}</span>}</div><span
                className="text-[11px] font-semibold whitespace-nowrap"
                style={{
                  color: active ? "var(--primary)" : done ? "var(--success)" : "var(--muted-foreground)",
                }}>{label}{done && <span className="sr-only"> 완료</span>}{active && <span className="sr-only"> 현재 단계</span>}</span></div>{i < STEPS.length - 1 && <div
              className="flex-1 h-[2px] mx-2 rounded-full"
              style={{
                minWidth: 32,
                background: done
                  ? "var(--success)"
                  : "var(--border)",
              }} />}</React.Fragment>
        );
      })}</div>
  );
}

/* ─────────────────────────────────────────────
   KPI 카드
─────────────────────────────────────────────── */
function KpiBox({ icon, label, value, sub, tone }: { icon?: string; label?: React.ReactNode; value?: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
  const [c, softBg] = toneVar(tone || "primary");
  return (
    <div
      className="rounded-card border border-border bg-card px-5 py-4 shadow-sm flex items-center gap-4"><div
        className="inline-flex items-center justify-center shrink-0 rounded-[12px]"
        style={{ width: 44, height: 44, background: softBg, color: c }}><Icon name={icon} size={22} stroke={2} /></div><div className="min-w-0 flex-1"><div className="t-label text-[11.5px] mb-0.5"><MT>{label}</MT></div><div
          className="text-[22px] font-extrabold tabular leading-tight text-foreground">{mn(value)}</div>{sub && <div className="t-caption text-[11.5px] mt-0.5"><MT>{sub}</MT></div>}</div></div>
  );
}

/* ─────────────────────────────────────────────
   AG Grid — 보고서 목록 표 (수제 <table> 대체)
   "축은 두고 데이터는 가린다": 헤더·유형 pill·StatusBadge는 비마스킹,
   보고서명·기관·담당자는 <MT>, 보고일은 mn(). 조회전용(선택·페이지네이션 없음).
   액션 버튼은 원본과 동일하게 onClick 없음(시각 동형 유지).
─────────────────────────────────────────────── */
type MinistryRow = typeof MINISTRY_REPORTS[number];

function NameCell(p: any) {
  return <div className="text-[13.5px] font-semibold text-foreground"><MT>{p.value}</MT></div>;
}
function PlainCell(p: any) {
  return <span className="text-[13px] font-semibold text-foreground"><MT>{p.value}</MT></span>;
}
function TypeCell(p: any) {
  const susi = p.value === "수시";
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{
      background: susi ? "color-mix(in srgb,var(--warning) 14%,transparent)" : "color-mix(in srgb,var(--info) 14%,transparent)",
      color: susi ? "var(--warning)" : "var(--info)",
    }}>{p.value}</span>
  );
}
function StatusCell(p: any) {
  const r = p.data as MinistryRow | undefined;
  if (!r) return null;
  return <StatusBadge tone={reportTone(r.status)} label={r.status} size="sm" />;
}
function ActionCell(p: any) {
  const r = p.data as MinistryRow | undefined;
  if (!r) return null;
  return r.action === "-"
    ? <span className="t-caption text-[12px]">—</span>
    : <Button variant={r.action === "작성" ? "primary" : "outline"} size="sm">{r.action}</Button>;
}

const bucheoColumns: ColDef<MinistryRow>[] = [
  { field: "name", headerName: "보고서명", flex: 2, minWidth: 200, cellRenderer: NameCell },
  { field: "type", headerName: "보고유형", flex: 1, minWidth: 96, cellRenderer: TypeCell },
  { field: "org", headerName: "보고기관", flex: 1, minWidth: 96, cellRenderer: PlainCell },
  { field: "date", headerName: "보고일", flex: 1, minWidth: 112,
    valueFormatter: (p) => (p.value == null ? "" : mn(p.value)),
    cellStyle: { color: "var(--muted-foreground)", fontSize: "12.5px", fontVariantNumeric: "tabular-nums" } },
  { field: "status", headerName: "상태", flex: 1, minWidth: 100, cellRenderer: StatusCell },
  { field: "manager", headerName: "담당자", flex: 1, minWidth: 96, cellRenderer: PlainCell },
  { headerName: "액션", width: 104, minWidth: 92, sortable: false, resizable: false, type: "rightAligned", cellRenderer: ActionCell },
];

/* ─────────────────────────────────────────────
   메인 컴포넌트: ReportBucheo
─────────────────────────────────────────────── */
function ReportBucheo({ onNav }: { onNav?: (route: string) => void }) {
  // 현재 승인 단계: 접수 단계(index 1) 활성화
  const activeStep = 1;

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "보고관리", "부처보고"]}
        title="부처보고"
        sub="보고서 제출 및 승인 관리 — 2026-06-16 기준"
        actions={<><Button variant="primary" size="sm" leadingIcon="download">전체 내보내기</Button></>} /><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"><KpiBox
          icon="file"
          tone="primary"
          label="이번 분기 보고서"
          value="4건"
          sub="제출완료 3 / 미제출 1" /><KpiBox
          icon="check-circle"
          tone="success"
          label="확정 보고서"
          value="2건"
          sub="1분기 확정 포함" /><KpiBox
          icon="clock"
          tone="warning"
          label="승인 대기"
          value="1건"
          sub="모태펀드 집행실적 보고" /></div><div className="flex flex-col gap-4"><div
          className="rounded-card border border-border bg-card px-6 py-5 shadow-sm flex items-center gap-2"><div className="flex-1 flex items-center gap-4"><ColorChip icon="file" color="var(--primary)" size={32} iconSize={17} /><div><div className="text-[14px] font-bold text-foreground">보고 승인 흐름</div><div className="t-caption text-[11.5px]">2분기 운용현황 보고 현재 진행 단계</div></div></div><div className="flex items-center gap-2 shrink-0"><Stepper activeStep={activeStep} /></div></div><div
          className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
            className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border"><div className="flex items-center gap-2"><h3 className="text-[16px] font-bold">보고서 목록</h3><CountPill count={MINISTRY_REPORTS.length} /></div><div className="flex items-center gap-2"><Button variant="primary" size="sm" leadingIcon="plus">신규 보고 등록</Button><IconBtn icon="download" label="내보내기" size={34} /></div></div><div><AgGridReact<MinistryRow> theme={apfsTheme} rowData={MINISTRY_REPORTS} columnDefs={bucheoColumns} domLayout="autoHeight" rowHeight={48} defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }} /></div></div></div></div>
  );
}

export const Pages = { ReportBucheo };
