/* 투자자산관리 메인 페이지 — 모태펀드·자펀드 투자자산 종합 현황 개요
   route: 'asset' — FR-5.1 / 5.5
   APFS 인디고/블루 토큰 + Tailwind 유틸리티 (report_main.tsx 패턴 차용). */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { mn, MT } from './mask';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, RowDoubleClickedEvent } from 'ag-grid-community';
import { apfsTheme } from './aggrid_theme';   // 공유 테마(회색 선택) SSOT
import './aggrid_shared.css';

const { PageHeader } = Shell;
const { ColorChip, StatusBadge, Card, ChartCard, Button, CountPill, toneVar } = UI;
const { ComposedBars, Donut } = Charts;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */

// KPI 요약 (총 AUM / 집행률 / IRR / 운용 자펀드 수)
const KPIS = [
  { icon: "landmark", tone: "primary", label: "총 AUM (운용자산)", value: "23,840억원", sub: "전월 대비 +3.2%" },
  { icon: "target", tone: "success", label: "모태펀드 집행률", value: "78.0%", sub: "목표 80% 대비 -2.0%p" },
  { icon: "trending", tone: "info", label: "전체 평균 IRR", value: "+12.6%", sub: "전분기 대비 +0.8%p" },
  { icon: "layers", tone: "cyan", label: "운용 자펀드", value: "120개", sub: "신규 1건 등록원부 반영" },
];

// 빠른 이동 — 투자자산관리 6개 하위 그룹 → 각 대표 화면 route
const SUBNAV = [
  { icon: "landmark", tone: "primary", title: "모태펀드관리", desc: "자펀드 공고 정보·모태펀드 조성 및 출자현황을 관리합니다.", route: "자펀드 공고 정보관리" },
  { icon: "layers", tone: "cyan", title: "조합관리", desc: "자펀드정보·조합원 정보 조회 및 자펀드별 조합원을 관리합니다.", route: "자펀드정보관리" },
  { icon: "file-check", tone: "warning", title: "사후보고관리", desc: "투심보고 확정·승인, 체크리스트·정기/수시 보고를 처리합니다.", badge: 4, route: "투심보고 확정 및 승인" },
  { icon: "wallet", tone: "info", title: "자펀드관리", desc: "자펀드 관리·출자/분배·투자실적·수탁관리를 확인합니다.", badge: 1, route: "subfund" },
  { icon: "building", tone: "success", title: "투자기업정보", desc: "투자기업 명세·고용현황·투자실적 및 회수현황을 조회합니다.", route: "투자기업정보(통합)" },
  { icon: "shield-alert", tone: "danger", title: "운용사 모니터링", desc: "운용사 명세·재무·실사보고·관리/성과보수를 조회합니다.", badge: 1, route: "운용사 명세서" },
];

// 연도별 투자·집행 현황 (ComposedBars용)
const INVEST_HISTORY = [
  { name: "2021", plan: 15800, actual: 12400, rate: 59 },
  { name: "2022", plan: 18200, actual: 15900, rate: 66 },
  { name: "2023", plan: 20400, actual: 18100, rate: 71 },
  { name: "2024", plan: 22600, actual: 20300, rate: 74 },
  { name: "2025", plan: 24800, actual: 21400, rate: 78 },
];

// 자펀드 상태 분포 (Donut용)
const FUND_STATUS = [
  { name: "정상", value: 86, color: "var(--success)" },
  { name: "주의", value: 22, color: "var(--warning)" },
  { name: "경고", value: 8, color: "var(--danger)" },
  { name: "청산예정", value: 4, color: "var(--muted-foreground)" },
];

