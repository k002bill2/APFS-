/* 종합통계 — 읽기전용 통계 페이지 (투자자산관리 > 자펀드 관리 > 종합통계).
   출처: S1_25_종합통계.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·계정구분·연도기준·데이터기준·기준일자)
                           → 연도기준은 **툴바 주 필터 FilterChip**(결성연도·선정연도, '전체' 없음),
                             나머지는 상세필터 드로어(Sheet, apfs-detail-filter). 항목 순서는 목업 그대로.
                             검색어 입력은 목업에 없으므로 만들지 않는다.
   - 목록바(금액단위 seg)  → 툴바 우측 `단위: {unit}` 캡션 + ⚠마커 + SegTabs(원/백만원/억원, **기본 억원** = 목업 기본값).
                             데이터는 억원 저장 → 그리드 `context={{unit}}` + 단위 변경 시 `refreshCells({force:true})`.
   - 2단 헤더 33열 그리드  → AG Grid `ColGroupDef`(marryChildren). **연도별 소계는 본문 인라인 행**(목업 tr.subtotal),
                             전체 총계는 pinned bottom(목업 tfoot). 소계·총계는 원문 표시값 그대로(재계산 아님).
   - 엑셀                  → SheetJS. 2단 헤더 병합·리프 키는 `flattenForExcel(columnDefs, …)`로 columnDefs에서
                             자동 산출하고, 금액은 선택 단위로 환산한 숫자 셀(t:'n' + z 서식)로 쓴다.
                             마스크 ON이면 숫자 0·텍스트 ''(화면 밖 출력은 valueFormatter를 안 거침).
   - KPI 배지 행 · 카드뷰 · 명세 팝업 · 행 선택 · 등록 → **없음**(목업에 없는 조회 전용 화면).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정:
   - 상세필터 4종(모펀드·계정구분·데이터기준·기준일자)은 **전부 noop** — 행에 대응 컬럼이 없다(`· 데이터 연동 후 적용` 캡션).
     실제로 행을 거르는 필터가 하나도 없어 External Filter(isExternalFilterPresent/doesExternalFilterPass)를 배선하지 않았다
     (항상 false인 외부필터는 죽은 코드다). 연동 시 여기에 `passes` + `onFilterChanged`를 더한다.
   - 연도기준 '선정연도' 전환은 **연도 컬럼 헤더 라벨만** 바꾼다(목업 §2.4 동형) — 데이터는 동일하다.
   - 출자사업연도·결성일·등록일·기준일·경과년·투자승수 3열·감액금액은 원문 캡처 화면 폭 밖이라 미확인 →
     목업 `rowHtml`/`subtotalHtml`/tfoot과 같이 **전 행 '-'**(값 창작 금지).
   - 정렬은 전 컬럼 비활성이다 — 행 순서(연도 오름차순 + 각 해 끝의 소계)가 의미를 갖는 표라 정렬하면 소계가 흩어진다.
   - 페이지네이션은 표시행(행 137 + 소계 16 = 153) 기준이라 20행 × 8페이지이고, 푸터 건수는 데이터 행 137만 센다.
   ⚠검토필요 마커 4건 이식(목업 원문 그대로): 연도기준(드로어 라벨) · 금액단위(툴바 캡션) ·
     출자사업연도(그리드 헤더) · 감액금액(그리드 헤더). 설계 메모라 마스킹·엑셀 대상이 아니다.
   공용 `review_marker.tsx`, 규약은 apfs-grid 스킬. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유) — 없으면 총계행이 안 보인다
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마·포매터 SSOT
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef, ColGroupDef, GridApi, GridReadyEvent, ValueFormatterParams, CellStyle,
  HeaderValueGetterParams, RowClassParams, RowStyle,
} from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker, reviewInnerHeader } from './review_marker';
import type { ReviewNote } from './review_marker';
import { RAW, SUBTOTALS, GRAND } from './fund_stats_data';
import type { RawRow, StatBase } from './fund_stats_data';

const { Button, IconBtn, FilterChip, SegTabs } = UI;

/* ──────────────────────────────
   도메인 타입 · 파생값(목업 calc) — 금액 단위는 전부 **억원**
────────────────────────────── */
type RowKind = 'row' | 'subtotal' | 'grand';

