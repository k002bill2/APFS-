/* 자펀드 수탁관리 — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 자펀드 수탁관리).
   출처: S1_26_자펀드수탁관리_실물검증_.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(자펀드·기준일) → 상세필터 드로어(Sheet, apfs-detail-filter). 목업 [조회] 버튼은 즉시 반영형이라 없고,
     [엑셀] 버튼은 툴바 kebab '내보내기 (Excel)'로 흡수한다(apfs-grid: 독립 엑셀 버튼 금지). 검색어는 OFF.
   - 섹션 3개(투자자산 · 미투자자산 거래 · 미투자자산) → **GridFrame 하나 안에 세로로 쌓은 AG Grid 3개**.
     세 표 모두 2단 헤더(운용사·수탁기관·일치여부·메모)라 `ColGroupDef` + `marryChildren`(apfs-aggrid).
     섹션 경계는 번호 칩 + 제목 + 캡션 헤더 행(목업 `.sectitle`+`.listbar` 통합).
   - 일치여부 → `StatusBadge`(일치=success · 불일치=danger). 목업 `.tag n`("-")은 배지가 아니라 muted 텍스트다
     (값 없음 표식이라 상태색을 주면 "판정됨"으로 잘못 읽힌다).
   - 메모 그룹 '등록' 버튼 → 자펀드실물검증 메모 등록 팝업(`custody_verify_memo_modal.tsx`).
     날짜·내용 열은 최신 메모(`memos[0]`)를 보여주고, 저장하면 그 행 `memos` 선두에 불변으로 쌓인다.
   - 합계행·행 선택·페이지네이션·등록 없음 → selbar·pinned 합계·페이저·전체보기 토글도 없다(목업 동일).
   - 엑셀 → SheetJS 워크북 1개 + 시트 3개(섹션별 2단 헤더 병합 자동 산출).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정(결정 기록)
   - **섹션2·3은 원문 샘플이 없다**(목업 `<tbody>`가 '조회된 데이터가 없습니다.' 한 줄) → 빈 상태로 둔다. 값 창작 금지.
   - **조회조건은 추론**이다 — 목업에 [검색] 영역 자체가 없어 자펀드·기준일 2항목을 목업 설계메모대로 넣었다.
     기준일은 행 컬럼과 미연동이라 `noop`(데이터 연동 후 적용)이고, 실제로 거르는 건 자펀드뿐이다.
   - **금액 단위 토글 미적용** — 편집 팝업(메모 등록)이 있는 관리화면이라 규칙상 제외(목업 설계메모와 동일 결론).
     단위는 툴바 캡션 `단위: 원`으로만 표기한다.
   - **메모는 로컬 state**다(백엔드 없음) — 새로고침하면 초기 더미로 되돌아간다.
   - 빈 섹션 그리드는 높이 0으로 접히지 않는다 → 래퍼 `minHeight`·`EmptyState` 대체가 필요 없다. 근거:
     AG Grid v35 Theming API 주입 CSS의 `.ag-layout-auto-height .ag-center-cols-viewport{min-height:150px}`
     (node_modules/ag-grid-community/dist/package/main.esm.mjs 실측) — 2단 헤더 80px + 본문 150px가 확보돼
     `overlayNoRowsTemplate` 문구가 그 안에 그려진다. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 + autoHeight sticky 헤더(공유)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, numFmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, ValueFormatterParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { PeriodPicker } from './ui/period-picker';
import { CustodyMemoModal } from './custody_verify_memo_modal';
import type { CustodyMemoCtx } from './custody_verify_memo_modal';

const { Button, IconBtn, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 3개 표의 컬럼 집합 그대로
────────────────────────────── */
/** 대사 결과. '-' = 판정 대상 아님(목업 `.tag n`) */
export type MatchResult = '일치' | '불일치' | '-';
/** 메모 작성이력 한 줄 — 팝업 `기준일자`·`메모` */
export interface VerifyMemo { date: string; content: string }

