/* 자펀드 투자실적현황 — 투자자산관리 > 자펀드 관리 > 자펀드 투자실적현황.
   출처: S1_24_투자실적_현황_자펀드_.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 투자실적구분(경영형태별·분야별·산업별·연도별) → **툴바 FilterChip 4개**(단일 선택) + 드로어 `투자실적구분`
     (같은 state 공유). 목업 목록바 캡션 `투자실적 현황 · {구분}`은 카드 제목이 이미 같은 말을 하므로
     문구 대신 칩 앞 `Icon layers`로 대체한다.
   - 크로스탭 3뷰(경영형태별·분야별·산업별) → 2단 그룹헤더(`ColGroupDef` marryChildren) ·
     행 = 지표(투자건수·투자금액) × 연도 3(2011~2013). 목업 `VIEWS`·`crossTable()` 로직 그대로.
   - 연도별 뷰 → 3단 중첩 그룹헤더(`ColGroupDef` 안 `ColGroupDef`) 리프 24개 + pinned 합계행(YEARTOTAL 원문값).
   - 금액 단위 전환(원/백만원/억원, 기본 억원) → 캡션 + SegTabs + 그리드 `context={{unit}}` + `refreshCells`.
   - 검색박스(모펀드·계정구분·연도기준·투자실적구분·데이터기준·기준일자) → 상세필터 드로어(목업 순서 그대로).
     투자실적구분 외 5종은 행 컬럼과 미연동(noop) — `· 데이터 연동 후 적용` 캡션. 검색어는 OFF.
   - 엑셀 → SheetJS. 다단 헤더는 `flattenForExcel`을 **재귀로 일반화**(깊이 N → 헤더 N행 + 세로/가로 병합).
   - KPI 배지 행·`sub` 캡션·카드뷰·명세 팝업·행 선택·등록 없음(읽기전용 통계 화면).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커 0건 — 목업 원문에 `.review[data-rec]`가 없다(스크립트의 범용 팝오버 핸들러만 존재).

   한계·가정(결정 기록)
   - 필터 5종(모펀드·계정구분·연도기준·데이터기준·기준일자)은 **noop**이다. 원문이 조회 동작을 정의하지 않았고
     행 데이터에 대응 컬럼도 없다. 값이 행을 거르지 않으므로 **External Filter를 배선하지 않는다**
     (항상 통과하는 술어는 죽은 코드). 표시를 바꾸는 항목은 투자실적구분(=뷰)뿐이라 적용 칩도 생기지 않는다.
   - 뷰마다 컬럼·행·합계행이 통째로 바뀌므로 `<AgGridReact key={view}>`로 **리마운트**한다 —
     `autoSizeStrategy`는 최초 렌더 1회만 적용돼 교체만으로는 폭이 재산정되지 않는다(apfs-aggrid ⑥ 함정).
   - 크로스탭 수치는 목업 주석대로 **도메인 정합 샘플**(2011 원천 실값 × 연도 배수 1/1.08/1.15, 건당 3.2억).
   - 연도별 수치는 실 화면 캡처 확정값이라 원문 불일치(2019년 결성 8건 vs 펀드형태별 6건, 누적 금액 ±1 반올림)를
     **보정하지 않고 그대로** 싣는다(목업 설계메모: "임의 보정 없음").
   - `구분` 열의 rowspan(투자건수/투자금액이 연도 3행을 묶는 세로 병합)은 AG Grid가 지원하지 않아
     **행마다 표시**한다. 단위 보조표기는 목업 `(건)`/`(억원)`을 한 줄 캡션으로 붙였다.
   - 동명 리프(산업별 `관련산업` ×4)는 `field`를 평탄화 인덱스 `c0..cN`으로 부여한다(headerName만 중복).
   - 축(구분·연도)은 마스킹하지 않는다("축은 두고 데이터는 가린다") — 화면·엑셀 동일 계약. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, fmt, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, ValueFormatterParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { PeriodPicker } from './ui/period-picker';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS — 쓰기 전용(XLSX.read 미사용 → 알려진 파싱 CVE 비해당)

const { Button, IconBtn, SegTabs, FilterChip } = UI;

/* ──────────────────────────────
   뷰(투자실적구분) · 단위
────────────────────────────── */
type View = '경영형태별' | '분야별' | '산업별' | '연도별';
type CrossView = Exclude<View, '연도별'>;
const VIEWS: View[] = ['경영형태별', '분야별', '산업별', '연도별'];
const DEFAULT_VIEW: View = '경영형태별';   // 목업 state.view 기본값

type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const DEFAULT_UNIT: Unit = '억원';   // 목업 단위 세그먼트 aria-pressed=true가 '억원'

/* 원 저장값 → 선택 단위 수치(엑셀 숫자 셀용). 목업 fmtAmt()의 반올림 규칙 그대로. */
const toUnit = (won: number, unit: Unit): number =>
  unit === '원' ? Math.round(won) : unit === '백만원' ? Math.round(won / 1e6) : won / 1e8;
