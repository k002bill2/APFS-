/* 휴일관리 — 관리형 리스트 페이지(회계 > 설정 > 휴일관리, route acct-holiday, 화면ID ACC-025).
   출처: ACC-025 화면설계서(slide 9 개요 · 10 달력 · 11 목록 · 13 모달 · 15~22 이벤트 E00~E10)
         → APFS 디자인시스템(acc/baseinfo/account_code_manage 골격 + acc/slip/daily_close_manage 의 월 이동 툴바·달력/목록 전환).

   구성(설계서 → 우리 규약)
   - 툴바 좌: ‹ [PeriodPicker month 'YYYY년 M월'] › [오늘](E10) — 일마감 툴바와 같은 모양(선택 바가 뜨면 비운다).
     툴바 우: [휴일 등록](E03, ⌘⏎) → 조회(E05, 맨 끝). 주 필터칩·적용 칩 없음.
   - 상세필터(E02) 제거 — 년·월은 툴바 월 선택으로(사용자 결정 2026-11-06).
   - 본문 머리(HolidayViewBar): 우 보기 [달력|목록](E01, SegTabs — 기본 달력(사용자 지정 2026-11-06), 년·월 유지).
   - 목록: 그리드 6열(☐ · 일자 · 휴일명 · 휴일구분 · 등록자 · 비고), 일자 오름차순, getRowId = 안정 id(수정으로 일자가 바뀌어도 행 유지).
     기본 정렬 표시 없음(데이터 순서로 오름차순 — filterHolidays 가 sortByDate, 사용자 지적 2026-11-06). 헤더 클릭 정렬은 그대로.
       체크박스 선택(E06) → 선택 바 "N건 선택됨 · [수정] · [삭제] · [선택 해제]" · 행 더블클릭/Enter/[수정] = 「휴일 수정」(E08).
       [수정]은 1건 선택일 때만 활성(2건 이상이면 비활성 — 숨기지 않음).
   - 달력: 7열 월 달력(holiday_calendar) — 휴일 셀 빨강 + 휴일명 + 짧은 구분, 사용자 등록 = [사용자] 태그.
   - 모달: 「휴일 등록」/「휴일 수정」(holiday_form_modal) · 삭제 확인(AlertDialog, E07).
   - 푸터: 건수 · 페이저(목록) · 전체보기(목록) · 새 창 · 내보내기(⌥D) · 인쇄(⌘P)(E09).
   - KPI 배지 행 미포함(사용자 확정) · 카드헤더 sub 캡션 없음 · 명세 팝업 없음.

   결정·가정
   - 년·월은 항상 특정 월이다(월 '전체' 없음) — 목록·달력 모두 그 달. 월 선택에서 같은 달을 다시 눌러 해제하면 무시한다(일마감 pickMonth 선례).
   - 월 이동 ‹ › 는 연도 경계를 넘는다(1월 ‹ = 전년 12월 · 12월 › = 다음해 1월). 년도 범위(당해년도 ±5년) 양 끝 달에서만 비활성.
     [오늘] = 당해년도·당월.
   - E04 저장 성공 시 저장한 일자의 년·월로 이동하고(목록·달력 공통), 목록이면 그 행을 선택한다(restoreSelection).
   - 선택 해제는 년·월을 바꾸는 사용자 조작(월 선택·월 이동·오늘·보기 전환) 핸들러에서 한다 — effect 로 하면 저장 직후 복원한 선택까지 지운다.
   - 오늘(today)은 마운트 시점에 고정한다(daily_close 선례) — 자정을 넘겨 열어 두면 [오늘]·오늘 표시가 전날로 남는다.
   - 데모 seed(holiday_data) — 날짜 정확성은 이관 데이터로 대체. 등록자 '시스템' = AS-IS 이관, 그 외 = 사용자 등록.
   - 엑셀 = 보고 있는 달의 행(목록·달력 공통). 파일명 `휴일관리_YYYY-MM.xlsx`.
   - 모달 일자는 년도 범위(당해년도 ±5년) 안만 저장된다 — DatePicker 에 범위 prop 이 없어(공용 2000~2035) 저장 검증으로 막는다.
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다.

   설계서와 다른 점(PM 확인 대기)
   ① 상세필터(E02) 제거 — 년·월은 툴바 월 선택으로(사용자 결정 2026-11-06).
   ② 보기 전환·월 이동 위치 — 월 이동 = 툴바(일마감 동일), 보기 전환 = 본문 머리.
   ③ [등록] → [휴일 등록] 라벨(도메인 액션명 규약).
   ④ 엑셀 내보내기 추가(푸터 아이콘 + ⌥D — 다른 회계 목록과 동일).
   ⑤ 달력 휴일 셀 클릭 = 「휴일 수정」 모달(E08 재사용 — 사용자 지정 2026-11-06, 설계서 제안의 '목록 전환 후 행 선택' 대신) · 빈 셀 클릭 등록은 미결로 미구현.
   ⑥ 권한별 노출 없음(RBAC 미구현 — 등록·삭제·내보내기 항상 노출).
   ⑦ 검증 실패 = 툴팁 대신 필드 빨간 테두리 + 인라인 문구 + 토스트 · 월 이동이 연도 경계를 넘음 · 엑셀 파일명 `휴일관리_YYYY-MM` ·
      일자 범위 검증(당해년도 ±5년 밖이면 '일자는 YYYY~YYYY년 사이로 입력하세요' — 설계서에 없는 규칙).
   ⑧ E00·E01 기본 보기 목록 → 달력(사용자 지정 2026-11-06).
   ⑨ 선택 바 [수정] 추가(사용자 지정 2026-11-06). */
