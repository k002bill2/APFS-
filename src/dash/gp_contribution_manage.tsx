/* 출자/분배조회(자펀드) — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 출자/분배조회(자펀드)).
   출처: S1_14__운용사_출자배분관리.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드·운용사·자펀드·계정구분·담당자·출자/배분·기준일자 시작~종료)
       → **출자/배분 FilterChip**(툴바 좌, 목업도 칩버튼 그룹이다) + 상세필터 드로어(Sheet, apfs-detail-filter).
         드로어 항목 순서는 목업 검색박스 순서 그대로. 검색어는 OFF(opt-in 미요청).
         목업의 [조회] 버튼은 즉시 반영형이라 없다.
       ⚠ 기준일자는 **일(YYYY-MM-DD) 범위**다 → `PeriodPicker mode="day"` 2개. 목업 기본값
         `2000-01-01 ~ 2026-08-12`은 **적용하지 않는다**(빈 문자열 = 열린 경계, apfs-datepicker 함정).
       ⚠ 행 컬럼과 미연동인 항목(모펀드·계정구분·담당자)은 `noop` 캡션만 두고 `passes`에 넣지 않는다.
         담당자는 원문에 옵션·샘플 값이 없어 옵션을 **지어내지 않는다**(빈 목록 + 검토필요 마커).
   - 목록 그리드 → AG Grid **2단 그룹헤더**(기타조합원 배분·모태펀드 배분 각 5열, `marryChildren`) +
     **pinned 합계 2행**(목업 tfoot 소계·합계 둘 다). 행 선택·등록·워크플로우 없음 → selbar도 없다.
   - 기준일자 셀 → **링크(LinkCell)**: 클릭·Enter로 `일자별출자배분관리` 상세 팝업
     (`gp_contribution_detail_modal.tsx`). 목업은 **행 전체 클릭**이 진입점이지만 우리 규약은 셀 링크다
     (골드 `general_meeting_manage.tsx` 동형 — 행 클릭은 행 선택과 충돌하고 어느 셀이 진입점인지 보이지 않는다).
   - KPI 배지 행 → **미포함**. 카드뷰 토글·`sub` 캡션·명세 팝업·금액 단위 토글도 없다
     (단위 토글은 목업 설계메모 [확인 필요]가 미확정이라 원문 상태 유지 — 툴바엔 `단위: 원` 캡션만).
   - 엑셀 → SheetJS(2단 헤더 병합 · 본문 + 소계 + 합계 · 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **전수 이식**했다 — 목업 원문 2건: 검색 1건(담당자) + 상세 팝업 1건(업로드 여부, 모달 파일).

   한계·가정(결정 기록)
   - **rowspan 미재현**: 목업은 운용사·자펀드·약정총액·모태펀드 약정액을 `rowspan=12`로 1회만 표시하지만
     AG Grid엔 행 병합이 없다 → **12행 모두 같은 값**을 싣는다(값 창작 아님, 같은 값의 반복 표시).
     그래서 합계행의 약정총액·모태펀드 약정액은 단순 합(12배)이 아니라 **자펀드(fn) 기준 dedupe 합**이다.
   - **원문 정렬 유지**: 구분(출자 5행 → 배분 7행) 순서라 기준일자가 시간순이 아니다(목업 주석과 동일) — 재정렬하지 않는다.
     '출자잔액'도 목업 주석대로 원문 값 그대로다(재계산하지 않음).
   - 배지 톤은 목업이 출자·배분을 같은 `tag b`로 칠하지만, 우리는 **출자=info · 배분=primary**로 갈랐다
     (같은 색이면 열 전체가 한 덩어리로 보여 구분 컬럼의 의미가 사라진다. 문구·값은 원문 그대로).
   - **담당자 필터의 의미**(출자자(LP) 측인지 운용사(GP) 측인지)는 목업 설계메모 [개발자 확인 필요]로 남아 있다 →
     옵션 없이 검토필요 마커만 단다.
   - 배분 5열은 엑셀 flatten이 `colDef.field`를 쓰므로 목업 배열 `o`/`m`을 **개별 키(o0..o4·m0..m4)**로 펼쳤다.
   - 마스크 경계 때문에 `tooltipField`는 두지 않는다(툴팁으로 실값이 샌다). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF, numFmt, numStyle } from './aggrid_theme';
import { controlMinWidth } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, CellKeyDownEvent, CellStyle, ValueFormatterParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';
import { GpContributionDetailModal } from './gp_contribution_detail_modal';

const { Button, IconBtn, StatusBadge, FilterChip } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 DATA 1행 = 1 출자/배분 내역
────────────────────────────── */
type Gb = '출자' | '배분';
type Match = '일치' | '불일치';

