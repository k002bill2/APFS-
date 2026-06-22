/* 수탁보고 전용 페이지 — FR-5.9
   APFS forest-green 토큰 + Tailwind 유틸리티. */
import React from 'react';
import { Icon } from './icons';
import { Shell } from './shell';
import { UI } from './components';
import { mn, MT } from './mask';

const { useState } = React;
const { PageHeader } = Shell;
const {
  ColorChip, StatusBadge, Card, SegTabs,
  Button, IconBtn, CountPill, toneVar,
} = UI;
const cx = (...a: any[]) => a.filter(Boolean).join(" ");

/* ─────────────────────────────────────────────
   로컬 더미 데이터
─────────────────────────────────────────────── */

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

/* ─────────────────────────────────────────────
   헬퍼: 상태 → tone
─────────────────────────────────────────────── */
function custodyTone(status: string) {
  if (status === "완료") return "success";
  if (status === "검토중") return "danger";
  if (status === "진행중") return "warning";
  return "info";
}

function registryTone(status: string) {
  if (status === "현행") return "success";
  if (status === "개정검토") return "warning";
  return "info";
}

function resultTone(result: string) {
  return result === "일치" ? "success" : "danger";
}

/* ─────────────────────────────────────────────
   수탁검증 탭 콘텐츠
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
                    tone={resultTone(r.result) as any}
                    label={r.result}
                    size="sm"
                    icon={r.result === "일치" ? "check-circle" : "x-circle"} /></td><td className="px-4 py-3.5 text-center"><StatusBadge tone={custodyTone(r.status) as any} label={r.status} size="sm" /></td><td className="px-4 pr-5 py-3.5 text-right"><Button
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
                    className="px-4 py-3.5 text-center text-[12.5px] font-bold tabular text-primary">{mn(r.version)}</td><td className="px-4 py-3.5 text-center"><StatusBadge tone={registryTone(r.status) as any} label={r.status} size="sm" /></td><td className="px-4 pr-5 py-3.5 text-right"><IconBtn icon="download" label={`${r.name} 다운로드`} size={32} /></td></tr>
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
   메인 컴포넌트: ReportSutack
─────────────────────────────────────────────── */
function ReportSutack({ onNav }: { onNav?: (route: string) => void }) {
  const [tab, setTab] = useState("custody");

  const tabOptions = [
    { value: "custody", label: "수탁검증" },
    { value: "registry", label: "등록원부" },
  ];

  return (
    <div
      className="max-w-[1320px] mx-auto"
      style={{ animation: "dashFade .35s var(--ease) both" }}><PageHeader
        crumbs={["홈", "보고관리", "수탁보고"]}
        title="수탁보고"
        sub="수탁 데이터 검증 및 등록원부 관리 — 2026-06-16 기준"
        actions={<><Button
            variant="outline"
            size="sm"
            leadingIcon="chevron-left"
            onClick={() => onNav && onNav("report")}>메인으로</Button><Button variant="primary" size="sm" leadingIcon="upload">데이터 업로드</Button></>} /><div className="flex flex-col gap-4"><div className="flex items-center gap-3"><SegTabs options={tabOptions} value={tab} onChange={setTab} size="md" /></div>{tab === "custody" && <CustodyTab />}{tab === "registry" && <RegistryTab />}</div></div>
  );
}

export const Pages = { ReportSutack };
