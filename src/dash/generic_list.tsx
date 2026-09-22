/* 일반 리스트 페이지 — 전용 구현이 없는 모든 메뉴 항목의 기본(폴백) 화면.
   레이아웃: KPI 배지 · 필터 칩 툴바 · CRUD 테이블 · 페이지네이션 · 하단 요약 2-카드.
   route 값(한글 레이블 또는 경로)으로 제목·브레드크럼을 자동 구성. */
import React from 'react';
import { Icon } from './icons';
import { UI } from './components';
import { APFS_DATA } from './data';
import { mn, MT, useMask } from './mask';
import { RowFormModal, statusTone } from './generic_list_modal';
import type { Row } from './generic_list_modal';
import { resolveSchema } from './schemas';
import { Cell, AttachChips, controlMinWidth, drawerInputStyle } from './schemas/renderers';   // controlMinWidth = 컨트롤 폭 하한 SSOT(fit-content 짝)
import { resolveFilterField, YEAR_OPTIONS } from './schemas/filter_field';
import type { FilterField } from './schemas/filter_field';
import type { PageSchema, DetailPopup } from './schemas/types';
import { MonthlyReportModal } from './monthly_report_modal';   // 읽기전용 상세 보고서 팝업(컬럼 detail 옵트인 스키마만)
import { GpSpecModal } from './gp_spec_modal';                 // 운용사 명세(S1_02) — 운용사 명세서 목록의 행 상세
import { CompanyProfileModal } from './company_profile_modal'; // 투자기업 기업개요(S1_30) — 투자기업정보(통합)의 행 상세
import { MgmtFeeDetailModal } from './mgmt_fee_detail_modal';   // 관리보수보고 상세조회(S1_43) — 지급일자 링크
import { DueDiligChecklistModal } from './due_dilig_checklist_modal'; // 투자금실사보고서 체크리스트(S1_40) — 실사일자 링크
import { noteHeader, foldGroups } from './grid_header_note';   // 컬럼 헤더 옆 ⚠검토필요 마커 + 2단 그룹헤더(ColumnSpec note/group 소비처)
import { linksDetail } from './schemas/detail_link';   // detail 링크 술어 정본(소비처 3곳 공유)
import { UNITS, DEFAULT_UNIT, isUnit, toUnit, amountHeader } from './schemas/unit';
import type { Unit } from './schemas/unit';
import type { ColumnSpec } from './schemas/types';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';   // 앱-스코프 단축키(⌘⏎ 등록·⌘P 인쇄·⌥D 내보내기)
import { toast } from './ui/sonner';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DatePicker } from './ui/date-picker';
import { PeriodPicker } from './ui/period-picker';   // 월 선택 필터(kind:'month') — 값 'YYYY-MM'
import * as XLSX from 'xlsx';   // SheetJS — 클라이언트 전용 .xlsx 생성(쓰기 전용: XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, SelectionChangedEvent, ICellRendererParams, IRowNode, CellContextMenuEvent, CellKeyDownEvent, SuppressKeyboardEventParams } from 'ag-grid-community';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마(회색 행선택)·내용폭 자동화 SSOT
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import './aggrid_shared.css';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { GridFrame, KpiBadge, FooterActions } from './grid_frame';   // 공통 양식 셸 + KPI 배지(apfs-grid 스킬 SSOT)

const { useState, useEffect, useRef, useCallback, useMemo } = React;
const { Button, StatusBadge, IconBtn, ColorChip, SegTabs, DeltaBadge, ClearableInput } = UI;
const D = APFS_DATA;

/* MENU 트리 노드 형태 — data.ts의 MENU는 선언 타입 없는 이질적 리터럴 배열이라
   union 프로퍼티 접근(children/path)이 좁혀지지 않는다. 실제 트리 구조(라벨 필수,
   path/children 선택)를 명시해 findMenuContext 안에서만 정합화한다. 런타임 무변경. */
type MenuNode = { label: string; path?: string; children?: MenuNode[] };

/* MENU를 재귀 탐색해 route와 일치하는 항목의 제목·breadcrumb·상위 레이블을 반환.
   app.tsx의 라우트 전환 aria-live 통지가 route→한글 제목 변환에 재사용(export). */
export function findMenuContext(route: string): { title: string; crumbs: string[]; parent?: string } {
  for (const top of D.MENU as MenuNode[]) {
    if (!top.children) continue;
    for (const child of top.children) {
      if (!child.children) {
        if (child.label === route || child.path === route)
          return { title: child.label, crumbs: ["홈", top.label, child.label], parent: top.label };
        continue;
      }
      for (const leaf of child.children) {
        if (leaf.label === route || leaf.path === route)
          return { title: leaf.label, crumbs: ["홈", top.label, child.label, leaf.label], parent: child.label };
      }
    }
  }
  return { title: route, crumbs: ["홈", route] };
}

/* 행 더미 데이터 생성 — index 기반 결정적 값 (브랜드 차트 팔레트 토큰 매핑) */
const ROW_ICONS = ["building", "layers", "target", "wallet", "chart-bar"];
const ROW_COLORS = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--chart-9)"];
const ROW_CATS = ["투자성과", "리스크", "회계마감", "운용사보고", "컴플라이언스"];
const ROW_STATUS = ["정상", "진행중", "검토중", "보류", "완료"];
// 첨부파일(filepond) 필드 더미 시드 — 수정 모달에서 기존 첨부(Attachment) 표시 확인용.
const DOC_SEED = [
  "실사보고서.pdf, 재무제표_2026.xlsx",
  "투자심의결과.pdf",
  "현장점검_사진.zip, 점검체크리스트.docx, 의견서.hwp",
  "분기보고서_2026Q1.pdf, 결산자료.xlsx",
];

