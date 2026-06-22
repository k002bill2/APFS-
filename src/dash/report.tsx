/* 부처보고·수탁보고 페이지 — FR-5.8 / 5.9
   APFS forest-green 토큰 + Tailwind 유틸리티. JSX 없음. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { Charts } from './charts';
import { APFS_DATA } from './data';
import { mn, MT } from './mask';

const { useState, useMemo } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, DeltaBadge, Card, ChartCard, SegTabs,
  FilterChip, Button, IconBtn, EmptyState, CountPill, toneVar,
} = UI;
const { ComposedBars } = Charts;
const D = APFS_DATA;
const cx = (...a) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */

// 부처보고 목록
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

// 수탁보고 검증 목록
const CUSTODY_VERIFICATIONS = [
  {
    id: "CV01", vtype: "실물자료", fund: "스마트팜 그로스 1호 (SF-01)", uploadDate: "2026-06-13",
    result: "일치", status: "완료", mismatch: false,
  },
  {
    id: "CV02", vtype: "유가증권", fund: "그린바이오 투자조합 (GB-042)", uploadDate: "2026-06-14",
    result: "불일치", status: "검토중", mismatch: true,
  },
  {
    id: "CV03", vtype: "계좌정보", fund: "수산벤처 2호 (FV-02)", uploadDate: "2026-06-14",
    result: "일치", status: "완료", mismatch: false,
  },
  {
    id: "CV04", vtype: "입출금정보", fund: "푸드테크 액셀러레이터 (FT-110)", uploadDate: "2026-06-15",
    result: "불일치", status: "진행중", mismatch: true,
  },
  {
    id: "CV05", vtype: "실물자료", fund: "농식품 모태 직접출자 (GSB-10Y)", uploadDate: "2026-06-12",
    result: "일치", status: "완료", mismatch: false,
  },
  {
    id: "CV06", vtype: "유가증권", fund: "코어밸류파트너스 3호 (CV-03)", uploadDate: "2026-06-15",
    result: "일치", status: "진행중", mismatch: false,
  },
];

// 등록원부 목록
const REGISTRY_FUNDS = [
  {
    code: "VC-SF01", name: "스마트팜 그로스 1호", gp: "스마트팜벤처파트너스",
    regDate: "2022-03-14", lastModified: "2026-06-10", version: "v4.2", status: "현행",
  },
  {
    code: "PEF-042", name: "그린바이오 투자조합", gp: "그린루트벤처스",
    regDate: "2021-07-22", lastModified: "2026-05-28", version: "v6.0", status: "현행",
  },
  {
    code: "VC-FV02", name: "수산벤처 2호", gp: "블루오션파트너스",
    regDate: "2023-01-09", lastModified: "2026-04-30", version: "v2.1", status: "개정검토",
  },
  {
    code: "AGF-110", name: "푸드테크 액셀러레이터", gp: "코어밸류파트너스",
    regDate: "2023-09-18", lastModified: "2026-06-05", version: "v1.3", status: "현행",
  },
  {
    code: "GSB-10Y", name: "농식품 모태 직접출자", gp: "농금원(직접)",
    regDate: "2020-01-15", lastModified: "2026-06-01", version: "v8.5", status: "현행",
  },
];

// 수정이력 타임라인
const REGISTRY_HISTORY = [
  { date: "2026-06-10", fund: "스마트팜 그로스 1호", change: "출자금액 정정 (284,200 → 284,800백만원)", by: "김재현" },
  { date: "2026-06-05", fund: "푸드테크 액셀러레이터", change: "운용사 연락처 업데이트", by: "이미나" },
  { date: "2026-05-28", fund: "그린바이오 투자조합", change: "조합원 지분 변경 반영 (v5.9→v6.0)", by: "박수진" },
];

// 연도별 투자/회수 현황 (ComposedBars용)
const INVEST_HISTORY = [
  { name: "2021", plan: 15800, actual: 12400, rate: 59 },
  { name: "2022", plan: 18200, actual: 15900, rate: 66 },
  { name: "2023", plan: 20400, actual: 18100, rate: 71 },
  { name: "2024", plan: 22600, actual: 20300, rate: 74 },
  { name: "2025", plan: 24800, actual: 21400, rate: 78 },
];