export interface InvestAssetRow {
  id: string; no: number; fn: string;
  gpCorp: string; gpShares: number | null; gpPrin: number; gpImpair: number; gpBal: number;   // 운용사 장부
  cuCorp: string; cuShares: number | null; cuBal: number;                                     // 수탁기관 보관내역
  matchShares: MatchResult; matchBal: MatchResult;
  memos: VerifyMemo[];
}
export interface NonInvestTradeRow {
  id: string; no: number; fn: string;
  gpItem: string; gpShares: number | null; gpBal: number;
  cuItem: string; cuShares: number | null; cuBal: number;
  matchShares: MatchResult; matchBal: MatchResult;
  memos: VerifyMemo[];
}
export interface NonInvestRow {
  id: string; no: number; fn: string;
  gpAcct: string; gpBal: number;
  cuAcct: string; cuBal: number;
  matchBal: MatchResult;
  memos: VerifyMemo[];
}

/* 데모 데이터 — 목업 `<tbody>` 값 그대로(창작 없음).
   섹션1 1행: 전환사채 원금 A=25억, 감액 B=25억 → 운용사 잔액 A-B=0 이나 수탁 잔액 25억 → **불일치**(목업 설계메모).
   보유주수는 양쪽 모두 '-'(주식이 아닌 사채) → 숫자 N/A는 null(문자 '-' 금지, apfs-manage-page SOP 5). */
const INVEST_DEMO: InvestAssetRow[] = [
  { id: 'cv-i1', no: 1, fn: '유니 수산식품 투자조합1호',
    gpCorp: '(주)남양 f&b', gpShares: null, gpPrin: 2_500_000_000, gpImpair: 2_500_000_000, gpBal: 0,
    cuCorp: '주식회사남양에프앤비무보증사모전환사채', cuShares: null, cuBal: 2_500_000_000,
    matchShares: '-', matchBal: '불일치', memos: [] },
];
/* 섹션2·3 — 목업에 샘플 행이 없다('조회된 데이터가 없습니다.'). 임의 데이터를 만들지 않는다. */
const TRADE_DEMO: NonInvestTradeRow[] = [];
const NONINVEST_DEMO: NonInvestRow[] = [];

/* 상세필터 기준일 기본값 — COMMON 규약은 "목업 기본값을 필터 초기값으로 쓰지 않는다"이지만,
   이 값은 **행을 거르지 않고**(기준일은 noop) 메모 팝업의 `기준일자` 시드로만 쓰이므로 예외로 유지한다.
   비워두면 팝업이 빈 날짜로 열려 저장이 막힌다. */
const BASE_DATE = '2026-04-30';

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서·집합 그대로(2단 그룹: 운용사·수탁기관·일치여부·메모)
────────────────────────────── */
/* AG Grid cellStyle은 CellStyle(문자열 인덱스 시그니처) — React CSSProperties와 타입이 다르다 */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 숫자 N/A(null)는 '-'로 — 공유 numFmt(콤마·소수)에 null 가드만 얇게 덧씌운다(재구현 아님) */
const nullFmt = (p: ValueFormatterParams) => (p.value == null ? '-' : numFmt(p));
/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate를 준다 */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const dashCell = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

const MATCH_TONE: Record<'일치' | '불일치', Tone> = { 일치: 'success', 불일치: 'danger' };
/* 일치여부 셀 — '-'는 판정 대상 아님(배지로 칠하면 '판정됨'으로 잘못 읽힌다) */
const matchCell = (p: { value: MatchResult | null }) =>
  (p.value == null || p.value === '-' ? dashCell : <StatusBadge tone={MATCH_TONE[p.value]} label={p.value} size="lg" dot={false} />);

/* 컬럼 팩토리 — `field`를 인자로 받아 호출부에서 행 타입이 확정된다(섹션 3개가 같은 규격을 공유) */
function seq<T>(field: ColDef<T>['field']): ColDef<T> {
  return { field, headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) };
}
function txt<T>(field: ColDef<T>['field'], header: string, width: number, maxWidth?: number): ColDef<T> {
  return { field, headerName: header, width, maxWidth, cellStyle: flexCenter, cellRenderer: textCell };
}
function num<T>(field: ColDef<T>['field'], header: string, width = 110): ColDef<T> {
  return { field, headerName: header, width, valueFormatter: nullFmt, cellStyle: centerNum };
}
function amt<T>(field: ColDef<T>['field'], header: string, width = 140): ColDef<T> {
  return { field, headerName: header, width, type: 'rightAligned', valueFormatter: nullFmt, cellStyle: numStyle() as any };
}
function match<T>(field: ColDef<T>['field'], header: string, width = 106): ColDef<T> {
  return { field, headerName: header, width, cellStyle: flexMid, cellRenderer: matchCell };
}