export interface StatRow {
  id: string;
  kind: RowKind;
  no: number | null;        // 소계·총계 행은 없음(목업에서 NO~분야가 가로 병합된 칸)
  y: number;                // 그룹 키(연도). 표시는 ylabel
  ylabel: string;           // 연도 셀 표시값 — '2011' | '2011 소계' | '총 계'
  fld: string | null;       // 분야
  fund: string | null;      // 조합
  form: number; gov: number; pri: number; prir: number | null;            // 결성액·정부·민간·민간비율
  cAf: number; cNaf: number; cSub: number; cDuty: number; cUnder: number; // 투자건수(개) 5
  afInv: number; afIvr: number | null; afFmr: number | null;             // 농식품 3
  nafInv: number; nafIvr: number | null; nafFmr: number | null;          // 비농식품 3
  totInv: number; tir: number | null;                                    // 총계 2
  recPrin: number; recProf: number; recTotal: number;                    // 회수실적 3
  /* ↓ 원문 캡처 화면 폭 밖이라 값 미확인 — 전 행 '-'로만 표시한다(목업 동형, 값 창작 금지).
     타입은 실제 도메인 값(금액·일자·년수·승수)의 nullable로 둔다 — `null` 단독 타입은 strict:false에서
     AG Grid NestedFieldPaths가 키를 탈락시켜 `keyof StatRow` 컬럼 팩토리가 tsc 오류를 낸다. */
  recCut: number | null;                                                 // 감액금액
  ybiz: number | null; fd: string | null; rd: string | null; bd: string | null; elapsed: number | null;   // 출자사업연도·결성일·등록일·기준일·경과년
  mAf: number | null; mNaf: number | null; mAll: number | null;          // 투자승수 3
}

/** 목업 `calc()` 그대로 — 분모 0이면 null(화면에서 '-'). */
function calc(b: StatBase) {
  const pri = b.form - b.gov;
  const sub = b.af + b.naf;
  const totinv = b.afinv + b.nafinv;
  return {
    pri,
    prir: b.form ? (pri / b.form) * 100 : null,
    sub,
    totinv,
    afivr: totinv ? (b.afinv / totinv) * 100 : null,
    affmr: b.form ? (b.afinv / b.form) * 100 : null,
    nafivr: totinv ? (b.nafinv / totinv) * 100 : null,
    naffmr: b.form ? (b.nafinv / b.form) * 100 : null,
    tir: b.form ? (totinv / b.form) * 100 : null,
    rectotal: b.recPrin + b.recProf,
  };
}

/* 미확인 8열 — 모든 행에서 동일하게 null(위 StatRow 주석 참조) */
const UNKNOWN = { recCut: null, ybiz: null, fd: null, rd: null, bd: null, elapsed: null, mAf: null, mNaf: null, mAll: null } as const;

function makeRow(id: string, kind: RowKind, no: number | null, y: number, ylabel: string,
                 fld: string | null, fund: string | null, b: StatBase): StatRow {
  const c = calc(b);
  return {
    id, kind, no, y, ylabel, fld, fund,
    form: b.form, gov: b.gov, pri: c.pri, prir: c.prir,
    cAf: b.af, cNaf: b.naf, cSub: c.sub, cDuty: b.duty, cUnder: b.under,
    afInv: b.afinv, afIvr: c.afivr, afFmr: c.affmr,
    nafInv: b.nafinv, nafIvr: c.nafivr, nafFmr: c.naffmr,
    totInv: c.totinv, tir: c.tir,
    recPrin: b.recPrin, recProf: b.recProf, recTotal: c.rectotal,
    ...UNKNOWN,
  };
}

/* RAW 튜플 → 집계 기초값(목업 DATA.map 동형) */
const toBase = (a: RawRow): StatBase => ({
  form: a[4], gov: a[5], af: a[6], naf: a[7], duty: a[8], under: a[9],
  afinv: a[10], nafinv: a[11], recPrin: a[12], recProf: a[13],
});

/* 데이터 행 137개 — 푸터 건수의 기준(소계·총계는 세지 않는다) */
const ROWS: StatRow[] = RAW.map((a) => makeRow('r-' + a[0], 'row', a[0], a[1], String(a[1]), a[2], a[3], toBase(a)));

