/* 조기경보 결과정보 관리 — 관리형 페이지 (조기경보 > 조기경보 > 조기경보 결과정보 관리).
   출처: S2_61_조기경보_결과정보_관리.html(KRDS TO-BE) + S2_62(생성 확인 팝업 — 목업에 이미 이식돼 있음)
   → APFS 디자인시스템으로 변형. 골드 레퍼런스: custody_verify_manage.tsx(섹션 적층형 + 상세필터 드로어).

   구성(목업 → 우리 규약):
   - 검색박스(기준년월 + [조회]) → **상세필터 드로어**(Sheet, apfs-detail-filter) 안의 `PeriodPicker mode="month"`.
     [조회] 버튼은 없다 — 월을 고르면 즉시 반영된다. 적용 값은 GridFrame `appliedFilters` 칩(값만 + ×)으로 보인다.
     기준년월은 항상 값이 있어(빈 조회 조건이 없다) 칩이 상시 보이고, × = 기본값(2026-07)으로 되돌리기. 검색어는 OFF.
   - `.actbar`(생성·확정·마감·마감해제) → 생성은 툴바 우 상세필터 오른쪽 `+ 생성` 버튼(등록 버튼 자리·형태, 월 단위라 행 선택과 무관),
     확정·마감·마감해제는 **섹션1 체크박스 선택 액션**(2026-09-28 사용자 지시 "그리드에 체크박스로 기능 구현").
   - 섹션 2개(조기경보 생성 결과내역 · 운용사 재무정보 보고) → **GridFrame 하나 안에 세로로 쌓은 AG Grid 2개**.
     두 그리드 모두 multiRow 체크박스(apfs-aggrid "체크박스" 절 — 본문 클릭 선택 없음, SELECTION_COL).
     선택이 두 그리드에서 동시에 생길 수 있어 GridFrame `contextActions`(단일 선택원 전제)가 아니라
     **각 섹션 헤더 우측**에 `N건 선택됨 · [액션] · 선택 해제`를 그린다. 선택이 없으면 섹션2는 전체권한부여·해제.
   - 섹션2 수정권한처리 → 구 셀 안 버튼 컬럼을 걷어내고 체크박스 선택 액션으로 옮겼다(선택 행 수정권한여부 토글).
   - O/X(목업 `.tag g`/`.tag n`) → `StatusBadge size="lg"` O=success · X=muted. null 은 muted 텍스트 '-'.
     생성여부 셀은 배지 옆에 생성일시(목업 `.ts`)를 작은 muted 텍스트로 붙인다.
   - 확인 다이얼로그(목업 `confirmDlg`) → Radix AlertDialog(`ew_result_dialogs.tsx`), 기본 포커스=취소.
     확정은 목업과 같이 다이얼로그 없이 바로 반영 + 토스트.
   - 합계행·페이지네이션·등록 없음 → pinned 합계·페이저도 없다(목업 동일). KPI 배지 행 미포함(사용자 결정).
   - 엑셀 → SheetJS 워크북 1개 + 시트 2개("생성결과내역"·"재무정보보고"). 단일 헤더라 병합 없음.
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·설계메모는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유).

   한계·가정(결정 기록)
   - **섹션2 기준년월 = 선택 월의 전월(-1)** — 목업이 상단 2026-07 / 섹션2 2026-06 으로 그렸고 설계메모가
     "전월 집계인지 하드코딩 오류인지" [확인 필요]로 남겼다. 목업 그대로 전월로 둔다(주석에만 기록).
   - **처리 효과 = 선택 행 O/X 로컬 갱신(2026-09-28 사용자 결정 — 09-23 '토스트만' 결정을 대체)**:
     확정→확정여부 O · 마감→마감여부 O · 마감해제→마감여부 X · 수정권한처리→수정권한여부 토글(미정 '-'→O) ·
     전체권한부여/해제→섹션2 전 행 O/X. 버튼은 상태 무관(이미 O 인 행에 마감해도 막지 않는다 — 기획서에 게이트 정의 없음).
     **생성은 여전히 토스트만** — 새 결과 행을 만들려면 없는 값을 창작해야 한다.
   - **"수정권한"의 의미·범위 미정의** [확인 필요] — 부여 시 운용사가 어느 화면·항목을 수정할 수 있는지, 기준년월 한정인지,
     재무정보 등록/보고 화면 편집 가능 여부와 어떻게 연동되는지 원문에 없다(목업 설계메모). 여기선 플래그만 바꾼다.
   - **더미 데이터는 목업 원문 2건뿐**(섹션1 2026-07 · 섹션2 2026-06) — 그 외 월은 빈 그리드. 값 창작 금지.
   - **데이터는 로컬 state**(월 키, 백엔드 없음) — 새로고침은 기준년월·데이터·선택을 모두 초기값으로 되돌린다.
   - 금액이 없는 조회·상태관리 화면이라 단위 표기·단위 토글이 없다(목업 설계메모와 동일 결론). */