type SectionKey = 'invest' | 'trade' | 'noninvest';
type OpenMemo = (sec: SectionKey, id: string) => void;
/** 세 섹션 행의 공통 계약(메모 그룹이 요구하는 최소 형태) */
type MemoRow = { id: string; no: number; memos: VerifyMemo[] };

/* 메모 등록 버튼 컬럼의 colId — 조작 요소라 엑셀 직렬화에서 제외한다(화면=엑셀 불변식의 유일한 예외) */
const MEMO_ACTION_COL = 'memoAdd';

/* 메모 그룹(날짜·내용·등록) — 세 섹션이 동일하다. 날짜/내용은 최신 메모(memos[0]) 파생값이라
   `field`가 아니라 `valueGetter`(+colId)로 만든다. colId는 그리드마다 독립이라 섹션 간 충돌 없음. */
function memoGroup<T extends MemoRow>(sec: SectionKey, secLabel: string, openMemo: OpenMemo): ColGroupDef<T> {
  return {
    headerName: '메모', marryChildren: true,
    children: [
      { colId: 'memoDate', headerName: '날짜', width: 112, cellStyle: centerNum,
        valueGetter: (p) => p.data?.memos[0]?.date ?? null,
        valueFormatter: (p) => (p.value == null ? '-' : String(p.value)) },
      { colId: 'memoContent', headerName: '내용', width: 170, maxWidth: 320, cellStyle: flexCenter,
        valueGetter: (p) => p.data?.memos[0]?.content ?? null,
        cellRenderer: (p: { value: string | null }) => (p.value == null ? dashCell : <span className="min-w-0 truncate">{p.value}</span>) },
      /* 등록 — 액션 컬럼(정렬·엑셀 제외). UI.Button은 aria-label을 받지 않으므로 접근名은 sr-only로 보강한다
         ("투자자산 1행 메모"). */
      { colId: MEMO_ACTION_COL, headerName: '등록', width: 96, sortable: false, cellStyle: flexMid,
        cellRenderer: (p: { data?: T }) => (p.data
          ? <Button variant="outline" size="sm" onClick={() => openMemo(sec, p.data!.id)}>
              <span className="sr-only">{secLabel + ' ' + p.data.no + '행 '}</span>메모
            </Button>
          : null) },
    ],
  };
}

/* ① 투자자산 — 운용사 5열 / 수탁기관 3열 / 일치여부 2열 / 메모 3열 */
function makeInvestCols(openMemo: OpenMemo): (ColDef<InvestAssetRow> | ColGroupDef<InvestAssetRow>)[] {
  return [
    seq<InvestAssetRow>('no'),
    txt<InvestAssetRow>('fn', '자펀드', 200, 280),
    { headerName: '운용사', marryChildren: true, children: [
      txt<InvestAssetRow>('gpCorp', '투자기업', 170, 260),
      num<InvestAssetRow>('gpShares', '보유주수'),
      amt<InvestAssetRow>('gpPrin', '원금(A)'),
      amt<InvestAssetRow>('gpImpair', '감액금액(B)'),
      amt<InvestAssetRow>('gpBal', '잔액(A-B)'),
    ] },
    { headerName: '수탁기관', marryChildren: true, children: [
      txt<InvestAssetRow>('cuCorp', '투자기업', 220, 320),
      num<InvestAssetRow>('cuShares', '보유주수'),
      amt<InvestAssetRow>('cuBal', '잔액'),
    ] },
    { headerName: '일치여부', marryChildren: true, children: [
      match<InvestAssetRow>('matchShares', '보유주수'),
      match<InvestAssetRow>('matchBal', '잔액'),
    ] },
    memoGroup<InvestAssetRow>('invest', '투자자산', openMemo),
  ];
}