function makeRows(schema: PageSchema, n: number): Row[] {
  /* 리터럴 샘플 우선 — 목업/캡처의 실제 행을 그대로 표시(합성 더미 대체). 개수=샘플 길이.
     ⚠ 판정은 **존재**지 길이가 아니다. `sample: []`(원천에 행이 0건 — 예: 신규 화면, 목업이
     "조회된 데이터가 없습니다"인 표)은 빈 표로 그려야 한다. `?.length` 로 보면 빈 배열이
     falsy 라 조용히 합성 더미 n건으로 되돌아가, 없는 데이터가 실적처럼 보인다. */
  const sample = schema.sample ?? null;
  const count = sample ? sample.length : n;
  return Array.from({ length: count }, (_, i) => {
    const k = i % 5;
    const base: Row = {
      id: "R" + String(i + 1).padStart(3, "0"),
      icon: ROW_ICONS[k],
      color: ROW_COLORS[k],
      name: "항목명 " + String(i + 1).padStart(3, "0"),
      category: ROW_CATS[k],
      amount: 1200 * (i + 1) + ((i * 137) % 800),
      change: Number((((i * 13) % 200) / 10 - 8).toFixed(1)),
      status: (schema.statusDomain?.[i % (schema.statusDomain.length || 1)]?.label) ?? ROW_STATUS[i % 5],
      trend: [3, 5, 4, 7, 6].map((v, j) => v + ((i + j * 2) % 4)),
    };
    /* 샘플 행: 원문 값만 싣는다. base 에서 물려받는 것은 **표현용**(id·icon·color·trend)뿐이고
       amount·change·status·name 같은 합성 시드는 물려받지 않는다 — `{...base, ...s}` 로 두면
       원문에 없는 금액이 남아 카드뷰 금액과 헤더 KPI 합계(sumAmount)에 실적처럼 올라간다.
       원문이 그 키를 주면(예: 관리보수 amount) 아래 전개에서 그 값이 들어온다. */
    if (sample) {
      const s = sample[i];
      return {
        id: base.id, icon: base.icon, color: base.color, trend: base.trend,
        ...s,
        // Row 계약상 number/string 이 보장돼야 하는 5개만 뒤에서 정규화한다(원문에 없으면 0/'').
        amount: Number(s.amount ?? 0) || 0,
        change: Number(s.change ?? 0) || 0,
        status: String(s.status ?? ''),
        name: String(s.name ?? s.title ?? ''),
        category: String(s.category ?? schema.entity),
      } as Row;
    }
    const extra: Record<string, unknown> = {};
    for (const c of schema.columns) {
      if (['name', 'amount', 'change', 'status', 'trend'].includes(c.key)) continue;
      const field = schema.fields.find((f) => f.key === c.key);
      if (field?.control === 'select' && field.options?.length) {
        extra[c.key] = field.options[i % field.options.length];     // enum 도메인 시드 → 상세필터 매칭 성립
      } else if (/(년도|연도)/.test(c.label)) {
        extra[c.key] = YEAR_OPTIONS[i % YEAR_OPTIONS.length];        // 년도 도메인 시드 → year 필터 매칭
      } else if (/(차수|회차|순번|순서)/.test(c.label)) {
        extra[c.key] = (i % 12) + 1;                                 // 차수/회차는 작은 서수(금액 시드 오적용 방지)
      } else if (c.type === 'amount' || c.type === 'number' || c.type === 'rate') {
        extra[c.key] = (i + 1) * 100 + (i * 7) % 90;
      } else {
        extra[c.key] = c.label + ' ' + String(i + 1).padStart(3, '0');
      }
    }
    // 첨부파일(filepond) 필드는 columns가 아니라 fields라 위 루프에서 시드되지 않는다.
    // 수정 모달에서 기존 첨부가 Attachment로 보이도록 결정적 더미 파일명을 시드(3행마다 무첨부).
    for (const f of schema.fields) {
      if (f.control === 'filepond' && extra[f.key] == null && base[f.key] == null) {
        extra[f.key] = i % 3 === 2 ? '' : DOC_SEED[i % DOC_SEED.length];
      }
    }
    return { ...base, ...extra } as Row;
  });
}

/* 행 선택(체크박스) 옵션 — **모듈 상수로 호이스팅**(apfs-aggrid 규약 ⑦).
   인라인 리터럴로 두면 렌더마다 새 객체가 되어 AG Grid가 컬럼을 재생성하고 폭을 선언값으로 되돌린다
   (aggrid_theme.ts DEFAULT_COL_DEF 주석의 실측 사례와 동일 원인).
   schema.hideRowSelection이면 이 prop 자체를 undefined로 넘겨 선택 컬럼을 없앤다(체크 해제가 아니라 컬럼 제거). */
/* 행 본문 클릭으로도 체크된다(2026-09-17 사용자 결정) — 체크박스 칸을 정확히 겨냥하지 않아도 되게.
   두 옵션이 **한 벌**이다: `enableClickSelection` 이 클릭을 선택 수단으로 열고(기본 false),
   `enableSelectionWithoutKeys` 가 ⌘/Shift 없이도 **누적 토글**이 되게 한다. 후자가 없으면 클릭이
   기존 체크를 전부 지우고 그 행만 남겨, 체크박스로 고른 다건이 본문 클릭 한 번에 날아간다. */
const ROW_SELECTION = { mode: "multiRow", checkboxes: true, headerCheckbox: false, selectAll: "filtered", enableClickSelection: true, enableSelectionWithoutKeys: true } as const;   // 헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그린다(내장 SelectAllFeature 끔) · selectAll 범위는 DS 헤더와 동일하게 filtered

let SEQ = 500;
const nextId = () => "R" + (++SEQ);

const PER = 20;

/* 작은 막대 스파크라인 — 마지막 막대만 진하게 (이미지 참조) */
function MiniBars({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  return (
    <div className="inline-flex items-end" style={{ gap: 3, height: 20 }}>
      {data.map((v, i) => (
        <span key={i} style={{
          width: 5, borderRadius: 2, height: Math.max(3, (v / max) * 20),
          background: i === data.length - 1 ? color : `color-mix(in srgb, ${color} 32%, transparent)`,
        }} />
      ))}
    </div>
  );
}

/* KpiBadge는 grid_frame.tsx(GridFrame SSOT)에서 import — 인라인 정의 제거(apfs-grid 양식 이관) */

/* 제거 가능한 필터 칩 — 값만 표시(항목명 접두사 없음, 2026-09-09 통일: typed 페이지 골드 규약과 일치).
   항목명은 title(호버)·aria-label로 회수해 의미 손실을 상쇄한다. 값은 데이터→MT 마스킹. 태그형(value 없음)은 라벨=값 토큰이라 라벨을 그대로 표시. */
function FilterPill({ label, value, onRemove }: { label: string; value?: string; onRemove: () => void }) {
  return (
    <span title={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: "5px 8px 5px 11px", borderRadius: 9, fontSize: 12.5, background: "color-mix(in srgb, var(--primary) 10%, transparent)" }}>
      {value ? <MT>{value}</MT> : <span>{label}</span>}
      <button onClick={onRemove} aria-label={label + " 필터 제거"} className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: "transparent", color: "inherit", minWidth: 24, minHeight: 24, padding: 0, margin: "-5px -4px -5px 0" }}>
        <Icon name="x" size={13} stroke={2.4} />
      </button>
    </span>
  );
}

/* ── 드로어 체크 행 — 박스+체크 시각 (토큰 기반, 라이트/다크 양립) ── */
function DrawerCheckRow({ label, checked, onClick }: { label: string; checked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={checked}
      className="flex items-center gap-3 w-full text-left cursor-pointer border-0 py-2 px-0"
      style={{ background: "transparent", font: "inherit" }}>
      <span className="inline-flex items-center justify-center shrink-0" style={{
        width: 24, height: 24, borderRadius: 7, transition: "all .15s var(--ease)",
        background: checked ? "var(--primary)" : "var(--card)",
        border: checked ? "1px solid var(--primary)" : "1.5px solid var(--border-strong)" }}>
        {checked && <Icon name="check" size={16} stroke={3} style={{ color: "var(--primary-foreground)" }} />}
      </span>
      <span className="font-semibold text-foreground" style={{ fontSize: 14 }}>{label}</span>
    </button>
  );
}

/* 예약 라벨: 상세필터 최상단 공통 검색어 — 스키마 filters 배열과 무관한 별도 슬롯이며,
   노출은 `schema.searchable` opt-in(기본 OFF)에 달렸다. 현재 켜둔 스키마는 없다.
   resolveFilterField를 타지 않고(휴리스틱이 tag로 오판 → 표 증발) rowMatchesFilters에서 특수 처리:
   행의 전 컬럼 부분일치(OR), 다른 필터와는 AND. 이 처리는 opt-in 여부와 무관하게 유지한다. */
export const SEARCH_LABEL = "검색어";