/* 표시행 = 연도 오름차순으로 [그 해 행들…, 소계] 반복(목업 render() 그대로). 총계는 pinned로 따로.
   ⚠ 화면·엑셀 모두 이 배열 하나를 쓴다(화면=엑셀 불변식).
   ⚠ 모듈 스코프 상수인 이유: 이 화면엔 행을 바꾸는 상태(필터·CRUD)가 전혀 없다 —
      정적 데이터는 모듈 상수가 정본이고(apfs-aggrid 계약4) 참조가 렌더 간 고정된다. */
const YEARS: number[] = Object.keys(SUBTOTALS).map(Number).sort((a, b) => a - b);
const DISPLAY_ROWS: StatRow[] = YEARS.flatMap((y) => [
  ...ROWS.filter((r) => r.y === y),
  makeRow('sub-' + y, 'subtotal', null, y, y + ' 소계', null, null, SUBTOTALS[y]),
]);
const GRAND_ROW: StatRow = makeRow('grand', 'grand', null, 0, '총 계', null, null, GRAND);
const PINNED_BOTTOM: StatRow[] = [GRAND_ROW];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   금액 단위 전환 — 데이터는 **억원 저장**이라 선택 단위로 곱해 내린다(목업 fmt() 배율 그대로)
────────────────────────────── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const DEFAULT_UNIT: Unit = '억원';   // 목업 기본값(aria-pressed=true가 '억')

/** 억원 저장값 → 선택 단위 수치(엑셀 숫자 셀용) */
const toUnit = (eok: number, unit: Unit): number => (unit === '억원' ? eok : unit === '백만원' ? eok * 100 : eok * 100000000);
/** 표시 문자열 — 목업 `fmt()` 그대로: 억원만 소수 2자리 허용, 백만원·원은 정수 콤마.
    ⚠ 공유 `fmt()`에 넣지 않는다 — fmt는 비정수를 소수 1자리로 고정해 억원의 2자리를 깎는다. */
const unitText = (eok: number, unit: Unit): string =>
  unit === '억원' ? eok.toLocaleString('ko-KR', { maximumFractionDigits: 2 }) : toUnit(eok, unit).toLocaleString('ko-KR');
/** 엑셀 숫자서식 — 화면 소수 자릿수와 일치(억원만 소수 허용) */
const Z_BY_UNIT: Record<Unit, string> = { 원: '#,##0', 백만원: '#,##0', 억원: '#,##0.##' };

/** 목업 `pctN()` 그대로 — 소수 1자리 반올림 + ' %'. null/NaN은 '-' */
const pctN = (v: number | null | undefined): string =>
  v == null || Number.isNaN(v) ? '-' : `${Math.round(v * 10) / 10} %`;

/* ──────────────────────────────
   연도기준 — 값 변경 시 연도 컬럼의 **헤더 라벨만** 바뀐다(목업 §2.4). 데이터는 동일
────────────────────────────── */
type YearBasis = '결성연도' | '선정연도';
const YEAR_BASES: YearBasis[] = ['결성연도', '선정연도'];
const DEFAULT_YEAR_BASIS: YearBasis = '결성연도';

interface GridCtx { unit: Unit; yearBasis: YearBasis }

/* ──────────────────────────────
   ⚠검토필요 메모 4건 — 목업 `S1_25_종합통계.html`의 data-rec/data-dat 원문 그대로(창작·합치기 금지)
────────────────────────────── */
const YBASIS_NOTE: ReviewNote = {
  rec: '결성연도·선정연도 (조회기준 → 연도 컬럼 의미 변경)',
  dat: "실값 '결성연도'만 확인 · '선정연도'는 §2.4 동적관계 근거 추론",
};
const UNIT_NOTE: ReviewNote = {
  rec: '원·백만원·억원 (표준 단위전환 토글)',
  dat: "CDTP:BU · 실값 '억원' · 그 외 옵션 미확인",
};
const YBIZ_NOTE: ReviewNote = {
  rec: '원문 그대로 표시',
  dat: "사용자 제공 참고 화면 캡처가 이 열부터 오른쪽(출자사업연도~투자승수)은 화면 폭 밖이라 안 보임 — 1행(예시)만 있던 기존 값 유지, 나머지 136행은 확인 전까지 '-' 표시",
};
const CUT_NOTE: ReviewNote = {
  rec: '원문 그대로 표시',
  dat: "참고 화면 캡처에서 감액금액 열도 화면 폭 밖이라 값 미확인 — 1행(예시) 제외 나머지는 '-' 표시",
};
/* 모듈 스코프에 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid가 헤더를 통째로 remount한다 */
const YBIZ_HEADER = reviewInnerHeader(YBIZ_NOTE);
const CUT_HEADER = reviewInnerHeader(CUT_NOTE);
/* Tab을 AG Grid 헤더 내비게이션에서 빼 브라우저 기본 순서로 넘긴다 —
   안 하면 헤더 안의 ⚠마커에 키보드로 도달할 수 없다(AG Grid가 Tab을 가로채 다음 헤더 셀로 이동). */