import './aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정 + autoHeight sticky 헤더(공유)
import React, { useState, useCallback, useMemo, useRef } from 'react';
import { UI } from './components';
import { GridFrame, FooterActions } from './grid_frame';
import { SectionHead } from './risk_grid';   // 여러 표 세로 쌓기 공용 섹션 헤더
import { apfsTheme, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL, restoreSelection } from './aggrid_selection';   // DS 체크박스 선택 열 + multiRow 선택 복원
import { controlMinWidth } from './schemas/renderers';   // 컨트롤 폭 하한 SSOT(fit-content 짝)
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, CellStyle, GridApi, GridReadyEvent, SelectionChangedEvent, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { PeriodPicker } from './ui/period-picker';
import { EwConfirmDialog } from './ew_result_dialogs';
import { prevYm, setFlag, togglePerm } from './ew_result_model';   // 순수함수 — 유닛 테스트 대상

const { Button, IconBtn, SaveButton, StatusBadge } = UI;

/* ──────────────────────────────
   도메인 타입 — 목업 2개 표의 컬럼 집합 그대로
────────────────────────────── */
export type OX = 'O' | 'X';

/** 섹션1 조기경보 생성 결과내역 한 행 */
export interface EwResultRow {
  id: string; no: number; ym: string; info: string;
  make: OX; makeTs: string | null;   // 생성여부 + 생성일시(목업 `.ts`)
  mod: OX; cfm: OX; cls: OX;         // 수정·확정·마감여부
}
/** 섹션2 운용사 재무정보 보고 한 행 */
export interface GpReportRow {
  id: string; no: number; ym: string; gp: string;
  rep: OX | null; cons: OX | null; perm: OX | null;   // 보고·정합성·수정권한여부(null = '-')
}

/* 데모 데이터 — 목업 `<script>` D1·D2 원문 그대로(창작 없음). 월(YYYY-MM) 키로 보관한다.
   섹션2 행은 **자기 기준년월(2026-06)** 키로 둔다 → 선택 월의 전월로 찾으면 2026-07 선택 시 이 행이 나온다. */
const RESULT_DEMO: Record<string, EwResultRow[]> = {
  '2026-07': [
    { id: 'ew-r-2026-07', no: 1, ym: '2026-07', info: '운용사지표결과정보', make: 'O', makeTs: '2026-07-23 15:06:03', mod: 'X', cfm: 'O', cls: 'X' },
  ],
};
const REPORT_DEMO: Record<string, GpReportRow[]> = {
  '2026-06': [
    { id: 'ew-g-2026-06-1', no: 1, ym: '2026-06', gp: '(주)에코캐피탈', rep: 'X', cons: 'O', perm: 'X' },
  ],
};

/* 기준년월 기본값 — 목업 `#f-ym` value */
const BASE_YM = '2026-07';

/* 다중 선택(체크박스로만 on/off — 행 본문 클릭 선택 없음, apfs-aggrid "체크박스" 절). 모듈 상수(계약 6 — 인라인이면 컬럼 재생성) */
const ROW_SELECTION: RowSelectionOptions = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서·집합 그대로(단일 헤더)
   ⚠ 폭 전략 = **flex + minWidth**(`autoSizeStrategy` 없음) — 컬럼 내용 폭 합이 프레임보다 좁아 내용 맞춤을 쓰면
     오른쪽에 빈 거터가 남는다(workforce_manage 와 같은 상황). flex 컬럼에도 `width: minWidth` 필수(apfs-aggrid ⑨).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