function DrawerFilterControl({ ff, value, onChange, onEnter }: { ff: FilterField; value: string; onChange: (v: string) => void; onEnter?: () => void }) {
  // Enter로 즉시 적용 — 한글 IME 조합 확정 Enter(isComposing)는 무시해 오적용 방지
  const onKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) onEnter?.(); };
  let control: React.ReactNode;
  if (ff.kind === "year" || ff.kind === "enum") {
    // Safari menulist는 세로 padding을 무시해 select가 input보다 낮게 렌더됨(WebKit 22 vs 37px).
    // appearance:none으로 높이를 맞추고, 사라진 네이티브 화살표는 chevron으로 보강. (date는 달력 아이콘 보존 위해 미적용)
    control = (
      // 래퍼도 fit-content — block 100% 래퍼면 절대배치 chevron이 드로어 오른쪽 끝으로 떨어진다
      <div className="relative" style={{ width: "fit-content", maxWidth: "100%" }}>
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...drawerInputStyle("enum"), appearance: "none", WebkitAppearance: "none", paddingRight: 32 }}>
          <option value="">전체</option>
          {ff.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <Icon name="chevron-down" size={16} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted-foreground)", pointerEvents: "none" }} />
      </div>
    );
  } else if (ff.kind === "date") {
    // 일자선택 — shadcn Radix Calendar(Popover). 값은 'YYYY-MM-DD' 문자열 유지(정확일치 필터 계약). DatePicker 트리거는 w-full이라 fit-content 래퍼로 폭 규칙 적용.
    control = <div style={{ width: "fit-content", minWidth: controlMinWidth("date"), maxWidth: "100%" }}><DatePicker value={value} onChange={onChange} ariaLabel={ff.label} /></div>;
  } else if (ff.kind === "month") {
    // 월선택 — PeriodPicker 월 그리드. 값은 'YYYY-MM' 문자열(정확일치 필터 계약 — rowMatchesFilters). 트리거가 w-full이라 date와 같은 fit-content 래퍼(minW=130).
    control = <div style={{ width: "fit-content", minWidth: controlMinWidth("month"), maxWidth: "100%" }}><PeriodPicker mode="month" value={value} onChange={onChange} ariaLabel={ff.label} /></div>;
  } else if (ff.kind === "number") {
    control = <input type="number" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder="값 입력" style={drawerInputStyle("number")} />;
  } else {
    control = <input type="text" value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={ff.label + " 입력"} style={drawerInputStyle("text")} />;
  }
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>
        {ff.label}
        {/* 매칭 컬럼이 없어 더미데이터를 거를 수 없는 필터(조회 파라미터) — 무신호 no-op 방지 */}
        {!ff.columnKey && <span className="font-medium text-caption" style={{ marginLeft: 6 }}>· 데이터 연동 후 적용</span>}
      </span>
      {control}
    </label>
  );
}

/* ── 우측 슬라이드인: 스키마 기반 상세 필터 드로어 ──
   schema.filters 각 항목을 타입에 맞는 컨트롤로 노출한다 — 값-필터는 값 픽커, 카테고리는 on/off 토글.
   **즉시 반영형**(2026-09-11 사용자 결정 — typed 페이지 asset_funding·subfund_manage와 통일): 선택·입력하는
   즉시 부모 filterValues가 갱신돼 표가 줄어든다. draft 사본을 두고 "필터 적용"에서 커밋하던 방식은 폐기.
   그래서 상태 SSOT는 부모의 `applied` 하나뿐이며(드로어 로컬 상태 없음), 툴바 칩 ×로 외부에서 값이 빠져도
   재동기화 effect 없이 즉시 반영된다. 푸터 "필터 적용"은 **닫기** 역할(값은 이미 적용됨), "초기화"는 즉시 전체 해제.
   Portal로 body 직계 렌더(루트 dashFade transform의 영향 차단), 좁은 화면은 maxWidth 92vw로 축소. */
function ListFilterDrawer({ open, onClose, schema, applied, onApply }: {
  open: boolean; onClose: () => void; schema: PageSchema; applied: Record<string, string>; onApply: (next: Record<string, string>) => void;
}) {
  const filters = schema.filters ?? [];
  // 값 변경 = 즉시 적용. 빈 값("" = 전체/미선택)은 키째 지워 비활성으로 만든다(rowMatchesFilters 계약).
  const setVal = (label: string, v: string) => {
    const next = { ...applied };
    v === "" ? delete next[label] : (next[label] = v);
    onApply(next);
  };
  const toggleTag = (label: string) => {
    const next = { ...applied };
    next[label] ? delete next[label] : (next[label] = label);
    onApply(next);
  };
  // 입력 중 Enter = 드로어 닫기(값은 이미 반영돼 있다). IME 조합 확정 Enter는 제외
  const closeOnEnter = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) onClose(); };
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
        <SheetHeader>
          <SheetTitle>상세 필터</SheetTitle>
          <SheetDescription className="sr-only">목록을 조건으로 거르는 상세 필터</SheetDescription>
          <IconBtn icon="x" onClick={onClose} label="닫기" size={38} />
        </SheetHeader>
        <div className="flex-1 overflow-y-auto" style={{ padding: "20px clamp(14px,3vw,20px)" }}>
          {/* 검색어 — 예약 라벨, opt-in(schema.searchable). 최상단 고정, 전 컬럼 부분일치 검색 */}
          {schema.searchable && (
            <label className="block mb-4">
              <span className="block font-semibold text-muted-foreground" style={{ fontSize: 13, marginBottom: 6 }}>{SEARCH_LABEL}</span>
              <ClearableInput type="text" value={applied[SEARCH_LABEL] ?? ""} onValueChange={(v) => setVal(SEARCH_LABEL, v)} onKeyDown={closeOnEnter} placeholder="검색어 입력" clearLabel="검색어 지우기" style={drawerInputStyle("text")} />
            </label>
          )}
          {filters.length === 0 && !schema.searchable ? (
            <div className="text-caption text-center" style={{ fontSize: 13, padding: "28px 0" }}>설정 가능한 필터가 없습니다.</div>
          ) : (
            /* 섹션 제목("필터 항목")은 두지 않는다(2026-09-11 사용자 결정) — 드로어 제목 '상세 필터'가 이미
               내용을 지시하므로 중복이다. 항목 라벨이 곧 소제목 역할을 한다. */
            <div className="flex flex-col">
              {filters.map((label) => {
                const ff = resolveFilterField(label, schema);
                return ff.kind === "tag"
                  ? <DrawerCheckRow key={label} label={label} checked={!!applied[label]} onClick={() => toggleTag(label)} />
                  : <DrawerFilterControl key={label} ff={ff} value={applied[label] ?? ""} onChange={(v) => setVal(label, v)} onEnter={onClose} />;
              })}
            </div>
          )}
        </div>
        <SheetFooter>
          {/* 초기화 = 즉시 전체 해제(드로어는 열린 채) · 필터 적용 = 닫기(값은 이미 적용됨) — typed 페이지와 동일 */}
          <Button variant="outline" size="md" onClick={() => onApply({})}>초기화</Button>
          <Button variant="primary" size="md" style={{ flex: 1 }} onClick={onClose}>필터 적용</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* 활성 필터(filterValues)로 행 1건의 통과 여부 판정.
   값-필터(year/month/enum/date/number/text)는 모두 AND, 카테고리 태그끼리는 합집합(OR).
   text/number는 부분일치(includes), 그 외(year/month/enum/date)는 정확일치. columnKey 미해결 필터는 무시(칩만). */
