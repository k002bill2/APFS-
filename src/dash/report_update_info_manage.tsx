/* 보고 업데이트정보 — 읽기전용 모니터링 리스트 (투자자산관리 > 사후보고관리 > 보고 업데이트정보).
   출처: S1_10_보고_업데이트정보.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(보고구분 1항목)   → 상세필터 드로어(Sheet, apfs-detail-filter). 목업 항목이 하나뿐이라
       드로어가 너무 빈약해지므로 주 필터(투심상태)를 드로어에도 함께 노출한다(골드 '확인상태' 동형).
       ⚠ 보고구분은 실데이터가 '투자심의관리' 1건뿐이어서 **옵션을 지어내지 않는다**(목업 유일 옵션만).
         행 필드가 아니라 상태만 보관하는 noop 필터다 → `passes`에 넣지 않는다.
   - 주 필터(투심상태)         → 툴바 좌 FilterChip(전체·승인·보류·부결). 행 `stat` 연동.
   - 목록바 금액단위 토글       → 툴바 우 `금액단위` 캡션 + SegTabs(원/백만원/억원, 기본 원).
       그리드는 `context={{ unit }}`로 단위를 받고 단위가 바뀌면 `refreshCells({force:true})`로 재포맷한다.
       헤더명은 `승인금액` 고정 — 동적 headerName 은 컬럼 재생성을 유발한다(apfs-aggrid 계약 6).
   - 목록 그리드(11컬럼)        → AG Grid 단일 헤더(apfs-aggrid) + **pinned 합계행**(목업 tfoot).
       목업 tfoot 은 colspan 7 '합계' · 합계금액 · colspan 3 '-' 인데 AG Grid 엔 colspan 이 없으므로
       구분 셀에 '합계', 텍스트 셀(운용사·자펀드·투자기업) 빈 값, 나머지 '-' 로 나눠 실었다.
   - 행 선택(라디오)            → 목업 "행 선택은 실제 라디오" 그대로 단일선택. 초기 선택 = 1행(목업 `sel:1`).
       ⚠ **선택은 표시 전용이다** — 읽기전용 모니터링 화면이라 전이·편집 액션이 하나도 없다.
         그래서 툴바 좌는 항상 필터 칩이며 **selbar 를 만들지 않는다**: `apfs-stage-workflow` 의
         "전이는 선택 후 컨텍스트 액션으로"(규약 1)·selbar 규약(4)은 액션이 없는 이 화면에 적용되지 않는다.
         선택 SSOT 는 규약 9 그대로 React `selId` 이고 그리드가 따라간다(onGridReady·onRowDataUpdated 복원).
   - KPI 배지 행                → 미포함(`kpis` 미전달). 카드뷰·명세 팝업·등록/수정/삭제도 없음(읽기전용).
   - 엑셀                       → SheetJS(단일 헤더, 승인금액은 선택 단위 숫자 셀, 마스크 시 실값 비노출)
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).
   ⚠검토필요 마커는 **이식한다**(2026-09-12 사용자 지시) — 목업 원문 4건 전부 옮겼다:
     검색 1건(보고구분) + 그리드 헤더 3건(구분·투심상태·파일구분). 공용 `review_marker.tsx`, 규약은 apfs-grid.

   한계(목업 원문 범위):
   - 구분·투심상태·파일구분은 원본에 샘플값이 없어 표시값이 도메인 추론이다(헤더 마커로 명시).
   - 투자금납입 예정일의 '-' 는 목업 문자 그대로다(텍스트 N/A). 숫자 N/A 는 null→'-'. */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유) — 없으면 합계행이 안 보인다
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import type { Tone } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, fmt, numStyle, AUTO_SIZE_CONTENT, DEFAULT_COL_DEF } from './aggrid_theme';   // 공유 테마(회색 선택)·포매터 SSOT
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, IRowNode, ValueFormatterParams, CellStyle, RowSelectionOptions, SelectionColumnDef } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';
import { ReviewMarker, reviewInnerHeader } from './review_marker';
import type { ReviewNote } from './review_marker';

const { Button, IconBtn, StatusBadge, FilterChip, SegTabs } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터 (목업 하단 `DATA` 4행 그대로, 승인금액은 원 단위 저장)
────────────────────────────── */
export type ReviewStatus = '승인' | '보류' | '부결';