/* 표시 문자열 — 목업 fmtAmt(): 원·백만원=정수 콤마(공유 fmt), 억원=소수 1자리 고정.
   ⚠ 억원을 공유 fmt()에 넣지 않는다 — fmt는 정수를 소수 없이 찍어 `1,170.0`이 `1,170`으로 깎인다. */
const amtText = (won: number, unit: Unit): string =>
  unit === '억원'
    ? (won / 1e8).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
    : fmt(toUnit(won, unit));
/* 엑셀 숫자서식 — 화면 소수 자릿수와 일치(정수 판정이 아니라 **단위**가 기준) */
const Z_BY_UNIT: Record<Unit, string> = { 원: '#,##0', 백만원: '#,##0', 억원: '#,##0.0' };
const Z_COUNT = '#,##0';

/* ──────────────────────────────
   행 타입 — 크로스탭/연도별은 컬럼 집합이 달라 각각의 평탄 레코드다.
   리프 키가 동적(c0..cN, inv0..inv5)이라 인덱스 시그니처를 둔다(원천 리터럴은 아래 RAW 타입이 검사).
────────────────────────────── */
type Metric = '투자건수' | '투자금액';
interface CrossRow { id: string; metric: Metric; y: number; [k: string]: string | number }
interface YearRow { id: string; y: number | null; [k: string]: string | number | null }
type StatRow = CrossRow | YearRow;
type AnyDef = ColDef<StatRow> | ColGroupDef<StatRow>;
type StatColDefs = AnyDef[];

/* ──────────────────────────────
   크로스탭 3뷰 — 목업 `VIEWS`(그룹 구성 + 2011년 원천 건수 c11) 그대로
────────────────────────────── */
type CrossGroup = { label: string; leaves: string[]; solo?: boolean; total?: boolean };
type CrossCfg = { groups: CrossGroup[]; c11: number[] };

const CROSS: Record<CrossView, CrossCfg> = {
  경영형태별: {
    groups: [
      { label: '조합법인', leaves: ['영농조합', '영어조합'] },
      { label: '회사법인', leaves: ['농업회사', '어업회사'] },
      { label: '일반기업', leaves: ['일반기업'], solo: true },
      { label: '개인 및 기타', leaves: ['개인 및 기타'], solo: true },
      { label: '미입력', leaves: ['미입력'], solo: true },
      { label: '합계', leaves: ['합계'], solo: true, total: true },
    ],
    c11: [3, 0, 7, 4, 89, 3, 8],
  },
  분야별: {
    groups: [
      { label: '의무투자분야(60%)', leaves: ['농림축산', '수산', '식품', '비농업'] },
      { label: '기타(40%)', leaves: ['기타(40%)'], solo: true },
      { label: '미입력', leaves: ['미입력'], solo: true },
      { label: '합계', leaves: ['합계'], solo: true, total: true },
    ],
    c11: [12, 7, 10, 1, 4, 7],
  },
  산업별: {
    groups: [
      { label: '농림업', leaves: ['농업', '관련산업'] },
      { label: '축산업', leaves: ['축산업', '관련산업'] },
      { label: '수산업', leaves: ['수산업', '관련산업'] },
      { label: '식품산업', leaves: ['식품산업', '관련산업'] },
      { label: '비농업', leaves: ['비농업'], solo: true },
      { label: '미입력', leaves: ['미입력'], solo: true },
      { label: '합계', leaves: ['합계'], solo: true, total: true },
    ],
    c11: [3, 4, 3, 2, 2, 5, 8, 3, 4, 7],
  },
};

const CROSS_YEARS = [2011, 2012, 2013];
const CROSS_MULT: Record<number, number> = { 2011: 1, 2012: 1.08, 2013: 1.15 };
const AMT_PER_CASE = 320_000_000;   // 목업 AMTU — 건당 3.2억(샘플)
const METRICS: Metric[] = ['투자건수', '투자금액'];
const TOTAL_KEY = 'tot';   // 합계 리프 키(그룹 total)

/* 그룹별 리프 시작 인덱스 — 리프 키는 평탄화 인덱스 c0..cN(동명 리프 때문에 headerName을 키로 못 쓴다) */
const leafOffsets = (cfg: CrossCfg): number[] => {
  const offs: number[] = [];
  let acc = 0;
  for (const g of cfg.groups) { offs.push(acc); if (!g.total) acc += g.leaves.length; }
  return offs;
};

/* 행 생성 — 목업 crossTable(): counts = round(c11 × 배수), 금액 = counts × 3.2억(원), 합계 = 행 합 */
const crossRows = (view: CrossView): CrossRow[] => {
  const cfg = CROSS[view];
  return METRICS.flatMap((metric) =>
    CROSS_YEARS.map((y) => {
      const counts = cfg.c11.map((v) => Math.round(v * CROSS_MULT[y]));
      const vals = metric === '투자금액' ? counts.map((c) => c * AMT_PER_CASE) : counts;
      return {
        id: `${view}-${metric}-${y}`, metric, y,
        ...Object.fromEntries(vals.map((v, i) => ['c' + i, v])),
        [TOTAL_KEY]: vals.reduce((a, b) => a + b, 0),
      } as CrossRow;
    }));
};