function rowMatchesFilters(row: Row, schema: PageSchema, filterValues: Record<string, string>): boolean {
  const active = Object.entries(filterValues).filter(([, v]) => v !== "");
  if (active.length === 0) return true;
  const tags: string[] = [];
  for (const [label, value] of active) {
    // 검색어(예약 라벨): 전 컬럼 부분일치(OR) — 휴리스틱(tag 오판) 우회, 다른 필터와는 AND
    if (label === SEARCH_LABEL) {
      const q = value.toLowerCase();
      const hit = schema.columns.some((c) => String((row as Record<string, unknown>)[c.key] ?? "").toLowerCase().includes(q))
        || row.category.toLowerCase().includes(q);
      if (!hit) return false;
      continue;
    }
    const ff = resolveFilterField(label, schema);
    if (ff.kind === "tag") { tags.push(label); continue; }
    if (!ff.columnKey) continue;
    const rv = String((row as Record<string, unknown>)[ff.columnKey] ?? "");
    const ok = ff.kind === "text" || ff.kind === "number"
      ? rv.toLowerCase().includes(value.toLowerCase())
      : rv === value;
    if (!ok) return false;
  }
  if (tags.length > 0 && !tags.includes(row.category)) return false;
  return true;
}

/* 상세 팝업 레지스트리 — 스키마의 detail 키 → 팝업 컴포넌트. 스키마는 키만 선언하고 매핑은 여기가 갖는다.
   팝업은 읽기전용이지만 **누른 행**을 받는다 — S1_43 산출내역·S1_40 체크리스트는 행마다 값이 다르다.
   ⚠ `row` 를 안 넘기던 종전 코드 탓에 CompanyProfileModal 의 `row?` prop 이 한 번도 소비되지 않아
     어느 행을 눌러도 헤더 대상명이 폴백 상수로 굳어 있었다(선언이 소비처까지 닿지 않는 그 부류).
   타입 파라미터는 반변이라 `{ onClose }` 만 받는 기존 팝업도 그대로 할당된다 — 무수정으로 남겨 둔다. */
const DETAIL_MODALS: Record<DetailPopup, (p: { onClose: () => void; row: Row }) => React.ReactElement> = {
  monthlyReport: MonthlyReportModal,
  gpSpec: GpSpecModal,
  companyProfile: CompanyProfileModal,
  mgmtFeeDetail: MgmtFeeDetailModal,
  dueDiligChecklist: DueDiligChecklistModal,
};
/* 링크 셀 title(동작 힌트) — 값은 절대 넣지 않는다(마스크 경계) */
const DETAIL_HINT: Record<DetailPopup, string> = {
  monthlyReport: '월간보고 상세 보기',
  gpSpec: '운용사 명세 보기',
  companyProfile: '투자기업 기업개요 보기',
  mgmtFeeDetail: '관리보수보고 상세조회',
  dueDiligChecklist: '투자금실사보고서 체크리스트 조회',
};

/* 셀 안 링크 — 값 클릭으로 상세 팝업 진입. occasional_report_manage.tsx의 LinkCell 복사 관례.
   ⚠ `title`엔 동작 힌트만 담는다 — 값을 넣으면 마스크 ON일 때 툴팁으로 실데이터가 샌다(마스크 경계는 툴팁까지).
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다.
   외관: primary + 600, 평상시 밑줄 없음 / hover에만 밑줄(목업 `.linktxt`). */
function LinkCell({ value, hint, onClick }: { value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate text-left text-primary font-semibold no-underline hover:underline cursor-pointer"
      style={{ font: 'inherit', fontWeight: 600, background: 'transparent', border: 0, padding: 0 }}>
      <MT>{value}</MT>
    </button>
  );
}

/* 셀 안 select — `ColumnSpec.inlineSelect` 선언 컬럼. 원문 S1_43 `<select class="cellsel" data-cfm>` 이식.
   왜 셀 편집인가: 원문은 등록 폼이 없는 **조회 화면**인데 이 컬럼 하나만 바꾼다. `fields` 를 채우면
   `editable` 이 켜져 원문에 없는 `등록` 버튼이 생기므로(generic_list `editable = fields.length > 0`)
   컬럼 수준 계약으로 푼다. 원문도 StatusBadge 격인 `cfmTag()` 를 정의만 해 두고 쓰지 않는다 —
   이 셀은 select 만 그린다(배지와 함께 그리면 같은 값이 두 번 나온다).

   ⚠ 값은 마스킹하지 않는다. select 의 표시값은 **선택 상태**이고 가리면 무엇이 선택됐는지 알 수 없어
     컨트롤이 무의미해진다(StatusBadge 를 안 가리는 것과 같은 이유 — "축은 두고 데이터는 가린다").
   ⚠ 폰트는 inline 으로 준다 — preflight:false 라 select 가 UA 기본(13.3px Arial)으로 튄다.
   ⚠ Chrome UA 때문에 height 만으로는 안 맞는다 — lineHeight 를 함께 준다([[form-control-height-38-line-height-trap]]). */
