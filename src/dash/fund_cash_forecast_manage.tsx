/* 조합예상자금 정보보고 — 조회형 리스트 페이지 (투자자산관리 > 사후보고관리 > 조합예상자금 정보보고).
   출처: S1_08_조합예상자금보고.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 타이틀                → ⚠ 목업 h1은 '조합예상자금요청보고'지만 **메뉴 리프 라벨 '조합예상자금 정보보고'**를 쓴다
                             (apfs-grid "타이틀=메뉴 리프" 규약 — crumbs 리프·title·favRoute 모두 리프 기준).
   - 검색박스(모펀드·운용사·자펀드·계정구분·담당자·기준년월)
                           → 계정구분 FilterChip(툴바 좌) + 상세필터 드로어(Sheet, apfs-detail-filter).
                             검색어는 OFF(목업에 없음). 항목 순서는 목업 그대로.
       ⚠ 담당자는 목업이 `data-dat="원천 데이터에 옵션·CDTP 없음 — 실 담당자 목록 미확인"`으로 못 박아
         옵션을 지어내지 않는다(options=[] + ⚠검토필요 마커, noop).
       ⚠ 기준년월은 행에 기준년월 필드가 없어 **noop**(상태만, `· 데이터 연동 후 적용` 캡션).
         초기값은 ''이다 — 목업의 `value="2026-05"`는 데모 표시값이라 필터 기본값으로 승격하지 않는다.
   - 목록바(단위 전환)     → 툴바 우측 `단위` 캡션 + SegTabs(원/백만원/억원, **기본 원** = 목업 기본값).
                             그리드 `context={{ unit }}` + 단위 변경 시 `refreshCells({force:true})`로
                             본문·pinned 합계행을 함께 재포맷한다(asset_funding 동형).
   - 2단 헤더 + tfoot 합계 → AG Grid `ColGroupDef`(marryChildren) + `pinnedBottomRowData`(useMemo 재계산, apfs-aggrid 계약4).
                             목업 tfoot의 `colspan=5 합계`는 AG Grid에 가로 병합이 없어 **No 컬럼에 '합계'**로 싣고
                             나머지 텍스트/일시/배지 칸은 rowPinned 분기로 비운다('-').
   - 엑셀                  → SheetJS. 2단 헤더 병합·리프 키는 `flattenForExcel(columnDefs, unit)`로 columnDefs에서
                             자동 산출하고, 금액은 **선택 단위로 환산한 숫자 셀**(t:'n' + 단위별 z 서식)로 쓴다.
                             마스크 ON이면 숫자 0·텍스트 ''(화면 밖 출력은 valueFormatter를 안 거침).
   - KPI 배지 행 · 카드뷰 · 명세 팝업 · 행 선택 · 등록 → **없음**(목업에 없는 조회 전용 화면).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **이식한다**(2026-09-12 사용자 지시) — 목업 원문 1건(담당자)을 상세필터 라벨 옆에 그대로 싣는다.
   공용 `review_marker.tsx`, 규약은 apfs-grid 스킬. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유) — 없으면 합계행이 안 보인다
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, fmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마·포매터 SSOT
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, IRowNode, ValueFormatterParams, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용 → 알려진 파싱 CVE 비해당)
import { PeriodPicker } from './ui/period-picker';
import { ReviewMarker } from './review_marker';
import type { ReviewNote } from './review_marker';

const { Button, IconBtn, StatusBadge, FilterChip, SegTabs } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터 (목업 `DATA` 3행 그대로 — **원 단위 저장**)
────────────────────────────── */
export type Acct = '농식품' | '수산';