/* ──────────────────────────────
   연도별 — 목업 YEARDATA(17행, 실 화면 캡처 확정값) 그대로.
   금액은 원 단위 저장(원문 억원 표시값 × 1e8), 화면·엑셀에서 선택 단위로 환산한다.
────────────────────────────── */
type YearRaw = {
  y: number; inv: number[]; fm: number[];
  fCnt: number; fAmt: number; fCumCnt: number; fCumAmt: number;
  iCnt: number; iAmt: number; iCumCnt: number; iCumAmt: number;
  rTot: number; rMo: number; rMi: number; gTot: number; gCh: number; gSg: number; gEt: number;
};
const E = 1e8;
const YEAR_RAW: YearRaw[] = [
  { y: 2010, inv: [5, 2, 1, 0, 1, 1], fm: [5, 4, 1], fCnt: 5, fAmt: 1170 * E, fCumCnt: 5, fCumAmt: 1170 * E, iCnt: 0, iAmt: 0, iCumCnt: 0, iCumAmt: 0, rTot: 1170 * E, rMo: 547 * E, rMi: 623 * E, gTot: 1170 * E, gCh: 65 * E, gSg: 70 * E, gEt: 1035 * E },
  { y: 2011, inv: [6, 2, 2, 0, 1, 1], fm: [6, 6, 0], fCnt: 6, fAmt: 1040 * E, fCumCnt: 11, fCumAmt: 2210 * E, iCnt: 8, iAmt: 150 * E, iCumCnt: 8, iCumAmt: 150 * E, rTot: 1040 * E, rMo: 495 * E, rMi: 545 * E, gTot: 1130 * E, gCh: 186 * E, gSg: 100 * E, gEt: 844 * E },
  { y: 2012, inv: [7, 2, 2, 0, 1, 2], fm: [7, 7, 0], fCnt: 7, fAmt: 1000 * E, fCumCnt: 18, fCumAmt: 3210 * E, iCnt: 30, iAmt: 473 * E, iCumCnt: 38, iCumAmt: 623 * E, rTot: 1000 * E, rMo: 540 * E, rMi: 460 * E, gTot: 1000 * E, gCh: 111 * E, gSg: 60 * E, gEt: 829 * E },
  { y: 2013, inv: [7, 0, 0, 3, 1, 3], fm: [7, 7, 0], fCnt: 7, fAmt: 900 * E, fCumCnt: 25, fCumAmt: 4110 * E, iCnt: 54, iAmt: 738 * E, iCumCnt: 92, iCumAmt: 1361 * E, rTot: 900 * E, rMo: 510 * E, rMi: 390 * E, gTot: 850 * E, gCh: 54 * E, gSg: 0, gEt: 796 * E },
  { y: 2014, inv: [10, 0, 0, 4, 1, 5], fm: [10, 10, 0], fCnt: 10, fAmt: 1290 * E, fCumCnt: 35, fCumAmt: 5400 * E, iCnt: 89, iAmt: 1223 * E, iCumCnt: 181, iCumAmt: 2584 * E, rTot: 1290 * E, rMo: 790 * E, rMi: 500 * E, gTot: 1290 * E, gCh: 180 * E, gSg: 12 * E, gEt: 1098 * E },
  { y: 2015, inv: [8, 0, 0, 3, 1, 4], fm: [8, 7, 1], fCnt: 8, fAmt: 1210 * E, fCumCnt: 43, fCumAmt: 6610 * E, iCnt: 80, iAmt: 914 * E, iCumCnt: 261, iCumAmt: 3497 * E, rTot: 1210 * E, rMo: 700 * E, rMi: 510 * E, gTot: 1210 * E, gCh: 110 * E, gSg: 45 * E, gEt: 1055 * E },
  { y: 2016, inv: [8, 0, 0, 2, 1, 5], fm: [8, 8, 0], fCnt: 8, fAmt: 1655 * E, fCumCnt: 51, fCumAmt: 8265 * E, iCnt: 73, iAmt: 991 * E, iCumCnt: 334, iCumAmt: 4489 * E, rTot: 1655 * E, rMo: 1040 * E, rMi: 615 * E, gTot: 1625 * E, gCh: 85 * E, gSg: 10 * E, gEt: 1530 * E },
  { y: 2017, inv: [7, 0, 0, 3, 1, 3], fm: [7, 7, 0], fCnt: 7, fAmt: 1170 * E, fCumCnt: 58, fCumAmt: 9435 * E, iCnt: 78, iAmt: 1035 * E, iCumCnt: 412, iCumAmt: 5524 * E, rTot: 1170 * E, rMo: 700 * E, rMi: 470 * E, gTot: 1170 * E, gCh: 60 * E, gSg: 45 * E, gEt: 1065 * E },
  { y: 2018, inv: [6, 0, 0, 1, 1, 4], fm: [6, 6, 0], fCnt: 6, fAmt: 875 * E, fCumCnt: 64, fCumAmt: 10310 * E, iCnt: 89, iAmt: 1281 * E, iCumCnt: 501, iCumAmt: 6805 * E, rTot: 875 * E, rMo: 520 * E, rMi: 355 * E, gTot: 875 * E, gCh: 15 * E, gSg: 50 * E, gEt: 810 * E },
  { y: 2019, inv: [8, 0, 0, 2, 2, 4], fm: [6, 5, 1], fCnt: 8, fAmt: 1331 * E, fCumCnt: 72, fCumAmt: 11641 * E, iCnt: 83, iAmt: 1161 * E, iCumCnt: 584, iCumAmt: 7966 * E, rTot: 1331 * E, rMo: 623 * E, rMi: 708 * E, gTot: 1331 * E, gCh: 58 * E, gSg: 50 * E, gEt: 1223 * E },
  { y: 2020, inv: [10, 0, 0, 2, 0, 8], fm: [10, 9, 1], fCnt: 10, fAmt: 1807 * E, fCumCnt: 82, fCumAmt: 13448 * E, iCnt: 83, iAmt: 1057 * E, iCumCnt: 667, iCumAmt: 9023 * E, rTot: 1807 * E, rMo: 980 * E, rMi: 827 * E, gTot: 1801 * E, gCh: 30 * E, gSg: 62 * E, gEt: 1709 * E },
  { y: 2021, inv: [12, 0, 0, 2, 1, 9], fm: [10, 10, 0], fCnt: 12, fAmt: 1933 * E, fCumCnt: 94, fCumAmt: 15381 * E, iCnt: 144, iAmt: 1504 * E, iCumCnt: 811, iCumAmt: 10527 * E, rTot: 1933 * E, rMo: 1047 * E, rMi: 886 * E, gTot: 1933 * E, gCh: 215 * E, gSg: 0, gEt: 1718 * E },
  { y: 2022, inv: [17, 0, 0, 2, 1, 14], fm: [17, 17, 0], fCnt: 17, fAmt: 2727 * E, fCumCnt: 111, fCumAmt: 18108 * E, iCnt: 124, iAmt: 1364 * E, iCumCnt: 935, iCumAmt: 11891 * E, rTot: 2727 * E, rMo: 1656 * E, rMi: 1071 * E, gTot: 2723 * E, gCh: 195 * E, gSg: 35 * E, gEt: 2493 * E },
  { y: 2023, inv: [14, 0, 0, 3, 0, 11], fm: [13, 13, 0], fCnt: 14, fAmt: 2142 * E, fCumCnt: 125, fCumAmt: 20250 * E, iCnt: 138, iAmt: 1435 * E, iCumCnt: 1073, iCumAmt: 13327 * E, rTot: 2142 * E, rMo: 1315 * E, rMi: 827 * E, gTot: 2129 * E, gCh: 88 * E, gSg: 53 * E, gEt: 1989 * E },
  { y: 2024, inv: [15, 0, 0, 1, 0, 14], fm: [13, 13, 0], fCnt: 15, fAmt: 2527 * E, fCumCnt: 140, fCumAmt: 22776 * E, iCnt: 208, iAmt: 2140 * E, iCumCnt: 1281, iCumAmt: 15466 * E, rTot: 2527 * E, rMo: 1416 * E, rMi: 1111 * E, gTot: 2503 * E, gCh: 116 * E, gSg: 70 * E, gEt: 2317 * E },
  { y: 2025, inv: [14, 0, 0, 1, 0, 13], fm: [11, 11, 0], fCnt: 14, fAmt: 3384 * E, fCumCnt: 154, fCumAmt: 26161 * E, iCnt: 184, iAmt: 2012 * E, iCumCnt: 1465, iCumAmt: 17478 * E, rTot: 3384 * E, rMo: 1246 * E, rMi: 2138 * E, gTot: 3380 * E, gCh: 235 * E, gSg: 0, gEt: 3146 * E },
  { y: 2026, inv: [5, 0, 0, 0, 1, 4], fm: [4, 4, 0], fCnt: 5, fAmt: 598 * E, fCumCnt: 159, fCumAmt: 26759 * E, iCnt: 78, iAmt: 1100 * E, iCumCnt: 1543, iCumAmt: 18579 * E, rTot: 598 * E, rMo: 354 * E, rMi: 244 * E, gTot: 598 * E, gCh: 20 * E, gSg: 21 * E, gEt: 557 * E },
];