import '../../aggrid_shared.css';
import React, { useState, useRef, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { controlMinWidth } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { demoHolidays, todayStr, DEMO_USER } from './holiday_data';
import type { HolidayRow } from './holiday_data';
import { MSG, yearRangeOf, canShiftMonth, defaultFilter, filterHolidays, filterOfDate, fromYm, shiftMonth, sortByDate, toYm } from './holiday_model';
import type { HolidayFilter, ViewMode } from './holiday_model';
import { HolidayFormModal } from './holiday_form_modal';
import type { HolidayPatch } from './holiday_form_modal';
import { HolidayCalendar, HolidayViewBar } from './holiday_calendar';

const { Button, IconBtn, SegTabs, TagBadge } = UI;

/* 페이지 번호 버튼 — apfs-grid 푸터 골드(‹ 이전 · 번호 · 다음 ›). 공유 export 가 아니라 골드에서 복사하는 로컬 헬퍼 */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

const PAGE_SIZE = 20;
const VIEWS = [{ value: 'calendar', label: '달력' }, { value: 'list', label: '목록' }];

/* ──────────────────────────────
   컬럼 정의 — 설계서 slide11 순서. 전부 텍스트라 좌측. 비고 = 잔여폭 흡수
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };
/* display:flex 셀은 AG Grid 기본 말줄임이 안 걸린다 → 긴 텍스트는 truncate span */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const typeCell = (p: { value: string }) => (p.value ? <TagBadge tone="muted" size="lg">{p.value}</TagBadge> : null);

const columnDefs: ColDef<HolidayRow>[] = [
  { field: 'date', headerName: '일자', width: 120, maxWidth: 130, cellStyle: codeStyle },
  { field: 'name', headerName: '휴일명', width: 220, minWidth: 180, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'type', headerName: '휴일구분', width: 120, maxWidth: 130, cellStyle: flexCenter, cellRenderer: typeCell },
  { field: 'createdBy', headerName: '등록자', width: 110, maxWidth: 130, cellStyle: muted },
  { field: 'memo', headerName: '비고', flex: 1, minWidth: 180, cellStyle: flexCenter, cellRenderer: textCell },
];
/* 다중 선택(전 리스트 공통) — 체크박스로만 on/off(행 본문 클릭 선택 없음) */
const ROW_SELECTION: RowSelectionOptions<HolidayRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

type XCol = { header: string; get: (r: HolidayRow) => string; wch: number };
const EXPORT_COLS: XCol[] = [
  { header: '일자', get: (r) => r.date, wch: 12 }, { header: '휴일명', get: (r) => r.name, wch: 26 }, { header: '휴일구분', get: (r) => r.type, wch: 12 },
  { header: '등록자', get: (r) => r.createdBy, wch: 10 }, { header: '비고', get: (r) => r.memo, wch: 36 },
];

/* 툴바 월 이동 — daily_close_manage 와 같은 규격 */
const monthWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('month'), maxWidth: '100%' };
const NAV_BTN: React.CSSProperties = { paddingLeft: 8, paddingRight: 8 };
const fromButton = (ev: Event | null | undefined) => !!(ev?.target as Element | null)?.closest?.('button');

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; mode: 'create' | 'edit'; id?: string }
  | { kind: 'delete'; ids: string[] };

