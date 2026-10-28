/* 계정과목 관리 — 관리형 리스트 페이지 (회계 > 기초관리 > 계정과목 관리, route acct-account-code, 화면ID ACC-001).
   출처: ACC-001 화면설계서(slide9~25) → APFS 디자인시스템(user_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터](E02) → [계정과목 등록](E03, ⌘⏎) → 조회(E04) → [삭제이력](E11). 주 필터칩 없음.
   - 설계서 '전체펼치기'(E01) = 푸터 FooterActions 전체보기(showAll, ⌥A) — 사용자 확정. 툴바 토글을 따로 두지 않는다.
   - 그리드 9열(계정코드·계정과목명·계정분류·차대구분·차감구분·입력여부·사용여부·최초등록자·최종수정자) + 선택 체크박스.
       계정코드 오름차순, getRowId=계정코드. 선택은 체크박스로만 → 선택 바 [삭제]·[선택 해제](E05·E06). 행 더블클릭 = 수정 모달(E07).
   - 상세필터 드로어 6개(계정과목명·계정분류·차대구분·차감구분·입력여부·사용여부) + 적용 칩(값만, × 개별 해제).
   - 삭제 = 논리삭제: 목록에서 빼서 삭제이력(deletedRows)으로 옮기고 최종수정자 = 삭제 처리자(데모 사용자).
   - 엑셀(E09) = 푸터 내보내기 아이콘 + ⌥D.
   - KPI 배지 행 미포함(사용자 확정) · 카드헤더 sub 캡션 없음 · 카드뷰 없음 · 명세 팝업 없음.
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { demoAccounts, demoDeletedAccounts, DEMO_USER, ACCOUNT_CLASSES, DC_TYPES, CONTRA_TYPES, YN } from './account_code_data';
import type { AccountRow } from './account_code_data';
import { filterAccounts, logicalDelete, sortByCode, blockedDeletes, DELETE_BLOCKED_MSG } from './account_code_model';
import { AccountCodeFormModal } from './account_code_form_modal';
import type { AccountPatch } from './account_code_form_modal';
import { AccountDeleteHistoryModal } from './account_delete_history_modal';

const { Button, IconBtn } = UI;

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 설계서 slide10 ② 순서. 정렬 규약상 코드·여부·이름은 모두 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

const columnDefs: ColDef<AccountRow>[] = [
  { field: 'code', headerName: '계정코드', width: 110, maxWidth: 120, cellStyle: codeStyle, sort: 'asc' },
  { field: 'name', headerName: '계정과목명', flex: 1, width: 200, minWidth: 170, cellStyle: { ...flexCenter, fontWeight: 600 } },
  { field: 'cls', headerName: '계정분류', width: 96, maxWidth: 100, cellStyle: flexCenter },
  { field: 'dc', headerName: '차대구분', width: 96, maxWidth: 100, cellStyle: flexCenter },
  { field: 'contra', headerName: '차감구분', width: 96, maxWidth: 100, cellStyle: flexCenter },
  { field: 'input', headerName: '입력여부', width: 96, maxWidth: 100, cellStyle: flexCenter },
  { field: 'use', headerName: '사용여부', width: 96, maxWidth: 100, cellStyle: flexCenter },
  { field: 'createdBy', headerName: '최초등록자', width: 110, maxWidth: 130, cellStyle: muted },
  { field: 'updatedBy', headerName: '최종수정자', width: 110, maxWidth: 130, cellStyle: muted },
];
/* 다중 선택(전 리스트 공통) — 체크박스로만 on/off(행 본문 클릭 선택 없음) */
const ROW_SELECTION: RowSelectionOptions<AccountRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

type XCol = { header: string; get: (r: AccountRow) => string };
const EXPORT_COLS: XCol[] = [
  { header: '계정코드', get: (r) => r.code }, { header: '계정과목명', get: (r) => r.name }, { header: '계정분류', get: (r) => r.cls },
  { header: '차대구분', get: (r) => r.dc }, { header: '차감구분', get: (r) => r.contra }, { header: '입력여부', get: (r) => r.input },
  { header: '사용여부', get: (r) => r.use }, { header: '최초등록자', get: (r) => r.createdBy }, { header: '최종수정자', get: (r) => r.updatedBy },
];

function DrawerField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; mode: 'create' | 'edit'; code?: string }
  | { kind: 'delete'; codes: string[] }
  | { kind: 'history' };

