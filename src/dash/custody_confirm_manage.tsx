/* 자펀드수탁관리(확정) — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 자펀드수탁관리(확정)).
   출처: S1_27_자펀드수탁관리_확정_.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(기준일자 단일·필수)  → 상세필터 드로어 1항목(PeriodPicker day). **행 필터가 아니라 조회 기준 컨텍스트**라
       목업 기본값 `2026-07-31`(실 캡처 기준일)을 그대로 유지한다 — 상세 팝업 부제에 실리는 값이라 빈 값이 될 수 없다.
       (apfs-detail-filter의 "목업 기본값을 필터 초기값으로 쓰지 않는다"는 **행을 거르는 필터**에 대한 규약이다.)
   - 툴바 좌 주 필터                → `확정여부` FilterChip(전체·확정·미확정). ⚠ 목업 검색박스엔 없는 **파생 칩**이다
       (행 `confirm` 값에서 파생 — 수시보고 '확인상태' 파생 칩과 같은 관례). 드로어 select와 state를 공유한다.
   - 3단 헤더 목록 그리드          → AG Grid 중첩 `ColGroupDef`(일치여부 > 투자자산/미투자자산 거래/미투자자산 > 리프),
       `marryChildren`. 합계행 없음·행 선택 없음 — 가산 가능한 금액 컬럼이 없고 목업에도 체크박스/라디오가 없다.
   - 마크 셀(O/X/-)                 → `StatusBadge`(O=success · X=danger) + 회색 칩('-'). 상태 표식이라 비마스킹.
   - 상세보기 셀                    → 셀 링크(+ 셀 Enter) → 읽기전용 `CustodyConfirmDetailModal`.
       ⚠ **행 더블클릭으로는 열지 않는다** — 링크가 진입점인데 더블클릭까지 걸면 링크를 두 번 누른 순간
         엉뚱한 팝업이 뜬다(골드 `general_meeting_manage.tsx`와 동일 결정).
   - 확정여부 셀                    → 셀 안 네이티브 `<select>`(목업 `confirmSel` 그대로). 변경은 로컬 state(백엔드 없음).
   - KPI 배지 행                    → 미포함(브리프 확정). 금액 개념이 없어 건수 지표뿐이다.
   - 엑셀                           → SheetJS. 3단 헤더 병합을 `flattenForExcel`(깊이 N 재귀)로 columnDefs에서 자동 산출.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정:
   - 목록은 **실 화면 캡처 24건 발췌**(전체 약 152건) — 목업이 명시한 범위 그대로이고 나머지를 창작하지 않는다.
   - 확정여부 변경은 로컬 state(`patchRow` 불변 갱신)로만 반영된다(백엔드 없음).
   - 상세 팝업은 원 구조도 예시 1건 고정 — 자펀드 고유 값이 아니다(팝업 헤더의 ⚠검토필요 마커가 이 사실을 싣는다).
   ⚠검토필요 마커 1건(상세 팝업 헤더)은 `custody_confirm_detail_modal.tsx`에 이식했다. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle, SuppressKeyboardEventParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { CustodyConfirmDetailModal } from './custody_confirm_detail_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

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
     · 상세보기 · 확정여부  (리프 10개)
   ⚠ 폭 전략은 **autoSizeStrategy 없이 고정폭 + 텍스트 2열 flex** — 리프 10개의 고정폭 합(≈1198)이 프레임(1280)
     안에 들어오는 좁은 표라, 내용 맞춤이면 우측에 빈 공간이 남는다(apfs-aggrid "좁은 매트릭스" 규약).
     운용사·자펀드만 `flex:1`로 잉여를 흡수하고, 마크/상세보기/확정여부는 고정폭(헤더 라벨 폭이 하한).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 마크 셀 — O/X는 StatusBadge, '-'는 회색 칩(Tone에 중립 톤이 없어 직접 만든다).
   기하(padding·radius·13px)는 StatusBadge size="lg"와 동일하게 맞춘다(O/X와 섞여 반복되는 열이라 어긋나면 눈에 띈다).
   상태 표식이라 마스킹하지 않는다("축은 두고 데이터는 가린다"). */