export interface CashForecastRow {
  id: string; no: number;
  gp: string;                // 운용사
  fn: string;                // 자펀드
  acct: Acct;                // 계정구분
  reg: string;               // 등록일시 'YYYY-MM-DD'
  total: number;             // 약정총액
  a: number; b: number; rb: number; bal: number;   // 모태펀드: 약정액(A)·납입액(B)·운용사보고 납입액·출자잔액(A-B)
  tgt: 'O' | 'X';            // 보고대상 여부
  n1e: number | null; n1m: number | null; n1l: number | null;   // 다음월   초순·중순·말
  n2e: number | null; n2m: number | null; n2l: number | null;   // 다다음월 초순·중순·말
  att: '보고' | '미보고';    // 첨부파일(보고 상태)
  upd: string | null;        // 수정일시
}

/* 숫자 N/A는 null(문자 '-' 금지) → 포매터가 '-'로 표시하고 합계는 0으로 취급.
   row1 = 목업 원천 샘플(예상금액 전부 미보고 → null), row2·3 = 목업 도메인 정합 예시. */
const N = null;
const DEMO: CashForecastRow[] = [
  { id: 'cf-1', no: 1, gp: '나우아이비캐피탈(주)', fn: '나우농식품투자펀드5호', acct: '농식품', reg: '2022-08-03',
    total: 14_000_000_000, a: 10_000_000_000, b: 7_000_000_000, rb: 7_000_000_000, bal: 3_000_000_000, tgt: 'O',
    n1e: N, n1m: N, n1l: N, n2e: N, n2m: N, n2l: N, att: '미보고', upd: N },
  { id: 'cf-2', no: 2, gp: '미래에셋벤처투자(주)', fn: '미래에셋농식품투자조합1호', acct: '농식품', reg: '2021-05-10',
    total: 20_000_000_000, a: 12_000_000_000, b: 9_000_000_000, rb: 9_000_000_000, bal: 3_000_000_000, tgt: 'O',
    n1e: 500_000_000, n1m: 300_000_000, n1l: 200_000_000, n2e: 400_000_000, n2m: 0, n2l: 100_000_000, att: '보고', upd: '2026-05-15' },
  { id: 'cf-3', no: 3, gp: '수산벤처투자(주)', fn: '블루오션수산투자조합2호', acct: '수산', reg: '2023-02-20',
    total: 8_000_000_000, a: 5_000_000_000, b: 3_000_000_000, rb: 3_000_000_000, bal: 2_000_000_000, tgt: 'O',
    n1e: 200_000_000, n1m: 100_000_000, n1l: 0, n2e: 150_000_000, n2m: 0, n2l: 0, att: '보고', upd: '2026-05-18' },
];

const PAGE_SIZE = 20;
const ACCTS: Acct[] = ['농식품', '수산'];

/* 상태 배지 톤 — 목업 `.tag` 클래스 대응(tgt: b/n, att: g/a) */
const TGT_TONE: Record<'O' | 'X', Tone> = { O: 'primary', X: 'info' };
const ATT_TONE: Record<'보고' | '미보고', Tone> = { 보고: 'success', 미보고: 'warning' };

/* ──────────────────────────────
   금액 단위 전환 (원/백만원/억원) — 데이터는 **원 단위 저장**이라 선택 단위로 나눠 내린다
────────────────────────────── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];
const DEFAULT_UNIT: Unit = '원';   // 목업 기본값(aria-pressed=true가 '원')

/* 원 저장값 → 선택 단위 수치(엑셀 숫자 셀용) */
const toUnit = (won: number, unit: Unit): number => (unit === '원' ? won : unit === '백만원' ? won / 1e6 : won / 1e8);
/* 표시 문자열 — 목업 `fmt()` 그대로: 원=정수 콤마(공유 fmt) · 백만원=소수 1 · 억원=소수 2.
   ⚠ 백만원·억원을 공유 fmt()에 넣지 않는다 — fmt는 비정수를 소수 1자리로 고정해 억원의 2자리를 깎는다. */
const unitText = (won: number, unit: Unit): string =>
  unit === '원' ? fmt(won)
    : unit === '백만원' ? (won / 1e6).toLocaleString('ko-KR', { maximumFractionDigits: 1 })
      : (won / 1e8).toLocaleString('ko-KR', { maximumFractionDigits: 2 });