export function AccountCodeManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<AccountRow> | null>(null);
  const [rows, setRows] = useState<AccountRow[]>(() => demoAccounts());
  const [deletedRows, setDeletedRows] = useState<AccountRow[]>(() => demoDeletedAccounts());
  /* 선택 SSOT — 체크된 계정코드 배열 */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터(설계서 slide11 — 6개, 기본 '전체') */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fCls, setFCls] = useState('');
  const [fDc, setFDc] = useState('');
  const [fContra, setFContra] = useState('');
  const [fInput, setFInput] = useState('');
  const [fUse, setFUse] = useState('');
  const clearFilters = () => { setFName(''); setFCls(''); setFDc(''); setFContra(''); setFInput(''); setFUse(''); };

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null && !filterOpen });
  /* 인쇄·내보내기는 모달·드로어가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen });

  const visible = useMemo(() => filterAccounts(rows, { name: fName, cls: fCls, dc: fDc, contra: fContra, input: fInput, use: fUse }), [rows, fName, fCls, fDc, fContra, fInput, fUse]);

  /* 필터를 바꾸면 선택을 전부 해제한다(2026-10-27 사용자 결정 — apfs-detail-filter) */
  useEffect(() => { apiRef.current?.deselectAll(); }, [fName, fCls, fDc, fContra, fInput, fUse]);

  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<AccountRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<AccountRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.code));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<AccountRow> }) => {
    restoreSelection(e.api, selIdsRef.current);
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<AccountRow>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', mode: 'edit', code: e.data.code }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<AccountRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    setModal({ kind: 'form', mode: 'edit', code: e.data.code });
  }, []);

  const target = modal?.kind === 'form' && modal.code ? rows.find((r) => r.code === modal.code) ?? null : null;
  const takenCodes = useMemo(() => new Set([...rows, ...deletedRows].map((r) => r.code)), [rows, deletedRows]);

  /* ── 등록/수정 저장 — 등록: 최초등록자=최종수정자=데모 사용자 / 수정: 최종수정자 갱신 ── */
  const save = (patch: AccountPatch) => {
    if (!modal || modal.kind !== 'form') return;
    if (modal.mode === 'create') {
      setRows((prev) => sortByCode([...prev, { ...patch, createdBy: DEMO_USER, updatedBy: DEMO_USER }]));
    } else {
      if (!target) return;   // 수정 대상이 사라졌으면 아무것도 하지 않는다
      setRows((prev) => prev.map((r) => (r.code === target.code ? { ...r, ...patch, code: target.code, updatedBy: DEMO_USER } : r)));
    }
    setModal(null);
  };

  /* ── 삭제(E06) — 논리삭제. setModal 은 부르지 않는다: 닫기는 AlertDialog onOpenChange 가 맡는다(exit 애니메이션 보존) ── */
  const doDelete = (codes: string[]) => {
    const next = logicalDelete(rows, deletedRows, codes, DEMO_USER);
    setRows(next.rows);
    setDeletedRows(next.deleted);
    apiRef.current?.deselectAll();
    toast.success('삭제되었습니다');
  };

  /* 삭제 요청 — 선택에 포함되지 않은 활성 하위 계정이 있으면 확인 모달을 열지 않는다(고아 행 방지). 자손까지 모두 선택했으면 허용 */
  const requestDelete = () => {
    if (blockedDeletes(rows, selIds).length > 0) { toast.error(DELETE_BLOCKED_MSG); return; }
    setModal({ kind: 'delete', codes: selIds });
  };

  /* 조회(E04) — "현재 조건으로 재조회". 백엔드가 없어 로컬 상태(삭제·등록 결과·필터)를 유지하고 선택만 푼다 */
  const refresh = () => { apiRef.current?.deselectAll(); toast.success('조회되었습니다'); };

  /* ── Excel — 표시 중인 행 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '계정과목명' ? 28 : 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '계정과목 관리');
    XLSX.writeFile(wb, '계정과목 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['계정과목명', fName.trim(), () => setFName('')],
    ['계정분류', fCls, () => setFCls('')],
    ['차대구분', fDc, () => setFDc('')],
    ['차감구분', fContra, () => setFContra('')],
    ['입력여부', fInput, () => setFInput('')],
    ['사용여부', fUse, () => setFUse('')],
  ];

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={requestDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '기초관리', '계정과목 관리']}
      title="계정과목 관리"
      favRoute="acct-account-code"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form', mode: 'create' })}>계정과목 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
        <Button variant="outline" size="sm" leadingIcon="clock" onClick={() => setModal({ kind: 'history' })}>삭제이력</Button>
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '건 중 ' + String(visible.length) + '건 · ' + String(Math.min(shown, visible.length)) + '건 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<AccountRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.code}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 설계서 6개 조건(검색어 opt-in 미사용: 계정과목명이 텍스트 조건) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">계정과목 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정과목명">
              <input type="text" value={fName} onChange={(e) => setFName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="계정과목명" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="계정분류"><DrawerSelect value={fCls} onChange={setFCls} options={[...ACCOUNT_CLASSES]} ariaLabel="계정분류" /></DrawerField>
            <DrawerField label="차대구분"><DrawerSelect value={fDc} onChange={setFDc} options={[...DC_TYPES]} ariaLabel="차대구분" /></DrawerField>
            <DrawerField label="차감구분"><DrawerSelect value={fContra} onChange={setFContra} options={[...CONTRA_TYPES]} ariaLabel="차감구분" /></DrawerField>
            <DrawerField label="입력여부"><DrawerSelect value={fInput} onChange={setFInput} options={[...YN]} ariaLabel="입력여부" /></DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={fUse} onChange={setFUse} options={[...YN]} ariaLabel="사용여부" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 모달(E03·E07) ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <AccountCodeFormModal mode={modal.mode} initial={modal.mode === 'edit' ? target! : undefined} rows={rows} takenCodes={takenCodes}
          onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── 삭제이력보기(E11) ── */}
      {modal?.kind === 'history' && <AccountDeleteHistoryModal rows={deletedRows} onClose={() => setModal(null)} />}

      {/* ── 삭제 확인(E06) — 게이트는 modal.kind(현재 rows 파생값이면 doDelete 직후 동기 언마운트돼 exit 가 사라진다).
             AlertDialogAction 은 Radix 닫기 버튼이라 onClick 직후 onOpenChange(false) 가 따라온다 → 거기서만 비운다. ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doDelete(modal.codes)} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