/* ② 미투자자산 거래 — 종목·보유주수·잔액 대사 */
function makeTradeCols(openMemo: OpenMemo): (ColDef<NonInvestTradeRow> | ColGroupDef<NonInvestTradeRow>)[] {
  return [
    seq<NonInvestTradeRow>('no'),
    txt<NonInvestTradeRow>('fn', '자펀드', 200, 280),
    { headerName: '운용사', marryChildren: true, children: [
      txt<NonInvestTradeRow>('gpItem', '종목', 180, 280),
      num<NonInvestTradeRow>('gpShares', '보유주수'),
      amt<NonInvestTradeRow>('gpBal', '잔액'),
    ] },
    { headerName: '수탁기관', marryChildren: true, children: [
      txt<NonInvestTradeRow>('cuItem', '종목', 180, 280),
      num<NonInvestTradeRow>('cuShares', '보유주수'),
      amt<NonInvestTradeRow>('cuBal', '잔액'),
    ] },
    { headerName: '일치여부', marryChildren: true, children: [
      match<NonInvestTradeRow>('matchShares', '보유주수'),
      match<NonInvestTradeRow>('matchBal', '잔액'),
    ] },
    memoGroup<NonInvestTradeRow>('trade', '미투자자산 거래', openMemo),
  ];
}

/* ③ 미투자자산 — 계좌번호·잔액 대사. 일치여부는 잔액 하나뿐이라 **단일 컬럼**(목업 rowspan=2) */
function makeNonInvestCols(openMemo: OpenMemo): (ColDef<NonInvestRow> | ColGroupDef<NonInvestRow>)[] {
  return [
    seq<NonInvestRow>('no'),
    txt<NonInvestRow>('fn', '자펀드', 200, 280),
    { headerName: '운용사', marryChildren: true, children: [
      txt<NonInvestRow>('gpAcct', '계좌번호', 180, 280),
      amt<NonInvestRow>('gpBal', '잔액'),
    ] },
    { headerName: '수탁기관', marryChildren: true, children: [
      txt<NonInvestRow>('cuAcct', '계좌번호', 180, 280),
      amt<NonInvestRow>('cuBal', '잔액'),
    ] },
    match<NonInvestRow>('matchBal', '일치여부(잔액)', 128),
    memoGroup<NonInvestRow>('noninvest', '미투자자산', openMemo),
  ];
}

/* ──────────────────────────────
   Excel — 섹션별 시트 3개
────────────────────────────── */
/* 2단 헤더 병합·리프 키를 columnDefs에서 자동 산출(subfund_manage 로컬 헬퍼 복사 + 이 화면 고유 2가지):
   ① 리프 키는 `field ?? colId` — 메모 날짜·내용은 파생값이라 field가 없다.
   ② 액션 컬럼(메모 등록 버튼)은 데이터가 아니므로 건너뛴다. 건너뛴 뒤 자식이 0이 된 그룹도 빼 병합 범위가 어긋나지 않게 한다. */
function flattenForExcel<T>(defs: (ColDef<T> | ColGroupDef<T>)[]) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  const leafKey = (c: ColDef<T>) => String(c.field ?? c.colId ?? '');
  const usable = (c: ColDef<T>) => { const k = leafKey(c); return k !== '' && k !== MEMO_ACTION_COL; };
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = (d.children as ColDef<T>[]).filter(usable);
      if (kids.length === 0) continue;
      head1.push(d.headerName ?? '', ...Array(kids.length - 1).fill(''));
      kids.forEach((k) => { head2.push(k.headerName ?? ''); keys.push(leafKey(k)); });
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
    } else {
      const col = d as ColDef<T>;
      if (!usable(col)) continue;
      head1.push(col.headerName ?? ''); head2.push(''); keys.push(leafKey(col));
      merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { head1, head2, keys, merges };
}