export interface GpContribRow {
  id: string; no: number;
  gp: string;                 // 운용사 — 목업 rowspan(전 행 동일)
  fn: string;                 // 자펀드 — 목업 rowspan(전 행 동일)
  cmt: number | null;         // 약정총액 — 목업 rowspan(전 행 동일). 소계행만 null(공란)
  cmtM: number | null;        // 모태펀드 약정액 — 동상
  gb: Gb;                     // 구분(출자/배분)
  bd: string;                 // 기준일자 'YYYY-MM-DD'(사전식 비교 가능)
  pay: number; payM: number;  // 납입총액 · 모태펀드 납입액
  o0: number; o1: number; o2: number; o3: number; o4: number;   // 기타조합원 배분 — 원금·수익(세후)·성과보수·원천징수·합계
  m0: number; m1: number; m2: number; m3: number; m4: number;   // 모태펀드 배분 — 동일 5
  dist: number;               // 배분합계
  bal: number | null;         // 출자잔액 — 합계 2행은 null('-')
  match: Match | null;        // 수탁일치여부 — 합계 2행은 null('-')
}

/* 데모 데이터 — 목업 `DATA` 12행 값 그대로(콤마 문자열 → number, 값 창작 없음).
   GP·FN·CMT·CMTM은 목업이 rowspan으로 1회만 그리지만 AG Grid엔 행 병합이 없어 12행에 모두 싣는다(파일 상단 '한계'). */
const GP = 'KB증권(주)';
const FN = '현대동양농식품사모투자전문회사';
const CMT = 32_000_000_000;
const CMTM = 15_700_000_000;
/* 반복 필드를 한 곳에 모은 헬퍼 — 값이 아니라 '같은 값의 반복'을 표현한다 */
const head = (no: number, gb: Gb, bd: string) => ({ id: 'gc-' + no, no, gp: GP, fn: FN, cmt: CMT, cmtM: CMTM, gb, bd });
/* 출자 5행은 배분 10칸이 전부 0(목업 동일) */
const ZERO_DIST = { o0: 0, o1: 0, o2: 0, o3: 0, o4: 0, m0: 0, m1: 0, m2: 0, m3: 0, m4: 0, dist: 0 };