const tabToBrowser = (p: { event: KeyboardEvent }) => p.event.key === 'Tab';

/* ──────────────────────────────
   컬럼 정의 — 목업 `<thead>` 구조 그대로(리프 33개, 2단 그룹 6개).
   ⚠ 전 컬럼 `sortable:false` — 행 순서(연도 오름차순 + 각 해 끝의 소계)가 의미라 정렬하면 소계가 흩어진다.
────────────────────────────── */
/* AG Grid cellStyle은 CellStyle(문자열 인덱스 시그니처) — React CSSProperties와 타입이 다르다 */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 숫자 N/A(null) → '-' : 공유 numFmt(콤마·소수·마스킹)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
/* 금액 셀 — grid context.unit로 환산 후 마스킹. 단위가 바뀌면 refreshCells({force:true})로 재적용 */
const moneyFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '-';
  const unit = (p.context as GridCtx | undefined)?.unit ?? DEFAULT_UNIT;
  return mn(unitText(p.value as number, unit));
};
/* 비율 셀 — 목업 pctN. 단위 토글과 무관(항상 %) */
const pctFmt = (p: ValueFormatterParams): string => mn(pctN(p.value as number | null));

/* 텍스트 — 소계·총계 행은 값이 null이라 빈 칸(목업 tr.subtotal / tfoot의 빈 td) */
const txt = (field: keyof StatRow, header: string, width: number, center?: boolean): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => (p.value == null ? null : <MT>{p.value}</MT>),
});
/* 금액(억원 저장) — 우측정렬. numStyle()은 셀마다 호출되는 함수(0=muted, pinned 총계행 자동 bold) */
const amt = (field: keyof StatRow, header: string, width = 116): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, type: 'rightAligned',
  valueFormatter: moneyFmt, cellStyle: numStyle() as any,
});
/* 건수(개) — 가운데 정렬 정수 */
const cnt = (field: keyof StatRow, header: string, width = 92): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, valueFormatter: nullFmt, cellStyle: centerNum,
});
/* 비율(%) — 가운데 정렬 */
const pct = (field: keyof StatRow, header: string, width = 108): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, valueFormatter: pctFmt, cellStyle: centerNum,
});
/* 원문 미확인 열 — 값이 항상 null이라 nullFmt가 전 행 '-'를 낸다(별도 하드코딩 아님) */
const dash = (field: keyof StatRow, header: string, width = 104): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, valueFormatter: nullFmt, cellStyle: centerNum,
});