/* 목업 YEARTOTAL — 누적 4칸(fCumCnt·fCumAmt·iCumCnt·iCumAmt)은 원문 tfoot이 '-'라 null */
const YEAR_TOTAL_RAW = {
  inv: [159, 6, 5, 29, 14, 105], fm: [148, 144, 4],
  fCnt: 159, fAmt: 26759 * E, iCnt: 1543, iAmt: 18579 * E,
  rTot: 26759 * E, rMo: 14479 * E, rMi: 12280 * E,
  gTot: 26718 * E, gCh: 1823 * E, gSg: 683 * E, gEt: 24214 * E,
};

const spreadArr = (prefix: string, arr: number[]) => Object.fromEntries(arr.map((v, i) => [prefix + i, v]));

const YEAR_ROWS: YearRow[] = YEAR_RAW.map((r) => ({
  id: 'y-' + r.y, y: r.y,
  ...spreadArr('inv', r.inv), ...spreadArr('fm', r.fm),
  fCnt: r.fCnt, fAmt: r.fAmt, fCumCnt: r.fCumCnt, fCumAmt: r.fCumAmt,
  iCnt: r.iCnt, iAmt: r.iAmt, iCumCnt: r.iCumCnt, iCumAmt: r.iCumAmt,
  rTot: r.rTot, rMo: r.rMo, rMi: r.rMi, gTot: r.gTot, gCh: r.gCh, gSg: r.gSg, gEt: r.gEt,
}));

