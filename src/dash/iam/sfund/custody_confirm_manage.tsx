/* 자펀드수탁관리(확정) — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 자펀드수탁관리(확정)).
   출처: S1_27_자펀드수탁관리_확정_.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기준일자 단일·필수)  → 상세필터 드로어 1항목(PeriodPicker day). **행 필터가 아니라 조회 기준 컨텍스트**라
       목업 기본값 `2026-07-31`(실 캡처 기준일)을 그대로 유지한다 — 상세 팝업 부제에 실리는 값이라 빈 값이 될 수 없다.
       (apfs-detail-filter의 "목업 기본값을 필터 초기값으로 쓰지 않는다"는 **행을 거르는 필터**에 대한 규약이다.)
   - 툴바 좌 주 필터                → `확정여부` FilterChip(전체·확정·미확정). ⚠ 목업 검색박스엔 없는 **파생 칩**이다
       (행 `confirm` 값에서 파생 — 수시보고 '확인상태' 파생 칩과 같은 관례). 드로어 select와 state를 공유한다.
   - 3단 헤더 목록 그리드          → AG Grid 중첩 `ColGroupDef`(일치여부 > 투자자산/미투자자산 거래/미투자자산 > 리프),
       `marryChildren`. 합계행 없음 — 가산 가능한 금액 컬럼이 없다.
   - 행 선택(multiRow 체크박스, `SELECTION_COL`) → 1건일 때 선택 바 [수정] / 행 더블클릭=수정
       (2026-10-14 사용자 결정, 관리 열 삭제). 목업엔 체크박스가 없지만 선택이 [수정] 액션을 만든다(apfs-aggrid "체크박스" 절).
   - 마크 셀(O/X/-)                 → `StatusBadge`(O=success · X=danger) + 회색 칩('-').
   - 상세보기 셀                    → 셀 링크(+ 셀 Enter) → 읽기전용 `CustodyConfirmDetailModal`.
       ⚠ **행 더블클릭은 상세보기가 아니라 수정을 연다** — 상세보기 진입점은 링크뿐이다. 링크·버튼·select 안에서
         발생한 더블클릭은 무시해 링크를 두 번 누른 순간 엉뚱한 팝업이 뜨지 않게 한다(골드 `general_meeting_manage.tsx`의 우려와 동일).
   - 확정여부 셀                    → 셀 안 네이티브 `<select>`(목업 `confirmSel` 그대로). 변경은 로컬 state(백엔드 없음).
   - (2026-10-14 사용자 결정 — 기획서 회의록 반영분 이식)
     운용사·자펀드 셀                → 셀 링크(+ 셀 Enter) → `GpSpecModal` / `SubFundSpecModal`(+`SPEC_SAMPLE_SUBFUND`, 샘플 1건).
     선택 바 [수정]·행 더블클릭 · 툴바 [단건 등록] → `CustodyEntryModal`(custody_confirm_entry_modal.tsx). X가 하나라도 있으면 불일치.
     툴바 [불일치 건 알림]            → `CustodyMismatchAlertModal`(전체 행 중 불일치 목록 + 시스템 알림 발송).
   - KPI 배지 행                    → 미포함(브리프 확정). 금액 개념이 없어 건수 지표뿐이다.
   - 엑셀                           → SheetJS. 3단 헤더 병합을 `flattenForExcel`(깊이 N 재귀)로 columnDefs에서 자동 산출.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정:
   - 목록은 **실 화면 캡처 24건 발췌**(전체 약 152건) — 목업이 명시한 범위 그대로이고 나머지를 창작하지 않는다.
   - 확정여부 변경·단건 등록/수정은 로컬 state(불변 갱신)로만 반영된다(백엔드 없음). 등록 행은 사용자 입력값이다.
   - 상세 팝업은 원 구조도 예시 1건 고정 — 자펀드 고유 값이 아니다. */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { LeafTabBody } from '../leaf_tabs';   // 리프 탭 묶음(opt-in)