/* 엑셀 값 해석 — 화면의 valueGetter(최신 메모 파생)와 같은 규칙을 쓴다(화면=엑셀 불변식) */
const exportValue = (r: MemoRow, k: string): unknown =>
  k === 'memoDate' ? (r.memos[0]?.date ?? null)
    : k === 'memoContent' ? (r.memos[0]?.content ?? null)
      : ((r as unknown as Record<string, unknown>)[k] ?? null);

/* 숫자 컬럼(`z` 서식). 'no'는 별도 취급 */
const INVEST_NUM = new Set(['gpShares', 'gpPrin', 'gpImpair', 'gpBal', 'cuShares', 'cuBal']);
const TRADE_NUM = new Set(['gpShares', 'gpBal', 'cuShares', 'cuBal']);
const NONINVEST_NUM = new Set(['gpBal', 'cuBal']);
/* 엑셀 열 너비 — 긴 명칭 컬럼만 넓게 */
const WIDE_KEYS = new Set(['fn', 'gpCorp', 'cuCorp', 'gpItem', 'cuItem', 'gpAcct', 'cuAcct', 'memoContent']);

/* ──────────────────────────────
   페이지 로컬 프리미티브(골드 복사 — 공유 export 아님)
────────────────────────────── */

/* 드로어 필드 래퍼 — noop=행 컬럼 미연동 필터(캡션으로 no-op 신호, apfs-detail-filter 규약).
   plain=true → <label> 대신 <div>: PeriodPicker 트리거는 <button>이라 <label> 안에서 2회 토글된다 */
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

/* 섹션 헤더 — 목업 `.sectitle`(번호 칩 + 제목) + `.listbar`(캡션)을 한 행으로 합친다.
   번호 칩은 ColorChip(아이콘 전용)이 아니라 숫자를 담는 primary soft 배지다. */
function SectionHead({ n, title, cap }: { n: string; title: string; cap: string }) {
  return (
    <div className="flex items-center gap-2 flex-wrap" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
      <span aria-hidden className="inline-flex items-center justify-center shrink-0 font-bold"
        style={{ width: 20, height: 20, borderRadius: 6, fontSize: 12, background: 'color-mix(in srgb, var(--primary) 13%, transparent)', color: 'var(--primary)' }}>{n}</span>
      {/* preflight:false — h4는 UA 기본 마진이 살아 있어 m-0 필수 */}
      <h4 className="font-bold m-0" style={{ fontSize: 15 }}>{title}</h4>
      <span className="text-caption" style={{ fontSize: 12.5 }}>{cap}</span>
    </div>
  );
}

const NO_ROWS = '<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회된 데이터가 없습니다.</span>';

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'memo'; sec: SectionKey; id: string };

/** 메모 선두 추가 — 불변(새 배열 + 새 행 객체). 세 섹션이 같은 규칙을 공유한다 */
function prependMemo<T extends MemoRow>(rows: T[], id: string, memo: VerifyMemo): T[] {
  return rows.map((r) => (r.id === id ? { ...r, memos: [memo, ...r.memos] } : r));
}