export function HolidayManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const yearRange = useMemo(() => yearRangeOf(today), [today]);
  const apiRef = useRef<GridApi<HolidayRow> | null>(null);
  const [rows, setRows] = useState<HolidayRow[]>(() => demoHolidays());
  /* E00 진입 — 당해년도 · 당월 · 보기 = 달력(사용자 지정) */
  const [filter, setFilter] = useState<HolidayFilter>(() => defaultFilter(today));
  const [view, setView] = useState<ViewMode>('calendar');
  /* 선택 SSOT — 체크된 행 id 배열 */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  const clearSel = useCallback(() => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); }, []);
  /* 년·월을 바꾸는 사용자 조작 = 선택 전부 해제(2026-10-27 사용자 결정 — apfs-detail-filter) */
  const changeFilter = (next: HolidayFilter) => { setFilter(next); clearSel(); };

  const openCreate = () => setModal({ kind: 'form', mode: 'create' });
  useHotkey(HOTKEYS.register.combo, openCreate, { enabled: modal === null, skipInDialog: true });
  /* 인쇄·내보내기는 모달이 열려 있지 않을 때만(상세필터 드로어 없음 — 2026-11-06) */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null, skipInDialog: true });

  /* 목록·달력 공통 — 보고 있는 달의 휴일 */
  const visible = useMemo(() => filterHolidays(rows, filter), [rows, filter]);

  /* ── 그리드 이벤트 ── */
  const onGridReady = useCallback((e: GridReadyEvent<HolidayRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<HolidayRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<HolidayRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E08 「휴일 수정」 — 목록 행 더블클릭 / Enter · 달력 휴일 셀 클릭(사용자 지정 2026-11-06) 공통 경로 */
  const openEdit = useCallback((id: string) => setModal({ kind: 'form', mode: 'edit', id }), []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<HolidayRow>) => {
    if (!e.data || e.rowPinned || fromButton(e.event as Event | null)) return;
    openEdit(e.data.id);
  }, [openEdit]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<HolidayRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || fromButton(ev)) return;
    openEdit(e.data.id);
  }, [openEdit]);

  const target = modal?.kind === 'form' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* E04 저장 — 등록: 새 id · 등록자 = 데모 사용자 / 수정: 등록자 유지. 저장한 일자의 년·월로 이동하고 목록이면 그 행을 선택한다.
     selIdsRef 를 먼저 바꿔야 rowData 갱신 뒤 onRowDataUpdated → restoreSelection 이 새 행을 고른다 */
  const save = (patch: HolidayPatch) => {
    if (!modal || modal.kind !== 'form') return;
    let id: string;
    if (modal.mode === 'create') {
      id = `h-u${String(Date.now())}`;
      setRows((prev) => sortByDate([...prev, { id, ...patch, createdBy: DEMO_USER }]));
    } else {
      if (!target) return;   // 수정 대상이 사라졌으면 아무것도 하지 않는다
      id = target.id;
      setRows((prev) => sortByDate(prev.map((r) => (r.id === id ? { ...r, ...patch } : r))));
    }
    const sel = view === 'list' ? [id] : [];
    selIdsRef.current = sel;
    setSelIds(sel);
    setFilter(filterOfDate(patch.date));
  };

  /* E07 삭제 — setModal 은 부르지 않는다: 닫기는 AlertDialog onOpenChange 가 맡는다(exit 애니메이션 보존) */
  const doDelete = (ids: string[]) => {
    const del = new Set(ids);
    setRows((prev) => prev.filter((r) => !del.has(r.id)));
    clearSel();
    toast.success(MSG.deleted);
  };

  /* E05 조회 — 현재 조건으로 재조회. 백엔드가 없어 로컬 상태를 유지하고 선택만 푼다 */
  const refresh = () => { clearSel(); toast.success(MSG.refreshed); };

  /* E10 월 이동(연도 경계 넘음) · 월 선택 · 오늘 */
  const shift = (dir: -1 | 1) => changeFilter(shiftMonth(filter, dir, yearRange));
  const pickMonth = (ym: string) => { if (ym) changeFilter(fromYm(ym)); };   // 같은 달 재클릭 = 해제 → 무시(항상 특정 월)
  const goToday = () => changeFilter(defaultFilter(today));
  /* E01 보기 전환 — 조건 유지, 선택만 해제 */
  const changeView = (v: ViewMode) => { setView(v); clearSel(); };

  /* E09 Excel — 보고 있는 달의 행(목록·달력 공통) */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '휴일관리');
    XLSX.writeFile(wb, `휴일관리_${toYm(filter)}.xlsx`);
    toast.success('Excel로 내보냈습니다');
  };

  const isList = view === 'list';
  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  const selActions = isList && selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {/* 수정 = 단일 대상 액션 — 정확히 1건일 때만 노출(apfs-aggrid single 게이트). E06·E07 삭제 = 다건 벌크 */}
      {selCount === 1 && <Button variant="primary" size="sm" onClick={() => openEdit(selIds[0])}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onClick={() => setModal({ kind: 'delete', ids: selIds })}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  /* 툴바 좌 — 월 이동(일마감 툴바와 같은 모양). 선택 바가 뜨면 비운다 */
  const toolbarLeft = selActions ? null : (
    <span className="inline-flex items-center gap-1">
      <Button variant="ghost" size="sm" leadingIcon="chevron-left" style={NAV_BTN} disabled={!canShiftMonth(filter, -1, yearRange)} onClick={() => shift(-1)}><span className="sr-only">이전 달</span></Button>
      <div style={monthWrap}><PeriodPicker mode="month" value={toYm(filter)} onChange={pickMonth} ariaLabel="년월" yearRange={yearRange} /></div>
      <Button variant="ghost" size="sm" leadingIcon="chevron-right" style={NAV_BTN} disabled={!canShiftMonth(filter, 1, yearRange)} onClick={() => shift(1)}><span className="sr-only">다음 달</span></Button>
      <Button variant="outline" size="sm" onClick={goToday}>오늘</Button>
    </span>
  );

  return (
    <GridFrame
      crumbs={['홈', '회계', '설정', '휴일관리']}
      title="휴일관리"
      favRoute="acct-holiday"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      toolbarLeft={toolbarLeft}
      toolbarRight={<>
        {/* E03 휴일 등록 */}
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={openCreate}>휴일 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{isList
        ? footerCount(visible.length, Math.min(shown, visible.length))
        : `${filter.year}년 ${filter.month}월 휴일 ${String(visible.length)}건`}</span>}
      footerCenter={isList && page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      /* FooterActions 는 한 번만 렌더(⌥A·⌥O 바인딩 소유 — 2개면 이중 발화). 전체보기는 목록에서만 */
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={isList ? () => setShowAll((v) => !v) : undefined} />}>

      <HolidayViewBar>
        <SegTabs size="sm" options={VIEWS} value={view} onChange={(v: ViewMode) => changeView(v)} />
      </HolidayViewBar>

      {view === 'calendar' && <HolidayCalendar year={Number(filter.year)} month={Number(filter.month)} holidays={visible} today={today} onOpen={(h) => openEdit(h.id)} />}
      {isList && (
        <div>
          <AgGridReact<HolidayRow>
            theme={apfsTheme}
            rowData={visible}
            columnDefs={columnDefs}
            getRowId={(p) => p.data.id}
            domLayout="autoHeight"
            defaultColDef={DEFAULT_COL_DEF}
            rowSelection={ROW_SELECTION}
            selectionColumnDef={SELECTION_COL}
            pagination paginationPageSize={pageSize} suppressPaginationPanel
            onGridReady={onGridReady}
            onGridPreDestroyed={() => { apiRef.current = null; }}
            onSelectionChanged={onSelectionChanged}
            onRowDataUpdated={onRowDataUpdated}
            onPaginationChanged={onPaginationChanged}
            onRowDoubleClicked={onRowDoubleClicked}
            onCellKeyDown={onCellKeyDown}
            overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
          />
        </div>
      )}

      {/* ── E03·E08 등록/수정 모달 ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <HolidayFormModal mode={modal.mode} initial={modal.mode === 'edit' ? target! : undefined} rows={rows}
          createdBy={modal.mode === 'edit' ? target!.createdBy : DEMO_USER} yearRange={yearRange}
          onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── E07 삭제 확인 — AlertDialogAction 은 Radix 닫기 버튼이라 onClick 직후 onOpenChange(false) 가 따라온다 → 거기서만 비운다 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doDelete(modal.ids)} style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