/* 엑셀 숫자서식 — 화면 소수 자릿수와 일치(정수 판정이 아니라 **단위**가 기준) */
const Z_BY_UNIT: Record<Unit, string> = { 원: '#,##0', 백만원: '#,##0.0', 억원: '#,##0.00' };

/* 금액 셀 포매터 — grid context.unit로 환산 후 마스킹(numFmt 동형, 단위만 반영).
   단위가 바뀌면 `refreshCells({force:true})`로 재적용한다(본문 + pinned 합계행). */
const moneyFmt = (p: ValueFormatterParams): string => {
  if (p.value == null) return '-';
  const unit = (p.context as { unit?: Unit } | undefined)?.unit ?? DEFAULT_UNIT;
  return mn(unitText(p.value as number, unit));
};

/* ──────────────────────────────
   합계(pinned bottom) — 가산 가능한 금액 11개만. null은 0으로 취급(목업 `r[k]||0` 동형)
────────────────────────────── */
const SUM_KEYS = ['total', 'a', 'b', 'rb', 'bal', 'n1e', 'n1m', 'n1l', 'n2e', 'n2m', 'n2l'] as const;
const MONEY = new Set<string>(SUM_KEYS);
function computeTotal(rows: CashForecastRow[]): CashForecastRow {
  /* 텍스트·일시·배지 칸은 포매터/렌더러의 rowPinned 분기가 '-'·공백으로 처리한다(여기선 빈 값만 채운다) */
  const t: any = { id: '__total', no: 0, gp: '', fn: '', acct: '', reg: '', tgt: '', att: '', upd: N };
  for (const k of SUM_KEYS) t[k] = rows.reduce((s, r) => s + (r[k] ?? 0), 0);
  return t as CashForecastRow;
}

/* ──────────────────────────────
   컬럼 정의 — 목업 `<thead>` 구조 그대로(리프 19개, 2단 그룹 3개)
     No · 운용사 · 자펀드 · 계정구분 · 등록일시 · 약정총액
     │ 모태펀드(5) │ 다음월 자금요청 예상금액(3) │ 다다음월 자금요청 예상금액(3) │ 첨부파일 · 수정일시
   ⚠ pinned는 **No만** — 다른 컬럼에 pinned를 주면 목업 순서가 좌측 영역으로 끌려와 깨진다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const txt = (field: keyof CashForecastRow, header: string, width: number, center?: boolean): ColDef<CashForecastRow> => ({
  field, headerName: header, width, cellStyle: center ? flexMid : flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : <MT>{p.value}</MT>),
});
/* 일시 — 합계행은 '-'(목업 tfoot), 값 없음도 '-'. 숫자 문자열이라 mn() 마스킹 */
const date = (field: keyof CashForecastRow, header: string, width = 128): ColDef<CashForecastRow> => ({
  field, headerName: header, width, cellStyle: { ...centerNum, color: 'var(--muted-foreground)' },
  valueFormatter: (p) => (p.node?.rowPinned ? '-' : p.value == null ? '-' : mn(p.value)),
});
/* 금액 — 우측정렬 + 단위 반영 포매터. numStyle()은 셀마다 호출되는 함수(0=muted, 합계행 자동 bold) */
const amt = (field: keyof CashForecastRow, header: string, width = 150): ColDef<CashForecastRow> => ({
  field, headerName: header, width, type: 'rightAligned', valueFormatter: moneyFmt, cellStyle: numStyle() as any,
});
/* 상태 배지 — 배지가 촘촘히 반복되는 열이라 size="lg" dot={false}(apfs-aggrid). 합계행은 '-' */
const badge = (field: 'tgt' | 'att', header: string, tones: Record<string, Tone>, width: number): ColDef<CashForecastRow> => ({
  field, headerName: header, width, cellStyle: flexMid,
  cellRenderer: (p: any) => (p.node.rowPinned ? '-' : <StatusBadge tone={tones[p.value]} label={p.value} size="lg" dot={false} />),
});