const dashCell = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;
/* O/X 셀 — O=success · X=muted(중립). null 은 값 없음 표식이라 배지가 아니라 muted 텍스트 */
const OX_TONE = { O: 'success', X: 'muted' } as const;
const oxBadge = (v: OX | null | undefined) =>
  (v == null ? dashCell : <StatusBadge tone={OX_TONE[v]} label={v} size="lg" />);
const oxCell = (p: { value: OX | null }) => oxBadge(p.value);
/* 텍스트 셀 — flex 셀은 AG Grid 기본 ellipsis가 안 먹으므로 내부 span에 truncate */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
/* 기준년월 */
const ymFmt = (p: { value?: string | null }) => (p.value ? String(p.value) : '-');

/* 생성여부 셀 — 배지 + 생성일시. 값은 `make|makeTs` 결합 문자열(valueGetter) — 셀 값이 두 필드를 모두 반영해야
   (데이터 연동 후) 일시만 바뀌어도 AG Grid 델타 갱신이 셀을 다시 그린다. */
const MAKE_COL = 'makeState';
const makeCell = (p: { value: string }) => {
  const [make, ts] = String(p.value ?? '').split('|');
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {oxBadge((make || null) as OX | null)}
      {ts && <span className="truncate" style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>{String(ts)}</span>}
    </span>
  );
};

const seqCol = <T,>(): ColDef<T> =>
  ({ field: 'no' as ColDef<T>['field'], headerName: '순번', width: 72, maxWidth: 72, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) });
const ymCol = <T,>(): ColDef<T> =>
  ({ field: 'ym' as ColDef<T>['field'], headerName: '기준년월', flex: 0.7, minWidth: 100, width: 100, cellStyle: centerNum, valueFormatter: ymFmt });
const oxCol = <T,>(field: string, headerName: string): ColDef<T> =>
  ({ field: field as ColDef<T>['field'], headerName, flex: 0.7, minWidth: 104, width: 104, cellStyle: flexMid, cellRenderer: oxCell });

const RESULT_COLS: ColDef<EwResultRow>[] = [
  seqCol<EwResultRow>(),
  ymCol<EwResultRow>(),
  { field: 'info', headerName: '생성정보', flex: 1.4, minWidth: 160, width: 160, cellStyle: flexCenter, cellRenderer: textCell },
  { colId: MAKE_COL, headerName: '생성여부', flex: 1.3, minWidth: 196, width: 196, cellStyle: flexMid,
    valueGetter: (p) => (p.data ? `${p.data.make}|${p.data.makeTs ?? ''}` : ''), cellRenderer: makeCell },
  oxCol<EwResultRow>('mod', '수정여부'),
  oxCol<EwResultRow>('cfm', '확정여부'),
  oxCol<EwResultRow>('cls', '마감여부'),
];

/* 섹션2 — 수정권한처리는 셀 버튼 컬럼이 아니라 체크박스 선택 액션이다(파일 상단 구성) */
const REPORT_COLS: ColDef<GpReportRow>[] = [
  seqCol<GpReportRow>(),
  ymCol<GpReportRow>(),
  { field: 'gp', headerName: '운용사', flex: 1.4, minWidth: 160, width: 160, cellStyle: flexCenter, cellRenderer: textCell },
  oxCol<GpReportRow>('rep', '보고여부'),
  oxCol<GpReportRow>('cons', '정합성여부'),
  oxCol<GpReportRow>('perm', '수정권한여부'),
];