const DEMO: GpContribRow[] = [
  { ...head(1, '출자', '2011-05-13'), pay: 1_600_000_000, payM: 785_000_000, ...ZERO_DIST, bal: 1_600_000_000, match: '일치' },
  { ...head(2, '출자', '2011-10-21'), pay: 4_800_000_000, payM: 2_355_000_000, ...ZERO_DIST, bal: 6_400_000_000, match: '일치' },
  { ...head(3, '출자', '2012-06-28'), pay: 4_800_000_000, payM: 2_355_000_000, ...ZERO_DIST, bal: 11_200_000_000, match: '일치' },
  { ...head(4, '출자', '2014-06-17'), pay: 10_240_000_000, payM: 5_024_000_000, ...ZERO_DIST, bal: 13_920_000_000, match: '일치' },
  { ...head(5, '출자', '2014-09-16'), pay: 5_202_000_000, payM: 2_552_000_000, ...ZERO_DIST, bal: 19_122_000_000, match: '일치' },
  { ...head(6, '배분', '2013-08-22'), pay: 0, payM: 0, o0: 2_852_500_000, o1: 0, o2: 0, o3: 0, o4: 2_852_500_000, m0: 2_747_500_000, m1: 0, m2: 0, m3: 0, m4: 2_747_500_000, dist: 5_600_000_000, bal: 5_600_000_000, match: '일치' },
  { ...head(7, '배분', '2014-02-27'), pay: 0, payM: 0, o0: 978_000_000, o1: 0, o2: 0, o3: 0, o4: 978_000_000, m0: 942_000_000, m1: 0, m2: 0, m3: 0, m4: 942_000_000, dist: 1_920_000_000, bal: 3_680_000_000, match: '일치' },
  { ...head(8, '배분', '2015-03-06'), pay: 0, payM: 0, o0: 611_200_000, o1: 0, o2: 0, o3: 0, o4: 611_200_000, m0: 588_800_000, m1: 0, m2: 0, m3: 0, m4: 588_800_000, dist: 1_200_000_000, bal: 17_922_000_000, match: '일치' },
  { ...head(9, '배분', '2015-08-18'), pay: 0, payM: 0, o0: 1_305_300_000, o1: 0, o2: 0, o3: 0, o4: 1_305_300_000, m0: 1_256_700_000, m1: 0, m2: 0, m3: 0, m4: 1_256_700_000, dist: 2_562_000_000, bal: 15_360_000_000, match: '일치' },
  { ...head(10, '배분', '2017-12-26'), pay: 0, payM: 0, o0: 7_661_000_000, o1: 815_000_000, o2: 0, o3: 0, o4: 8_476_000_000, m0: 7_379_000_000, m1: 785_000_000, m2: 0, m3: 0, m4: 8_164_000_000, dist: 16_640_000_000, bal: 320_000_000, match: '일치' },
  { ...head(11, '배분', '2018-04-23'), pay: 0, payM: 0, o0: 0, o1: 97_099_605, o2: 0, o3: 0, o4: 97_099_605, m0: 0, m1: 93_525_405, m2: 0, m3: 0, m4: 93_525_405, dist: 190_625_010, bal: 320_000_000, match: '일치' },
  { ...head(12, '배분', '2018-06-28'), pay: 0, payM: 0, o0: 163_000_000, o1: 937_183_218, o2: 0, o3: 0, o4: 1_100_183_218, m0: 157_000_000, m1: 902_685_709, m2: 0, m3: 0, m4: 1_059_685_709, dist: 2_159_868_927, bal: 0, match: '일치' },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   합계 2행 — 목업 tfoot(소계·합계)을 pinned bottom 2행으로 재현
   ⚠ 합성 행은 `id`로 가른다(`rowPinned`만으론 소계/합계를 구분할 수 없다).
────────────────────────────── */
const SUB_ID = '__sub';
const TOT_ID = '__tot';
const pinnedId = (p: { node?: any; data?: any }): string | null => (p.node?.rowPinned ? (p.data?.id ?? null) : null);

/* 가산 가능한 금액 컬럼(목업 소계행이 합을 보여주는 13열). 약정액 2열은 rowspan 값이라 여기 없다 */
const SUM_KEYS = ['pay', 'payM', 'o0', 'o1', 'o2', 'o3', 'o4', 'm0', 'm1', 'm2', 'm3', 'm4', 'dist'] as const;
/* 엑셀 숫자 셀 판정용(No는 합계행에서 '소 계'/'합 계' 문자열이라 제외 — export에서 먼저 분기) */
const NUM_KEYS = new Set<string>(['cmt', 'cmtM', ...SUM_KEYS, 'bal']);

const sumBy = (rows: GpContribRow[], key: (typeof SUM_KEYS)[number]) => rows.reduce((a, r) => a + (r[key] ?? 0), 0);

/* 약정액은 자펀드(fn)마다 1건인 값이 전 행에 반복된다 → **dedupe 합**.
   단순 reduce면 같은 32,000,000,000이 12번 더해져 384,000,000,000이 된다(빌드·테스트로는 안 잡히는 오답). */
const sumDistinctByFund = (rows: GpContribRow[], key: 'cmt' | 'cmtM'): number => {
  const per = new Map<string, number>();
  for (const r of rows) if (!per.has(r.fn)) per.set(r.fn, r[key] ?? 0);
  return [...per.values()].reduce((a, b) => a + b, 0);
};

/* 합계 2행 공통 골격 — 텍스트 셀은 셀 렌더러가 rowPinned에서 비우지만, 엑셀은 이 값을 그대로 직렬화한다.
   소계: 목업 `colspan=7`(No~기준일자)이 덮는 칸 → 공란. 합계: `colspan=3`(No~자펀드) 밖의 구분·기준일자는 '-'. */
const pinnedBase = (rows: GpContribRow[]) => {
  const t: any = { gp: '', fn: '', bal: null, match: null };
  for (const k of SUM_KEYS) t[k] = sumBy(rows, k);
  return t;
};
const computeSubtotal = (rows: GpContribRow[]): GpContribRow =>
  ({ ...pinnedBase(rows), id: SUB_ID, no: 0, cmt: null, cmtM: null, gb: '', bd: '' } as GpContribRow);
const computeTotal = (rows: GpContribRow[]): GpContribRow =>
  ({ ...pinnedBase(rows), id: TOT_ID, no: 0, cmt: sumDistinctByFund(rows, 'cmt'), cmtM: sumDistinctByFund(rows, 'cmtM'), gb: '-', bd: '-' } as GpContribRow);

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서·집합 그대로(22 리프, 2단 그룹 2개)
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 숫자 N/A(null)는 '-'로 — 공유 numFmt(콤마·소수·마스킹)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
/* 약정액 2열 — 소계행은 목업 tfoot의 `colspan=7`에 덮여 값이 없다(공란). 합계행만 값을 갖는다 */
const cmtFmt = (p: ValueFormatterParams) => (pinnedId(p) === SUB_ID ? '' : nullFmt(p));

/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다 */
const txt = (field: keyof GpContribRow, header: string, width: number, maxWidth: number): ColDef<GpContribRow> => ({
  field, headerName: header, width, maxWidth, cellStyle: flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : <span className="min-w-0 truncate"><MT>{p.value}</MT></span>),
});
const amt = (field: keyof GpContribRow, header: string, strong?: boolean, width = 150): ColDef<GpContribRow> => ({
  field, headerName: header, width, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle(strong) as any,
});
const dash = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* 배지 톤 — 목업은 출자·배분을 같은 `tag b`로 칠하지만 구분이 안 돼 갈랐다(파일 상단 '한계').
   수탁일치여부는 목업 `matchTag`와 동형(일치=녹/불일치=앰버). */