const columnDefs: (ColDef<CashForecastRow> | ColGroupDef<CashForecastRow>)[] = [
  /* 목업 tfoot의 `colspan=5 합계`를 여기 한 칸으로 싣는다(AG Grid는 가로 병합 불가) */
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum,
    valueFormatter: (p) => (p.node?.rowPinned ? '합계' : String(p.value)) },
  { ...txt('gp', '운용사', 190), maxWidth: 240 },
  { ...txt('fn', '자펀드', 230), maxWidth: 300 },
  txt('acct', '계정구분', 96, true),
  date('reg', '등록일시'),
  amt('total', '약정총액'),
  { headerName: '모태펀드', headerClass: 'apfs-grp-a', marryChildren: true,
    children: [amt('a', '약정액(A)'), amt('b', '납입액(B)'), amt('rb', '운용사보고 납입액', 160), amt('bal', '출자잔액(A-B)'),
      badge('tgt', '보고대상 여부', TGT_TONE, 122)] },
  { headerName: '다음월 자금요청 예상금액', headerClass: 'apfs-grp-b', marryChildren: true,
    children: [amt('n1e', '초순', 130), amt('n1m', '중순', 130), amt('n1l', '말', 130)] },
  { headerName: '다다음월 자금요청 예상금액', headerClass: 'apfs-grp-a', marryChildren: true,
    children: [amt('n2e', '초순', 130), amt('n2m', '중순', 130), amt('n2l', '말', 130)] },
  badge('att', '첨부파일', ATT_TONE, 104),
  date('upd', '수정일시'),
];

/* Excel 헤더 병합·리프 컬럼을 columnDefs에서 자동 산출(19컬럼 수작업 오프바이원 방지).
   단위 표기는 asset_funding 방식 그대로 **헤더 텍스트에 `(단위)`**(커뮤니티 xlsx는 셀 스타일을 못 씀):
   - 자식이 전부 금액인 그룹 → 그룹 헤더에 한 번(다음월·다다음월)
   - 금액·비금액이 섞인 그룹 → 금액 리프마다(모태펀드: 보고대상 여부가 섞여 있음)
   - 단독 금액 컬럼        → 그 컬럼 헤더에(약정총액) */
function flattenForExcel(defs: (ColDef<CashForecastRow> | ColGroupDef<CashForecastRow>)[], unit: Unit) {
  const head1: string[] = [], head2: string[] = [], keys: string[] = [], merges: XLSX.Range[] = [];
  const withUnit = (h: string) => `${h}(${unit})`;
  let c = 0;
  for (const d of defs) {
    if ('children' in d && d.children) {
      const kids = d.children as ColDef<CashForecastRow>[];
      const allMoney = kids.every((k) => MONEY.has(String(k.field)));
      const grp = d.headerName ?? '';
      head1.push(allMoney ? withUnit(grp) : grp, ...Array(kids.length - 1).fill(''));
      kids.forEach((k) => {
        const h = k.headerName ?? '';
        head2.push(!allMoney && MONEY.has(String(k.field)) ? withUnit(h) : h);
        keys.push(String(k.field));
      });
      merges.push({ s: { r: 0, c }, e: { r: 0, c: c + kids.length - 1 } });
      c += kids.length;
    } else {
      const col = d as ColDef<CashForecastRow>;
      const h = col.headerName ?? '';
      head1.push(MONEY.has(String(col.field)) ? withUnit(h) : h);
      head2.push('');
      keys.push(String(col.field));
      merges.push({ s: { r: 0, c }, e: { r: 1, c } });
      c += 1;
    }
  }
  return { head1, head2, keys, merges };
}

/* ──────────────────────────────
   로컬 헬퍼 — 골드(subfund_manage·occasional_report_manage)에서 복사. 공유 export 아님
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

/* 상세필터 ⚠검토필요 메모 — 목업 `S1_08_조합예상자금보고.html` 담당자 필드의 data-rec/data-dat 원문 그대로(1건).
   설계 메모라 마스킹·엑셀 대상이 아니다. */