const YEAR_TOTAL_ROW: YearRow = {
  id: '__total', y: null,
  ...spreadArr('inv', YEAR_TOTAL_RAW.inv), ...spreadArr('fm', YEAR_TOTAL_RAW.fm),
  fCnt: YEAR_TOTAL_RAW.fCnt, fAmt: YEAR_TOTAL_RAW.fAmt, fCumCnt: null, fCumAmt: null,
  iCnt: YEAR_TOTAL_RAW.iCnt, iAmt: YEAR_TOTAL_RAW.iAmt, iCumCnt: null, iCumAmt: null,
  rTot: YEAR_TOTAL_RAW.rTot, rMo: YEAR_TOTAL_RAW.rMo, rMi: YEAR_TOTAL_RAW.rMi,
  gTot: YEAR_TOTAL_RAW.gTot, gCh: YEAR_TOTAL_RAW.gCh, gSg: YEAR_TOTAL_RAW.gSg, gEt: YEAR_TOTAL_RAW.gEt,
};
/* 정적 합계행 — 행이 변하지 않으므로 모듈 상수(apfs-aggrid 계약4: 인라인 배열 금지, 정적이면 상수).
   값도 원문 확정값이라 rows 합산으로 재계산하지 않는다(원문이 일부러 불일치를 남겼다 — 상단 '한계'). */
const YEAR_PINNED: StatRow[] = [YEAR_TOTAL_ROW];

/* 연도별 금액 컬럼(단위 환산 대상) — 나머지는 건수 */
const YEAR_MONEY = new Set(['fAmt', 'fCumAmt', 'iAmt', 'iCumAmt', 'rTot', 'rMo', 'rMi', 'gTot', 'gCh', 'gSg', 'gEt']);

const PAGE_SIZE = 20;

/* ──────────────────────────────
   포매터·컬럼 팩토리
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const axisCell: CellStyle = { ...centerNum, fontWeight: 600 };

const ctxUnit = (p: ValueFormatterParams): Unit => (p.context as { unit?: Unit } | undefined)?.unit ?? DEFAULT_UNIT;

/* 숫자 N/A(null)는 '-' — 공유 numFmt(콤마·소수·마스킹)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams): string => (p.value == null ? '-' : numFmt(p));
/* 금액 셀 — grid context.unit로 환산 후 마스킹. 단위가 바뀌면 refreshCells({force:true})로 재적용 */
const moneyFmt = (p: ValueFormatterParams): string =>
  (p.value == null ? '-' : mn(amtText(p.value as number, ctxUnit(p))));
/* 크로스탭 셀 — 같은 컬럼에 건수 행/금액 행이 섞이므로 행의 metric으로 분기(목업 crossTable 동형) */
const crossFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '-';
  return p.data?.metric === '투자금액'
    ? mn(amtText(p.value as number, ctxUnit(p)))
    : mn(fmt(p.value as number));
};
/* 구분 셀(크로스탭) — 축이라 비마스킹. 목업의 `투자금액<br>(억원)` 보조표기를 한 줄 캡션으로 */
const metricFmt = (p: ValueFormatterParams): string =>
  (p.value === '투자금액' ? `투자금액 (${ctxUnit(p)})` : '투자건수 (건)');

/* 크로스탭 리프 — 컬럼 합이 프레임보다 좁은 매트릭스라 autoSizeStrategy 없이 flex로 폭을 채운다 */
const crossLeaf = (field: string, header: string, strong?: boolean): ColDef<StatRow> => ({
  field: field as any, headerName: header, flex: 1, minWidth: 92,
  valueFormatter: crossFmt, cellStyle: numStyle(strong) as any, type: 'rightAligned',
});
/* 연도별 건수 리프 */
const cnt = (field: string, header: string, strong?: boolean, width = 96): ColDef<StatRow> => ({
  field: field as any, headerName: header, width,
  valueFormatter: nullFmt, cellStyle: numStyle(strong) as any, type: 'rightAligned',
});
/* 연도별 금액 리프 — '합계' 열은 strong(그룹 총액 강조, subfund_manage 동형) */
const amt = (field: string, header: string, strong?: boolean, width = 120): ColDef<StatRow> => ({
  field: field as any, headerName: header, width,
  valueFormatter: moneyFmt, cellStyle: numStyle(strong) as any, type: 'rightAligned',
});