import type { LeafTabsSlot } from '../leaf_tabs';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { controlMinWidth } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle, SuppressKeyboardEventParams, SelectionChangedEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { SELECTION_COL, dropHiddenSelection } from '../../aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT, 좌측 고정 44px)
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from '../../ui/period-picker';
import { CustodyConfirmDetailModal } from './custody_confirm_detail_modal';
import { CustodyEntryModal } from './custody_confirm_entry_modal';
import type { CustodyEntryValue } from './custody_confirm_entry_modal';
import { CustodyMismatchAlertModal } from './custody_mismatch_alert_modal';
import { GpSpecModal } from '../report/gp_spec_modal';
import { SubFundSpecModal, SPEC_SAMPLE_SUBFUND } from '../report/subfund_spec_modal';   // 샘플 행 = 명세 팝업 공유본
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본(옵션 많으면 검색형)
import { LinkCell } from '../../link_cell';   // 셀 링크 공용본(상세 진입)

const { Button, IconBtn, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 DATA 구조 그대로(inv[2]·nt[2]·ni 를 리프 키로 폄)
────────────────────────────── */
export type Mark = 'O' | 'X' | '-';
export type MatchStatus = '일치' | '불일치';
export type ConfirmState = '확정' | '미확정';

export interface CustodyConfirmRow {
  id: string; no: number; gp: string; fn: string;
  invShares: Mark; invBal: Mark;      // 일치여부 > 투자자산 [보유주수·잔액]
  ntShares: Mark; ntBal: Mark;        // 일치여부 > 미투자자산 거래 [보유주수·잔액]
  niBal: Mark;                        // 일치여부 > 미투자자산 [잔액]
  status: MatchStatus;                // 상세보기 셀에 링크 텍스트로 표시
  confirm: ConfirmState;
}

/* 마크 배지 톤 — 목업 `tagCls`: O=.tag.g(ok) · X=.tag.d(danger) · '-'=.tag.n(회색, 아래 MarkCell) */
const MARK_TONE: Record<'O' | 'X', Tone> = { O: 'success', X: 'danger' };
/* 확정여부 옵션 — 목업 `confirmSel`의 2개 실값(빈 option 없음: 값이 ''가 되는 경로가 없다) */
const CONFIRM_OPTIONS: ConfirmState[] = ['확정', '미확정'];

/* 기준일자 기본값 — 목업 검색박스 `value="2026-07-31"`(실 화면 캡처 기준일).
   조회 기준 컨텍스트라 초기화(clearFilters)·칩 제거도 이 값으로 되돌린다(빈 값 금지 — 필수 항목). */
const BASE_DATE = '2026-07-31';

/* 데모 데이터 — 목업 DATA 24행을 값까지 그대로 옮겼다(전체 약 152건 중 실 캡처 발췌).
   [운용사, 자펀드, 투자자산 보유주수·잔액, 미투자자산 거래 보유주수·잔액, 미투자자산 잔액, 일치여부, 확정여부] */
const RAW: [string, string, Mark, Mark, Mark, Mark, Mark, MatchStatus, ConfirmState][] = [
  ['농업정책보험금융원', '농식품새싹키움매칭펀드', 'O', 'O', '-', '-', 'X', '불일치', '미확정'],
  ['농업정책보험금융원', '농식품혁신스타트업투자조합', 'O', 'O', '-', '-', 'X', '불일치', '미확정'],
  ['씨제이인베스트먼트(주)', 'TWI농식품상생투자조합', 'O', 'O', '-', '-', 'X', '불일치', '미확정'],
  ['씨제이인베스트먼트(주)', '타임와이즈농식품벤처펀드', 'O', 'O', '-', '-', 'X', '불일치', '미확정'],
  ['씨제이인베스트먼트(주)', '씨제이농식품벤처펀드', 'O', 'O', '-', '-', 'X', '불일치', '미확정'],
  ['케이비인베스트먼트(주)', 'KB 신자산어보 투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['주식회사 엘에프인베스트먼트', '스마트네이처투자조합1호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['엘앤에스벤처캐피탈(주)', '엘앤에스 농수산업 투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['엘앤에스벤처캐피탈(주)', '엘앤에스농식품6차산업화투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['롯데벤처스(주)', '롯데농식품테크펀드1호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['롯데벤처스(주)', '롯데농식품테크펀드2호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['마이다스동아인베스트먼트(주)', '마이다스동아-엔에스씨 수산펀드 2호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['제이비인베스트먼트(주)', '메가농식품벤처투자조합3호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['마그나인베스트먼트(주)', '마그나 ABC펀드', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['마그나인베스트먼트(주)', '마그나 FRESH펀드', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['마그나인베스트먼트(주)', '마그나 GREEN 펀드', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['마그나인베스트먼트(주)', '마그나 FUTURE 펀드', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['로이투자파트너스 주식회사', '세종 농식품바이오 투자조합1호', 'O', 'O', 'O', 'O', '-', '일치', '확정'],
  ['주식회사 센트럴투자파트너스', '센트럴생거진천농식품투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['씨케이디창업투자(주)', 'CKD Smart Farm 1호 농식품투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['캐피탈원(주)', '캐피탈원농림수산식품 투자조합2호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['캐피탈원(주)', '캐피탈원 농림수산식품 투자조합 3호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['미시간벤처캐피탈주식회사', '미시간글로벌식품산업투자조합2호', 'O', 'O', '-', '-', 'O', '일치', '확정'],
  ['컴퍼니케이파트너스(주)', '컴퍼니케이 애그로씨드투자조합', 'O', 'O', '-', '-', 'O', '일치', '확정'],
];

const DEMO: CustodyConfirmRow[] = RAW.map(([gp, fn, invShares, invBal, ntShares, ntBal, niBal, status, confirm], i) => ({
  id: 'cc-' + (i + 1), no: i + 1, gp, fn, invShares, invBal, ntShares, ntBal, niBal, status, confirm,
}));

const PAGE_SIZE = 20;

/* 폭 관련 그리드 prop(`defaultColDef`)은 `aggrid_theme.ts`의 공용 상수를 쓴다 — 인라인 리터럴 금지
   (렌더마다 새 객체 → 컬럼 재생성 → 폭이 선언값으로 되돌아감). */

/* ──────────────────────────────
   컬럼 정의 — 목업 3단 헤더 그대로:
     No · 운용사 · 자펀드 · [일치여부 > 투자자산(보유주수·잔액) / 미투자자산 거래(보유주수·잔액) / 미투자자산(잔액)]
     · 상세보기 · 확정여부  (리프 10개 + 선택 열 44px. 관리 열은 2026-10-14 사용자 결정으로 삭제 — 선택 바 [수정]이 대체)
   ⚠ 폭 전략은 **autoSizeStrategy 없이 고정폭 + 텍스트 2열 flex** — 선택 열 포함 고정폭 합(≈1242, 프레임 안쪽 실폭 대비 미실측)이 프레임(1280)
     안에 들어오는 좁은 표라, 내용 맞춤이면 우측에 빈 공간이 남는다(apfs-aggrid "좁은 매트릭스" 규약).
     운용사·자펀드만 `flex:1`로 잉여를 흡수하고, 마크/상세보기/확정여부는 고정폭(헤더 라벨 폭이 하한).
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 마크 셀 — O/X는 StatusBadge, '-'는 회색 칩(Tone에 중립 톤이 없어 직접 만든다).
   기하(padding·radius·13px)는 StatusBadge size="lg"와 동일하게 맞춘다(O/X와 섞여 반복되는 열이라 어긋나면 눈에 띈다). */
function MarkCell({ v }: { v: Mark }) {
  if (v !== 'O' && v !== 'X') {
    return <span className="inline-flex items-center rounded-[7px] bg-muted px-[10px] py-[4px] text-[13px] font-bold leading-tight text-muted-foreground">{v}</span>;
  }
  return <StatusBadge tone={MARK_TONE[v]} label={v} size="lg" />;
}

const mark = (field: keyof CustodyConfirmRow, header: string, width = 100): ColDef<CustodyConfirmRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: flexCenter,
  cellRenderer: (p: any) => <MarkCell v={p.value as Mark} />,
});

/* 텍스트 열 — flex로 잉여 폭을 흡수하므로 셀 내부는 min-w-0 + truncate(말줄임) */
const txt = (field: keyof CustodyConfirmRow, header: string, minWidth: number): ColDef<CustodyConfirmRow> => ({
  field, headerName: header, flex: 1, minWidth, width: minWidth, cellStyle: flexCenter,   // width=flex 전 초기폭(apfs-aggrid ⑨)
  cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span>,
});

/* 셀 내 링크(공용 `link_cell.tsx`) — 상세보기 셀은 상세 팝업(목업은 `.linkbtn` 버튼 셀이 진입점이다), 운용사·자펀드 셀은 명세 팝업.
   ⚠ 상세보기 셀 색은 **목업 그대로 상태에 따라 갈린다**(`.linkbtn`=danger / `.linkbtn.ok`=ok) — 색이 곧 정보라
      단일 링크색으로 통일하지 않는다(`color` prop). 텍스트 색이므로 `-text` 토큰을 쓴다(color-tokens 규약). */

type SpecKind = 'gpSpec' | 'fundSpec';
/* 셀 Enter → 팝업 매핑(링크 셀만) */
const SPEC_BY_COL: Record<string, SpecKind> = { gp: 'gpSpec', fn: 'fundSpec' };

/* 확정여부 셀 — 목업 `confirmSel()` 그대로(확정/미확정 2개. 값이 ''가 되는 경로가 없어 빈 option은 두지 않는다).
   ⚠ 폰트는 `fontFamily:'inherit'` + 14px — preflight:false라 select가 UA 기본(13.3px Arial)으로 튄다.
     `font` 단축속성을 쓰면 뒤 키의 fontSize를 리셋할 수 있어 분리해 쓴다(키 순서 함정).
   ⚠ React의 stopPropagation은 AG Grid를 막지 못한다(리스너가 셀 조상에 먼저 달림) — 방향키 이중 동작은
     colDef `suppressKeyboardEvent`(아래 `suppressFromSelect`)가 막는다. 여기 stopPropagation은 React 레벨 보호다. */
function SelectCell({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onClick={stop} onMouseDown={stop} onDoubleClick={stop} onKeyDown={stop}
      style={{
        fontFamily: 'inherit', fontSize: 14, lineHeight: '18px', height: 30, padding: '0 4px',
        boxSizing: 'border-box', maxWidth: '100%', cursor: 'pointer',
        border: '1px solid var(--input)', borderRadius: 7, background: 'var(--card)', color: 'var(--foreground)',
      }}>
      {CONFIRM_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

/* 셀 안 select가 포커스를 가진 동안은 AG Grid 키보드 처리를 끈다(방향키 이중 동작 방지).
   Tab은 AG Grid에 남겨 셀↔셀 이동을 그리드 기본과 같게 유지한다. */
const suppressFromSelect = (p: SuppressKeyboardEventParams<CustodyConfirmRow>): boolean =>
  p.event.key !== 'Tab' && (p.event.target as HTMLElement | null)?.tagName === 'SELECT';

const makeColumns = (
  openDetail: (id: string) => void,
  patchRow: (id: string, patch: Partial<CustodyConfirmRow>) => void,
  openSpec: (k: SpecKind) => void,
): (ColDef<CustodyConfirmRow> | ColGroupDef<CustodyConfirmRow>)[] => [
  /* No는 행에 저장된 값이라 정렬해도 번호가 다시 매겨지지 않는다 */
  { field: 'no', headerName: 'No', width: 68, minWidth: 68, pinned: 'left', cellStyle: tabNum, valueFormatter: (p) => String(p.value) },
  /* 운용사·자펀드 = 명세 링크(목업 `.gpf-gp-link`·`.gpf-fund-link`). minWidth 170/220 — 관리 열(88) 추가 때 150/200로 줄였다가
     관리 열 삭제(선택 열 44 추가)로 되돌렸다. 고정폭 합 1242 < 관리 열 시절 1246 이라 가로 스크롤 하한은 그때보다 낮다 */
  { ...txt('gp', '운용사', 170),
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="운용사 명세 보기" onClick={() => openSpec('gpSpec')} /> },
  { ...txt('fn', '자펀드', 220),
    cellRenderer: (p: any) => <LinkCell value={p.value} hint="자펀드 명세 보기" onClick={() => openSpec('fundSpec')} /> },
  /* 3단 헤더 — 중첩 ColGroupDef. 바깥·안쪽 모두 marryChildren으로 묶음이 흩어지지 않게 한다.
     리프 headerName이 겹치지만(보유주수·잔액) field가 달라 문제 없다. */
  { headerName: '일치여부', marryChildren: true, children: [
    { headerName: '투자자산', marryChildren: true, children: [mark('invShares', '보유주수'), mark('invBal', '잔액')] },
    { headerName: '미투자자산 거래', marryChildren: true, children: [mark('ntShares', '보유주수'), mark('ntBal', '잔액')] },
    { headerName: '미투자자산', marryChildren: true, children: [mark('niBal', '잔액')] },
  ] },
  { field: 'status', headerName: '상세보기', width: 120, minWidth: 120, cellStyle: flexCenter,
    cellRenderer: (p: any) => (
      <LinkCell
        value={p.value} hint="대사 상세 보기"
        color={p.value === '일치' ? 'var(--success-text)' : 'var(--danger-text)'}
        onClick={() => p.data && openDetail(p.data.id)} />
    ) },
  { field: 'confirm', headerName: '확정여부', width: 120, minWidth: 120, cellStyle: flexCenter, suppressKeyboardEvent: suppressFromSelect,
    cellRenderer: (p: any) => (
      <SelectCell
        value={p.value} label={`${p.data?.no}행 확정여부`}
        onChange={(v) => p.data && patchRow(p.data.id, { confirm: v as ConfirmState })} />
    ) },
];

/* 엑셀 헤더 — columnDefs에서 **깊이 N 재귀**로 병합/리프를 자동 산출한다(이 화면은 3단).
   골드 `subfund_manage.tsx`의 2단 전용 버전을 일반화했다. 규칙:
   - 깊이 d의 그룹이 리프 n개를 덮으면 → heads[d]에 이름 1 + 빈칸 n-1, 가로 병합
   - 깊이 d의 리프는 → heads[d]에 이름, 아래 행은 빈칸 + 세로 병합(마지막 행 리프는 병합 불필요)
   - 1칸짜리 병합(리프 1개 그룹 등)은 만들지 않는다(퇴화 범위) */
type AnyDef = ColDef<CustodyConfirmRow> | ColGroupDef<CustodyConfirmRow>;
const isGroup = (d: AnyDef): d is ColGroupDef<CustodyConfirmRow> => Array.isArray((d as ColGroupDef<CustodyConfirmRow>).children);
const depthOf = (d: AnyDef): number => (isGroup(d) ? 1 + Math.max(...d.children.map((k) => depthOf(k as AnyDef))) : 1);

function flattenForExcel(defs: AnyDef[]) {
  const maxDepth = Math.max(...defs.map(depthOf));
  const heads: string[][] = Array.from({ length: maxDepth }, () => [] as string[]);
  const keys: string[] = [];
  const merges: XLSX.Range[] = [];
  let c = 0;
  const walk = (d: AnyDef, row: number) => {
    if (isGroup(d)) {
      const start = c;
      d.children.forEach((k) => walk(k as AnyDef, row + 1));
      heads[row][start] = d.headerName ?? '';
      for (let i = start + 1; i < c; i++) heads[row][i] = '';
      if (c - 1 > start) merges.push({ s: { r: row, c: start }, e: { r: row, c: c - 1 } });
      return;
    }
    heads[row][c] = d.headerName ?? '';
    for (let r = row + 1; r < maxDepth; r++) heads[r][c] = '';
    if (row < maxDepth - 1) merges.push({ s: { r: row, c }, e: { r: maxDepth - 1, c } });
    keys.push(String(d.field));
    c += 1;
  };
  defs.forEach((d) => walk(d, 0));
  return { heads, keys, merges };
}

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 암묵 연결이 안 되고(ariaLabel로 명명),
   <label> 안 버튼 클릭이 라벨 활성화와 겹쳐 2회 토글되는 것을 막는다 */
function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}

/* 행 선택 — 선택 행 [수정](1건일 때만)이 액션이라 multiRow(apfs-aggrid "체크박스" 절, 2026-09-23 기본값).
   선택은 체크박스로만(enableClickSelection:false 명시). 헤더 전체선택은 SELECTION_COL 의 DS 헤더가 그리므로
   내장 헤더는 끄고 범위를 'filtered' 로 맞춘다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다). */
const ROW_SELECTION = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered',
  enableClickSelection: false,
} as const;

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
/* 상세 팝업은 **대상 행 id를 직접 싣는다** — 상세보기 링크는 선택과 무관하게 그 행을 연다 */
type ModalState = null
  | { kind: 'detail'; id: string }
  | { kind: SpecKind }                          // 운용사/자펀드 명세(샘플 — 행 무관)
  | { kind: 'entry'; id?: string }              // 대사 결과 단건 등록(id 없음) / 수정(id)
  | { kind: 'mismatch' };                       // 불일치 건 알림

/* tabs(opt-in) — 메뉴 리프가 원문 화면 2개를 탭으로 묶을 때(leaf_tabs.tsx). 미지정이면 종전 화면 그대로 */
export function CustodyConfirmManage({ onNav, tabs }: { onNav?: (r: string) => void; tabs?: LeafTabsSlot }) {
  const apiRef = useRef<GridApi<CustodyConfirmRow> | null>(null);
  const [rows, setRows] = useState<CustodyConfirmRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);

  /* 행 패치 — 항상 새 객체를 만들어 DEMO 원본을 건드리지 않는다(immutability) */
  const patchRow = useCallback((id: string, patch: Partial<CustodyConfirmRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  /* setModal(useState 세터)·patchRow(useCallback []) 둘 다 안정 참조라 deps로 컬럼 정의를 고정한다
     (매 렌더 새 배열이면 AG Grid가 컬럼을 재생성하며 폭을 선언값으로 되돌린다) */
  const columnDefs = useMemo(() => makeColumns(
    (id: string) => setModal({ kind: 'detail', id }),
    patchRow,
    (k: SpecKind) => setModal({ kind: k }),
  ), [patchRow]);
  const [filterOpen, setFilterOpen] = useState(false);   // 상세필터 드로어 — 아래 단축키 enabled 가 읽는다(선언이 단축키보다 아래면 TDZ)
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen });

  /* 필터 — 확정여부는 툴바 칩(=드로어 select와 공유), 기준일자는 조회 기준 컨텍스트(행 필터 아님) */
  const [fConfirm, setFConfirm] = useState<'' | ConfirmState>('');
  const [fBaseDate, setFBaseDate] = useState(BASE_DATE);
  const clearFilters = () => { setFConfirm(''); setFBaseDate(BASE_DATE); };

  const passes = useCallback((r: CustodyConfirmRow) => !fConfirm || r.confirm === fConfirm, [fConfirm]);
  /* 기준일자는 행을 거르지 않으므로 External Filter 판정에 넣지 않는다 */
  const filterActive = Boolean(fConfirm);
  /* 필터가 바뀌면 선택을 정리한다 — 걸러진 행의 체크가 보이지 않는 채로 남지 않게 */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<CustodyConfirmRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);

  const onGridReady = useCallback((e: GridReadyEvent<CustodyConfirmRow>) => { apiRef.current = e.api; }, []);

  /* 선택 SSOT = id 배열 하나(건수·단건은 파생 — apfs-aggrid "선택 상태는 selIds 하나로") */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const single = selCount === 1 ? rows.find((r) => r.id === selIds[0]) ?? null : null;
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<CustodyConfirmRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  /* 행 더블클릭 = 수정(규약 "더블클릭=수정"). 셀 안 링크/버튼/select 에서 난 더블클릭은 그 컨트롤의 몫이라 무시한다.
     체크박스 셀 더블클릭 누수는 SELECTION_COL 이 막는다 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<CustodyConfirmRow>) => {
    if ((e.event?.target as HTMLElement | null)?.closest?.('a,button,select')) return;
    if (e.data && !e.rowPinned) setModal({ kind: 'entry', id: e.data.id });
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — 셀에 초점을 둔 채 Enter. 상세보기 셀=팝업, 확정여부 셀=셀 안 select로 포커스.
     (AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button/select에 초점이 닿지 않는다) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<CustodyConfirmRow>) => {
    const ev = e.event as KeyboardEvent | null | undefined;
    if (ev?.key !== 'Enter') return;
    /* 셀 안 링크/버튼에 초점이 있으면 그 버튼의 click이 이미 연다 — 중복 오픈 방지 */
    if ((ev.target as HTMLElement | null)?.closest?.('a,button')) return;
    const colId = e.column.getColId();
    const spec = SPEC_BY_COL[colId];
    if (spec) { setModal({ kind: spec }); return; }
    if (colId === 'status') { if (e.data) setModal({ kind: 'detail', id: e.data.id }); return; }
    if (colId !== 'confirm') return;
    const cell = (e.event?.target as HTMLElement | null)?.closest?.('.ag-cell') as HTMLElement | null;
    cell?.querySelector('select')?.focus();
  }, []);

  const target = modal?.kind === 'detail' ? rows.find((r) => r.id === modal.id) ?? null : null;
  const entryTarget = modal?.kind === 'entry' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* 단건 등록/수정 저장 — 수정은 id·no 유지, 등록은 끝에 추가(no = 최대+1, 목업 `DATA.push`). 불변 갱신 */
  const saveEntry = (v: CustodyEntryValue) => {
    if (modal?.kind !== 'entry') return;
    const { id } = modal;
    if (id) { setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...v } : r))); apiRef.current?.deselectAll(); }
    else setRows((prev) => {
      const no = prev.reduce((m, r) => Math.max(m, r.no), 0) + 1;
      return [...prev, { ...v, id: 'cc-new-' + no + '-' + Date.now(), no }];
    });
    setModal(null);
  };

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('조회되었습니다'); };

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측에 렌더한다(선택 중엔 필터 칩을 +N 안으로 접는다).
     [수정]·[상세보기]+상태 배지는 단일 대상이라 1건일 때만(`single` 게이트) */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {single && <Button variant="outline" size="sm" leadingIcon="file" onClick={() => setModal({ kind: 'entry', id: single.id })}>수정</Button>}
      {single && <Button variant="outline" size="sm" leadingIcon="eye" onClick={() => setModal({ kind: 'detail', id: single.id })}>상세보기</Button>}
      {single && <StatusBadge tone={single.status === '일치' ? 'success' : 'danger'} label={single.status} size="lg" />}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  /* ── Excel(.xlsx) — 3단 헤더(병합 자동 산출). 합계행 없음 ── */
  const exportExcel = () => {
    const { heads, keys, merges } = flattenForExcel(columnDefs);
    const body = filteredRows.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (typeof v === 'number') return v;
      return String(v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([...heads, ...body]);
    /* No는 유일한 숫자 컬럼 — 숫자 셀 서식(화면 우측정렬과 같은 모양) */
    const noCol = keys.indexOf('no');
    if (noCol >= 0) body.forEach((_, i) => {
      const a = XLSX.utils.encode_cell({ r: i + heads.length, c: noCol });
      if (ws[a]) ws[a].z = '#,##0';
    });
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' ? 34 : k === 'gp' ? 26 : k === 'no' ? 6 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '자펀드수탁관리(확정)');
    XLSX.writeFile(wb, '자펀드수탁관리(확정).xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={tabs?.crumbs ?? ['홈', '투자자산관리', '자펀드 관리', '자펀드수탁관리(확정)']}
      title={tabs?.label ?? "자펀드수탁관리(확정)"}
      favRoute={tabs?.route ?? "custody-confirm"}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(확정여부) + 적용 중인 드로어 값 칩. 선택 중엔 선택 바(contextActions)가 대신한다.
         기준일자 칩은 **목업 기본값과 다를 때만** 띄운다(기본값이 상시 칩으로 남으면 시끄럽다). */
      filterChips={(['', '확정', '미확정'] as ('' | ConfirmState)[]).map((s) => ({ key: s || 'all', label: s || '확정여부: 전체', active: fConfirm === s, onSelect: () => setFConfirm(s) }))}
      appliedFilters={[
        { label: '기준일자', value: fBaseDate !== BASE_DATE ? String(fBaseDate) : '', onClear: () => setFBaseDate(BASE_DATE) },
      ]}
      contextActions={selActions}
      /* 단위 캡션 없음 — 금액 컬럼이 없다(마크·상태만) */
      toolbarRight={<>
        {/* 목업 listbar `.acts` 순서 그대로: 불일치 건 알림 · 단건 등록(2026-09 회의록 반영분) */}
        <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'mismatch' })}>불일치 건 알림</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'entry' })}>단건 등록</Button>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(filteredRows.length) + '개 중 ' + String(Math.min(shown, filteredRows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <LeafTabBody slot={tabs}>
      <div>
        <AgGridReact<CustodyConfirmRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          /* autoSizeStrategy 없음 — 고정폭 합이 프레임에 들어오는 좁은 표라 flex로 잉여를 흡수한다(위 컬럼 주석) */
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          onSelectionChanged={onSelectionChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onModelUpdated={dropHiddenSelection}   // 수정·단계 전이로 선택 행이 조건 밖에 나가면 선택 해제(2026-10-27)
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 대사 건이 없습니다.</span>'}
        />
      </div>
      </LeafTabBody>

      {/* ── 상세필터 드로어 — 검색어는 미사용(OFF). 목업 검색박스는 기준일자 단일이고, 확정여부는 우리가 더한 파생 필터다 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자펀드 수탁 대사 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 기준일자 — 목업의 유일한 검색조건(필수). 행을 거르지 않고 조회 기준을 정하는 값이라
                no-op 캡션 대신 값을 유지한다(상세 팝업 부제에 그대로 실린다).
                PeriodPicker 트리거는 w-full이라 fit-content 래퍼로 감싼다(apfs-datepicker "폭" 규칙) */}
            <DrawerField label="기준일자" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fBaseDate} onChange={(v) => setFBaseDate(v || BASE_DATE)} ariaLabel="기준일자" />
              </div>
            </DrawerField>
            {/* 확정여부 — 툴바 칩과 state 공유(목업엔 없는 파생 필터) */}
            <DrawerField label="확정여부">
              <DrawerSelect value={fConfirm} onChange={(v) => setFConfirm(v as '' | ConfirmState)} options={CONFIRM_OPTIONS} />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 읽기전용 상세 팝업 — 상세보기 링크(또는 그 셀 Enter)가 연다. 행 선택·더블클릭과 무관 ── */}
      {modal?.kind === 'detail' && target && (
        <CustodyConfirmDetailModal row={target} baseDate={fBaseDate} onClose={() => setModal(null)} />
      )}

      {/* ── 운용사/자펀드 명세 — 샘플(행에 원천이 없다 — 수시보고 화면과 같은 한계) ── */}
      {modal?.kind === 'gpSpec' && <GpSpecModal onClose={() => setModal(null)} />}
      {modal?.kind === 'fundSpec' && <SubFundSpecModal row={SPEC_SAMPLE_SUBFUND} onClose={() => setModal(null)} />}

      {/* ── 대사 결과 단건 등록 / 수정 ── */}
      {modal?.kind === 'entry' && (!modal.id || entryTarget) && (
        <CustodyEntryModal row={entryTarget ?? undefined} onSave={saveEntry} onClose={() => setModal(null)} />
      )}

      {/* ── 불일치 건 알림 — 전체 행 기준(목업 DATA.filter) ── */}
      {modal?.kind === 'mismatch' && <CustodyMismatchAlertModal rows={rows} onClose={() => setModal(null)} />}

    </GridFrame>
  );
}
