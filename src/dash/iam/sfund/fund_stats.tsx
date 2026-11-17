/* 종합통계(확정) — 읽기전용 통계 페이지 (투자자산관리 > 자펀드 관리 > 종합통계(확정)).
   출처: S1_25_종합통계.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·계정구분·연도기준·데이터기준·기준일자)
                           → 연도기준은 **툴바 주 필터 FilterChip**(결성연도·선정연도, '전체' 없음),
                             나머지는 칩 줄 위 인라인 필터 패널(apfs-detail-filter). 항목 순서는 목업 그대로.
                             검색어 입력은 목업에 없으므로 만들지 않는다.
   - 목록바(금액단위 seg)  → 툴바 우측 `단위: {unit}` 캡션 + SegTabs(원/백만원/억원, **기본 억원** = 목업 기본값).
                             데이터는 억원 저장 → 그리드 `context={{unit}}` + 단위 변경 시 `refreshCells({force:true})`.
   - 2단 헤더 33열 그리드  → AG Grid `ColGroupDef`(marryChildren). **연도별 소계는 본문 인라인 행**(목업 tr.subtotal),
                             전체 총계는 pinned bottom(목업 tfoot). 기본 상태의 소계·총계는 원문 표시값 그대로(재계산 아님) —
                             검색조건이 행·금액을 바꿀 때만 표시 행에서 다시 합산한다(statRowsFor).
   - 엑셀                  → SheetJS. 2단 헤더 병합·리프 키는 `flattenForExcel(columnDefs, …)`로 columnDefs에서
                             자동 산출하고, 금액은 선택 단위로 환산한 숫자 셀(t:'n' + z 서식)로 쓴다.
   - KPI 배지 행 · 카드뷰 · 명세 팝업 · 행 선택 · 등록 → **없음**(목업에 없는 조회 전용 화면).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정:
   - 상세필터 4종(모펀드·계정구분·데이터기준·기준일자)은 2026-11-16 사용자 지시 "미연동 필터 전부 동작"으로 실제로 동작한다
     (종전 no-op — 원문 행에 대응 컬럼이 없다). 그리드 컬럼은 늘리지 않는다(백엔드라면 조회 파라미터):
     · 모펀드·계정구분 = 조합 행의 **숨은 속성**(행 번호로 결정적 — mfOf·accOf)으로 거른다.
     · 데이터기준 월말확정 = 투자금액·회수금액에 조합별 확정률 0.96~1.00(운용사보고 중 월말 미확정분 제외), 결성액·건수는 그대로.
     · 기준일자 = 조회 시점 — 연도(결성연도 열)가 그 날짜의 연도보다 뒤인 조합을 뺀다(onOrBefore).
     소계 행이 연도마다 끼고 소계·총계 값도 바뀌므로 External Filter 대신 statRowsFor 가 만든 표시 행·총계를 그리드에 넘긴다.
     기본 상태(빈 값 ≡ 운용사보고, 빠지는 행 없음)면 원문 상수(DISPLAY_ROWS·GRAND_ROW)를 그대로 돌려준다 — 원문 소계·총계는
     행 합과 13개 연도에서 어긋나(원문 그대로) 재합산하면 기본 수치가 바뀐다. 조건이 걸리면 소계·총계 = 표시 행의 합이라
     모펀드 두 몫의 소계 합은 원문 소계가 아니라 그 해 행 합과 같다.
   - 연도기준 '선정연도' 전환은 **연도 컬럼 헤더 라벨만** 바꾼다(목업 §2.4 동형) — 데이터는 동일하다.
   - 출자사업연도·결성일·등록일·기준일·경과년·투자승수 3열·감액금액은 원문 캡처 화면 폭 밖이라 미확인 →
     목업 `rowHtml`/`subtotalHtml`/tfoot과 같이 **전 행 '-'**(값 창작 금지).
   - 정렬은 전 컬럼 비활성이다 — 행 순서(연도 오름차순 + 각 해 끝의 소계)가 의미를 갖는 표라 정렬하면 소계가 흩어진다.
   - 페이지네이션은 표시행(행 137 + 소계 16 = 153) 기준이라 20행 × 8페이지이고, 푸터 건수는 데이터 행 137만 센다. */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유) — 없으면 총계행이 안 보인다
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from '../../aggrid_theme';   // 공유 테마·포매터 SSOT
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef, ColGroupDef, GridApi, GridReadyEvent, ValueFormatterParams, CellStyle,
  HeaderValueGetterParams, RowClassParams, RowStyle,
} from 'ag-grid-community';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { RAW, SUBTOTALS, GRAND } from './fund_stats_data';
import type { RawRow, StatBase } from './fund_stats_data';
import { FilterPanel, PanelSelect, PanelPeriod } from '../../filter_panel';   // 상세필터 인라인 패널(apfs-detail-filter)
import { onOrBefore } from '../../schemas/filter_field';   // 조회 시점 판정(셀 ≤ 값) 공용본