export interface ReportUpdateRow {
  id: string;
  gb: '정기' | '수시';     // 구분(⚠ 원본 샘플값 없음 — 도메인 추론)
  gp: string;              // 운용사
  fd: string;              // 자펀드
  co: string;              // 투자기업
  stat: ReviewStatus;      // 투심상태(⚠ 동상)
  sdt: string;             // 투심일자 'YYYY-MM-DD'
  amt: number;             // 승인금액(원)
  pdt: string;             // 투자금납입 예정일 — 목업 '-' 문자 그대로(텍스트 N/A)
  ftype: string;           // 파일구분(⚠ 동상)
  reg: string;             // 등록/변경일시 'YYYY-MM-DD HH:mm'
}

/* 목업 `statTag()` 의 g/a/n 매핑 그대로 — 승인=g(success) · 보류=a(warning) · 부결=n(info) */
const STAT_TONE: Record<ReviewStatus, Tone> = { 승인: 'success', 보류: 'warning', 부결: 'info' };

const DEMO: ReportUpdateRow[] = [
  { id: 'ru-1', gb: '정기', gp: '한국투자파트너스', fd: '한투 청년농식품투자조합', co: '그린바이오텍', stat: '승인', sdt: '2026-04-18', amt: 5_000_000_000, pdt: '2026-06-30', ftype: '투자심의보고서', reg: '2026-04-18 14:22' },
  { id: 'ru-2', gb: '정기', gp: 'IMM인베스트먼트', fd: 'IMM 농식품 스마트투자조합', co: '스마트팜테크', stat: '승인', sdt: '2026-04-05', amt: 3_000_000_000, pdt: '2026-06-15', ftype: '투자심의보고서', reg: '2026-04-05 09:47' },
  { id: 'ru-3', gb: '수시', gp: 'KB증권', fd: '현대동양농식품사모투자전문회사', co: '푸드테크랩', stat: '보류', sdt: '2026-03-27', amt: 2_000_000_000, pdt: '-', ftype: '투자심의보고서', reg: '2026-03-27 16:03' },
  { id: 'ru-4', gb: '정기', gp: '한국투자파트너스', fd: '한투 청년농식품투자조합', co: '애그리넷', stat: '부결', sdt: '2026-03-11', amt: 1_500_000_000, pdt: '-', ftype: '투자심의보고서', reg: '2026-03-11 11:18' },
];
/* 초기 선택 행 — 목업 `sel:1`(1행). 선택 SSOT 는 React state 이고 그리드가 따라간다 */
const INIT_SEL = 'ru-1';
const PAGE_SIZE = 20;
const TOTAL_ID = '__total';

/* ──────────────────────────────
   금액 단위 전환 (원/백만원/억원) — 데이터는 원 단위 저장. 목업 listbar `.unit` 이식
────────────────────────────── */
type Unit = '원' | '백만원' | '억원';
const UNITS: Unit[] = ['원', '백만원', '억원'];

/* 원 저장값 → 선택 단위 숫자. **화면(moneyFmt)과 엑셀이 같은 함수를 쓴다** — 따로 계산하면 갈라진다.
   백만원은 목업 `fmt()` 의 소수 0자리와 맞추려 여기서 정수로 반올림한다(억원은 소수 2자리까지 표시). */
const toUnit = (won: number, unit: Unit): number =>
  unit === '원' ? won : unit === '백만원' ? Math.round(won / 1e6) : won / 1e8;

/* 표시 문자 — 목업 `fmt()` 규칙 그대로. 원=정수 콤마(공유 fmt) · 백만원=정수 콤마 ·
   억원=나누어떨어지면 정수, 아니면 소수 2자리. */