const GB_TONE: Record<Gb, Tone> = { 출자: 'info', 배분: 'primary' };
const MATCH_TONE: Record<Match, Tone> = { 일치: 'success', 불일치: 'warning' };

/* 기준일자 셀 링크 — 클릭 시 상세 팝업(골드 `general_meeting_manage.tsx` LinkCell 복사).
   ⚠ `title`엔 동작 힌트만 담는다 — 값을 넣으면 마스크 ON일 때 툴팁으로 실데이터가 샌다.
   ⚠ 값이 날짜라 `<MT>`가 아니라 `mn()`으로 마스킹한다(마스크 규약: 날짜·숫자는 mn).
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다. */
function LinkCell({ value, hint, onClick }: { value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate text-left text-primary font-semibold no-underline hover:underline cursor-pointer tabular"
      style={{ font: 'inherit', fontWeight: 600, background: 'transparent', border: 0, padding: 0 }}>
      {mn(value)}
    </button>
  );
}

const makeColumns = (openDetail: (id: string) => void): (ColDef<GpContribRow> | ColGroupDef<GpContribRow>)[] => [
  /* No는 축(순번)이라 마스킹하지 않는다. 합계 2행은 목업 tfoot 라벨('소계'/'합계')을 그 자리에 쓴다 */
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum,
    valueFormatter: (p) => { const id = pinnedId(p); return id === SUB_ID ? '소 계' : id === TOT_ID ? '합 계' : String(p.value); } },
  txt('gp', '운용사', 170, 200),
  txt('fn', '자펀드', 220, 260),
  { ...amt('cmt', '약정총액'), valueFormatter: cmtFmt },
  { ...amt('cmtM', '모태펀드 약정액'), valueFormatter: cmtFmt },
  { field: 'gb', headerName: '구분', width: 90, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.node.rowPinned
      ? (p.data?.id === TOT_ID ? dash : null)
      : <StatusBadge tone={GB_TONE[p.value as Gb]} label={p.value} size="lg" dot={false} />) },
  /* 기준일자 — 상세 팝업 진입점(클릭 / 셀 Enter). 합계행은 링크가 아니다(가짜 행의 상세는 열 수 없다) */
  { field: 'bd', headerName: '기준일자', width: 124, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.node.rowPinned
      ? (p.data?.id === TOT_ID ? dash : null)
      : <LinkCell value={p.value} hint="일자별출자배분관리 상세 보기" onClick={() => p.data && openDetail(p.data.id)} />) },
  amt('pay', '납입총액'),
  amt('payM', '모태펀드 납입액'),
  { headerName: '기타조합원 배분', marryChildren: true, headerClass: 'apfs-grp-a',
    children: [amt('o0', '원금배분'), amt('o1', '수익배분(세후)'), amt('o2', '성과보수액'), amt('o3', '원천징수세액'), amt('o4', '합계', true)] },
  { headerName: '모태펀드 배분', marryChildren: true, headerClass: 'apfs-grp-b',
    children: [amt('m0', '원금배분'), amt('m1', '수익배분(세후)'), amt('m2', '성과보수액'), amt('m3', '원천징수세액'), amt('m4', '합계', true)] },
  amt('dist', '배분합계', true),
  amt('bal', '출자잔액'),
  /* 수탁일치여부 — 합계 2행은 값이 없어 '-'(목업 tfoot 동일) */
  { field: 'match', headerName: '수탁일치여부', width: 124, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.value == null ? dash
      : <StatusBadge tone={MATCH_TONE[p.value as Match]} label={p.value} size="lg" dot={false} />) },
];