export function CustodyVerifyManage({ onNav }: { onNav?: (r: string) => void }) {
  const [invest, setInvest] = useState<InvestAssetRow[]>(INVEST_DEMO);
  const [trade, setTrade] = useState<NonInvestTradeRow[]>(TRADE_DEMO);
  const [nonInvest, setNonInvest] = useState<NonInvestRow[]>(NONINVEST_DEMO);
  const [modal, setModal] = useState<ModalState>(null);

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 드로어 2항목(목업 검색박스 순서 그대로). 실제로 거르는 건 자펀드뿐이다.
     행이 세 배열로 갈려 있어 External Filter(그리드 1개 전제)가 아니라 **React 쪽에서 각각 filter**한다. */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fFund, setFFund] = useState('');
  const [fAsOf, setFAsOf] = useState(BASE_DATE);   // 기준일 — 행 컬럼 아님(no-op). 메모 팝업 기준일자 시드
  /* 초기화는 기준일을 빈 값이 아니라 목업 기본값으로 되돌린다(위 BASE_DATE 주석 — 팝업 시드가 비면 저장이 막힌다) */
  const clearFilters = () => { setFFund(''); setFAsOf(BASE_DATE); };

  const investRows = useMemo(() => invest.filter((r) => !fFund || r.fn === fFund), [invest, fFund]);
  const tradeRows = useMemo(() => trade.filter((r) => !fFund || r.fn === fFund), [trade, fFund]);
  const nonInvestRows = useMemo(() => nonInvest.filter((r) => !fFund || r.fn === fFund), [nonInvest, fFund]);
  /* 자펀드 옵션 — 세 섹션 행에서 파생(원문에 별도 코드 목록이 없다) */
  const fundOptions = useMemo(
    () => Array.from(new Set([...invest.map((r) => r.fn), ...trade.map((r) => r.fn), ...nonInvest.map((r) => r.fn)])),
    [invest, trade, nonInvest],
  );


  /* 컬럼 정의 — openMemo(안정)만 캡처하므로 deps는 [openMemo]. 매 렌더 새 배열이면 그리드가 컬럼을
     재생성하며 폭이 선언값으로 되돌아간다(apfs-aggrid 계약6). */
  const openMemo = useCallback<OpenMemo>((sec, id) => setModal({ kind: 'memo', sec, id }), []);
  const investCols = useMemo(() => makeInvestCols(openMemo), [openMemo]);
  const tradeCols = useMemo(() => makeTradeCols(openMemo), [openMemo]);
  const nonInvestCols = useMemo(() => makeNonInvestCols(openMemo), [openMemo]);

  /* 메모 팝업 대상 — 섹션별로 대상명 슬롯이 다르다(투자기업 / 종목 / 계좌번호) */
  const memoTarget = useMemo((): { ctx: CustodyMemoCtx; history: VerifyMemo[] } | null => {
    if (modal?.kind !== 'memo') return null;
    if (modal.sec === 'invest') {
      const r = invest.find((x) => x.id === modal.id);
      return r ? { ctx: { fund: r.fn, gubun: '투자자산', corp: r.gpCorp }, history: r.memos } : null;
    }
    if (modal.sec === 'trade') {
      const r = trade.find((x) => x.id === modal.id);
      return r ? { ctx: { fund: r.fn, gubun: '미투자자산 거래', corp: r.gpItem }, history: r.memos } : null;
    }
    const r = nonInvest.find((x) => x.id === modal.id);
    return r ? { ctx: { fund: r.fn, gubun: '미투자자산', corp: r.gpAcct }, history: r.memos } : null;
  }, [modal, invest, trade, nonInvest]);

  const saveMemo = (m: VerifyMemo) => {
    if (modal?.kind !== 'memo') return;
    const { sec, id } = modal;
    if (sec === 'invest') setInvest((prev) => prependMemo(prev, id, m));
    else if (sec === 'trade') setTrade((prev) => prependMemo(prev, id, m));
    else setNonInvest((prev) => prependMemo(prev, id, m));
    setModal(null);
  };

  const refresh = () => {
    setInvest([...INVEST_DEMO]); setTrade([...TRADE_DEMO]); setNonInvest([...NONINVEST_DEMO]);
    clearFilters();
    toast.success('새로고침했습니다');
  };

  /* ── Excel(.xlsx) — 워크북 1개 + 섹션 시트 3개. 2단 헤더 병합 재현 ── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const sheets: [string, (ColDef<any> | ColGroupDef<any>)[], MemoRow[], Set<string>][] = [
      ['투자자산', investCols, investRows, INVEST_NUM],
      ['미투자자산 거래', tradeCols, tradeRows, TRADE_NUM],
      ['미투자자산', nonInvestCols, nonInvestRows, NONINVEST_NUM],
    ];
    for (const [name, defs, rows, numKeys] of sheets) {
      const { head1, head2, keys, merges } = flattenForExcel(defs);
      const body = rows.map((r) => keys.map((k) => {
        if (k === 'no') return r.no;                        // 순번
        const v = exportValue(r, k);
        if (numKeys.has(k)) return v == null ? '' : v;
        return (v ?? '');
      }));
      const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
      rows.forEach((r, i) => keys.forEach((k, j) => {
        if (!numKeys.has(k)) return;
        const v = exportValue(r, k);
        if (typeof v !== 'number') return;
        const a = XLSX.utils.encode_cell({ r: i + 2, c: j });
        if (ws[a]) ws[a].z = Number.isInteger(v) ? '#,##0' : '#,##0.0';
      }));
      ws['!merges'] = merges;
      ws['!cols'] = keys.map((k) => ({ wch: WIDE_KEYS.has(k) ? 30 : numKeys.has(k) ? 16 : 12 }));
      XLSX.utils.book_append_sheet(wb, ws, name);
    }
    XLSX.writeFile(wb, '자펀드 수탁관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '자펀드 수탁관리']}
      title="자펀드 수탁관리"
      favRoute="custody-verify"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 적용 중인 드로어 값 칩. 주 필터(FilterChip 그룹)는 없다 — 목업 검색박스가 자펀드·기준일 2개뿐이고
         자펀드는 값이 하나라 칩 그룹으로 펼칠 축이 아니다. 행 선택이 없어 selbar도 없다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {/* 값만 표시(항목명 접두사 없음) + ×. 기준일은 no-op이라 칩을 만들지 않는다 */}
          {fFund && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              {fFund}
              <button type="button" onClick={() => setFFund('')} aria-label="자펀드 필터 제거" className="inline-flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: 'inherit', minWidth: 24, minHeight: 24, padding: 0, margin: '-5px -4px -5px 0' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          )}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 표기 — 캡션. 단위 토글은 규칙상 미적용(파일 상단 '한계') */}
        <span className="text-caption font-semibold whitespace-nowrap" style={{ fontSize: 12, marginRight: 6 }}>단위: 원</span>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      /* 푸터 좌 = 섹션별 건수(페이지네이션이 없어 '총 N개 중 M개' 형식이 성립하지 않는다) */
      footerLeft={<span>{'투자자산 ' + String(investRows.length) + '건 · 미투자자산 거래 ' + String(tradeRows.length) + '건 · 미투자자산 ' + String(nonInvestRows.length) + '건'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* ── ① 투자자산 ── */}
      <SectionHead n="1" title="투자자산" cap="운용사 장부 ↔ 수탁기관 보관내역 대사" />
      <div>
        <AgGridReact<InvestAssetRow>
          theme={apfsTheme}
          rowData={investRows}
          columnDefs={investCols}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 내용 맞춤(15컬럼 넓은 표) — 잘림 방지, 긴 명칭 컬럼은 maxWidth 캡
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── ② 미투자자산 거래 (원문 샘플 없음 — 빈 상태) ── */}
      <SectionHead n="2" title="미투자자산 거래" cap="종목·보유주수·잔액 대사" />
      <div>
        <AgGridReact<NonInvestTradeRow>
          theme={apfsTheme}
          rowData={tradeRows}
          columnDefs={tradeCols}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── ③ 미투자자산 (원문 샘플 없음 — 빈 상태) ── */}
      <SectionHead n="3" title="미투자자산" cap="계좌번호·잔액 대사" />
      <div>
        <AgGridReact<NonInvestRow>
          theme={apfsTheme}
          rowData={nonInvestRows}
          columnDefs={nonInvestCols}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 순서 그대로(자펀드·기준일). 검색어는 미사용(OFF) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">자펀드 실물검증 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            {/* 기준일 — 행에 기준일 컬럼이 없어 no-op. PeriodPicker는 <label>로 명명되지 않으므로 plain + ariaLabel */}
            <DrawerField label="기준일" noop plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' }}>
                <PeriodPicker mode="day" value={fAsOf} onChange={setFAsOf} ariaLabel="기준일" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 메모 등록 팝업 — 조건부 마운트(open prop 없음) ── */}
      {modal?.kind === 'memo' && memoTarget && (
        <CustodyMemoModal
          ctx={memoTarget.ctx}
          history={memoTarget.history}
          baseDate={fAsOf}
          onSave={saveMemo}
          onClose={() => setModal(null)}
        />
      )}
    </GridFrame>
  );
}
