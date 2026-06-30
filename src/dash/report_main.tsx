/* 보고관리 메인 페이지 — 부처보고·수탁보고 개요
   route: 'report' — FR-5.8 / 5.9
   APFS 인디고/블루 토큰 + Tailwind 유틸리티. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';
import './aggrid_shared.css';
import { apfsTheme } from './aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef } from 'ag-grid-community';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, Card, ChartCard, Button, IconBtn, CountPill, toneVar,
} = UI;
const { ComposedBars } = Charts;
const D = APFS_DATA;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */

// 연도별 투자/집행 현황 (ComposedBars용)
const INVEST_HISTORY = [
  { name: "2021", plan: 15800, actual: 12400, rate: 59 },
  { name: "2022", plan: 18200, actual: 15900, rate: 66 },
  { name: "2023", plan: 20400, actual: 18100, rate: 71 },
  { name: "2024", plan: 22600, actual: 20300, rate: 74 },
  { name: "2025", plan: 24800, actual: 21400, rate: 78 },
];

// 최근 보고 요약 목록
const RECENT_REPORTS = [
  { id: "MR01", name: "2분기 운용현황 보고", type: "부처보고", org: "농식품부", date: "2026-06-18", status: "접수", tone: "warning" },
  { id: "MR03", name: "모태펀드 집행실적 보고", type: "부처보고", org: "농식품부", date: "2026-06-29", status: "승인대기", tone: "warning" },
  { id: "MR04", name: "수시보고 — 운용사 조기경보 처리결과", type: "부처보고", org: "농금원", date: "2026-06-12", status: "확정", tone: "success" },
  { id: "CV02", name: "그린바이오 투자조합 — 유가증권 검증", type: "수탁보고", org: "수탁기관", date: "2026-06-14", status: "검토중", tone: "danger" },
  { id: "CV04", name: "푸드테크 액셀러레이터 — 입출금 검증", type: "수탁보고", org: "수탁기관", date: "2026-06-15", status: "진행중", tone: "info" },
];