/* 크로스탭 컬럼 — 구분(pinned) · 연도 · 그룹들. solo 그룹은 그룹 없이 리프 1개(목업 rowspan=2 동형),
   total 그룹(합계)은 행 합계 리프 하나다. */
const crossColumns = (view: CrossView): StatColDefs => {
  const cfg = CROSS[view];
  const offs = leafOffsets(cfg);
  const defs: StatColDefs = [
    { field: 'metric' as any, headerName: '구분', pinned: 'left', width: 120,
      cellStyle: { fontWeight: 600 }, sortable: false, valueFormatter: metricFmt },
    { field: 'y' as any, headerName: '연도', width: 92, cellStyle: axisCell,
      valueFormatter: (p) => String(p.value) },   // 축(연도)은 비마스킹
  ];
  cfg.groups.forEach((g, gi) => {
    if (g.total) { defs.push(crossLeaf(TOTAL_KEY, g.label, true)); return; }
    if (g.solo) { defs.push(crossLeaf('c' + offs[gi], g.label)); return; }
    defs.push({
      headerName: g.label, marryChildren: true, headerClass: gi % 2 ? 'apfs-grp-b' : 'apfs-grp-a',
      children: g.leaves.map((lf, j) => crossLeaf('c' + (offs[gi] + j), lf)),
    });
  });
  return defs;
};

/* 연도별 컬럼 — 3단 중첩(그룹 > 그룹 > 리프). 동명 그룹(연도별·누적·합계)이 여러 번 나오므로
   `groupId`를 명시해 자동 생성 id 충돌 가능성을 없앤다. */
const YEAR_COLUMNS: StatColDefs = [
  { field: 'y' as any, headerName: '구분', pinned: 'left', width: 96, cellStyle: axisCell, sortable: false,
    valueFormatter: (p) => (p.node?.rowPinned ? '합 계' : `${p.value}년`) },   // 축이라 비마스킹
  {
    headerName: '자펀드 결성현황', groupId: 'g-form', marryChildren: true, headerClass: 'apfs-grp-a',
    children: [
      { headerName: '투자분야별', groupId: 'g-form-field', marryChildren: true,
        children: [cnt('inv0', '합계', true), cnt('inv1', '농림축산업'), cnt('inv2', '식품산업'),
          cnt('inv3', '농림축산식품산업', false, 130), cnt('inv4', '수산업'), cnt('inv5', '특수목적')] },
      { headerName: '펀드형태별', groupId: 'g-form-type', marryChildren: true,
        children: [cnt('fm0', '합계', true), cnt('fm1', '농식품펀드'), cnt('fm2', '사모펀드(PEF)', false, 118)] },
      { headerName: '연도별', groupId: 'g-form-year', marryChildren: true,
        children: [cnt('fCnt', '펀드수'), amt('fAmt', '결성금액')] },
      { headerName: '누적', groupId: 'g-form-cum', marryChildren: true,
        children: [cnt('fCumCnt', '펀드수'), amt('fCumAmt', '결성금액')] },
    ],
  },
  {
    headerName: '투자실적', groupId: 'g-inv', marryChildren: true, headerClass: 'apfs-grp-b',
    children: [
      { headerName: '연도별', groupId: 'g-inv-year', marryChildren: true,
        children: [cnt('iCnt', '투자건수'), amt('iAmt', '투자금액')] },
      { headerName: '누적', groupId: 'g-inv-cum', marryChildren: true,
        children: [cnt('iCumCnt', '투자건수'), amt('iCumAmt', '투자금액')] },
    ],
  },
  {
    headerName: '자펀드 조성금액', groupId: 'g-raise', marryChildren: true, headerClass: 'apfs-grp-a',
    children: [
      { headerName: '조성금액', groupId: 'g-raise-amt', marryChildren: true,
        children: [amt('rTot', '합계', true), amt('rMo', '모태펀드'), amt('rMi', '민간')] },
      { headerName: '운용사(GP)별 조성현황', groupId: 'g-raise-gp', marryChildren: true,
        children: [amt('gTot', '합계', true), amt('gCh', '창투사'), amt('gSg', '신기사'), amt('gEt', '기타')] },
    ],
  },
];

/* 뷰별 행·컬럼은 정적이라 모듈 스코프에서 1회 계산한다(렌더마다 새 배열이면 컬럼 재생성 → 폭 되돌림) */
const CROSS_ROWS: Record<CrossView, StatRow[]> = {
  경영형태별: crossRows('경영형태별'), 분야별: crossRows('분야별'), 산업별: crossRows('산업별'),
};
const CROSS_COLUMNS: Record<CrossView, StatColDefs> = {
  경영형태별: crossColumns('경영형태별'), 분야별: crossColumns('분야별'), 산업별: crossColumns('산업별'),
};