/* ──────────────────────────────
   Excel — 섹션별 시트 2개(단일 헤더).
   생성일시는 화면에선 생성여부 셀 안에 붙어 있지만 엑셀에선 **별도 열**로 푼다(한 셀에 섞으면 정렬·필터 불가).
────────────────────────────── */
type XCol<T> = { header: string; get: (r: T) => string | number | null; wide?: boolean };
const RESULT_X: XCol<EwResultRow>[] = [
  { header: '순번', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '생성정보', get: (r) => r.info, wide: true },
  { header: '생성여부', get: (r) => r.make },
  { header: '생성일시', get: (r) => r.makeTs, wide: true },
  { header: '수정여부', get: (r) => r.mod },
  { header: '확정여부', get: (r) => r.cfm },
  { header: '마감여부', get: (r) => r.cls },
];
const REPORT_X: XCol<GpReportRow>[] = [
  { header: '순번', get: (r) => r.no },
  { header: '기준년월', get: (r) => r.ym },
  { header: '운용사', get: (r) => r.gp, wide: true },
  { header: '보고여부', get: (r) => r.rep },
  { header: '정합성여부', get: (r) => r.cons },
  { header: '수정권한여부', get: (r) => r.perm },
];
function toSheet<T>(cols: XCol<T>[], rows: T[]): XLSX.WorkSheet {
  const body = rows.map((r) => cols.map((c) => {
    const v = c.get(r);
    if (v == null) return '-';
    return v;
  }));
  const ws = XLSX.utils.aoa_to_sheet([cols.map((c) => c.header), ...body]);
  ws['!cols'] = cols.map((c) => ({ wch: c.wide ? 24 : 12 }));
  return ws;
}

/* ──────────────────────────────
   페이지 로컬 프리미티브(섹션 헤더는 공용 risk_grid SectionHead)
────────────────────────────── */
const NO_ROWS = '<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회된 데이터가 없습니다.</span>';

/* 드로어 필드 래퍼(custody_verify_manage 골드 복사) — PeriodPicker 트리거는 <button>이라 <label> 안에서 2회 토글된다 → <div> */
function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </div>
  );
}

/* 그리드 1장의 multiRow 선택 배선 — 선택 SSOT = `selIds`(배열, 건수는 파생). 두 섹션이 같은 배선을 한 벌씩 쓴다.
   rowData 가 바뀌어도(O/X 갱신) getRowId 가 같으면 선택이 유지되고, onRowDataUpdated 의 restoreSelection 이 되맞춘다. */
function useGridSelection<T extends { id: string }>() {
  const apiRef = useRef<GridApi<T> | null>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<T>) => {
    apiRef.current = e.api;
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<T>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<T> }) => {
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  /* 선택 해제 — ref 를 먼저 비워야 뒤따르는 rowData 교체(월 변경) 때 restoreSelection 이 옛 id 를 되살리지 않는다 */
  const clear = useCallback(() => {
    selIdsRef.current = [];
    setSelIds([]);
    apiRef.current?.deselectAll();
  }, []);
  return { selIds, clear, gridProps: { onGridReady, onSelectionChanged, onRowDataUpdated } };
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'make' }
  | { kind: 'close' | 'reopen'; ym: string; ids: string[] }   // 섹션1 선택 행
  | { kind: 'perm'; ids: string[] }                            // 섹션2 선택 행
  | { kind: 'grantAll' | 'revokeAll'; ids: string[] };         // 섹션2 전 행

const DONE_TOAST: Record<NonNullable<ModalState>['kind'], string> = {
  make: '생성되었습니다',
  close: '마감 처리되었습니다',
  reopen: '마감이 해제되었습니다',
  grantAll: '전체권한부여 되었습니다',
  revokeAll: '전체권한해제 되었습니다',
  perm: '권한처리 되었습니다',
};