/* ─────────────────────────────────────────────
   헬퍼: 상태 → tone
─────────────────────────────────────────────── */
function reportTone(status) {
  if (status === "작성중") return "info";
  if (status === "접수") return "warning";
  if (status === "승인대기") return "warning";
  if (status === "확정") return "success";
  if (status === "확정(Lock)") return "cyan";
  return "info";
}

function custodyTone(status) {
  if (status === "완료") return "success";
  if (status === "검토중") return "danger";
  if (status === "진행중") return "warning";
  return "info";
}

function registryTone(status) {
  if (status === "현행") return "success";
  if (status === "개정검토") return "warning";
  return "info";
}

function resultTone(result) {
  return result === "일치" ? "success" : "danger";
}

/* ─────────────────────────────────────────────
   4단계 승인 스텝퍼
─────────────────────────────────────────────── */
const STEPS = ["작성", "접수", "승인", "확정"];

function Stepper({ activeStep }) {
  return (
    <div className="flex items-center gap-0" aria-label="보고 승인 단계">{STEPS.map((label, i) => {
        const done = i < activeStep;
        const active = i === activeStep;
        const [color] = toneVar(active ? "primary" : done ? "success" : "info");
        return (
          <React.Fragment key={label}><div className="flex flex-col items-center gap-1"><div
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
                }}>{label}</span></div>{i < STEPS.length - 1 && <div
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
   보고 일정 카드
─────────────────────────────────────────────── */
function ScheduleCard({ item }) {
  const [color, softBg] = toneVar(item.tone);
  return (
    <div
      className="flex items-start gap-3 rounded-card border border-border bg-card px-4 py-3 shadow-sm"><div
        className="inline-flex items-center justify-center shrink-0 rounded-[8px] text-[10px] font-bold w-10 h-10"
        style={{ background: softBg, color }}>{mn(item.dday)}</div><div className="min-w-0 flex-1"><div
          className="text-[13px] font-semibold truncate text-foreground"><MT>{item.title}</MT></div><div className="flex items-center gap-1.5 mt-0.5"><span
            className="inline-block rounded-full px-2 py-0.5 text-[10.5px] font-bold"
            style={{ background: softBg, color }}>{item.kind}</span><span className="t-caption text-[11px]">{mn(item.date)}</span></div></div></div>
  );
}

/* ─────────────────────────────────────────────
   부처보고 탭 콘텐츠
─────────────────────────────────────────────── */
function MinistryTab() {
  // 현재 승인 단계: 접수 단계(index 1) 활성화
  const activeStep = 1;

  return (
    <div className="flex flex-col gap-4"><div
        className="rounded-card border border-border bg-card px-6 py-5 shadow-sm flex items-center gap-2"><div className="flex-1 flex items-center gap-4"><ColorChip icon="file" color="var(--primary)" size={32} iconSize={17} /><div><div className="text-[14px] font-bold text-foreground">보고 승인 흐름</div><div className="t-caption text-[11.5px]">2분기 운용현황 보고 현재 진행 단계</div></div></div><div className="flex items-center gap-2 shrink-0"><Stepper activeStep={activeStep} /></div></div><div
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
          className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border"><div className="flex items-center gap-2"><h3 className="text-[16px] font-bold">보고서 목록</h3><CountPill count={MINISTRY_REPORTS.length} /></div><div className="flex items-center gap-2"><Button variant="primary" size="sm" leadingIcon="plus">신규 보고 등록</Button><IconBtn icon="download" label="내보내기" size={34} /></div></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[760px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{[
                  ["보고서명", "left"],
                  ["보고유형", "center"],
                  ["보고기관", "center"],
                  ["보고일", "center"],
                  ["상태", "center"],
                  ["담당자", "center"],
                  ["액션", "right"],
                ].map(([label, align], i) =>
                  <th
                    key={i}
                    className={cx(
                      "t-label font-semibold px-4 py-3 whitespace-nowrap",
                      align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                      i === 0 && "pl-6"
                    )}>{label}</th>
                )}</tr></thead><tbody>{MINISTRY_REPORTS.map((r) =>
                <tr
                  key={r.id}
                  className="border-t border-border transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><td className="px-4 pl-6 py-3.5"><div
                      className="text-[13.5px] font-semibold text-foreground"><MT>{r.name}</MT></div></td><td className="px-4 py-3.5 text-center"><span
                      className="inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold"
                      style={{
                        background: r.type === "수시"
                          ? "color-mix(in srgb,var(--warning) 14%,transparent)"
                          : "color-mix(in srgb,var(--info) 14%,transparent)",
                        color: r.type === "수시" ? "var(--warning)" : "var(--info)",
                      }}>{r.type}</span></td><td
                    className="px-4 py-3.5 text-center text-[13px] font-semibold text-foreground"><MT>{r.org}</MT></td><td className="px-4 py-3.5 text-center t-caption tabular text-[12.5px]">{mn(r.date)}</td><td className="px-4 py-3.5 text-center"><StatusBadge tone={reportTone(r.status)} label={r.status} size="sm" /></td><td
                    className="px-4 py-3.5 text-center text-[13px] font-semibold text-foreground"><MT>{r.manager}</MT></td><td className="px-4 pr-5 py-3.5 text-right">{r.action === "-"
                      ? <span className="t-caption text-[12px]">—</span>
                      : <Button variant={r.action === "작성" ? "primary" : "outline"} size="sm">{r.action}</Button>}</td></tr>
              )}</tbody></table></div></div></div>
  );
}

/* ─────────────────────────────────────────────
   수탁보고 탭 콘텐츠
─────────────────────────────────────────────── */
function CustodyTab() {
  return (
    <div
      className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
        className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border"><div className="flex items-center gap-2"><h3 className="text-[16px] font-bold">수탁 데이터 검증 현황</h3><CountPill
            count={CUSTODY_VERIFICATIONS.filter((c) => c.mismatch).length}
            urgent={true} /></div><div className="flex items-center gap-2"><Button variant="outline" size="sm" leadingIcon="upload">데이터 업로드</Button><IconBtn icon="refresh" label="재검증" size={34} /></div></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[740px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{[
                ["검증유형", "left"],
                ["대상 자펀드", "left"],
                ["업로드일", "center"],
                ["비교검증결과", "center"],
                ["상태", "center"],
                ["액션", "right"],
              ].map(([label, align], i) =>
                <th
                  key={i}
                  className={cx(
                    "t-label font-semibold px-4 py-3 whitespace-nowrap",
                    align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                    i === 0 && "pl-6"
                  )}>{label}</th>
              )}</tr></thead><tbody>{CUSTODY_VERIFICATIONS.map((r) =>
              <tr
                key={r.id}
                className="border-t border-border transition-colors"
                style={r.mismatch
                  ? { background: "color-mix(in srgb,var(--danger) 6%,transparent)" }
                  : undefined}
                onMouseEnter={(e) => {
                  if (!r.mismatch) e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = r.mismatch
                    ? "color-mix(in srgb,var(--danger) 6%,transparent)"
                    : "transparent";
                }}><td className="px-4 pl-6 py-3.5"><div className="flex items-center gap-2">{r.mismatch && <Icon
                      name="alert-circle"
                      size={15}
                      className="text-danger shrink-0" />}<span
                      className="text-[13.5px] font-semibold text-foreground"><MT>{r.vtype}</MT></span></div></td><td
                  className="px-4 py-3.5 text-[13px] text-foreground"><MT>{r.fund}</MT></td><td className="px-4 py-3.5 text-center t-caption tabular text-[12.5px]">{mn(r.uploadDate)}</td><td className="px-4 py-3.5 text-center"><StatusBadge
                    tone={resultTone(r.result)}
                    label={r.result}
                    size="sm"
                    icon={r.result === "일치" ? "check-circle" : "x-circle"} /></td><td className="px-4 py-3.5 text-center"><StatusBadge tone={custodyTone(r.status)} label={r.status} size="sm" /></td><td className="px-4 pr-5 py-3.5 text-right"><Button
                    variant={r.mismatch ? "outline" : "ghost"}
                    size="sm"
                    style={r.mismatch ? { color: "var(--danger)", borderColor: "var(--danger)" } : undefined}>{r.mismatch ? "불일치 검토" : "상세 보기"}</Button></td></tr>
            )}</tbody></table></div></div>
  );
}

/* ─────────────────────────────────────────────
   등록원부 탭 콘텐츠
─────────────────────────────────────────────── */
function RegistryTab() {
  return (
    <div className="flex flex-col gap-4"><div
        className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
          className="flex items-center justify-between gap-4 px-5 py-4 border-b border-border"><div className="flex items-center gap-2"><h3 className="text-[16px] font-bold">등록원부 관리</h3><CountPill count={REGISTRY_FUNDS.length} /></div><div className="flex items-center gap-2"><Button variant="primary" size="sm" leadingIcon="plus">원부 등록</Button><IconBtn icon="download" label="일괄 다운로드" size={34} /></div></div><div className="overflow-x-auto"><table className="w-full border-collapse min-w-[860px]"><thead><tr style={{ background: "color-mix(in srgb,var(--muted) 60%,transparent)" }}>{[
                  ["자펀드코드", "left"],
                  ["자펀드명", "left"],
                  ["운용사", "left"],
                  ["등록일", "center"],
                  ["최종수정일", "center"],
                  ["버전", "center"],
                  ["상태", "center"],
                  ["다운로드", "right"],
                ].map(([label, align], i) =>
                  <th
                    key={i}
                    className={cx(
                      "t-label font-semibold px-4 py-3 whitespace-nowrap",
                      align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
                      i === 0 && "pl-6"
                    )}>{label}</th>
                )}</tr></thead><tbody>{REGISTRY_FUNDS.map((r) =>
                <tr
                  key={r.code}
                  className="border-t border-border transition-colors"
                  onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb,var(--muted) 45%,transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}><td
                    className="px-4 pl-6 py-3.5 tabular text-[12.5px] font-mono font-semibold text-accent"><MT>{r.code}</MT></td><td
                    className="px-4 py-3.5 text-[13.5px] font-semibold text-foreground"><MT>{r.name}</MT></td><td
                    className="px-4 py-3.5 text-[13px] text-muted-foreground"><MT>{r.gp}</MT></td><td className="px-4 py-3.5 text-center t-caption tabular text-[12px]">{mn(r.regDate)}</td><td className="px-4 py-3.5 text-center t-caption tabular text-[12px]">{mn(r.lastModified)}</td><td
                    className="px-4 py-3.5 text-center text-[12.5px] font-bold tabular text-primary">{mn(r.version)}</td><td className="px-4 py-3.5 text-center"><StatusBadge tone={registryTone(r.status)} label={r.status} size="sm" /></td><td className="px-4 pr-5 py-3.5 text-right"><IconBtn icon="download" label={`${r.name} 다운로드`} size={32} /></td></tr>
              )}</tbody></table></div></div><div className="rounded-card border border-border bg-card px-5 py-4 shadow-sm"><div className="flex items-center gap-2 mb-4"><ColorChip icon="clock" color="var(--info)" size={28} iconSize={15} /><h4 className="text-[14px] font-bold">최근 수정이력</h4></div><div className="flex flex-col">{REGISTRY_HISTORY.map((item, i) =>
            <div
              key={i}
              className={cx("flex items-start gap-3 pb-4", i < REGISTRY_HISTORY.length - 1 && "border-b border-border mb-4")}><div className="flex flex-col items-center shrink-0"><div
                  className="w-2 h-2 rounded-full mt-1.5 bg-primary" />{i < REGISTRY_HISTORY.length - 1 && <div
                  className="w-px flex-1 mt-1 bg-border"
                  style={{ minHeight: 20 }} />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span
                    className="text-[12.5px] font-bold text-foreground"><MT>{item.fund}</MT></span><span className="t-caption tabular text-[11.5px]">{mn(item.date)}</span></div><div
                  className="text-[12.5px] mt-0.5 text-muted-foreground"><MT>{item.change}</MT></div><div className="t-caption text-[11px] mt-0.5">처리: <MT>{item.by}</MT></div></div></div>
          )}</div></div></div>
  );
}

/* ─────────────────────────────────────────────
   KPI 카드 (단순 수치 표시)
─────────────────────────────────────────────── */
function KpiBox({ icon, color, label, value, sub, tone }: { icon?: string; color?: string; label?: React.ReactNode; value?: React.ReactNode; sub?: React.ReactNode; tone?: string }) {
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
   메인 컴포넌트: Report
─────────────────────────────────────────────── */
function Report({ onNav }) {
  const [tab, setTab] = useState("ministry");

  // 보고 일정 필터 (kind === "보고")
  const scheduleItems = useMemo(
    () => (D.SCHEDULE || []).filter((s) => s.kind === "보고"),
    []
  );

  const tabOptions = [
    { value: "ministry", label: "부처보고" },
    { value: "custody", label: "수탁보고" },
    { value: "registry", label: "등록원부" },
  ];

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "부처보고", "보고 관리"]}
        title="부처보고·수탁보고"
        sub="보고서 제출, 수탁 데이터 검증, 등록원부 관리 — 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("main")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="download">전체 내보내기</Button></>} /><div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4"><KpiBox
          icon="file"
          tone="primary"
          label="이번 분기 보고서"
          value="4건"
          sub="제출완료 3 / 미제출 1" /><KpiBox
          icon="shield"
          tone="warning"
          label="수탁보고 검증"
          value="진행중 2건"
          sub="불일치 항목 재검토 중" /><KpiBox
          icon="clock"
          tone="info"
          label="등록원부 최종갱신"
          value="2026-06-10"
          sub="스마트팜 그로스 1호" /></div><div className="flex flex-col gap-4 mb-4"><div className="flex items-center gap-3"><SegTabs options={tabOptions} value={tab} onChange={setTab} size="md" /></div>{tab === "ministry" && <MinistryTab />}{tab === "custody" && <CustodyTab />}{tab === "registry" && <RegistryTab />}</div><div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4"><ChartCard
          title="연도별 투자·집행 현황"
          sub="계획 대비 실적 (억원)"
          icon="chart"
          accent="var(--primary)"
          minH={240}><div style={{ height: 200 }}><ComposedBars
              data={INVEST_HISTORY}
              height={200}
              planColor="var(--chart-3)"
              actualColor="var(--primary)" /></div><div className="flex items-center gap-4 mt-2 px-1"><div className="flex items-center gap-1.5"><span
                className="w-3 h-3 rounded-sm inline-block shrink-0"
                style={{ background: "var(--chart-3)" }} /><span className="t-caption text-[11.5px]">계획</span></div><div className="flex items-center gap-1.5"><span
                className="w-3 h-3 rounded-sm inline-block shrink-0 bg-primary" /><span className="t-caption text-[11.5px]">실적</span></div></div></ChartCard><div
          className="rounded-card-lg border border-border bg-card shadow-sm overflow-hidden"><div
            className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border"><div className="flex items-center gap-2"><ColorChip icon="calendar" color="var(--warning)" size={30} iconSize={16} /><h3 className="text-[15px] font-bold">보고 일정 현황</h3></div>{scheduleItems.length > 0 && <CountPill count={scheduleItems.length} />}</div><div
            className="flex flex-col gap-2 px-4 py-3 overflow-y-auto"
            style={{ maxHeight: 280 }}>{scheduleItems.length === 0
              ? <div className="py-8 text-center t-caption">예정된 보고 일정이 없습니다.</div>
              : scheduleItems.map((item, i) => <ScheduleCard key={i} item={item} />)}</div></div></div></div>
  );
}

export { Report };