function InlineSelectCell({ value, options, label, onChange }: {
  value: string; options: string[]; label: string; onChange: (v: string) => void;
}) {
  return (
    <select
      value={options.includes(value) ? value : options[0]}
      aria-label={label + ' 선택'}
      onChange={(e) => onChange(e.target.value)}
      /* 셀 클릭이 행 선택·컨텍스트로 새지 않도록 컨트롤 안에서 멈춘다 */
      onClick={(e) => e.stopPropagation()}
      className="rounded-tok-sm border border-border-strong bg-card text-foreground"
      style={{ font: 'inherit', fontSize: 12.5, height: 30, lineHeight: '20px', padding: '0 8px', maxWidth: '100%' }}>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

export function GenericListPage({ route, onNav }: { route: string; onNav: (r: string) => void }) {
  const { title, crumbs } = findMenuContext(route);
  const schema = resolveSchema(route);
  /* editable = 등록 가능 스키마(fields 보유). 툴바 규약의 분기 하나를 이것이 결정한다(2026-09-11 사용자 결정):
     등록이 있으면 combo(split) 버튼 하나로 합치고, 등록이 없으면 종전처럼 kebab(⋯) 단독. */
  const editable = schema.fields.length > 0;
  const masked = useMask();   // Excel 우측정렬 숫자 셀의 마스킹 시 값을 0으로(실값 비노출)
  const apiRef = useRef<GridApi<Row> | null>(null);
  const [rows, setRows] = useState<Row[]>(() => makeRows(schema, 23));
  const [selCount, setSelCount] = useState(0);   // AG Grid 선택 행 수(수제 Set 선택 대체)
  // 상태 SSOT: 필터 라벨 → 선택값(빈 값/부재 = 비활성). 칩·행필터 모두 여기서 파생.
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 23 });   // AG Grid 페이지네이션 미러
  const [viewState, setView] = useState("list");
  // 카드뷰 미사용 스키마(hideCardView)는 SegTabs를 숨기고 리스트 뷰로 고정 — view === "list" 게이트가 모두 참이 된다
  const view = schema.hideCardView ? "list" : viewState;
  const [showAll, setShowAll] = useState(false);   // 전체보기 — 페이지 크기를 전체 행 수로 키워 한 페이지에 모두 표시
  const [modal, setModal] = useState<{ mode: "create" | "edit"; row?: Row } | null>(null);
  /* 상세 보고서 팝업 — 컬럼이 detail을 선언한 스키마만(정기보고 등). 편집 모달과 별개 상태다:
     둘은 서로 다른 진입(셀 링크 vs 더블클릭)이고 동시에 열리지 않는다. */
  const [detail, setDetail] = useState<{ kind: DetailPopup; row: Row } | null>(null);
  const detailCol = schema.columns.find((c) => c.detail);
  /* 이 행에서 상세가 열리는가 — 판정 정본은 schemas/detail_link.ts 의 linksDetail 하나다.
     소비처가 셋(셀 렌더러·셀 Enter·우클릭 상세조회)이라 종전처럼 술어를 복제하면
     "링크는 보이는데 Enter 는 안 먹는다"가 에러 없이 생긴다. */
  const hasDetail = (row: Row) => linksDetail(detailCol, (row as Record<string, unknown>)[detailCol?.key ?? '']);
  const openDetail = (row: Row) => { if (detailCol?.detail) setDetail({ kind: detailCol.detail, row }); };
  /* 상단 kebab 가시성 — 뷰포트에서 벗어나면(스크롤) 푸터 kebab 폴백을 노출(골드 subfund_manage 동형) */
  const [filterOpen, setFilterOpen] = useState(false);
  /* 금액 단위 토글 — `schema.unitToggle` 이 선언돼 있어도 **소비처가 없어** 화면에 안 나오고
     금액이 원 원시값으로 굳어 있었다(2026-09-16 Codex 4R P1). group·note·pinned 와 같은 부류다.
     환산은 **셀 렌더·엑셀 경계에서만** 한다 — rows 에 환산값을 써넣으면 KPI 합계·필터 비교값까지 흔들린다. */
  const [unit, setUnit] = useState<Unit>(isUnit(schema.defaultUnit ?? '') ? (schema.defaultUnit as Unit) : DEFAULT_UNIT);
  // 토글은 금액 컬럼이 실제로 있을 때만 의미가 있다(선언만 있고 금액이 없으면 빈 컨트롤이 된다).
  const unitOn = !!schema.unitToggle && schema.columns.some((c) => c.type === 'amount');
  const [ctx, setCtx] = useState<CtxMenuState>(null);   // 우클릭 컨텍스트 메뉴 좌표·항목(null=닫힘)

  // 활성 필터로 행을 실제 필터링 → KPI·카드뷰·건수는 이 결과 기준
  // (그리드 리스트뷰는 external filter로 동일 술어를 적용 — 페이지네이션은 그리드가 소유).
  const filtered = rows.filter((r) => rowMatchesFilters(r, schema, filterValues));
  // 칩: filterValues에서 파생 (값-필터는 "라벨: 값", 카테고리 태그는 값 없이 라벨만)
  // 검색어(예약 라벨)는 휴리스틱이 tag로 오판하므로 값-칩으로 강제
  const chipItems = Object.entries(filterValues).map(([label, value]) => ({
    label, value: label !== SEARCH_LABEL && resolveFilterField(label, schema).kind === "tag" ? undefined : value,
  }));
  /* 필터 변경 단일 관문 — 드로어(즉시 반영)·툴바 칩 ×·초기화가 모두 이 함수를 거친다.
     여기서만 첫 페이지로 되돌리므로 경로마다 정책이 갈리지 않는다(칩 ×만 페이지 유지되던 불일치 해소). */
  const applyFilters = (next: Record<string, string>) => { setFilterValues(next); apiRef.current?.paginationGoToFirstPage(); };
  const removeFilter = (label: string) => { const n = { ...filterValues }; delete n[label]; applyFilters(n); };

  /* 제네릭 금액·변동률 KPI(총액/평균 변동률)는 makeRows 의 **합성 시드**를 집계한 값이다.
     리터럴 샘플(원문 행)을 쓰는 화면에는 그 시드가 없으므로 배지를 아예 내린다 —
     0원·0%를 띄우면 "실적이 0"이라는 다른 거짓말이 된다. countKpis(건수형)는 실제 행을 세므로 무관. */
  const genericMetrics = !schema.sample;
  // 파생 KPI (필터 결과 기준)
  const sumAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const avgChange = filtered.length ? filtered.reduce((s, r) => s + r.change, 0) / filtered.length : 0;
  const avgUp = avgChange >= 0;
  // 건수형 KPI(schema.countKpis) — column+value 매칭 행 수, 없으면 전체. 값은 필터 결과 기준.
  const countKpiNodes = schema.countKpis?.map((k) => {
    const n = k.column && k.value != null
      ? filtered.filter((r) => String((r as Record<string, unknown>)[k.column!]) === k.value).length
      : filtered.length;
    return <KpiBadge key={k.label} icon={k.icon} color={k.color} label={k.label} value={mn(String(n)) + " 건"} />;
  });

  // ── AG Grid 연결 ──
  const onGridReady = useCallback((e: GridReadyEvent<Row>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<Row>) => { setSelCount(e.api.getSelectedRows().length); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next)); // 값 동일 시 동일 참조 반환→재렌더 방지
  }, []);

  // 외부 필터(상세필터 드로어 → 그리드 행 거르기). 값이 바뀌면 그리드에 재적용 통지.
  const filterActive = Object.values(filterValues).some((v) => v !== "");
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [filterValues]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback(
    (node: IRowNode<Row>) => (node.data ? rowMatchesFilters(node.data, schema, filterValues) : true),
    [schema, filterValues]);

  // ── 스키마 주도 컬럼 정의 ──
  // 특수 컬럼(name=2줄 · trend=스파크라인)만 전용 cellRenderer, 그 외는 Cell 재사용(마스킹 내장).
  // 마지막 '관리' 컬럼은 editable일 때만 — 더블클릭 수정과 동일하게 수정 모달을 연다.
  const columnDefs = useMemo<(ColDef<Row> | ColGroupDef<Row>)[]>(() => {
    // 남는 그리드 폭을 채울 stretch 컬럼 = 주 식별/텍스트 컬럼(마지막 left-text, 또는 name).
    // 이 컬럼만 flex로 잔여폭 흡수 + autoSize 제외(fitCellContents가 폭을 고정하지 않도록) → 우측 빈 공간 제거.
    const textCols = schema.columns.filter((c) => (c.type === "text" || c.key === "name") && c.align !== "right" && c.key !== "trend");
    const stretchKey = textCols.length ? textCols[textCols.length - 1].key : undefined;
    const cols: ColDef<Row>[] = schema.columns.map((c): ColDef<Row> => {
      const stretch = c.key === stretchKey;
      if (c.key === "name") {
        return {
          field: "name", headerName: c.label,
          ...(stretch ? { flex: 1, minWidth: 200, suppressAutoSize: true } : { width: 240, minWidth: 180, maxWidth: 360 }),   // stretch면 잔여폭 흡수, 아니면 골드 subfund_manage 폭 규칙
          cellStyle: { display: "flex", flexDirection: "column", justifyContent: "center" },
          cellRenderer: (p: ICellRendererParams<Row>) => (
            <div className="min-w-0" style={{ lineHeight: 1.25 }}>
              <div className="font-semibold" style={{ fontSize: 13.5 }}><MT>{p.data?.name}</MT></div>
              <div className="text-muted-foreground" style={{ fontSize: 12 }}><MT>{p.data?.category}</MT></div>
            </div>
          ),
        };
      }
      if (c.key === "trend") {
        return {
          field: "trend", headerName: c.label, width: 120, minWidth: 120, sortable: false,   // 스파크라인 — 내용폭 측정이 좁으니 하한 고정
          cellDataType: false,   // 값은 number[](스파크라인) — 커스텀 렌더러라 타입 추론 불필요(AG Grid warning #48 억제)
          cellStyle: { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any },
          cellRenderer: (p: ICellRendererParams<Row>) => <MT w={40}><MiniBars data={(p.value as number[]) || []} color={p.data?.color || "var(--chart-1)"} /></MT>,
        };
      }
      const right = c.align === "right";
      return {
        field: c.key as any,   // 스키마 동적 키 — Row 정적 타입 밖
        headerName: unitOn && c.type === 'amount' ? amountHeader(c.label, unit) : c.label + (c.unit ? ` (${c.unit})` : ""),
        ...noteHeader<Row>(c.note),   // 목업 `!` 마커 — 선언(ColumnSpec.note)만 있고 안 그려지던 자리
        /* 셀 안 select 가 초점을 가진 동안에는 그리드가 키를 가로채지 않는다 —
           안 막으면 ↑↓ 가 옵션 변경 대신 셀 이동이 되어 마우스 없이는 값을 못 바꾼다. */
        ...(c.inlineSelect ? { suppressKeyboardEvent: (p: SuppressKeyboardEventParams<Row>) => (p.event.target as HTMLElement | null)?.tagName === 'SELECT' } : {}),
        ...(c.pinned ? { pinned: c.pinned } : {}),   // 좌측 고정 — 같은 이유로 안 넘어가던 자리
        ...(stretch ? { flex: 1, minWidth: 200, suppressAutoSize: true } : { minWidth: 110, maxWidth: 240 }),   // stretch면 잔여폭 흡수, 아니면 긴 텍스트 상한 캡
        type: right ? "rightAligned" : undefined,
        ...(c.multiline ? { autoHeight: true, wrapText: true, minWidth: 260, maxWidth: 360 } : {}),
        cellStyle: c.multiline
          // 여러 줄 원문(사후관리 내용 등) — 기본 nowrap+ellipsis 면 5줄이 한 줄로 잘린다(원문 .content-cell)
          ? { display: "flex", alignItems: "flex-start", textAlign: (c.align || "left") as any, whiteSpace: "pre-line", lineHeight: 1.5, paddingTop: 8, paddingBottom: 8 }
          : { display: "flex", alignItems: "center", textAlign: (c.align || "left") as any, ...(right ? { justifyContent: "flex-end" } : {}) },
        /* 렌더러 분기 4갈래:
           ① detail 옵트인 컬럼 — 값이 detailWhen과 같은 셀만 링크가 되고 나머지는 평상 셀이다
              (정기보고: 보고구분 '월간보고'만 상세 보고서가 있고 반기·연간은 없다 — 원문 목업 동작)
           ② attachFrom 컬럼(제목 등) — 값 뒤에 첨부 확장자 칩을 덧붙인다(첨부 전용 컬럼을 만들지 않는 표현 규약).
              값(텍스트)은 min-w-0 + ellipsis로 줄고, 칩은 shrink-0이라 긴 제목에도 살아남는다.
           ③ inlineSelect 컬럼 — 셀 안 select(S1_43 확정여부). 값을 바꾸면 rows 가 바뀐다.
           ④ 그 외 — 공용 Cell(마스킹 내장) */
        cellRenderer: c.detail
          ? (p: ICellRendererParams<Row>) => (linksDetail(c, p.value)
              ? <LinkCell value={String(p.value ?? "")} hint={DETAIL_HINT[c.detail!]} onClick={() => { if (p.data) setDetail({ kind: c.detail!, row: p.data }); }} />
              : <Cell col={c} value={p.value} color={p.data?.color} statusDomain={schema.statusDomain} unit={unitOn ? unit : undefined} />)
          : c.inlineSelect
          ? (p: ICellRendererParams<Row>) => (
              <InlineSelectCell
                value={String(p.value ?? '')} options={c.inlineSelect!} label={c.label}
                onChange={(v) => { if (p.data) setCellValue(p.data.id, c.key, v); }} />
            )
          : c.attachFrom
          ? (p: ICellRendererParams<Row>) => (
              <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
                <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  <Cell col={c} value={p.value} color={p.data?.color} statusDomain={schema.statusDomain} unit={unitOn ? unit : undefined} />
                </span>
                <AttachChips value={(p.data as Record<string, unknown> | undefined)?.[c.attachFrom!]} />
              </span>
            )
          : (p: ICellRendererParams<Row>) => <Cell col={c} value={p.value} color={p.data?.color} statusDomain={schema.statusDomain} unit={unitOn ? unit : undefined} />,
      };
    });
    // '관리' 액션 컬럼 제거(2026-09-11) — 행 더블클릭(onRowDoubleClicked)이 수정 모달을 열어 기능 대체.
    // 2단 헤더: ColumnSpec.group 이 선언된 스키마(투자기업명세서 58컬럼·전체 투자실적 회수실적 4컬럼)는
    // 연속 그룹을 ColGroupDef 로 접는다. group 이 없는 스키마는 이 호출이 그대로 통과시킨다.
    return foldGroups(cols, schema.columns);
  }, [schema, editable, unitOn, unit]);

  /* 셀 안 select 의 값 변경(ColumnSpec.inlineSelect) — 원문 `DATA[i].cfm = s.value` 에 대응.
     rows 가 SSOT 라 여기에 써야 필터·건수·엑셀이 같이 따라온다(그리드 node 만 고치면 React 쪽이 낡는다).
     ⚠ 함수형 갱신만 쓴다 — columnDefs useMemo 의 deps 에 rows 가 없어 렌더러 클로저가 첫 렌더에 묶인다.
       rows 를 직접 읽으면 낡은 배열을 덮어써 이전 변경이 되돌아간다. */
  const setCellValue = useCallback((id: string, key: string, value: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  }, []);

  // CRUD
  const save = (row: Row) => {
    const creating = modal?.mode === "create";
    setRows((prev) => creating
      ? [{ ...row, id: nextId() }, ...prev]
      : prev.map((r) => (r.id === row.id ? row : r)));
    setModal(null);
    toast.success(creating ? "항목이 등록되었습니다" : "항목이 수정되었습니다");
  };
  const deleteOne = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
    apiRef.current?.deselectAll();
    setModal(null);
    toast.success("항목이 삭제되었습니다");
  };
  /* 선택 행 수정 — 체크 1건일 때만 노출되는 툴바 액션(2026-09-17). 더블클릭·Enter·우클릭 '수정'과
     같은 모달을 연다(대체가 아니라 추가 진입점). 선택 행은 bulkDelete와 동일하게 클릭 시점에 읽는다 —
     selCount만 state로 두고 행 자체는 그리드가 SSOT다. detail 팝업이 떠 있으면 무시(더블클릭 경로와 동형). */
  const editSelected = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (sel.length !== 1 || detail !== null) return;
    setModal({ mode: "edit", row: sel[0] });
  };
  const bulkDelete = () => {
    const sel = apiRef.current?.getSelectedRows() ?? [];
    if (!sel.length) return;
    const ids = new Set(sel.map((r) => r.id));
    setRows((prev) => prev.filter((r) => !ids.has(r.id)));
    apiRef.current?.deselectAll();
    toast.success(`${sel.length}개 항목을 삭제했습니다`);
  };

  // Excel(.xlsx) 내보내기 — SheetJS. 스키마 컬럼을 동적 추출(스파크라인 trend는 값 없음 → 제외), 현재 필터(filtered) 반영.
  // 화면 우측정렬(align:'right') 숫자 컬럼만 숫자 셀(t:'n'+z)로 기록 → Excel 자동 우측정렬·실데이터 연동 시 계산 가능.
  // 그 외(text/code/date/status·center 정렬)는 화면처럼 텍스트 셀(좌측). 마스크 ON이면 숫자 셀 값을 0으로 비노출.
  // ※ Excel은 center 정렬을 스타일 없이 못 내므로(커뮤니티 xlsx 한계) center 숫자 컬럼은 텍스트(좌측) 유지가 최선.
  const exportExcel = () => {
    const cols = schema.columns.filter((c) => c.key !== 'trend');
    const cell = (v: any) => mn(typeof v === 'number' ? v.toLocaleString() : String(v ?? ''));
    /* 숫자서식은 **그 값의 실제 소수 자릿수**를 따른다 — 고정 '#,##0.0' 으로 두면 단위 환산으로
       생긴 2자리 값(억원 12.35)이 엑셀에서 12.4 로 반올림돼 화면과 파일이 달라진다
       (2026-09-16 Codex 7R P2). toUnit 은 최대 2자리를 만든다. */
    const zFmt = (v: number) => {
      const d = (String(v).split('.')[1] ?? '').length;
      return d === 0 ? '#,##0' : `#,##0.${'0'.repeat(Math.min(d, 2))}`;
    };
    const isNum = (c: typeof cols[number], v: any) => c.align === 'right' && typeof v === 'number';   // 우측정렬 숫자 컬럼만
    // 내보내기는 **화면에 보이는 단위**를 따른다(unit.ts 엑셀 계약). 헤더에 단위를 적지 않으면
    // 1/10⁸ 값이 의미 불명이 되므로 금액 컬럼 헤더는 amountHeader 를 거친다.
    const conv = (c: typeof cols[number], v: number) => (unitOn && c.type === 'amount' ? toUnit(v, unit) : v);
    const header = cols.map((c) => (unitOn && c.type === 'amount' ? amountHeader(c.label, unit) : c.label + (c.unit ? ` (${c.unit})` : '')));
    const body = filtered.map((r) => cols.map((c) => {
      const v = (r as any)[c.key];
      return isNum(c, v) ? (masked ? 0 : conv(c, v)) : cell(v);
    }));
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    // 숫자 셀에 화면 포맷과 일치하는 숫자서식(z) 부여 (행: 헤더 다음=1부터)
    filtered.forEach((r, i) => cols.forEach((c, j) => {
      const raw = (r as any)[c.key];
      if (!isNum(c, raw)) return;
      const addr = XLSX.utils.encode_cell({ r: i + 1, c: j });
      if (ws[addr]) ws[addr].z = zFmt(conv(c, raw));
    }));
    ws['!cols'] = cols.map((c) => ({ wch: c.key === 'name' ? 22 : 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '목록');
    XLSX.writeFile(wb, `${title}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };


  /* 앱-스코프 단축키 — 등록 ⌘⏎(편집 가능 + 모달 닫힘일 때만)·인쇄 ⌘P·내보내기 ⌥D. 힌트는 kebab의 DropdownMenuShortcut */
  useHotkey(HOTKEYS.register.combo, () => setModal({ mode: 'create' }), { enabled: editable && modal === null && detail === null && !filterOpen && ctx === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  // 행 복사 — 스키마 컬럼(스파크라인 trend 제외)을 TSV로. 마스크 ON이면 mn()으로 실값 비노출(엑셀과 동일 계약).
  const copyRow = (row: Row) => {
    const line = schema.columns.filter((c) => c.key !== 'trend')
      .map((c) => mn(String((row as any)[c.key] ?? ''))).join('\t');
    navigator.clipboard?.writeText(line).then(
      () => toast.success('행을 복사했습니다'),
      () => toast.error('복사에 실패했습니다'));
  };

  // 우클릭 컨텍스트 메뉴 — Community엔 내장 메뉴가 없어 onCellContextMenu(이벤트만 제공)로 직접 띄운다.
  // pinned 행(합계 등)·데이터 없는 셀은 제외. 항목은 기존 CRUD 핸들러 재사용.
  const handleCellContextMenu = (e: CellContextMenuEvent<Row>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [];
    // 원문 목록의 '상세조회' 버튼 대체 진입 — 액션 컬럼을 새로 만들지 않고 컨텍스트 메뉴에 둔다
    if (hasDetail(row)) items.push({ label: '상세조회', icon: 'search', onSelect: () => openDetail(row) });
    if (editable) items.push({ label: '수정', icon: 'file', onSelect: () => setModal({ mode: 'edit', row }) });
    items.push({ label: '행 복사', icon: 'layers', onSelect: () => copyRow(row) });
    items.push({ label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel });
    if (editable) { items.push('sep'); items.push({ label: '삭제', icon: 'trash', danger: true, onSelect: () => deleteOne(row.id) }); }
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  // 전체보기 시 페이지 크기 = 전체 행 수 → total pages가 1이 되어 푸터 페이지네이션이 자동으로 숨는다
  const pageSize = showAll ? Math.max(rows.length, 1) : PER;
  // 푸터 건수 — 리스트뷰는 그리드 페이지 기준, 카드뷰는 필터 결과 기준
  const shown = view === "list" ? Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize)) : filtered.length;
  const totalForCount = view === "list" ? page.rowCount : filtered.length;

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다
     (contextActions 슬롯). 그래서 선택 시 toolbarLeft 는 비워 둔다 — 둘 다 넘기면 탭 스톱이 2벌 된다. */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{selCount}건 선택됨</span>
      {/* 단건 체크일 때만 '수정' — 다건 선택에 수정 모달은 의미가 없다(bespoke user_manage·subfund_manage 규약과 동형) */}
      {editable && selCount === 1 && <Button variant="primary" size="sm" leadingIcon="file" onClick={editSelected}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: "var(--danger)" }} onClick={bulkDelete}>선택 삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;
  return (
    <GridFrame
      crumbs={crumbs}
      title={title}
      favRoute={route}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav("main")}>메인으로</Button>}
      kpis={schema.hideKpis ? undefined : countKpiNodes ? <>{countKpiNodes}</> : (schema.hideMetrics || !genericMetrics) ? undefined : (<>
        <KpiBadge icon="trending" color="var(--chart-1)" label="평균 변동률"
          value={mn((avgUp ? "+" : "-") + Math.abs(avgChange).toFixed(1)) + "%"}
          valueColor={avgUp ? "var(--success-text)" : "var(--danger-text)"} />
        <KpiBadge icon="wallet" color="var(--accent)" label="합계 금액"
          value={"₩" + mn(Math.round(sumAmount / 100).toLocaleString()) + "억"} />
      </>)}
      toolbarLeft={selCount > 0 ? null : (
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {chipItems.map((c) => <FilterPill key={c.label} label={c.label} value={c.value} onRemove={() => removeFilter(c.label)} />)}
          {chipItems.length === 0 && <span className="text-caption" style={{ fontSize: 12.5 }}>필터 없음</span>}
        </>
      )}
      contextActions={selActions}
      toolbarRight={<>
        {unitOn && <>
          <span className="text-caption" style={{ fontSize: 12 }}>금액 단위</span>
          <SegTabs size="sm" options={UNITS as unknown as string[]} value={unit} onChange={(v: string) => setUnit(v as Unit)} />
        </>}
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* 등록 버튼 — 라벨은 도메인 액션명 그대로(스키마 entity, '공고 등록' 등), "등록"으로 줄이지 않는다.
            보조 액션(내보내기·인쇄)은 푸터 FooterActions 가 항시 노출한다(2026-09-17 kebab·combo 폐기). */}
        {editable && (
          <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ mode: "create" })}>{schema.entity + " 등록"}</Button>
        )}
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={() => { setRows(makeRows(schema, 23)); apiRef.current?.deselectAll(); apiRef.current?.paginationGoToFirstPage(); }} />
      </>}
      footerLeft={'총 ' + mn(String(totalForCount)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}
      footerCenter={view === "list" && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => i).map((i) => (
            <button key={i} onClick={() => apiRef.current?.paginationGoToPage(i)} aria-label={`${i + 1} 페이지`} aria-current={i === page.current ? "page" : undefined} style={{
              width: 32, height: 32, borderRadius: 8, border: "1px solid",
              borderColor: i === page.current ? "var(--primary)" : "var(--border)",
              background: i === page.current ? "color-mix(in srgb, var(--primary) 10%, transparent)" : "transparent",
              color: i === page.current ? "var(--primary)" : "var(--foreground)",
              font: "inherit", fontSize: 13, fontWeight: i === page.current ? 700 : 500, cursor: "pointer", transition: "all .12s",
            }}>{i + 1}</button>
          ))}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

        {/* 테이블 / 상세 뷰 (GridFrame children) */}
        {view === "list" ? (
          /* AG Grid 본체 — 스키마 주도 컬럼 + 체크박스 선택(hideRowSelection이면 없음) + 페이지네이션 + external filter.
             더블클릭=수정 모달(editable 한정). 행선택 배경은 공유 테마의 --row-selected(회색). */
          <div>
            <AgGridReact<Row>
              theme={apfsTheme}
              rowData={rows}
              columnDefs={columnDefs}
              getRowId={(p) => p.data.id}
              domLayout="autoHeight"
              autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(첫 렌더 1회). columnDefs flex 제거가 전제. 골드 subfund_manage와 동일
              rowHeight={44}
              defaultColDef={DEFAULT_COL_DEF}
              rowSelection={schema.hideRowSelection ? undefined : ROW_SELECTION}
              selectionColumnDef={SELECTION_COL}   // 선택 컬럼 = DS Checkbox(셀+3상태 헤더)
              pagination
              paginationPageSize={pageSize}
              paginationPageSizeSelector={false}
              suppressPaginationPanel
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onGridReady={onGridReady}
              onSelectionChanged={onSelectionChanged}
              onPaginationChanged={onPaginationChanged}
              /* 상세 팝업이 열려 있으면 행 더블클릭은 무시한다 — 링크 셀 더블클릭 시 첫 클릭이 팝업을 열고
                 두 번째 클릭이 오버레이에 먹혀 실측상 수정 모달은 안 열리지만(2026-09-12 확인), 그 방어는
                 렌더 타이밍에 기대는 것이라 상태로 한 번 더 막는다(Codex 리뷰 P2). */
              onRowDoubleClicked={editable ? (e) => { if (detail === null && e.data) setModal({ mode: "edit", row: e.data }); } : undefined}
              onCellKeyDown={(e: CellKeyDownEvent<Row>) => {
                // 관리 컬럼 제거 대체 — 키보드로 행에서 Enter 시 수정 모달(더블클릭과 동일). 선택 체크박스 컬럼은 Enter=선택 토글 유지.
                const ke = e.event as KeyboardEvent | null;
                if (!ke || ke.key !== "Enter" || !e.data) return;
                const colId = e.column?.getColId?.() ?? "";
                if (colId.startsWith("ag-Grid")) return;
                /* 링크 셀은 AG Grid의 Tab 순회가 셀 안 button에 닿지 않으므로 셀 Enter로 진입을 보장한다
                   (occasional_report_manage.tsx onCellKeyDown과 동일 이유). 편집 모달보다 우선. */
                if (detailCol && colId === detailCol.key && hasDetail(e.data)) { openDetail(e.data); return; }
                /* 셀 안 select 도 Tab 순회가 닿지 않는다(LinkCell 과 같은 이유) — 셀 Enter 로 초점을 넣어준다.
                   넣고 나면 suppressKeyboardEvent 가 ↑↓·Enter 를 select 에 맡긴다. */
                if (schema.columns.some((c) => c.key === colId && c.inlineSelect)) {
                  (ke.target as HTMLElement | null)?.querySelector?.('select')?.focus();
                  return;
                }
                if (editable) setModal({ mode: "edit", row: e.data });
              }}
              preventDefaultOnContextMenu
              onCellContextMenu={handleCellContextMenu}
              overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 항목이 없습니다</span>'}
            />
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(240px, 100%), 1fr))", padding: 18 }}>
            {filtered.map((r) => (
              <button key={r.id} onClick={editable ? () => setModal({ mode: "edit", row: r }) : undefined}
                className="text-left border border-border bg-card flex flex-col gap-2.5 p-3.5"
                style={{ borderRadius: 12, cursor: editable ? "pointer" : "default", font: "inherit" }}>
                <div className="flex items-center gap-2.5">
                  <ColorChip icon={r.icon} color={r.color} size={36} iconSize={18} />
                  <div className="min-w-0">
                    <div className="font-semibold" style={{ fontSize: 13.5 }}><MT>{r.name}</MT></div>
                    <div className="text-muted-foreground" style={{ fontSize: 12 }}><MT>{r.category}</MT></div>
                  </div>
                </div>
                {!schema.hideMetrics && genericMetrics && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="tabular font-bold" style={{ fontSize: 15 }}>{mn(r.amount.toLocaleString())}</span>
                      <DeltaBadge value={r.change} />
                    </div>
                    <StatusBadge tone={statusTone(r.status)} label={r.status} size="sm" />
                  </>
                )}
              </button>
            ))}
          </div>
        )}

      {modal && (
        <RowFormModal
          mode={modal.mode}
          initial={modal.row}
          schema={schema}
          onSave={save}
          onClose={() => setModal(null)}
          onDelete={modal.row ? () => deleteOne(modal.row!.id) : undefined} />
      )}

      {/* 읽기전용 상세 보고서 팝업 — 스키마가 detail을 선언한 컬럼에서만 열린다(그 외 페이지엔 없음) */}
      {detail && React.createElement(DETAIL_MODALS[detail.kind], { onClose: () => setDetail(null), row: detail.row })}

      <ListFilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        schema={schema}
        applied={filterValues}
        onApply={applyFilters} />

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
    </GridFrame>
  );
}