// 최근 투자자산 활동 목록
const RECENT_ASSETS = [
  { id: "SF118", name: "그린바이오 투자조합", type: "벤처", gp: "코어밸류파트너스", aum: "420억", status: "정상", tone: "success", route: "subfund" },
  { id: "SF120", name: "푸드테크 액셀러레이터 2호", type: "엑셀러레이터", gp: "로고스벤처투자", aum: "180억", status: "신규등록", tone: "info", route: "자펀드정보관리" },
  { id: "SF097", name: "스마트팜 성장지원펀드", type: "성장", gp: "아그리벤처스", aum: "640억", status: "주의", tone: "warning", route: "subfund" },
  { id: "SF103", name: "수산식품 밸류업조합", type: "바이아웃", gp: "블루오션캐피탈", aum: "510억", status: "정상", tone: "success", route: "subfund" },
  { id: "SF089", name: "농식품 ESG 임팩트조합", type: "임팩트", gp: "그린임팩트파트너스", aum: "300억", status: "경고", tone: "danger", route: "투심보고 확정 및 승인" },
];

/* ─────────────────────────────────────────────
   KPI 카드
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
        className="inline-flex items-center justify-center shrink-0 rounded-[12px] w-11 h-11"
        style={{ background: softBg, color: c }}
      >
        <Icon name={icon} size={22} stroke={2} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="t-label text-[11.5px] mb-0.5"><MT>{label}</MT></div>
        <div
          className="text-[22px] font-extrabold tabular leading-tight text-foreground"
          style={{ overflowWrap: "anywhere" }}
        >{mn(value)}</div>
        {sub && <div className="t-caption text-[11.5px] mt-0.5"><MT>{sub}</MT></div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   빠른 이동 카드 (하위 그룹)
─────────────────────────────────────────────── */
function NavCard({ icon, tone, title, desc, badge, badgeUrgent, onClick }: {
  icon: string;
  tone: string;
  title: string;
  desc: string;
  badge?: number;
  badgeUrgent?: boolean;
  onClick: () => void;
}) {
  const [c, softBg] = toneVar(tone as any);
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
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[16px] font-bold text-foreground">{title}</span>
          {badge !== undefined && <CountPill count={badge} urgent={badgeUrgent} />}
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{desc}</p>
      </div>
      <div className="shrink-0 mt-1 transition-transform group-hover:translate-x-1 text-muted-foreground">
        <Icon name="chevron-right" size={20} />
      </div>
    </button>
  );
}