const { Button, IconBtn, SegTabs } = UI;
const MF_DEFAULT = '농식품모태펀드';   // 모펀드 기본값(목업 select 에 '전체' 없음)

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
   ⚠ 모듈 스코프 상수인 이유: 기본 상태엔 행을 바꾸는 상태(필터·CRUD)가 없다 —
      정적 데이터는 모듈 상수가 정본이고(apfs-aggrid 계약4) 참조가 렌더 간 고정된다.
      검색조건이 걸리면 statRowsFor 가 새 배열을 만든다(아래). */
const YEARS: number[] = Object.keys(SUBTOTALS).map(Number).sort((a, b) => a - b);
const DISPLAY_ROWS: StatRow[] = YEARS.flatMap((y) => [
  ...ROWS.filter((r) => r.y === y),
  makeRow('sub-' + y, 'subtotal', null, y, y + ' 소계', null, null, SUBTOTALS[y]),
]);
const GRAND_ROW: StatRow = makeRow('grand', 'grand', null, 0, '총 계', null, null, GRAND);
const PINNED_BOTTOM: StatRow[] = [GRAND_ROW];

/* ──────────────────────────────
   검색조건 재계산(2026-11-16 — 상단 '한계' 참조). 전부 결정적(난수 없음).
   모펀드: MOAF = 행 번호 % 8 === 5(17조합) · 나머지 농식품모태펀드 / 계정구분: 수산 = % 7 === 3(20조합) · 나머지 농식품
────────────────────────────── */
export const mfOf = (no: number): string => (no % 8 === 5 ? 'MOAF' : '농식품모태펀드');
export const accOf = (no: number): string => (no % 7 === 3 ? '수산' : '농식품');
/** 월말확정 확정률 — 조합(행 번호)·칸 위치로 0.96~1.00 */
const confirmRate = (no: number, c: number) => 1 - ((no * 3 + c * 7) % 5) / 100;
export interface FundStatsFilter { mf: string; acc: string; dBase: string; asOf: string }
export const FUND_STATS_FILTER_DEFAULT: Readonly<FundStatsFilter> = Object.freeze({ mf: '', acc: '', dBase: '', asOf: '' });

const sumBase = (bs: StatBase[]): StatBase => {
  const z: StatBase = { form: 0, gov: 0, af: 0, naf: 0, duty: 0, under: 0, afinv: 0, nafinv: 0, recPrin: 0, recProf: 0 };
  for (const b of bs) for (const k of Object.keys(z) as (keyof StatBase)[]) z[k] += b[k];
  return z;
};

/** 표시 행(행 + 연도 소계) · 데이터 행 · 총계 — 조건이 아무것도 바꾸지 않으면 원문 상수 그대로 */
export function statRowsFor(f: FundStatsFilter): { rows: StatRow[]; display: StatRow[]; grand: StatRow } {
  let same = true;
  const picked = RAW.flatMap((a) => {
    const no = a[0];
    if ((f.mf === 'MOAF' && mfOf(no) !== 'MOAF') ||   /* 모펀드: 농식품모태펀드 = 원문 전 조합(전체 없음), MOAF = MOAF 공동출자 조합 */
        (f.acc && accOf(no) !== f.acc) || !onOrBefore(String(a[1]), f.asOf)) { same = false; return []; }
    const b = toBase(a);
    if (f.dBase !== '월말확정') return [{ a, b }];
    const adj: StatBase = { ...b, afinv: Math.round(b.afinv * confirmRate(no, 0)), nafinv: Math.round(b.nafinv * confirmRate(no, 1)),
      recPrin: Math.round(b.recPrin * confirmRate(no, 2)), recProf: Math.round(b.recProf * confirmRate(no, 3)) };
    if (adj.afinv !== b.afinv || adj.nafinv !== b.nafinv || adj.recPrin !== b.recPrin || adj.recProf !== b.recProf) same = false;
    return [{ a, b: adj }];
  });
  if (same) return { rows: ROWS, display: DISPLAY_ROWS, grand: GRAND_ROW };
  const rows = picked.map(({ a, b }) => makeRow('r-' + a[0], 'row', a[0], a[1], String(a[1]), a[2], a[3], b));
  const display = YEARS.flatMap((y) => {
    const inYear = picked.filter(({ a }) => a[1] === y);
    if (!inYear.length) return [];   // 통과 행이 없는 연도는 소계 행도 뺀다
    return [...rows.filter((r) => r.y === y), makeRow('sub-' + y, 'subtotal', null, y, y + ' 소계', null, null, sumBase(inYear.map((p) => p.b)))];
  });
  return { rows, display, grand: makeRow('grand', 'grand', null, 0, '총 계', null, null, sumBase(picked.map((p) => p.b))) };
}

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
   컬럼 정의 — 목업 `<thead>` 구조 그대로(리프 33개, 2단 그룹 6개).
   ⚠ 전 컬럼 `sortable:false` — 행 순서(연도 오름차순 + 각 해 끝의 소계)가 의미라 정렬하면 소계가 흩어진다.