function MarkCell({ v }: { v: Mark }) {
  if (v !== 'O' && v !== 'X') {
    return <span className="inline-flex items-center rounded-[7px] bg-muted px-[10px] py-[4px] text-[13px] font-bold leading-tight text-muted-foreground">{v}</span>;
  }
  return <StatusBadge tone={MARK_TONE[v]} label={v} size="lg" dot={false} />;
}

const mark = (field: keyof CustodyConfirmRow, header: string, width = 100): ColDef<CustodyConfirmRow> => ({
  field, headerName: header, width, minWidth: width, cellStyle: flexMid,
  cellRenderer: (p: any) => <MarkCell v={p.value as Mark} />,
});

/* 텍스트 열 — flex로 잉여 폭을 흡수하므로 셀 내부는 min-w-0 + truncate(말줄임) */
const txt = (field: keyof CustodyConfirmRow, header: string, minWidth: number): ColDef<CustodyConfirmRow> => ({
  field, headerName: header, flex: 1, minWidth, cellStyle: flexCenter,
  cellRenderer: (p: any) => <span className="min-w-0 truncate"><MT>{p.value}</MT></span>,
});

/* 셀 내 링크 — 클릭 시 상세 팝업(목업은 `.linkbtn` 버튼 셀이 진입점이다).
   ⚠ 색은 **목업 그대로 상태에 따라 갈린다**(`.linkbtn`=danger / `.linkbtn.ok`=ok) — 색이 곧 정보라 단일 링크색으로
      통일하지 않는다. 텍스트 색이므로 `-text` 토큰을 쓴다(color-tokens 규약).
   ⚠ 링크 텍스트(일치/불일치)는 **상태 표식이라 `<MT>`로 가리지 않는다** — 가리면 버튼의 유일한 텍스트가 사라져
      접근名까지 없어진다. 마스킹 경계는 "축은 두고 데이터는 가린다".
   ⚠ `title`엔 동작 힌트만 담는다 — 값을 넣으면 마스크 ON일 때 툴팁으로 실데이터가 샌다.
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다. */
function LinkCell({ value, color, hint, onClick }: { value: string; color: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate font-semibold no-underline hover:underline cursor-pointer"
      style={{ font: 'inherit', fontWeight: 600, color, background: 'transparent', border: 0, padding: 0 }}>
      {value}<span className="sr-only"> 대사 상세 보기</span>
    </button>
  );
}

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
): (ColDef<CustodyConfirmRow> | ColGroupDef<CustodyConfirmRow>)[] => [
  /* No는 축(순번)이라 마스킹하지 않는다(골드 동형). 행에 저장된 값이라 정렬해도 번호가 다시 매겨지지 않는다 */
  { field: 'no', headerName: 'No', width: 68, minWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  txt('gp', '운용사', 170),
  txt('fn', '자펀드', 220),
  /* 3단 헤더 — 중첩 ColGroupDef. 바깥·안쪽 모두 marryChildren으로 묶음이 흩어지지 않게 한다.
     리프 headerName이 겹치지만(보유주수·잔액) field가 달라 문제 없다. */
  { headerName: '일치여부', marryChildren: true, children: [
    { headerName: '투자자산', marryChildren: true, children: [mark('invShares', '보유주수'), mark('invBal', '잔액')] },
    { headerName: '미투자자산 거래', marryChildren: true, children: [mark('ntShares', '보유주수'), mark('ntBal', '잔액')] },
    { headerName: '미투자자산', marryChildren: true, children: [mark('niBal', '잔액')] },
  ] },
  { field: 'status', headerName: '상세보기', width: 120, minWidth: 120, cellStyle: flexMid,
    cellRenderer: (p: any) => (
      <LinkCell
        value={p.value} hint="대사 상세 보기"
        color={p.value === '일치' ? 'var(--success-text)' : 'var(--danger-text)'}
        onClick={() => p.data && openDetail(p.data.id)} />
    ) },
  { field: 'confirm', headerName: '확정여부', width: 120, minWidth: 120, cellStyle: flexMid, suppressKeyboardEvent: suppressFromSelect,
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
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
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

function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        <option value="">{all}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
/* 상세 팝업은 **대상 행 id를 직접 싣는다** — 행 선택(체크박스)이 없어 `selected`가 존재하지 않는다 */
type ModalState = null | { kind: 'detail'; id: string };

export function CustodyConfirmManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<CustodyConfirmRow> | null>(null);
  const [rows, setRows] = useState<CustodyConfirmRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);
  const masked = useMask();

  /* 행 패치 — 항상 새 객체를 만들어 DEMO 원본을 건드리지 않는다(immutability) */
  const patchRow = useCallback((id: string, patch: Partial<CustodyConfirmRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  /* setModal(useState 세터)·patchRow(useCallback []) 둘 다 안정 참조라 deps로 컬럼 정의를 고정한다
     (매 렌더 새 배열이면 AG Grid가 컬럼을 재생성하며 폭을 선언값으로 되돌린다) */
  const columnDefs = useMemo(() => makeColumns((id: string) => setModal({ kind: 'detail', id }), patchRow), [patchRow]);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 확정여부는 툴바 칩(=드로어 select와 공유), 기준일자는 조회 기준 컨텍스트(행 필터 아님) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fConfirm, setFConfirm] = useState<'' | ConfirmState>('');
  const [fBaseDate, setFBaseDate] = useState(BASE_DATE);
  const clearFilters = () => { setFConfirm(''); setFBaseDate(BASE_DATE); };

  const passes = useCallback((r: CustodyConfirmRow) => !fConfirm || r.confirm === fConfirm, [fConfirm]);
  /* 기준일자는 행을 거르지 않으므로 External Filter 판정에 넣지 않는다 */
  const filterActive = Boolean(fConfirm);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<CustodyConfirmRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);

  const onGridReady = useCallback((e: GridReadyEvent<CustodyConfirmRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — 셀에 초점을 둔 채 Enter. 상세보기 셀=팝업, 확정여부 셀=셀 안 select로 포커스.
     (AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button/select에 초점이 닿지 않는다) */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<CustodyConfirmRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter') return;
    const colId = e.column.getColId();
    if (colId === 'status') { if (e.data) setModal({ kind: 'detail', id: e.data.id }); return; }
    if (colId !== 'confirm') return;
    const cell = (e.event?.target as HTMLElement | null)?.closest?.('.ag-cell') as HTMLElement | null;
    cell?.querySelector('select')?.focus();
  }, []);

  const target = modal?.kind === 'detail' ? rows.find((r) => r.id === modal.id) ?? null : null;

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 3단 헤더(병합 자동 산출). 합계행 없음. 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const { heads, keys, merges } = flattenForExcel(columnDefs);
    const body = filteredRows.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : String(v ?? '');
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
      crumbs={['홈', '투자자산관리', '자펀드 관리', '자펀드수탁관리(확정)']}
      title="자펀드수탁관리(확정)"
      favRoute="custody-confirm"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌는 항상 필터칩이다 — 행 선택이 없어 selbar가 존재하지 않는다(조회 전용 화면).
         기준일자 칩은 **목업 기본값과 다를 때만** 띄운다(기본값이 상시 칩으로 남으면 시끄럽다). */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '확정', '미확정'] as ('' | ConfirmState)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fConfirm === s} onClick={() => setFConfirm(s)}>{s || '전체'}</FilterChip>
          ))}
          {fBaseDate !== BASE_DATE && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {mn(fBaseDate)}
              <button type="button" onClick={() => setFBaseDate(BASE_DATE)} aria-label="기준일자 필터 제거" className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          )}
        </>
      )}
      /* 단위 캡션 없음 — 금액 컬럼이 없다(마크·상태만) */
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<CustodyConfirmRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          /* autoSizeStrategy 없음 — 고정폭 합이 프레임에 들어오는 좁은 표라 flex로 잉여를 흡수한다(위 컬럼 주석) */
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 대사 건이 없습니다.</span>'}
        />
      </div>

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

      {/* ── 읽기전용 상세 팝업 — 상세보기 링크(또는 그 셀 Enter)가 연다. 행 선택과 무관 ── */}
      {modal?.kind === 'detail' && target && (
        <CustodyConfirmDetailModal row={target} baseDate={fBaseDate} onClose={() => setModal(null)} />
      )}

    </GridFrame>
  );
}