/* ──────────────────────────────
   Excel 헤더 — 깊이 N 재귀 일반화(연도별 3단 · 크로스탭 2단)
   subfund_manage의 2단 전용 flattenForExcel을 일반화했다: 리프는 자기 행부터 마지막 행까지 세로 병합,
   그룹은 자식 리프 폭만큼 가로 병합. 금액 리프 헤더엔 선택 단위를 덧붙인다(커뮤니티 xlsx는 셀 스타일을
   못 써 단위를 텍스트로 싣는다 — fund_cash_forecast 동형, 3단이라 그룹이 아니라 리프에 붙인다).
────────────────────────────── */
function flattenForExcel(defs: StatColDefs, unitOf: (key: string) => string | null) {
  const depthOf = (d: AnyDef): number =>
    ('children' in d && d.children ? 1 + Math.max(...(d.children as AnyDef[]).map(depthOf)) : 1);
  const rowsN = Math.max(...defs.map(depthOf));
  const head: string[][] = Array.from({ length: rowsN }, () => [] as string[]);
  const keys: string[] = [];
  const merges: XLSX.Range[] = [];
  let c = 0;
  const walk = (d: AnyDef, r: number) => {
    if ('children' in d && d.children) {
      const start = c;
      (d.children as AnyDef[]).forEach((k) => walk(k, r + 1));
      head[r][start] = d.headerName ?? '';
      for (let i = start + 1; i < c; i += 1) head[r][i] = '';
      if (c - start > 1) merges.push({ s: { r, c: start }, e: { r, c: c - 1 } });
      return;
    }
    const col = d as ColDef<StatRow>;
    const key = String(col.field ?? col.colId ?? '');
    const u = unitOf(key);
    head[r][c] = (col.headerName ?? '') + (u ? `(${u})` : '');
    for (let i = r + 1; i < rowsN; i += 1) head[i][c] = '';
    keys.push(key);
    if (r < rowsN - 1) merges.push({ s: { r, c }, e: { r: rowsN - 1, c } });
    c += 1;
  };
  defs.forEach((d) => walk(d, 0));
  head.forEach((row) => { for (let i = 0; i < c; i += 1) if (row[i] === undefined) row[i] = ''; });
  return { head, keys, merges };
}