const columnDefs: (ColDef<StatRow> | ColGroupDef<StatRow>)[] = [
  /* NO — 순번은 축이라 비마스킹. 소계·총계 행은 목업에서 NO~분야가 가로 병합된 한 칸이라 비운다
     (AG Grid엔 가로 병합이 없어 '2011 소계'/'총 계' 라벨을 연도 컬럼에 싣는다). */
  { field: 'no', headerName: 'NO', width: 72, maxWidth: 72, pinned: 'left', sortable: false, cellStyle: centerNum,
    valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
  /* 연도 — 헤더 라벨이 연도기준(결성/선정)을 따른다. headerName을 state로 갈아끼워 컬럼을 재생성하면
     폭이 선언값으로 되돌아가므로(apfs-aggrid 계약6) headerValueGetter + refreshHeader()로만 바꾼다.
     값(연도·'2011 소계'·'총 계')은 행을 묶는 축이라 비마스킹(apfs-grid 계약3). */
  { field: 'ylabel', headerName: DEFAULT_YEAR_BASIS, width: 110, pinned: 'left', sortable: false, cellStyle: centerNum,
    headerValueGetter: (p: HeaderValueGetterParams<StatRow>) => (p.context as GridCtx | undefined)?.yearBasis ?? DEFAULT_YEAR_BASIS,
    valueFormatter: (p) => String(p.value) },
  txt('fld', '분야', 132, true),
  { ...txt('fund', '조합', 240), maxWidth: 320 },
  amt('form', '결성액'), amt('gov', '정부'), amt('pri', '민간'),
  pct('prir', '민간비율'),
  { headerName: '투자건수(개)', headerClass: 'apfs-grp-a', marryChildren: true,
    children: [cnt('cAf', '농식품'), cnt('cNaf', '비농식품'), cnt('cSub', '소계'), cnt('cDuty', '의무투자'), cnt('cUnder', '규모이하')] },
  { headerName: '농식품', headerClass: 'apfs-grp-b', marryChildren: true,
    children: [amt('afInv', '투자금액'), pct('afIvr', '투자금액 대비', 124), pct('afFmr', '결성액 대비', 116)] },
  { headerName: '비농식품', headerClass: 'apfs-grp-a', marryChildren: true,
    children: [amt('nafInv', '투자금액'), pct('nafIvr', '투자금액 대비', 124), pct('nafFmr', '결성액 대비', 116)] },
  { headerName: '총계', headerClass: 'apfs-grp-b', marryChildren: true,
    children: [amt('totInv', '투자금액'), pct('tir', '결성액대비 총투자율', 144)] },
  { headerName: '회수실적', headerClass: 'apfs-grp-a', marryChildren: true,
    children: [amt('recPrin', '회수원금'), amt('recProf', '회수수익'), amt('recTotal', '회수총액'),
      { ...dash('recCut', '감액금액', 116),
        headerComponentParams: { innerHeaderComponent: CUT_HEADER }, suppressHeaderKeyboardEvent: tabToBrowser }] },
  { ...dash('ybiz', '출자사업연도', 132),
    headerComponentParams: { innerHeaderComponent: YBIZ_HEADER }, suppressHeaderKeyboardEvent: tabToBrowser },
  dash('fd', '결성일', 112), dash('rd', '등록일', 112), dash('bd', '기준일', 112),
  /* 목업 헤더의 보조 줄 `(등록일~기준일)`은 한 줄 headerName으로 합친다(AG Grid 헤더는 단일 텍스트) */
  dash('elapsed', '경과년(등록일~기준일)', 160),
  { headerName: '투자승수', headerClass: 'apfs-grp-b', marryChildren: true,
    children: [dash('mAf', '농식품', 96), dash('mNaf', '비농식품', 100), dash('mAll', '전체', 92)] },
];

/* 소계 행 강조 — 목업 `tr.subtotal`(회색 배경 + 굵게). 모듈 스코프 함수라 렌더 간 참조 고정 */
const getRowStyle = (p: RowClassParams<StatRow>): RowStyle | undefined =>
  p.data?.kind === 'subtotal' ? { background: 'var(--muted)', fontWeight: 700 } : undefined;

/* 엑셀 값 분류 — 금액은 선택 단위 숫자 셀, 건수는 정수 셀, 비율은 화면 문자열 그대로 */
const MONEY = new Set<string>(['form', 'gov', 'pri', 'afInv', 'nafInv', 'totInv', 'recPrin', 'recProf', 'recTotal']);
const COUNT = new Set<string>(['cAf', 'cNaf', 'cSub', 'cDuty', 'cUnder']);
const PCT = new Set<string>(['prir', 'afIvr', 'afFmr', 'nafIvr', 'nafFmr', 'tir']);

/* Excel 헤더 병합·리프 컬럼을 columnDefs에서 자동 산출(33컬럼 수작업 오프바이원 방지).
   - 연도 컬럼 헤더는 화면과 같이 **연도기준**을 따른다(headerName은 선언 기본값이라 여기서 대체).
   - 금액 컬럼은 헤더에 `(단위)`를 적는다 — 커뮤니티 xlsx는 셀 스타일을 못 써 단위를 헤더로만 전달(asset_funding 방식). */
function flattenForExcel(defs: (ColDef<StatRow> | ColGroupDef<StatRow>)[], yearBasis: YearBasis, unit: Unit) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  const headOf = (col: ColDef<StatRow>) => {
    const h = col.headerName ?? '';
    if (col.field === 'ylabel') return yearBasis;
    return MONEY.has(String(col.field)) ? `${h}(${unit})` : h;
  };
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = d.children as ColDef<StatRow>[];
      head1.push(d.headerName ?? '', ...Array(kids.length - 1).fill(''));
      kids.forEach((k) => { head2.push(headOf(k)); keys.push(String(k.field)); });
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
    } else {
      const col = d as ColDef<StatRow>;
      head1.push(headOf(col)); head2.push(''); keys.push(String(col.field));
      merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { head1, head2, keys, merges };
}