────────────────────────────── */
/* AG Grid cellStyle은 CellStyle(문자열 인덱스 시그니처) — React CSSProperties와 타입이 다르다 */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 숫자 N/A(null) → '-' : 공유 numFmt(콤마·소수)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
/* 금액 셀 — grid context.unit로 환산한다. 단위가 바뀌면 refreshCells({force:true})로 재적용 */
const moneyFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '-';
  const unit = (p.context as GridCtx | undefined)?.unit ?? DEFAULT_UNIT;
  return String(unitText(p.value as number, unit));
};
/* 비율 셀 — 목업 pctN. 단위 토글과 무관(항상 %) */
const pctFmt = (p: ValueFormatterParams): string => String(pctN(p.value as number | null));

/* 텍스트 — 소계·총계 행은 값이 null이라 빈 칸(목업 tr.subtotal / tfoot의 빈 td) */
const txt = (field: keyof StatRow, header: string, width: number): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, cellStyle: flexCenter,
  cellRenderer: (p: any) => (p.value == null ? null : p.value),
});
/* 금액(억원 저장) — 우측정렬. numStyle()은 셀마다 호출되는 함수(0=muted, pinned 총계행 자동 bold) */
const amt = (field: keyof StatRow, header: string, width = 116): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, type: 'rightAligned',
  valueFormatter: moneyFmt, cellStyle: numStyle() as any,
});
/* 건수(개) — 우측정렬 정수 */
const cnt = (field: keyof StatRow, header: string, width = 92): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle() as any,
});
/* 비율(%) — 우측정렬 */
const pct = (field: keyof StatRow, header: string, width = 108): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, type: 'rightAligned', valueFormatter: pctFmt, cellStyle: numStyle() as any,
});
/* 원문 미확인 열 — 값이 항상 null이라 nullFmt가 전 행 '-'를 낸다(별도 하드코딩 아님).
   정렬은 열 의미를 따른다 — 수량형(금액·년수·승수)은 right=true 로 우측, 연도·날짜는 좌측 */
const dash = (field: keyof StatRow, header: string, width = 104, right = false): ColDef<StatRow> => ({
  field, headerName: header, width, sortable: false, valueFormatter: nullFmt,
  ...(right ? { type: 'rightAligned', cellStyle: numStyle() as any } : { cellStyle: tabNum }),
});