/** 선택 액션 묶음 — 첫 자식은 언제나 `N건 선택됨`(apfs-aggrid 선택 툴바 규약), 끝은 `선택 해제` */
function SelActions({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  return <>
    <span className="font-semibold" style={{ fontSize: 13 }}>{String(count)}건 선택됨</span>
    {children}
    <Button variant="ghost" size="sm" onClick={onClear}>선택 해제</Button>
  </>;
}

export function EwResultManage({ onNav }: { onNav?: (r: string) => void }) {
  const [ym, setYmRaw] = useState(BASE_YM);
  const [results, setResults] = useState<Record<string, EwResultRow[]>>(RESULT_DEMO);
  const [reports, setReports] = useState<Record<string, GpReportRow[]>>(REPORT_DEMO);
  const [modal, setModal] = useState<ModalState>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const sel1 = useGridSelection<EwResultRow>();
  const sel2 = useGridSelection<GpReportRow>();

  /* 기준년월 변경 = 두 표의 행 집합이 통째로 바뀐다 → 선택을 함께 비운다(안 비우면 'N건 선택됨'만 남는 유령 선택) */
  const setYm = (v: string) => {
    const next = v || BASE_YM;
    if (next === ym) return;
    sel1.clear(); sel2.clear();
    setYmRaw(next);
  };

  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen });

  /* 섹션2 기준년월 = 선택 월의 전월(파일 상단 '한계·가정') */
  const reportYm = prevYm(ym);
  const resultRows = useMemo(() => results[ym] ?? [], [results, ym]);
  const reportRows = useMemo(() => (reportYm ? reports[reportYm] ?? [] : []), [reports, reportYm]);

  /* 섹션1 선택 행의 O/X 갱신 / 섹션2 선택 행의 수정권한여부 갱신 — 월 키 한 칸만 바꾼다 */
  const patchResults = (at: string, ids: string[], key: 'cfm' | 'cls', v: OX) =>
    setResults((prev) => ({ ...prev, [at]: setFlag(prev[at] ?? [], ids, key, v) }));
  const patchPerm = (ids: string[], v: OX | typeof togglePerm) =>
    setReports((prev) => (reportYm ? { ...prev, [reportYm]: setFlag(prev[reportYm] ?? [], ids, 'perm', v) } : prev));

  /* 확정 — 목업과 같이 다이얼로그 없이 바로 반영 */
  const doConfirm = () => {
    patchResults(ym, sel1.selIds, 'cfm', 'O');
    toast.success(`${sel1.selIds.length}건을 확정했습니다`);
  };

  /* 확인 다이얼로그 확정. 닫힘은 AlertDialog deferred close → onClose 가 처리(여기서 setModal(null) 하지 않는다) */
  const commit = () => {
    if (!modal) return;
    switch (modal.kind) {
      case 'close': patchResults(modal.ym, modal.ids, 'cls', 'O'); break;
      case 'reopen': patchResults(modal.ym, modal.ids, 'cls', 'X'); break;
      case 'perm': patchPerm(modal.ids, togglePerm); break;
      case 'grantAll': patchPerm(modal.ids, 'O'); break;
      case 'revokeAll': patchPerm(modal.ids, 'X'); break;
      case 'make': break;   // 생성은 토스트만(파일 상단 '한계·가정')
    }
    toast.success(DONE_TOAST[modal.kind]);
  };

  const refresh = () => {
    sel1.clear(); sel2.clear();
    setYmRaw(BASE_YM);
    setResults(RESULT_DEMO);
    setReports(REPORT_DEMO);
    toast.success('조회되었습니다');
  };

  /* ── Excel(.xlsx) — 워크북 1개 + 섹션 시트 2개 ── */
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, toSheet(RESULT_X, resultRows), '생성결과내역');
    XLSX.utils.book_append_sheet(wb, toSheet(REPORT_X, reportRows), '재무정보보고');
    XLSX.writeFile(wb, '조기경보 결과정보 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  /* 다이얼로그 문구 — 목업 confirmDlg 호출 원문 + 선택 건수 */
  const dialog = (() => {
    if (!modal) return null;
    const n = 'ids' in modal ? modal.ids.length : 0;
    const nB = <b className="text-foreground">{String(n)}건</b>;
    switch (modal.kind) {
      case 'make': return { title: '조기경보 결과정보 관리 - 생성 확인', ok: '확인',
        body: <span className="inline-flex items-center">생성하시겠습니까?</span> };
      case 'close': return { title: '마감 처리', ok: '마감',
        body: <>기준년월 <b className="text-foreground">{modal.ym}</b>의 조기경보 결과정보 {nB}을 마감하시겠습니까?<br />마감 후에는 수정이 제한됩니다.</> };
      case 'reopen': return { title: '마감해제', ok: '마감해제',
        body: <>기준년월 <b className="text-foreground">{modal.ym}</b>의 조기경보 결과정보 {nB}의 마감을 해제하시겠습니까?</> };
      case 'grantAll': return { title: '전체권한부여', ok: '부여', body: '운용사 재무정보 보고 대상 전체에 수정 권한을 일괄 부여하시겠습니까?' };
      case 'revokeAll': return { title: '전체권한해제', ok: '해제', body: '운용사 재무정보 보고 대상 전체의 수정 권한을 일괄 해제하시겠습니까?' };
      case 'perm': return { title: '수정권한처리', ok: '처리', body: <>선택한 운용사 {nB}을 권한처리하시겠습니까?</> };
    }
  })();

  const noReport = reportRows.length === 0;
  const allReportIds = reportRows.map((r) => r.id);

  return (
    <GridFrame
      crumbs={['홈', '조기경보', '조기경보', '조기경보 결과정보 관리']}
      title="조기경보 결과정보 관리"
      cardTitle="조기경보 결과정보 관리"
      favRoute="조기경보 결과정보 관리"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 적용 중인 드로어 값 칩 = appliedFilters. 기준년월은 비는 일이 없어 칩이 상시 보이고 × = 기본값 복귀 */
      appliedFilters={[{ label: '기준년월', value: ym, onClear: () => setYm(BASE_YM) }]}
      /* 툴바 우 = 상세필터 → 생성(월 단위, 선택 무관 — 등록 버튼 자리·형태, workforce_manage 선례) → 새로고침 */
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'make' })}>생성</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      /* 푸터 좌 = 섹션별 건수(페이지네이션이 없어 '총 N개 중 M개' 형식이 성립하지 않는다) */
      footerLeft={<span>{'생성 결과내역 ' + String(resultRows.length) + '건 · 운용사 재무정보 보고 ' + String(reportRows.length) + '건'}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      {/* ── ① 조기경보 생성 결과내역 (선택 월) — 선택 시 확정·마감·마감해제 ── */}
      <SectionHead title="조기경보 생성 결과내역"
        cap={<>기준년월 {String(ym)}</>}
        actions={sel1.selIds.length > 0 && (
          <SelActions count={sel1.selIds.length} onClear={sel1.clear}>
            <SaveButton variant="outline" leadingIcon="" busyLabel="확정 중" onSubmit={() => doConfirm}>확정</SaveButton>
            <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'close', ym, ids: sel1.selIds })}>마감</Button>
            <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'reopen', ym, ids: sel1.selIds })}>마감해제</Button>
          </SelActions>
        )} />
      <div className="apfs-stack-grid">
        <AgGridReact<EwResultRow>
          theme={apfsTheme}
          rowData={resultRows}
          columnDefs={RESULT_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          {...sel1.gridProps}
        />
      </div>

      {/* ── ② 운용사 재무정보 보고 (선택 월의 전월) — 선택 시 수정권한처리, 미선택 시 전체권한부여·해제 ── */}
      <SectionHead title="운용사 재무정보 보고"
        cap={<>기준년월 {reportYm ? String(reportYm) : '-'}</>}
        actions={sel2.selIds.length > 0 ? (
          <SelActions count={sel2.selIds.length} onClear={sel2.clear}>
            <Button variant="outline" size="sm" onClick={() => setModal({ kind: 'perm', ids: sel2.selIds })}>수정권한처리</Button>
          </SelActions>
        ) : <>
          <Button variant="outline" size="sm" disabled={noReport} onClick={() => setModal({ kind: 'grantAll', ids: allReportIds })}>전체권한부여</Button>
          <Button variant="outline" size="sm" disabled={noReport} onClick={() => setModal({ kind: 'revokeAll', ids: allReportIds })}>전체권한해제</Button>
        </>} />
      <div className="apfs-stack-grid">
        <AgGridReact<GpReportRow>
          theme={apfsTheme}
          rowData={reportRows}
          columnDefs={REPORT_COLS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          overlayNoRowsTemplate={NO_ROWS}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          {...sel2.gridProps}
        />
      </div>

      {/* ── 상세필터 드로어 — 목업 검색박스 항목 그대로(기준년월). 즉시 반영형이라 적용 버튼은 닫기만 한다 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조기경보 결과정보 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {/* PeriodPicker 트리거는 w-full 이라 fit-content 래퍼(apfs-datepicker "폭") */}
            <DrawerField label="기준년월">
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' }}>
                <PeriodPicker mode="month" value={ym} onChange={setYm} ariaLabel="기준년월" />
              </div>
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setYm(BASE_YM)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 확인 다이얼로그 — 조건부 마운트. 닫힘 후 onClose 에서 state 해제 ── */}
      {dialog && (
        <EwConfirmDialog title={dialog.title} body={dialog.body} okLabel={dialog.ok}
          onConfirm={commit} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