/* Excel 헤더 병합·리프 컬럼을 columnDefs에서 자동 산출(22컬럼 수작업 오프바이원 방지, 골드 subfund_manage 복사) */
function flattenForExcel(defs: (ColDef<GpContribRow> | ColGroupDef<GpContribRow>)[]) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = d.children as ColDef<GpContribRow>[];
      head1.push(d.headerName ?? '', ...Array(kids.length - 1).fill(''));
      kids.forEach((k) => { head2.push(k.headerName ?? ''); keys.push(String(k.field)); });
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
    } else {
      const col = d as ColDef<GpContribRow>;
      head1.push(col.headerName ?? ''); head2.push(''); keys.push(String(col.field));
      merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { head1, head2, keys, merges };
}

/* ⚠검토필요 메모 — 목업 `S1_14__운용사_출자배분관리.html`의 `data-rec`/`data-dat` 원문 그대로.
   설계 메모라 마스킹·엑셀 대상이 아니다(나머지 1건은 상세 팝업 파일). */
const FILTER_NOTES: Record<'mgr', ReviewNote> = {
  mgr: { rec: '담당자 목록(사용자 마스터 연동)', dat: '실 담당자 옵션 데이터 미확인' },
};

const inputStyle = (kind?: string): React.CSSProperties => ({
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

function DrawerField({ label, noop, plain, note, children }: { label: string; noop?: boolean; plain?: boolean; note?: ReviewNote; children: React.ReactNode }) {
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

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 목업엔 전역 신규 등록이 없어 kebab 단독(apfs-grid 툴바 규약) */
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

type ModalState = null | { kind: 'detail'; id: string };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function GpContributionManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<GpContribRow> | null>(null);
  const [rows, setRows] = useState<GpContribRow[]>(DEMO);
  const [modal, setModal] = useState<ModalState>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const masked = useMask();

  /* deps []: setModal은 안정(useState 세터) — 매 렌더 새 배열이면 그리드가 컬럼을 재생성하며 폭이 되돌아간다 */
  const openDetail = useCallback((id: string) => setModal({ kind: 'detail', id }), []);
  const columnDefs = useMemo(() => makeColumns(openDetail), [openDetail]);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 출자/배분은 툴바 칩 + 드로어가 **같은 state를 공유**한다(표시가 갈라지지 않게).
     나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fGb, setFGb] = useState<'' | Gb>('');
  const [fGp, setFGp] = useState('');
  const [fFn, setFFn] = useState('');
  const [fFrom, setFFrom] = useState('');   // 기준일자 시작 'YYYY-MM-DD'(빈 값=열린 경계)
  const [fTo, setFTo] = useState('');       // 기준일자 종료 'YYYY-MM-DD'(동상)
  const [fMf, setFMf] = useState('');       // 모펀드 — 행 컬럼 아님(no-op)
  const [fAcc, setFAcc] = useState('');     // 계정구분 — 행 컬럼 아님(no-op)
  const [fMgr, setFMgr] = useState('');     // 담당자 — 원문에 옵션·샘플 값 없음(no-op, 옵션 없음)
  const clearFilters = () => { setFGb(''); setFGp(''); setFFn(''); setFFrom(''); setFTo(''); setFMf(''); setFAcc(''); setFMgr(''); };

  const passes = useCallback((r: GpContribRow) => {
    if (fGp && r.gp !== fGp) return false;
    if (fFn && r.fn !== fFn) return false;
    if (fGb && r.gb !== fGb) return false;
    if (fFrom && r.bd < fFrom) return false;
    if (fTo && r.bd > fTo) return false;
    return true;
  }, [fGp, fFn, fGb, fFrom, fTo]);
  const filterActive = Boolean(fGp || fFn || fGb || fFrom || fTo);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
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
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<GpContribRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fnOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);
  const gbOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gb))), [rows]);
  /* pinned 합계 2행 — 인라인 배열 금지(참조가 매 렌더 바뀌면 고정행이 재생성된다). 필터 결과로 재계산 */
  const pinnedBottom = useMemo(() => [computeSubtotal(filteredRows), computeTotal(filteredRows)], [filteredRows]);

  const onGridReady = useCallback((e: GridReadyEvent<GpContribRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 키보드 진입 — AG Grid의 Tab은 **셀 단위**로만 이동해 셀 안 button에 초점이 닿지 않는다.
     기준일자 셀 Enter = 상세 팝업(WCAG 2.1.1). 합계 2행은 제외. */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<GpContribRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter') return;
    if (e.node?.rowPinned) return;
    if (e.column.getColId() !== 'bd') return;
    if (e.data) openDetail(e.data.id);
  }, [openDetail]);

  const detailRow = modal?.kind === 'detail' ? rows.find((r) => r.id === modal.id) ?? null : null;

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 2단 헤더 병합 + 본문 + 소계 + 합계(화면=엑셀 불변식). 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const { head1, head2, keys, merges } = flattenForExcel(columnDefs);
    const src = [...filteredRows, ...pinnedBottom];
    const body = src.map((r) => keys.map((k) => {
      const v = (r as any)[k];
      if (k === 'no') return r.id === SUB_ID ? '소 계' : r.id === TOT_ID ? '합 계' : v;
      if (NUM_KEYS.has(k)) return v == null ? '' : masked ? 0 : v;
      return masked ? '' : (v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
    src.forEach((r, i) => keys.forEach((k, j) => {
      if (!NUM_KEYS.has(k) || (r as any)[k] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 2, c: j });
      if (ws[a]) ws[a].z = Number.isInteger((r as any)[k]) ? '#,##0' : '#,##0.0';
    }));
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' ? 30 : k === 'gp' ? 18 : NUM_KEYS.has(k) ? 17 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '출자·분배조회(자펀드)');
    XLSX.writeFile(wb, '출자·분배조회(자펀드).xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '출자/분배조회(자펀드)']}
      title="출자/분배조회(자펀드)"
      favRoute="gp-contribution"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(출자/배분) + 적용 중인 드로어 값 칩. 행 선택이 없어 selbar는 존재하지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '출자', '배분'] as ('' | Gb)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fGb === s} onClick={() => setFGb(s)}>{s || '전체'}</FilterChip>
          ))}
          {/* 값만 표시(접두사 없음) + × — 운용사·자펀드는 텍스트라 <MT>, 기준일자는 날짜성이라 mn() */}
          {([
            ['운용사', fGp, () => setFGp(''), true],
            ['자펀드', fFn, () => setFFn(''), true],
            ['기준일자 시작', fFrom, () => setFFrom(''), false],
            ['기준일자 종료', fTo, () => setFTo(''), false],
          ] as [string, string, () => void, boolean][]).filter(([, v]) => v).map(([label, value, clear, isText]) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {isText ? <MT>{value}</MT> : mn(value)}
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
        <span ref={topMoreRef} className="inline-flex"><MoreMenu onExport={exportExcel} /></span>
      </>}
      footerLeft={<span>{'총 ' + mn(String(filteredRows.length)) + '개 중 ' + mn(String(Math.min(shown, filteredRows.length))) + '개 항목 표시 중'}</span>}
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

      <div>
        <AgGridReact<GpContribRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          pinnedBottomRowData={pinnedBottom}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(22컬럼·금액 다열) — 그리드 폭이 프레임을 넘어 내부 가로 스크롤
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 출자·배분 내역이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(모펀드·운용사·자펀드·계정구분·담당자·출자/배분·기준일자).
             검색어는 미사용(OFF). 컬럼 미연동 항목은 noop 캡션(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">출자/분배조회(자펀드) 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFn} onChange={setFFn} options={fnOptions} /></DrawerField>
            <DrawerField label="계정구분" noop><DrawerSelect value={fAcc} onChange={setFAcc} options={['농식품', '수산']} /></DrawerField>
            {/* 담당자 — 원문에 옵션·샘플 값이 없어 옵션을 생성하지 않는다(빈 목록 = '전체'만) */}
            <DrawerField label="담당자" noop note={FILTER_NOTES.mgr}><DrawerSelect value={fMgr} onChange={setFMgr} options={[]} /></DrawerField>
            {/* 출자/배분 — 툴바 칩과 같은 state 공유(옵션은 행에서 파생) */}
            <DrawerField label="출자/배분"><DrawerSelect value={fGb} onChange={(v) => setFGb(v as '' | Gb)} options={gbOptions} /></DrawerField>
            {/* 기준일자 — 일(YYYY-MM-DD) 범위. PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel(apfs-datepicker) */}
            <DrawerField label="기준일자 시작" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="기준일자 시작일" /></div></DrawerField>
            <DrawerField label="기준일자 종료" plain><div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="기준일자 종료일" /></div></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* 상세 팝업 — 조건부 마운트(open prop 없음) */}
      {detailRow && <GpContributionDetailModal row={detailRow} onClose={() => setModal(null)} />}

    </GridFrame>
  );
}