const MGR_NOTE: ReviewNote = { rec: '담당자 코드/명 목록', dat: '원천 데이터에 옵션·CDTP 없음 — 실 담당자 목록 미확인' };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function FundCashForecastManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<CashForecastRow> | null>(null);
  const [rows, setRows] = useState<CashForecastRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());
  const masked = useMask();

  /* 필터 — 계정구분은 툴바 칩(드로어 select와 state 공유), 나머지는 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fAcct, setFAcct] = useState<'' | Acct>('');
  const [fGp, setFGp] = useState('');
  const [fFund, setFFund] = useState('');
  const [fMf, setFMf] = useState('');     // 모펀드 — 행 컬럼 아님(no-op)
  const [fMgr, setFMgr] = useState('');   // 담당자 — 원천 옵션 미확인(no-op, 옵션 없음)
  const [fYm, setFYm] = useState('');     // 기준년월 — 행에 기준년월 필드가 없음(no-op)
  const clearFilters = () => { setFAcct(''); setFGp(''); setFFund(''); setFMf(''); setFMgr(''); setFYm(''); };

  /* no-op 필터(fMf·fMgr·fYm)는 passes·filterActive 양쪽에서 제외한다 —
     passes에 넣으면 표가 비고, filterActive에 넣으면 외부필터가 거짓으로 켜진다 */
  const passes = useCallback((r: CashForecastRow) => {
    if (fAcct && r.acct !== fAcct) return false;
    if (fGp && r.gp !== fGp) return false;
    if (fFund && r.fn !== fFund) return false;
    return true;
  }, [fAcct, fGp, fFund]);
  const filterActive = Boolean(fAcct || fGp || fFund);
  useEffect(() => { apiRef.current?.onFilterChanged(); }, [passes]);
  /* 단위 변경 → 금액 셀(context.unit 참조) 재포맷. 본문 + pinned 합계행 모두 */
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
  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<CashForecastRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  /* pinned 합계행 — 필터로 행이 바뀌면 재계산(참조 안정 + stale 방지, apfs-aggrid 계약4). 인라인 배열 금지 */
  const pinnedBottom = useMemo(() => [computeTotal(filteredRows)], [filteredRows]);
  const gpOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.gp))), [rows]);
  const fundOptions = useMemo(() => Array.from(new Set(rows.map((r) => r.fn))), [rows]);

  const onGridReady = useCallback((e: GridReadyEvent<CashForecastRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const refresh = () => { setRows([...DEMO]); clearFilters(); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 2단 헤더 병합 + 합계행 + 선택 단위 환산. 마스크 ON이면 숫자 0·텍스트 비노출 ── */
  const exportExcel = () => {
    const { head1, head2, keys, merges } = flattenForExcel(columnDefs, unit);
    const src = [...filteredRows, pinnedBottom[0]];
    const body = src.map((r, i) => keys.map((k) => {
      const v = (r as any)[k];
      if (k === 'no') return i === src.length - 1 ? '합계' : v;   // No는 행 번호(축)라 마스킹 대상 아님
      if (MONEY.has(k)) return v == null ? '' : masked ? 0 : toUnit(v as number, unit);
      return masked ? '' : (v ?? '');
    }));
    const ws = XLSX.utils.aoa_to_sheet([head1, head2, ...body]);
    /* 금액 셀에 단위별 숫자서식 — null(빈 셀)은 건너뛴다 */
    src.forEach((r, i) => keys.forEach((k, j) => {
      if (!MONEY.has(k) || (r as any)[k] == null) return;
      const a = XLSX.utils.encode_cell({ r: i + 2, c: j });
      if (ws[a]) ws[a].z = Z_BY_UNIT[unit];
    }));
    ws['!merges'] = merges;
    ws['!cols'] = keys.map((k) => ({ wch: k === 'fn' ? 28 : k === 'gp' ? 22 : MONEY.has(k) ? 16 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '조합예상자금 정보보고');
    XLSX.writeFile(wb, `조합예상자금_정보보고_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '조합예상자금 정보보고']}
      title="조합예상자금 정보보고"
      favRoute="fund-cash-forecast"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 = 주 필터 칩(계정구분, 목업 검색박스의 chipGroup) + 적용 중인 드로어 값 칩(운용사·자펀드).
         계정구분은 칩 자체가 적용 상태를 보여주므로 값 칩을 따로 만들지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', ...ACCTS] as ('' | Acct)[]).map((a) => (
            <FilterChip key={a || 'all'} active={fAcct === a} onClick={() => setFAcct(a)}>{a || '전체'}</FilterChip>
          ))}
          {([
            ['운용사', fGp, () => setFGp('')],
            ['자펀드', fFund, () => setFFund('')],
          ] as [string, string, () => void][]).filter(([, v]) => v).map(([label, value, clear]) => (
            <span key={label} title={label} className="inline-flex items-center gap-1.5 font-semibold text-primary" style={{ padding: '5px 8px 5px 11px', borderRadius: 9, fontSize: 12.5, background: 'color-mix(in srgb, var(--primary) 10%, transparent)' }}>
              <MT>{value}</MT>
              <button type="button" onClick={clear} aria-label={label + ' 필터 제거'} className="inline-flex border-0 cursor-pointer p-0" style={{ background: 'transparent', color: 'inherit' }}>
                <Icon name="x" size={13} stroke={2.4} />
              </button>
            </span>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환(목업 목록바 `.unit`) — 캡션 + 세그먼트. 현재 값은 SegTabs가 보여주므로 캡션은 '단위'만 */}
        <span className="text-caption font-semibold" style={{ fontSize: 12, marginRight: 6 }}>단위</span>
        <SegTabs size="sm" value={unit} onChange={(v) => setUnit(v as Unit)} options={UNITS.map((u) => ({ value: u, label: u }))} />
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

      {/* AG Grid 본체 — 2단 그룹헤더 + pinned 합계 + External Filter. 행 선택·더블클릭 진입 없음(조회 전용).
          가로는 AG Grid 내부 스크롤(리프 19개라 프레임보다 넓다 → AUTO_SIZE_CONTENT + 긴 텍스트 maxWidth 캡) */}
      <div>
        <AgGridReact<CashForecastRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          context={{ unit }}   // 금액 포매터(moneyFmt)가 참조. 단위 변경 시 useEffect가 refreshCells로 재적용
          pinnedBottomRowData={pinnedBottom}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 보고 건이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목·순서 그대로(모펀드·운용사·자펀드·계정구분·담당자·기준년월).
             검색어는 없다(목업 미포함). 컬럼 미연동 항목은 noop 캡션(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조합예상자금 정보보고 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={['농식품모태펀드', 'MOAF']} /></DrawerField>
            <DrawerField label="운용사"><DrawerSelect value={fGp} onChange={setFGp} options={gpOptions} /></DrawerField>
            <DrawerField label="자펀드"><DrawerSelect value={fFund} onChange={setFFund} options={fundOptions} /></DrawerField>
            {/* 계정구분은 툴바 칩과 같은 state를 공유한다(한 필터·두 진입점) */}
            <DrawerField label="계정구분"><DrawerSelect value={fAcct} onChange={(v) => setFAcct(v as '' | Acct)} options={ACCTS} /></DrawerField>
            <DrawerField label="담당자" noop note={MGR_NOTE}><DrawerSelect value={fMgr} onChange={setFMgr} options={[]} /></DrawerField>
            {/* 기준년월 = PeriodPicker month('YYYY-MM'). 트리거가 w-full이라 fit-content 래퍼 필수(apfs-datepicker 폭 규칙) */}
            <DrawerField label="기준년월" plain noop>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('select'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={fYm} onChange={setFYm} ariaLabel="기준년월" />
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