/* ─────────────────────────────────────────────
   KPI 카드 (단순 수치 표시)
─────────────────────────────────────────────── */
function KpiBox({ icon, label, value, sub, tone }: {
  icon?: string;
  label?: React.ReactNode;
  value?: React.ReactNode;
  sub?: React.ReactNode;
  tone?: string;
}) {
  const [c, softBg] = toneVar(tone || "primary");
  return (
    <div className="rounded-card border border-border bg-card px-5 py-4 shadow-sm flex items-center gap-4">
      <div
        className="inline-flex items-center justify-center shrink-0 rounded-[12px]"
        style={{ width: 44, height: 44, background: softBg, color: c }}
      >
        <Icon name={icon} size={22} stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="t-label text-[11.5px] mb-0.5"><MT>{label}</MT></div>
        <div
          className="text-[22px] font-extrabold tabular leading-tight text-foreground"
        >{mn(value)}</div>
        {sub && <div className="t-caption text-[11.5px] mt-0.5"><MT>{sub}</MT></div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   보고 일정 카드
─────────────────────────────────────────────── */
function ScheduleCard({ item }: { item: any }) {
  const [color, softBg] = toneVar(item.tone);
  return (
    <div className="flex items-start gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm">
      <div
        className="inline-flex items-center justify-center shrink-0 rounded-[8px] text-[10px] font-bold w-10 h-10"
        style={{ background: softBg, color }}
      >{mn(item.dday)}</div>
      <div className="min-w-0 flex-1">
        <div
          className="text-[13px] font-semibold truncate text-foreground"
        ><MT>{item.title}</MT></div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span
            className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ background: softBg, color }}
          >{item.kind}</span>
          <span className="t-caption text-[11px]">{mn(item.date)}</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   빠른 이동 카드 (부처보고 / 수탁보고)
─────────────────────────────────────────────── */
function NavCard({ icon, color, title, desc, badge, badgeUrgent, onClick }: {
  icon: string;
  color: string;
  title: string;
  desc: string;
  badge?: number;
  badgeUrgent?: boolean;
  onClick: () => void;
}) {
  const [c, softBg] = toneVar(color as any);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-card-lg border border-border bg-card px-6 py-5 shadow-sm transition-all hover:shadow-md flex items-start gap-4 group cursor-pointer"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb,var(--muted) 40%,transparent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "";
      }}
    >
      <div
        className="inline-flex items-center justify-center shrink-0 rounded-[14px]"
        style={{ width: 52, height: 52, background: softBg, color: c }}
      >
        <Icon name={icon} size={26} stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[16px] font-bold text-foreground"
          >{title}</span>
          {badge !== undefined && (
            <CountPill count={badge} urgent={badgeUrgent} />
          )}
        </div>
        <p
          className="text-[13px] leading-relaxed text-muted-foreground"
        >{desc}</p>
      </div>
      <div
        className="shrink-0 mt-1 transition-transform group-hover:translate-x-1 text-muted-foreground"
      >
        <Icon name="chevron-right" size={20} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   AG Grid — 최근 보고 활동 표 (수제 <table> 대체)
   "축은 두고 데이터는 가린다": 헤더·유형 pill·StatusBadge는 비마스킹,
   보고서명·기관은 <MT>, 보고일은 mn(). 조회전용(선택·페이지네이션 없음).
   onNav는 grid context로 전달 → cellRenderer가 params.context.onNav로 사용.
─────────────────────────────────────────────── */
type ReportRow = typeof RECENT_REPORTS[number];

function NameCell(p: any) {
  return <div className="text-[13.5px] font-semibold text-foreground"><MT>{p.value}</MT></div>;
}
function OrgCell(p: any) {
  return <span className="text-[13px] font-semibold text-foreground"><MT>{p.value}</MT></span>;
}
function TypeCell(p: any) {
  const sutack = p.value === "수탁보고";
  return (
    <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{
      background: sutack ? "color-mix(in srgb,var(--secondary) 14%,transparent)" : "color-mix(in srgb,var(--primary) 14%,transparent)",
      color: sutack ? "var(--secondary)" : "var(--primary)",
    }}>{p.value}</span>
  );
}
function StatusCell(p: any) {
  const r = p.data as ReportRow | undefined;
  if (!r) return null;
  return <StatusBadge tone={r.tone as any} label={r.status} size="sm" />;
}
function LinkCell(p: any) {
  const r = p.data as ReportRow | undefined;
  if (!r) return null;
  return (
    <Button variant="ghost" size="sm" onClick={() => p.context?.onNav?.(r.type === "수탁보고" ? "report-sutack" : "report-bucheo")}>보기</Button>
  );
}

const reportColumns: ColDef<ReportRow>[] = [
  { field: "name", headerName: "보고서명", flex: 2, minWidth: 200, cellRenderer: NameCell },
  { field: "type", headerName: "유형", flex: 1, minWidth: 100, cellRenderer: TypeCell },
  { field: "org", headerName: "기관", flex: 1, minWidth: 100, cellRenderer: OrgCell },
  { field: "date", headerName: "보고일", flex: 1, minWidth: 112,
    valueFormatter: (p) => (p.value == null ? "" : mn(p.value)),
    cellStyle: { color: "var(--muted-foreground)", fontSize: "12.5px", fontVariantNumeric: "tabular-nums" } },
  { field: "status", headerName: "상태", flex: 1, minWidth: 100, cellRenderer: StatusCell },
  { headerName: "바로가기", width: 104, minWidth: 92, sortable: false, resizable: false, type: "rightAligned", cellRenderer: LinkCell },
];

/* ─────────────────────────────────────────────
   메인 컴포넌트: ReportMain
─────────────────────────────────────────────── */
function ReportMain({ onNav }: { onNav?: (route: string) => void }) {
  // 보고 일정 필터 (kind === "보고")
  const scheduleItems = useMemo(
    () => (D.SCHEDULE || []).filter((s: any) => s.kind === "보고"),
    []
  );

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}
    >
      <PageHeader
        crumbs={["홈", "보고관리", "개요"]}
        title="보고 관리"
        sub="부처보고·수탁보고 현황 개요 — 2026-06-21 기준"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              leadingIcon="chevron-left"
              onClick={() => onNav && onNav("main")}
            >메인으로</Button>
            <Button variant="primary" size="sm" leadingIcon="download">전체 내보내기</Button>
          </>
        }
      />

      {/* KPI 요약 카드 3개 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <KpiBox
          icon="file"
          tone="primary"
          label="총 보고건수"
          value="5건"
          sub="이번 분기 누적 제출"
        />
        <KpiBox
          icon="loader"
          tone="warning"
          label="진행중 보고"
          value="2건"
          sub="수탁 검증 불일치 2건 포함"
        />
        <KpiBox
          icon="check-circle"
          tone="success"
          label="최근 보고일"
          value="2026-06-18"
          sub="2분기 운용현황 보고 접수"
        />
      </div>

      {/* 빠른 이동 — 부처보고 / 수탁보고 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <NavCard
          icon="file"
          color="primary"
          title="부처보고"
          desc="보고서 제출 및 4단계 승인 관리. 정기·수시 보고 목록과 승인 흐름을 확인합니다."
          badge={4}
          onClick={() => onNav && onNav("report-bucheo")}
        />
        <NavCard
          icon="file-check"
          color="cyan"
          title="수탁보고"
          desc="수탁 데이터 검증 및 등록원부 관리. 불일치 항목과 자펀드 원부 현황을 확인합니다."
          badge={2}
          badgeUrgent={true}
          onClick={() => onNav && onNav("report-sutack")}
        />
      </div>

      {/* 하단 2열: 차트 + 최근 보고 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mb-4">
        {/* 연도별 투자·집행 현황 차트 */}
        <ChartCard
          title="연도별 투자·집행 현황"
          sub="계획 대비 실적 (억원)"
          icon="chart"
          accent="var(--primary)"
          minH={240}
        >
          <div style={{ height: 200 }}>
            <ComposedBars
              data={INVEST_HISTORY}
              height={200}
              planColor="var(--chart-3)"
              actualColor="var(--primary)"
            />
          </div>
          <div className="flex items-center gap-4 mt-2 px-1">
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block shrink-0"
                style={{ background: "var(--chart-3)" }}
              />
              <span className="t-caption text-[11.5px]">계획</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block shrink-0 bg-primary"
              />
              <span className="t-caption text-[11.5px]">실적</span>
            </div>
          </div>
        </ChartCard>

        {/* 보고 일정 현황 */}
        <div className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <ColorChip icon="calendar" color="var(--warning)" size={30} iconSize={16} />
              <h3 className="text-[15px] font-bold">보고 일정 현황</h3>
            </div>
            {scheduleItems.length > 0 && <CountPill count={scheduleItems.length} />}
          </div>
          <div
            className="flex flex-col gap-2 px-4 py-3 overflow-y-auto"
            style={{ maxHeight: 280 }}
          >
            {scheduleItems.length === 0
              ? <div className="py-8 text-center t-caption">예정된 보고 일정이 없습니다.</div>
              : scheduleItems.map((item: any, i: number) => <ScheduleCard key={i} item={item} />)
            }
          </div>
        </div>
      </div>

      {/* 최근 보고 활동 목록 */}
      <div className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold">최근 보고 활동</h3>
            <CountPill count={RECENT_REPORTS.length} />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNav && onNav("report-bucheo")}
            >부처보고 전체 보기 →</Button>
          </div>
        </div>
        <div>
          <AgGridReact<ReportRow>
            theme={apfsTheme}
            rowData={RECENT_REPORTS}
            columnDefs={reportColumns}
            context={{ onNav }}
            domLayout="autoHeight"
            rowHeight={48}
            defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
          />
        </div>
      </div>
    </div>
  );
}

export const Pages = { ReportMain };