/* ──────────────────────────────
   드로어·페이저·kebab (골드 로컬 복사 — 공유 export 아님)
────────────────────────────── */
const inputStyle = (kind?: string): CSSProperties => ({
  width: 'fit-content', minWidth: controlMinWidth(kind), maxWidth: '100%', boxSizing: 'border-box',
  padding: '9px 11px', fontFamily: 'inherit', fontSize: 14,
  border: '1px solid var(--input)', borderRadius: 8, background: 'var(--card)', color: 'var(--foreground)',
});

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* noop=컬럼 미연동 필터(캡션으로 no-op 신호) · plain=<label> 대신 <div>(버튼 트리거 이중 토글 방지) */
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
/* all=null → '전체' 옵션 없음(투자실적구분은 항상 4뷰 중 하나라 빈 값이 없다) */
function DrawerSelect({ value, onChange, options, all = '전체' }: { value: string; onChange: (v: string) => void; options: string[]; all?: string | null }) {
  return (
    <div className="relative" style={{ width: 'fit-content', maxWidth: '100%' }}>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle('select'), appearance: 'none', WebkitAppearance: 'none', paddingRight: 32 }}>
        {all !== null && <option value="">{all}</option>}
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <Icon name="chevron-down" size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted-foreground)', pointerEvents: 'none' }} />
    </div>
  );
}

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 목업에 전역 등록이 없어 kebab 단독(apfs-grid 툴바 규약) */
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
export function FundInvestStatus({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<StatRow> | null>(null);
  const [view, setView] = useState<View>(DEFAULT_VIEW);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: CROSS_ROWS[DEFAULT_VIEW as CrossView].length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const masked = useMask();

  /* 상세필터 — 투자실적구분(=view)만 표시를 바꾸고 나머지 5종은 noop(상단 '한계') */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');       // 모펀드
  const [fAcc, setFAcc] = useState('');     // 계정구분
  const [fYBase, setFYBase] = useState(''); // 연도기준
  const [fDBase, setFDBase] = useState(''); // 데이터기준
  const [fAsOf, setFAsOf] = useState('');   // 기준일자 — 목업 기본값 2026-07-31은 적용하지 않는다(열린 경계)
  const resetFilters = () => { setFMf(''); setFAcc(''); setFYBase(''); setFDBase(''); setFAsOf(''); setView(DEFAULT_VIEW); };

  const isYearView = view === '연도별';
  const rows = isYearView ? YEAR_ROWS : CROSS_ROWS[view as CrossView];
  const columnDefs = isYearView ? YEAR_COLUMNS : CROSS_COLUMNS[view as CrossView];

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  const onGridReady = useCallback((e: GridReadyEvent<StatRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* 단위 변경 → 금액 셀(context.unit 참조) 재포맷. 본문 + pinned 합계행 + 구분 캡션 모두 */
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);
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

  /* 새로고침 — 원천이 정적 상수라 재조회할 원본이 없다. 표시만 다시 그리고 알린다(가짜 데이터 갱신 금지) */
  const refresh = () => { apiRef.current?.refreshCells({ force: true }); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 현재 뷰 기준. 다단 헤더 병합은 flattenForExcel(재귀), 금액은 선택 단위 숫자 셀.
        마스크 ON이면 숫자 0·텍스트 ''(축인 구분·연도는 화면과 같이 비마스킹). ── */
  const exportExcel = () => {
    const moneyUnitOf = (k: string) => (isYearView && YEAR_MONEY.has(k) ? unit : null);
    const { head, keys, merges } = flattenForExcel(columnDefs, moneyUnitOf);
    const src = isYearView ? [...rows, YEAR_TOTAL_ROW] : rows;   // 화면=엑셀 불변식(본문 + pinned 합계행)
    const cell = (r: StatRow, k: string): { v: string | number; z?: string } => {
      if (k === 'metric') {
        const m = (r as CrossRow).metric;
        return { v: `${m} (${m === '투자금액' ? unit : '건'})` };   // 축(구분) — 비마스킹
      }
      if (k === 'y') return { v: isYearView ? (r.y == null ? '합 계' : `${r.y}년`) : (r.y as number) };   // 축(연도)
      const raw = (r as any)[k];
      if (raw == null) return { v: '' };
      const money = isYearView ? YEAR_MONEY.has(k) : (r as CrossRow).metric === '투자금액';
      return { v: masked ? 0 : money ? toUnit(raw as number, unit) : (raw as number), z: money ? Z_BY_UNIT[unit] : Z_COUNT };
    };
    const cells = src.map((r) => keys.map((k) => cell(r, k)));
    const ws = XLSX.utils.aoa_to_sheet([...head, ...cells.map((row) => row.map((x) => x.v))]);
    cells.forEach((row, i) => row.forEach((x, j) => {
      if (!x.z) return;
      const a = XLSX.utils.encode_cell({ r: head.length + i, c: j });
      if (ws[a]) ws[a].z = x.z;
    }));
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'metric' ? 16 : k === 'y' ? 10 : 14 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, view);
    XLSX.writeFile(wb, `자펀드 투자실적현황_${view}_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '자펀드 투자실적현황']}
      title="자펀드 투자실적현황"
      favRoute="fund-invest-status"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(투자실적구분 4뷰, 단일 선택). 드로어 항목이 전부 noop이라 적용 칩은 없다. */
      toolbarLeft={(
        <>
          <Icon name="layers" size={16} className="text-caption" />
          {VIEWS.map((v) => (
            <FilterChip key={v} active={view === v} onClick={() => setView(v)}>{v}</FilterChip>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환(목업 목록바 `.unitwrap`) — 캡션 + 세그먼트 */}
        <span className="text-caption" style={{ fontSize: 12.5 }}>{'단위: ' + unit}</span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 중 ' + mn(String(Math.min(shown, rows.length))) + '개 항목 표시 중'}</span>}
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

      {/* AG Grid 본체 — 뷰 전환은 key로 **리마운트**(autoSizeStrategy 1회 적용 함정 회피, 상단 '한계') */}
      <div>
        <AgGridReact<StatRow>
          key={view}
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          context={{ unit }}   // 금액 포매터(moneyFmt/crossFmt)가 참조. 단위 변경 시 useEffect가 refreshCells로 재적용
          getRowId={(p) => p.data.id}
          pinnedBottomRowData={isYearView ? YEAR_PINNED : undefined}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          /* 연도별=25컬럼(내용 맞춤) · 크로스탭=좁은 매트릭스(컬럼 flex로 폭 채움 → 전략 없음) */
          autoSizeStrategy={isYearView ? AUTO_SIZE_CONTENT : undefined}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 투자실적이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(모펀드·계정구분·연도기준·투자실적구분·데이터기준·기준일자).
             투자실적구분만 표시를 바꾸고 나머지는 noop 캡션. 검색어는 OFF(만들지 않는다). ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">투자실적 현황 조회 조건을 고르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            <DrawerField label="연도기준" noop><DrawerSelect value={fYBase} onChange={setFYBase} options={['출자사업연도', '결성연도', '등록연도']} /></DrawerField>
            {/* 투자실적구분 — 툴바 칩과 같은 state 공유. 항상 4뷰 중 하나라 '전체' 옵션이 없다 */}
            <DrawerField label="투자실적구분"><DrawerSelect value={view} onChange={(v) => setView(v as View)} options={VIEWS} all={null} /></DrawerField>
            <DrawerField label="데이터기준" noop><DrawerSelect value={fDBase} onChange={setFDBase} options={['운용사보고', '월말확정']} /></DrawerField>
            {/* 기준일자 — PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker) */}
            <DrawerField label="기준일자" noop plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fAsOf} onChange={setFAsOf} ariaLabel="기준일자" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </GridFrame>
  );
}