/* ─────────────────────────────────────────────
   메인 컴포넌트: AssetMain
─────────────────────────────────────────────── */
function AssetMain({ onNav }: { onNav?: (route: string) => void }) {
  const go = (route: string) => onNav && onNav(route);

  /* 최근 투자자산 활동 AG Grid 컬럼 (수제 <table> 대체) — 본체만 교체.
     자펀드명(2줄)·유형 칩·운용사·상태는 셀 렌더러, AUM은 mn 우측정렬, 더블클릭=라우팅 보존. */
  const RECENT_COLS = React.useMemo<ColDef<any>[]>(() => [
    {
      field: "name", headerName: "자펀드명", flex: 2, minWidth: 180,
      cellStyle: { display: "flex", flexDirection: "column", justifyContent: "center" },
      cellRenderer: (p: any) => (
        <div className="min-w-0" style={{ lineHeight: 1.3 }}>
          <div className="text-[13.5px] font-semibold text-foreground"><MT>{p.data.name}</MT></div>
          <div className="t-caption text-[11.5px] mt-0.5 font-mono"><MT w={44}>{p.data.id}</MT></div>
        </div>
      ),
    },
    {
      field: "type", headerName: "유형", width: 120,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
      cellRenderer: (p: any) => (
        <span className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold text-accent" style={{ background: "color-mix(in srgb,var(--accent) 13%,transparent)" }}><MT w={40}>{p.value}</MT></span>
      ),
    },
    {
      field: "gp", headerName: "운용사", flex: 1, minWidth: 140,
      cellStyle: { display: "flex", alignItems: "center" },
      cellRenderer: (p: any) => <span className="text-[13px] font-semibold text-foreground"><MT>{p.value}</MT></span>,
    },
    {
      field: "aum", headerName: "AUM", type: "rightAligned", width: 110,
      valueFormatter: (p: any) => mn(p.value),
      cellStyle: { fontVariantNumeric: "tabular-nums", fontWeight: 700 },
    },
    {
      field: "status", headerName: "상태", width: 112,
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "center" },
      cellRenderer: (p: any) => <StatusBadge tone={p.data.tone as any} label={p.value} size="sm" />,
    },
    {
      colId: "go", headerName: "바로가기", width: 100, sortable: false, resizable: false, type: "rightAligned",
      cellStyle: { display: "flex", alignItems: "center", justifyContent: "flex-end" },
      cellRenderer: (p: any) => <Button variant="ghost" size="sm" onClick={() => onNav && onNav(p.data.route)}>보기</Button>,
    },
  ], [onNav]);

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}
    >
      <PageHeader
        crumbs={["홈", "투자자산관리", "개요"]}
        title="투자자산관리"
        sub="모태펀드·자펀드 투자자산 종합 현황 — 2026-06-21 기준"
        actions={
          <>
            <Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => go("main")}>메인으로</Button>
            <Button variant="primary" size="sm" leadingIcon="download">전체 내보내기</Button>
          </>
        }
      />

      {/* KPI 요약 카드 4개 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {KPIS.map((k) => (
          <KpiBox key={k.label} icon={k.icon} tone={k.tone} label={k.label} value={k.value} sub={k.sub} />
        ))}
      </div>

      {/* 빠른 이동 — 6개 하위 그룹 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        {SUBNAV.map((s) => (
          <NavCard
            key={s.title}
            icon={s.icon}
            tone={s.tone}
            title={s.title}
            desc={s.desc}
            badge={s.badge}
            badgeUrgent={s.tone === "danger"}
            onClick={() => go(s.route)}
          />
        ))}
      </div>

      {/* 하단 2열: 연도별 투자·집행 차트 + 자펀드 상태 분포 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 mb-4">
        <ChartCard
          title="연도별 투자·집행 현황"
          sub="계획 대비 실적 (억원)"
          icon="chart"
          accent="var(--primary)"
          minH={240}
        >
          <div style={{ height: 200 }}>
            <ComposedBars data={INVEST_HISTORY} height={200} planColor="var(--chart-3)" actualColor="var(--primary)" />
          </div>
          <div className="flex items-center gap-4 mt-2 px-1 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block shrink-0" style={{ background: "var(--chart-3)" }} />
              <span className="t-caption text-[11.5px]">계획</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm inline-block shrink-0 bg-primary" />
              <span className="t-caption text-[11.5px]">실적</span>
            </div>
          </div>
        </ChartCard>

        <ChartCard
          title="자펀드 상태 분포"
          sub={"전체 " + mn("120") + "개 자펀드"}
          icon="layers"
          accent="var(--accent)"
          minH={240}
          right={
            <div className="flex flex-col gap-1.5">
              {FUND_STATUS.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm inline-block shrink-0" style={{ background: d.color }} />
                  <span className="t-caption text-[12px]"><MT w={32}>{d.name}</MT></span>
                  <span className="text-[13px] font-bold tabular" style={{ color: d.color }}>{mn(d.value)}</span>
                </div>
              ))}
            </div>
          }
        >
          <Donut data={FUND_STATUS} height={210} centerLabel="자펀드" centerValue={mn("120")} />
        </ChartCard>
      </div>

      {/* 최근 투자자산 활동 목록 */}
      <div className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-[16px] font-bold">최근 투자자산 활동</h3>
            <CountPill count={RECENT_ASSETS.length} />
          </div>
          <Button variant="ghost" size="sm" onClick={() => go("자펀드정보관리")}>자펀드 전체 보기 →</Button>
        </div>
        <div style={{ padding: "0 2px 2px" }}>
          <AgGridReact
            theme={apfsTheme}
            rowData={RECENT_ASSETS}
            columnDefs={RECENT_COLS}
            getRowId={(p) => (p.data as any).id}
            domLayout="autoHeight"
            rowHeight={56}
            defaultColDef={{ sortable: true, resizable: true, suppressHeaderMenuButton: true }}
            onRowDoubleClicked={(e: RowDoubleClickedEvent) => { if (e.data) go((e.data as any).route); }}
          />
        </div>
      </div>
    </div>
  );
}

export const Pages = { AssetMain };