const unitText = (won: number, unit: Unit): string => {
  if (unit === '원') return fmt(won);
  if (unit === '백만원') return toUnit(won, unit).toLocaleString('ko-KR');
  const dec = won % 1e8 === 0 ? 0 : 2;
  return toUnit(won, unit).toLocaleString('ko-KR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};

/* 승인금액 셀 포매터 — 단위는 **grid context 에서 읽는다**(클로저로 잡으면 컬럼이 모듈/useMemo 고정이라
   첫 단위에서 얼어붙는다). 단위 변경 시 `refreshCells({force:true})` 로 재적용. 숫자 N/A(null)='-'. */
const moneyFmt = (p: ValueFormatterParams<ReportUpdateRow>): string => {
  if (p.value == null) return '-';
  const unit = (p.context as { unit?: Unit } | undefined)?.unit ?? '원';
  return mn(unitText(p.value as number, unit));
};

/* pinned 합계행 — 금액만 합산(목업 tfoot). 나머지 셀은 포매터/렌더러가 `rowPinned` 로 처리한다.
   `gb`·`stat` 이 문자열 리터럴 유니온이라 빈 문자를 직접 대입할 수 없어 any 경유(골드 subfund_manage 동형). */
function computeTotal(rows: ReportUpdateRow[]): ReportUpdateRow {
  const t: any = { id: TOTAL_ID, gb: '', gp: '', fd: '', co: '', stat: '', sdt: '', pdt: '', ftype: '', reg: '' };
  t.amt = rows.reduce((a, r) => a + (r.amt ?? 0), 0);
  return t as ReportUpdateRow;
}

/* ──────────────────────────────
   ⚠검토필요 메모 — 목업 `S1_10_보고_업데이트정보.html` 의 data-rec/data-dat 원문 그대로(4건).
   설계 메모라 마스킹·엑셀 대상이 아니다.
────────────────────────────── */
const NOTE_RT: ReviewNote = { rec: '보고구분 공통코드 옵션 목록', dat: "실데이터 '투자심의관리' 1건만 확인 · 그 외 옵션 미확인" };
const NOTE_GB: ReviewNote = { rec: '구분 공통코드값', dat: '원본 샘플값 없음 · 표시값은 도메인 추론(정기/수시)' };
const NOTE_STAT: ReviewNote = { rec: '투심상태 공통코드값(승인/부결/보류 등)', dat: '원본 샘플값 없음 · 표시값은 도메인 추론' };
const NOTE_FTYPE: ReviewNote = { rec: '파일구분 공통코드값', dat: '원본 샘플값 없음 · 표시값은 도메인 추론' };
/* 모듈 스코프에 한 번만 만든다 — 렌더마다 새 컴포넌트 타입이면 AG Grid 가 헤더를 통째로 remount 한다 */
const HEADER_GB = reviewInnerHeader(NOTE_GB);
const HEADER_STAT = reviewInnerHeader(NOTE_STAT);
const HEADER_FTYPE = reviewInnerHeader(NOTE_FTYPE);
/* Tab 을 AG Grid 헤더 내비게이션에서 빼 브라우저 기본 순서로 넘긴다 — 안 하면 헤더 안의 ⚠마커에
   키보드로 도달할 수 없다(AG Grid 가 Tab 을 가로채 다음 헤더 셀로 이동). 마커 3개 컬럼 전부에 건다. */
const passTab = (p: { event: KeyboardEvent }) => p.event.key === 'Tab';

/* ──────────────────────────────
   컬럼 정의 — 목업 `<thead>` 순서 그대로(단일 헤더):
     [선택 라디오] · 구분 · 운용사 · 자펀드 · 투자기업 · 투심상태 · 투심일자 · 승인금액 ·
     투자금납입 예정일 · 파일구분 · 등록/변경일시
   ⚠ 셀 클로저(버튼·링크)가 없는 화면이라 컬럼 배열을 **모듈 스코프 상수**로 둔다 — 렌더 간 참조가
     완전히 고정되고(useMemo([]) 보다 강함) 골드 `subfund_manage.tsx` 와 같은 형태다(apfs-aggrid 계약 6).
   ⚠ pinned 는 선택 컬럼만 — 다른 컬럼에 pinned 를 주면 목업 순서가 깨진다.
   ⚠ 마커를 단 컬럼(구분·투심상태·파일구분)은 헤더가 길어지므로 width/maxWidth 를 함께 올렸다.
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* 텍스트 컬럼(운용사·자펀드·투자기업) — 인명/기관명이라 <MT> 마스킹. 합계행은 빈 칸(목업 tfoot 병합 구간) */
const txt = (field: keyof ReportUpdateRow, header: string, width: number, maxWidth: number): ColDef<ReportUpdateRow> => ({
  field, headerName: header, width, maxWidth, cellStyle: flexCenter,
  cellRenderer: (p: any) => (p.node.rowPinned ? null : <MT>{p.value}</MT>),
});
/* 날짜/일시 — mn() 마스킹. 합계행 '-'(목업 tfoot colspan 3 '-'). muted 는 일자 컬럼만.
   ⚠ 골드 `occasional_report_manage` 의 date() 는 `maxWidth: width` 를 걸지만 그건 `FIT_GRID_WIDTH`
     전용 장치다(잉여 폭을 제목 컬럼으로만 흘리려고 성장을 막는 것). 이 화면은 `AUTO_SIZE_CONTENT` 이고
     컬럼 합이 프레임(1280)보다 넓어 흡수할 잉여가 없으므로 cap 을 두지 않는다 —
     특히 '투자금납입 예정일'(9자) 헤더가 cap 에 걸려 잘릴 수 있다. */
const dateCol = (field: keyof ReportUpdateRow, header: string, width: number, muted = true): ColDef<ReportUpdateRow> => ({
  field, headerName: header, width,
  cellStyle: muted ? { ...centerNum, color: 'var(--muted-foreground)' } : centerNum,
  valueFormatter: (p) => (p.node?.rowPinned ? '-' : mn(p.value)),
});

const COLUMN_DEFS: ColDef<ReportUpdateRow>[] = [
  /* 구분(⚠) — 합계행에서 '합계' 라벨을 맡는다(목업 tfoot 의 colspan 7 구간 대표). 공통코드값이라 비마스킹 */
  /* ⚠ 마커 컬럼 3개는 minWidth=width=maxWidth로 고정한다 — `AUTO_SIZE_CONTENT`(fitCellContents)는 React 커스텀
     inner 헤더(마커)를 첫 측정에 포함하지 못해 배지 폭(투심상태 95px)으로 눌러 헤더 텍스트가 잘렸다(2026-09-12 코디네이터 실측). */
  { field: 'gb', headerName: '구분', width: 96, minWidth: 96, maxWidth: 96, cellStyle: centerNum,
    headerComponentParams: { innerHeaderComponent: HEADER_GB }, suppressHeaderKeyboardEvent: passTab,
    valueFormatter: (p) => (p.node?.rowPinned ? '합계' : p.value) },
  txt('gp', '운용사', 180, 220),
  txt('fd', '자펀드', 240, 300),
  txt('co', '투자기업', 160, 200),
  /* 투심상태(⚠) — 배지는 상태 표시 전용(클릭 전이 없음). 합계행은 배지 대신 '-' */
  { field: 'stat', headerName: '투심상태', width: 136, minWidth: 136, maxWidth: 136, cellStyle: flexMid,
    headerComponentParams: { innerHeaderComponent: HEADER_STAT }, suppressHeaderKeyboardEvent: passTab,
    cellRenderer: (p: any) => (p.node.rowPinned ? '-' : <StatusBadge tone={STAT_TONE[p.value as ReviewStatus]} label={p.value} size="lg" dot={false} />) },
  dateCol('sdt', '투심일자', 124),
  /* 승인금액 — 단위는 context 에서(moneyFmt). 합계행은 numStyle 이 자동으로 굵게 처리 */
  { field: 'amt', headerName: '승인금액', width: 154, type: 'rightAligned',
    valueFormatter: moneyFmt, cellStyle: numStyle() as any },
  /* 투자금납입 예정일 — 목업 '-' 문자 그대로(텍스트 N/A). 일자 muted 는 주지 않는다(목업 본문색) */
  dateCol('pdt', '투자금납입 예정일', 150, false),
  /* 파일구분(⚠) — 공통코드값이라 비마스킹. 합계행 '-' */
  { field: 'ftype', headerName: '파일구분', width: 156, minWidth: 156, maxWidth: 156, cellStyle: centerNum,
    headerComponentParams: { innerHeaderComponent: HEADER_FTYPE }, suppressHeaderKeyboardEvent: passTab,
    valueFormatter: (p) => (p.node?.rowPinned ? '-' : p.value) },
  dateCol('reg', '등록/변경일시', 156),
];

/* 라디오 단일선택 — 목업 1열 '선택(라디오)'. 객체 prop 은 모듈 상수로 호이스팅(apfs-aggrid 계약 6).
   `isRowSelectable` 은 belt-and-braces 다 — AG Grid 자체가 pinned 행의 선택 컨트롤을 렌더하지 않고
   (`isIncludeControl`) 선택도 막지만(`isRowSelectionBlocked`), 합계행 비선택을 코드로 명시해 둔다. */
const ROW_SELECTION: RowSelectionOptions<ReportUpdateRow> = {
  mode: 'singleRow', checkboxes: true, enableClickSelection: true,
  isRowSelectable: (n) => !n.rowPinned,
};
const SELECTION_COL: SelectionColumnDef = { pinned: 'left', width: 44 };

/* 엑셀 텍스트 컬럼(승인금액 제외) — 화면 컬럼과 1:1(화면=엑셀 불변식). 순서가 목업 헤더와 같다 */
const EXCEL_TEXT: { header: string; get: (r: ReportUpdateRow) => string }[] = [
  { header: '구분', get: (r) => r.gb },
  { header: '운용사', get: (r) => r.gp },
  { header: '자펀드', get: (r) => r.fd },
  { header: '투자기업', get: (r) => r.co },
  { header: '투심상태', get: (r) => r.stat },
  { header: '투심일자', get: (r) => r.sdt },
];
const EXCEL_TAIL: { header: string; get: (r: ReportUpdateRow) => string }[] = [
  { header: '투자금납입 예정일', get: (r) => r.pdt },
  { header: '파일구분', get: (r) => r.ftype },
  { header: '등록/변경일시', get: (r) => r.reg },
];
const AMT_COL_IDX = EXCEL_TEXT.length;   // 승인금액 열 위치(숫자 서식 부여 대상)

/* ──────────────────────────────
   로컬 UI 조각 — 공유 export 가 아니라 골드에서 복사하는 것이 규약(MoreMenu·PageBtn·DrawerField…)
────────────────────────────── */
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

function DrawerField({ label, noop, note, children }: { label: string; noop?: boolean; note?: ReviewNote; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{note && <ReviewMarker {...note} label={label} />}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </label>
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

/* kebab(···) 더보기 — 내보내기(Excel)·인쇄. 읽기전용 화면이라 1차 액션(등록)이 없어 kebab 단독(apfs-grid 툴바 규약) */
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
export function ReportUpdateInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ReportUpdateRow> | null>(null);
  const [rows, setRows] = useState<ReportUpdateRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [unit, setUnit] = useState<Unit>('원');             // 금액 단위 — 목업 기본값 '원'
  const [selId, setSelId] = useState<string | null>(INIT_SEL);   // 선택 SSOT(표시 전용). 초기=목업 sel:1
  const masked = useMask();
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  /* 필터 — 주 필터(투심상태)는 툴바 칩, 보고구분은 드로어. SSOT=개별 state(빈 값=미적용) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fStat, setFStat] = useState<'' | ReviewStatus>('');
  const [fRt, setFRt] = useState('');      // 보고구분 — 행 컬럼 아님(no-op, 옵션은 목업 유일값만)
  const clearFilters = () => { setFStat(''); setFRt(''); };

  /* 보고구분(fRt)은 행 필드가 아니므로 술어에 넣지 않는다(noop 필터) */
  const passes = useCallback((r: ReportUpdateRow) => {
    if (fStat && r.stat !== fStat) return false;
    return true;
  }, [fStat]);
  const filterActive = Boolean(fStat);
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
  /* 단위 변경 → 승인금액 셀(context.unit 참조) 재포맷. 본문 + pinned 합계행 모두 */
  useEffect(() => { apiRef.current?.refreshCells({ force: true }); }, [unit]);

  const isExternalFilterPresent = useCallback(() => filterActive, [filterActive]);
  const doesExternalFilterPass = useCallback((node: IRowNode<ReportUpdateRow>) => (node.data ? passes(node.data) : true), [passes]);

  const filteredRows = useMemo(() => rows.filter(passes), [rows, passes]);
  /* pinned 합계행 — 필터 결과에 따라 합계가 변하므로 useMemo 재계산(참조 안정 + stale 방지, apfs-aggrid 계약 4) */
  const pinnedBottom = useMemo(() => [computeTotal(filteredRows)], [filteredRows]);

  /* 선택 SSOT=React state, 그리드는 따라간다(apfs-stage-workflow 규약 9).
     ① onGridReady — 재마운트 복원 ② onRowDataUpdated — rowData 반영 후에야 노드가 생기는 경로
        (초기 선택 'ru-1'·새로고침이 여기서 잡힌다). 둘 다 있어야 "state 는 선택, 라디오는 빈" 불일치가 없다. */
  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const onGridReady = useCallback((e: GridReadyEvent<ReportUpdateRow>) => {
    apiRef.current = e.api;
    const id = selIdRef.current; if (id) e.api.getRowNode(id)?.setSelected(true, true);
  }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<ReportUpdateRow>) => { setSelId(e.api.getSelectedRows()[0]?.id ?? null); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<ReportUpdateRow> }) => {
    const id = selIdRef.current; if (!id) return;
    const node = e.api.getRowNode(id); if (node && !node.isSelected()) node.setSelected(true, true);
  }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState는 렌더 루프 유발(aggrid-onpaginationchanged-render-loop) */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  const refresh = () => { setRows([...DEMO]); clearFilters(); setSelId(INIT_SEL); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더 + 합계행. 승인금액은 **선택 단위로 환산한 숫자 셀**(t:'n' + z 서식)이라
       Excel 이 화면처럼 우측 정렬하고 합계도 계산된다. 마스크 ON이면 숫자 0·텍스트 ''(실값 비노출).
       합계행 라벨('합계')은 구조 라벨이라 마스크 대상이 아니다(골드 subfund_manage 동형). ── */
  const exportExcel = () => {
    const amtHeader = `승인금액(${unit})`;
    const head = [...EXCEL_TEXT.map((c) => c.header), amtHeader, ...EXCEL_TAIL.map((c) => c.header)];
    const zFmt = unit === '억원' ? '#,##0.00' : '#,##0';
    const amtOf = (r: ReportUpdateRow) => (masked ? 0 : toUnit(r.amt, unit));
    const body = filteredRows.map((r) => [
      ...EXCEL_TEXT.map((c) => (masked ? '' : c.get(r))),
      amtOf(r),
      ...EXCEL_TAIL.map((c) => (masked ? '' : c.get(r))),
    ]);
    const total = pinnedBottom[0];
    const totalRow: (string | number)[] = ['합계', '', '', '', '', '', amtOf(total), '', '', ''];
    const src = [...body, totalRow];
    const ws = XLSX.utils.aoa_to_sheet([head, ...src]);
    src.forEach((_, i) => {
      const a = XLSX.utils.encode_cell({ r: i + 1, c: AMT_COL_IDX });
      if (ws[a]) ws[a].z = zFmt;
    });
    ws['!cols'] = head.map((h) => ({ wch: h === '자펀드' ? 30 : h === '운용사' || h === amtHeader || h === '등록/변경일시' ? 20 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '보고 업데이트정보');
    XLSX.writeFile(wb, `보고_업데이트정보_${unit}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '보고 업데이트정보']}
      title="보고 업데이트정보"
      favRoute="report-update-info"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌는 항상 필터 칩이다 — 선택이 표시 전용이라 selbar 가 존재하지 않는다(상단 주석 참조).
         드로어 값 칩도 없다: 투심상태는 이 칩 행이 이미 보여주고, 보고구분은 noop 이라 칩을 만들지 않는다. */
      toolbarLeft={(
        <>
          <Icon name="filter" size={16} className="text-caption" />
          {(['', '승인', '보류', '부결'] as ('' | ReviewStatus)[]).map((s) => (
            <FilterChip key={s || 'all'} active={fStat === s} onClick={() => setFStat(s)}>{s || '전체'}</FilterChip>
          ))}
        </>
      )}
      toolbarRight={<>
        {/* 금액 단위 전환 — 목업 listbar 의 '금액단위 원/백만원/억원'. 캡션·단위는 비마스킹(축) */}
        <span className="text-caption font-semibold" style={{ fontSize: 12, marginRight: 6 }}>금액단위</span>
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

      {/* AG Grid 본체 — 단일 헤더 + 라디오 단일선택 + pinned 합계 + External Filter. 가로는 AG Grid 내부 스크롤 */}
      <div>
        <AgGridReact<ReportUpdateRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMN_DEFS}
          getRowId={(p) => p.data.id}
          context={{ unit }}                     // 승인금액 포매터(moneyFmt)가 참조. 변경 시 useEffect 가 refreshCells
          pinnedBottomRowData={pinnedBottom}
          domLayout="autoHeight"
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(잘림 방지). 긴 텍스트 컬럼은 maxWidth 캡
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조건에 맞는 보고 업데이트 건이 없습니다.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목(보고구분 1개) + 주 필터(투심상태) 공유.
           검색어는 미사용(OFF). 컬럼 미연동 필터는 caption 으로 no-op(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">보고 업데이트정보 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* 보고구분 — 목업 유일 옵션('투자심의관리')만 둔다. 없는 옵션을 생성하지 않는다(검토필요 메모) */}
            <DrawerField label="보고구분" noop note={NOTE_RT}><DrawerSelect value={fRt} onChange={setFRt} options={['투자심의관리']} /></DrawerField>
            <DrawerField label="투심상태"><DrawerSelect value={fStat} onChange={(v) => setFStat(v as '' | ReviewStatus)} options={['승인', '보류', '부결']} /></DrawerField>
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