const columnDefs: (ColDef<StatRow> | ColGroupDef<StatRow>)[] = [
  /* NO — 소계·총계 행은 목업에서 NO~분야가 가로 병합된 한 칸이라 비운다
     (AG Grid엔 가로 병합이 없어 '2011 소계'/'총 계' 라벨을 연도 컬럼에 싣는다). */
  { field: 'no', headerName: 'NO', width: 72, maxWidth: 72, pinned: 'left', sortable: false, cellStyle: tabNum,
    valueFormatter: (p) => (p.value == null ? '' : String(p.value)) },
  /* 연도 — 헤더 라벨이 연도기준(결성/선정)을 따른다. headerName을 state로 갈아끼워 컬럼을 재생성하면
     폭이 선언값으로 되돌아가므로(apfs-aggrid 계약6) headerValueGetter + refreshHeader()로만 바꾼다. */
  { field: 'ylabel', headerName: DEFAULT_YEAR_BASIS, width: 110, pinned: 'left', sortable: false, cellStyle: tabNum,
    headerValueGetter: (p: HeaderValueGetterParams<StatRow>) => (p.context as GridCtx | undefined)?.yearBasis ?? DEFAULT_YEAR_BASIS,
    valueFormatter: (p) => String(p.value) },
  txt('fld', '분야', 132),
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
      dash('recCut', '감액금액', 116, true)] },
  dash('ybiz', '출자사업연도', 132),
  dash('fd', '결성일', 112), dash('rd', '등록일', 112), dash('bd', '기준일', 112),
  /* 목업 헤더의 보조 줄 `(등록일~기준일)`은 한 줄 headerName으로 합친다(AG Grid 헤더는 단일 텍스트) */
  dash('elapsed', '경과년(등록일~기준일)', 160, true),
  { headerName: '투자승수', headerClass: 'apfs-grp-b', marryChildren: true,
    children: [dash('mAf', '농식품', 96, true), dash('mNaf', '비농식품', 100, true), dash('mAll', '전체', 92, true)] },
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

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
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
  useHotkey(HOTKEYS.print.combo, printGrid, { skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { skipInDialog: true });

  /* 상세필터 — 모펀드·계정구분·기준일자는 조합 행을 거르고 데이터기준은 금액을 다시 계산한다(statRowsFor, 상단 한계 주석). */
  /* 모펀드 = 목업 select 에 '전체'가 없다(농식품모태펀드·MOAF) → 기본 농식품모태펀드 = 원문 수치 그대로, MOAF 만 대안 데이터(2026-11-16 사용자 결정 "고정 기본값의 다른 값은 데이터 추가").
      칩은 기본값이어도 늘 현재 값을 보인다(필수라 × 없음 — 인라인 패널 칸엔 고른 값이 안 보여 칩이 유일한 표시, 2026-11-17 · 정본 RiskPage specsToApplied).
      [초기화]는 기본값으로 */
  const [fMf, setFMf] = useState(MF_DEFAULT);        // 모펀드
  const [fAcct, setFAcct] = useState('');    // 계정구분
  const [fDbasis, setFDbasis] = useState(''); // 데이터기준
  const [fDate, setFDate] = useState('');    // 기준일자 — 목업 기본값 2026-07-31은 데모 표시값이라 초기값으로 승격하지 않는다
  /* 연도기준은 값이 늘 하나 잡혀 있으므로 초기화 = 기본값(결성연도) 복귀 */
  const clearFilters = () => { setFMf(MF_DEFAULT); setFAcct(''); setFDbasis(''); setFDate(''); setYearBasis(DEFAULT_YEAR_BASIS); };

  /* 검색조건 반영 표시 행·총계 — 기본 상태면 원문 상수 그대로(같은 참조) */
  const stats = useMemo(() => statRowsFor({ mf: fMf, acc: fAcct, dBase: fDbasis, asOf: fDate }), [fMf, fAcct, fDbasis, fDate]);
  const pinnedBottom = useMemo(() => (stats.grand === GRAND_ROW ? PINNED_BOTTOM : [stats.grand]), [stats]);
  /* 그리드 context — 금액 포매터(moneyFmt)와 연도 헤더(headerValueGetter)가 참조 */
  const gridContext = useMemo<GridCtx>(() => ({ unit, yearBasis }), [unit, yearBasis]);
  /* 단위 변경 → 금액 셀 재포맷. 본문 + pinned 총계행 모두 */
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);
  /* 연도기준 변경 → 연도 컬럼 헤더 라벨만 다시 읽힌다(컬럼 재생성 아님 — 폭 되돌림 방지) */
  useEffect(() => { apiRef.current?.refreshHeader(); }, [yearBasis]);
  /* 검색조건 변경 → 첫 페이지로(외부필터 onFilterChanged 와 같은 정책 — 줄어든 표의 빈 뒤 페이지에 남지 않게) */
  useEffect(() => { apiRef.current?.paginationGoToFirstPage(); }, [stats]);

  const onGridReady = useCallback((e: GridReadyEvent<StatRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const refresh = () => { clearFilters(); toast.success('조회되었습니다'); };

  /* ── Excel(.xlsx) — 2단 헤더 병합 + 표시행(행+소계) + 총계, 선택 단위 환산. ── */
  const exportExcel = () => {
    const { head1, head2, keys, merges } = flattenForExcel(columnDefs, yearBasis, unit);
    const src = [...stats.display, stats.grand];   // 화면 렌더 소스와 같은 배열 구성(화면=엑셀 불변식)
    const body = src.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (v == null) return '';                                   // 미확인 열·소계의 빈 칸 → 화면 '-'를 빈 셀로
      if (k === 'no' || k === 'ylabel') return v;                 // 순번·연도(소계/총계 라벨)는 원값 그대로
      if (MONEY.has(k)) return toUnit(v as number, unit);
      if (COUNT.has(k)) return (v as number);
      if (PCT.has(k)) return pctN(v as number);     // 비율은 화면 문자열 그대로
      return v;
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
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '종합통계(확정)');
    XLSX.writeFile(wb, `종합통계(확정)_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(stats.display.length, 1) : PAGE_SIZE;
  /* 표시 건수 — 페이지네이션은 표시행(행+소계) 기준이고, 총 건수는 데이터 행(기본 137)만 센다 */
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '종합통계(확정)']}
      title="종합통계(확정)"
      favRoute="fund-stats"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(연도기준). 목업 select가 결성/선정 2개뿐이라 '전체' 칩은 없다.
         패널 4칸은 행·금액을 바꾸므로 적용 칩(값 + × — 모펀드는 기본값이어도 늘 표시, × 는 기본값과 다를 때만)을 단다. */
      filterChips={YEAR_BASES.map((b) => ({ key: b, label: b, active: yearBasis === b, onSelect: () => setYearBasis(b) }))}
      appliedFilters={[
        { label: '모펀드', value: fMf, onClear: fMf !== MF_DEFAULT ? () => setFMf(MF_DEFAULT) : undefined },   // 2026-11-17 사용자 결정 (a): 기본값으로 걸린 조건도 칩 상시 — 패널 칸이 값을 안 보여 칩이 유일한 표시. × 는 기본값과 다를 때만(= 기본값 복원)
        { label: '계정구분', value: fAcct, onClear: () => setFAcct('') },
        { label: '데이터기준', value: fDbasis, onClear: () => setFDbasis('') },
        { label: '기준일자', value: fDate, onClear: () => setFDate('') },
      ]}
      /* 상세필터 = 칩 줄 위 인라인 패널 — 목업 검색박스 항목·순서 그대로(모펀드·계정구분·연도기준·데이터기준·기준일자).
         검색어는 없다(목업 미포함). 연도기준은 툴바 칩이라 패널에 다시 두지 않는다(2026-11-05 사용자 지시 — 가드 filter_chip_drawer_dup.test.ts).
         계정구분 — 목업은 전체/농식품/수산 칩 그룹, PanelSelect 의 빈 값(전체)이 같은 역할을 한다. 나머지 4종은 행·금액 재계산.
         [초기화] = 모펀드·연도기준 기본값 복원 */
      filterPanel={
        <FilterPanel label="종합통계(확정) 조건" onReset={clearFilters}>
          <PanelSelect label="모펀드" value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} required />
          <PanelSelect label="계정구분" value={fAcct} onChange={setFAcct} options={['농식품', '수산']} />
          <PanelSelect label="데이터기준" value={fDbasis} onChange={setFDbasis} options={['운용사보고', '월말확정']} />
          <PanelPeriod label="기준일자" mode="day" value={fDate} onChange={setFDate} />
        </FilterPanel>
      }
      toolbarRight={<>
        {/* 금액 단위 전환(목업 목록바 `.unitwrap`) — 캡션 + 세그먼트 */}
        <span className="text-caption font-semibold inline-flex items-center" style={{ fontSize: 12, marginRight: 6 }}>
          {'단위: ' + unit}
        </span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(stats.rows.length) + '개 중 ' + String(shown) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      {/* AG Grid 본체 — 2단 그룹헤더(리프 33) + 인라인 소계 행 + pinned 총계. 조회 전용이라 행 선택·편집 진입 없음.
          가로는 AG Grid 내부 스크롤(33열이라 프레임보다 넓다 → AUTO_SIZE_CONTENT + 조합 컬럼 maxWidth 캡) */}
      <div>
        <AgGridReact<StatRow>
          theme={apfsTheme}
          rowData={stats.display}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          context={gridContext}
          getRowStyle={getRowStyle}
          pinnedBottomRowData={pinnedBottom}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">표시할 통계가 없습니다.</span>'}
        />
      </div>
    </GridFrame>
  );
}