/* ──────────────────────────────
   로컬 헬퍼 — 골드(subfund_manage·fund_cash_forecast_manage)에서 복사. 공유 export 아님
────────────────────────────── */
/* 드로어 입력 — 폭은 fit-content(내용 맞춤), 하한은 타입별 controlMinWidth SSOT. 색은 토큰 */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box', padding: '9px 11px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 안에서 2회 토글된다 */
function DrawerField({ label, noop, plain, note, children }: { label: string; noop?: boolean; plain?: boolean; note?: ReviewNote; children: ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{note && <ReviewMarker {...note} label={label} />}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}
function DrawerSelect({ value, onChange, options, all = '전체', noAll }: { value: string; onChange: (v: string) => void; options: string[]; all?: string; noAll?: boolean }) {
  /* noAll — '전체'(빈 값) 선택지가 없는 항목. 목업 연도기준 select가 결성/선정 2개뿐이고 늘 하나가 잡혀 있다
     (행을 거르는 조회 조건이 아니라 연도 컬럼의 의미 전환이라 '미적용' 상태가 존재하지 않는다). */
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {!noAll && <option value="">{all}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 등록이 없는 조회 화면이라 kebab 단독(apfs-grid 툴바 규약) */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onExport}>
          <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
          <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => window.print()}>
          <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
          <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function FundStats({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<StatRow> | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DISPLAY_ROWS.length });
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [yearBasis, setYearBasis] = useState<YearBasis>(DEFAULT_YEAR_BASIS);
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  const masked = useMask();

  /* 상세필터 — 4종 전부 행 컬럼과 미연동(noop)이라 값은 상태로만 남고 행을 거르지 않는다.
     실제로 거르는 필터가 없어 External Filter를 배선하지 않았다(상단 한계 주석 참조). */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');        // 모펀드
  const [fAcct, setFAcct] = useState('');    // 계정구분
  const [fDbasis, setFDbasis] = useState(''); // 데이터기준
  const [fDate, setFDate] = useState('');    // 기준일자 — 목업 기본값 2026-07-31은 데모 표시값이라 초기값으로 승격하지 않는다
  /* 연도기준은 값이 늘 하나 잡혀 있으므로 초기화 = 기본값(결성연도) 복귀 */
  const clearFilters = () => { setFMf(''); setFAcct(''); setFDbasis(''); setFDate(''); setYearBasis(DEFAULT_YEAR_BASIS); };

  /* 그리드 context — 금액 포매터(moneyFmt)와 연도 헤더(headerValueGetter)가 참조 */
  const gridContext = useMemo<GridCtx>(() => ({ unit, yearBasis }), [unit, yearBasis]);
  /* 단위 변경 → 금액 셀 재포맷. 본문 + pinned 총계행 모두 */
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);
  /* 연도기준 변경 → 연도 컬럼 헤더 라벨만 다시 읽힌다(컬럼 재생성 아님 — 폭 되돌림 방지) */
  useEffect(() => { apiRef.current?.refreshHeader(); }, [yearBasis]);
  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리한다 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영
    // 안 뜨고 내보내기·인쇄 접근이 끊긴다(apfs-grid 푸터 골드 양식).
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onGridReady = useCallback((e: GridReadyEvent<StatRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const refresh = () => { clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 2단 헤더 병합 + 표시행(행+소계) + 총계, 선택 단위 환산.
        마스크 ON이면 숫자 0·텍스트 ''(화면 밖 출력은 valueFormatter를 안 거친다). ── */
  const exportExcel = () => {
    const { head1, head2, keys, merges } = flattenForExcel(columnDefs, yearBasis, unit);
    const src = [...DISPLAY_ROWS, GRAND_ROW];   // 화면 렌더 소스와 같은 배열 구성(화면=엑셀 불변식)
    const body = src.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (v == null) return '';                                   // 미확인 열·소계의 빈 칸 → 화면 '-'를 빈 셀로
      if (k === 'no' || k === 'ylabel') return v;                 // 순번·연도(소계/총계 라벨)는 축이라 비마스킹
      if (MONEY.has(k)) return masked ? 0 : toUnit(v as number, unit);
      if (COUNT.has(k)) return masked ? 0 : (v as number);
      if (PCT.has(k)) return masked ? '' : pctN(v as number);     // 비율은 화면 문자열 그대로
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
    /* 숫자 셀 서식 — 금액은 단위별, 건수는 정수. 빈 셀은 건너뛴다 */
    src.forEach((r, i) => keys.forEach((k, j) => {
      const isMoney = MONEY.has(k);
      if ((!isMoney && !COUNT.has(k)) || (r as any)[k] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 2, c: j });
      if (ws[a]) ws[a].z = isMoney ? Z_BY_UNIT[unit] : '#,##0';
    }));
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fund' ? 34 : k === 'fld' ? 16 : MONEY.has(k) ? 15 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '종합통계');
    XLSX.writeFile(wb, `종합통계_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(DISPLAY_ROWS.length, 1) : PAGE_SIZE;
  /* 표시 건수 — 페이지네이션은 표시행(행+소계) 기준이고, 총 건수는 데이터 행(137)만 센다 */
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '종합통계']}
      title="종합통계"
      favRoute="fund-stats"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(연도기준). 목업 select가 결성/선정 2개뿐이라 '전체' 칩은 없다.
         나머지 필터는 전부 noop이라 적용 칩을 만들지 않는다(값이 행을 거르지 않으므로 칩이 거짓 신호가 된다). */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {YEAR_BASES.map((b) => (
            <FilterChip key={b} active={yearBasis === b} onClick={() => setYearBasis(b)}>{b}</FilterChip>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환(목업 목록바 `.unitwrap`) — 캡션 + ⚠마커 + 세그먼트. 단위 문자열은 축이라 비마스킹 */}
        <span className="text-caption font-semibold inline-flex items-center" style={{ fontSize: 12, marginRight: 6 }}>
          {'단위: ' + unit}<ReviewMarker {...UNIT_NOTE} label="금액단위" />
        </span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(ROWS.length)) + '개 중 ' + mn(String(shown)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      {/* AG Grid 본체 — 2단 그룹헤더(리프 33) + 인라인 소계 행 + pinned 총계. 조회 전용이라 행 선택·편집 진입 없음.
          가로는 AG Grid 내부 스크롤(33열이라 프레임보다 넓다 → AUTO_SIZE_CONTENT + 조합 컬럼 maxWidth 캡) */}
      <div>
        <AgGridReact<StatRow>
          theme={apfsTheme}
          rowData={DISPLAY_ROWS}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          context={gridContext}
          getRowStyle={getRowStyle}
          pinnedBottomRowData={PINNED_BOTTOM}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 통계가 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(모펀드·계정구분·연도기준·데이터기준·기준일자).
             검색어는 없다(목업 미포함). 연도기준만 실제로 동작하고(헤더 라벨 전환) 나머지는 noop 캡션 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">종합통계 조회 조건을 정하는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            {/* 목업은 전체/농식품/수산 칩 그룹 — DrawerSelect의 첫 옵션 '전체'가 같은 역할을 한다 */}
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcct} onChange={setFAcct} options={['농식품', '수산']} /></DrawerField>
            {/* 연도기준은 툴바 칩과 같은 state를 공유한다(한 항목·두 진입점) */}
            <DrawerField label="연도기준" note={YBASIS_NOTE}>
              <DrawerSelect value={yearBasis} onChange={(v) => setYearBasis(v as YearBasis)} options={YEAR_BASES} noAll />
            </DrawerField>
            <DrawerField label="데이터기준" noop><DrawerSelect value={fDbasis} onChange={setFDbasis} options={['운용사보고', '월말확정']} /></DrawerField>
            {/* 기준일자 = PeriodPicker day('YYYY-MM-DD'). 트리거가 w-full이라 fit-content 래퍼 필수(apfs-datepicker 폭 규칙) */}
            <DrawerField label="기준일자" plain noop>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fDate} onChange={setFDate} ariaLabel="기준일자" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </GridFrame>
  );
}
