/* 회기생성/전기이월(ACC-016) — 회계 > 결산관리 > 회기생성/전기이월, route `acct-fiscal-rollover`.
   설계서 정본: 슬라이드 9~11(개요·화면·그리드 컬럼·상세필터) · 13~20(이벤트 E00·E01·E02·E03-1·E03-2·E04·E05·E08~E11).
   업무 규칙은 fiscal_rollover_model.ts(+ fiscal_rollover.test.ts), 더미는 fiscal_rollover_data.ts, 회기 생성 모달은 fiscal_create_modal.tsx.

   설계서 → 우리 규약
   - 제목·브레드크럼 = 메뉴 리프 라벨 "회기생성/전기이월"(설계서 "회기생성전기이월" 아님) · KPI 배지 행 미포함(kpis 미전달).
   - 툴바 우: [상세필터] · [+ 회기 생성] · [저장] · 조회 IconBtn(설계서 순서 상세필터·조회·회기 생성·저장 → 툴바 규약 순서).
   - 설계서 '그리드 저장' → '저장'(사용자 결정 2026-11-04, 결산양식 관리와 통일). 실행 버튼이라 SaveButton(아이콘 check — 설계서 '＋' 아이콘은 쓰지 않는다).
   - 그리드 = 체크박스 + 설계서 8컬럼 그대로. 상태 열은 두지 않는다 — 편집(U) 행은 편집한 칸이 옅은 경고 배경(--warning-soft)으로 보인다.
     마감기간종료일·이월기간종료일은 미마감('부') 행만 셀 안 날짜 선택(PeriodPicker day), 마감('여') 행은 읽기 전용 텍스트.
     이월기간시작일은 읽기 전용(마감기간종료일 + 1일 자동). 행 순서 = 계정구분·기수 순(정렬 끔 — 편집 그리드 관용구).
   - 행 선택(체크박스만, multiRow) → 선택 바(GridFrame contextActions): [연마감] · [연마감(미결재포함)] · [선택 해제].
   - 행 더블클릭(E08) = 상세 팝업 없음(설계서) → 배선하지 않는다.
   - 상세필터 = Sheet 드로어, 즉시 반영(사용자 지시 2026-11-04 — 값을 바꾸면 목록·칩이 바로 바뀌고 [필터 적용] = 닫기). 조건 2개(기준년도 PeriodPicker year · 계정구분 셀렉트). 적용 칩 값만 + ×.
   - 푸터 = FooterActions(새 창 · 내보내기(엑셀, ⌥D) · 인쇄(⌘P = printGrid, 그리드만)). 설계서 하단도구는 2개(인쇄 없음)지만
     푸터 4종 항시 노출(2026-09-17 사용자 결정)이 우선 — 페이저가 없어 전체보기만 빠진다(2026-11-09 점검: 직접 둔 IconBtn 2개라
     ⌘P 가 브라우저 기본 인쇄로 GNB 까지 찍었다).
   - "인쇄·다운로드 권한 보유자만 노출" → RBAC 데모가 없어 항상 노출.

   결정·가정(PR "설계서와 다른 점" 에도 기재)
   - 상세필터 2개: 개요·E01 은 3개(결성상태 포함)라 적었지만 정의 슬라이드(11)는 2개라 2개로 구현.
   - 기준년도 = 마감기간이 그 연도에 걸친 행. 기본값 당해년도(slide 11) — E00 '필터 없음 전체 조회'와 충돌, 기본값 쪽을 따랐다.
     × = 전 연도, [초기화] = 당해년도.
   - 편집(U) 행·이 화면에서 방금 생긴 행(회기 생성·연마감 자동 생성)은 조건과 무관하게 보인다 — 연마감으로 생긴 다음 해 회기가
     기준년도에 걸려 사라지지 않게. [조회]하면 다시 조건대로 거른다.
   - 연마감 = 게이트 필터형: 이미 마감 · 저장 안 한 편집 행 · 미결재 전표가 있는 행([연마감]만)은 건너뛰고 나머지만 처리,
     건너뛴 건수는 확인창·토스트에 사유별로. 처리 가능 0건이면 확인창 없이 토스트로 사유 안내.
   - 미결재 판정 = 더미 행의 unapprovedCount(그 회기 미결재 전표 수, 그리드 미표시).
   - [조회](E04) = 현재 조건 유지 + 저장본 재로딩(저장하지 않은 편집은 버린다 — closing_form 관용구).
   한계: 백엔드가 없어 회기 생성·연마감·저장은 화면 안 저장본만 바꾼다 — 새로고침하면 더미로 돌아간다. */
import '../../aggrid_shared.css';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type {
  CellClassParams, CellStyle, ColDef, GetRowIdParams, GridApi, ICellRendererParams, IRowNode,
  RowSelectionOptions, SelectionChangedEvent, SuppressKeyboardEventParams,
} from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { UI } from '../../components';
import type { Tone } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, dropHiddenSelection, restoreSelection } from '../../aggrid_selection';
import { controlMinWidth } from '../../schemas/renderers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { DrawerSelect } from '../../drawer_select';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { todayStr } from '../slip/general_journal_data';
import { FUND_ACCOUNTS, demoFiscalRows } from './fiscal_rollover_data';
import {
  accountsWithoutFiscal, changedCount, closeBlockedMessage, closeConfirmText, closeGate, commitEdits, createFirstFiscal,
  editRow, passesFilter, reloadRows, skippedText, termLabel, validateEdits, yearEndClose,
} from './fiscal_rollover_model';
import type { ClosedYn, EditField, FiscalRow } from './fiscal_rollover_model';
import { FiscalCreateModal } from './fiscal_create_modal';

const { Button, IconBtn, SaveButton, StatusBadge } = UI;
const LABEL = '회기생성/전기이월';

type Edit = (id: string, field: EditField, value: string) => void;

/* ── 그리드 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다 — apfs-aggrid) ── */
const EDIT_COL_DEF = { ...DEFAULT_COL_DEF, sortable: false } as const;
const ROW_SELECTION: RowSelectionOptions<FiscalRow> = {
  mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false,
};
const getRowId = (p: GetRowIdParams<FiscalRow>) => p.data.id;
const MID: CellStyle = { display: 'flex', alignItems: 'center' };
const TAB: CellStyle = { display: 'flex', alignItems: 'center', fontVariantNumeric: 'tabular-nums' };
const CLOSED_TONE: Record<ClosedYn, Tone> = { 여: 'muted', 부: 'info' };
/* 편집 셀 — 편집한 칸은 옅은 경고 배경, 저장 검증 위반은 빨간 안쪽 테두리 */
const cellRules = (f: EditField) => ({
  'bg-[var(--warning-soft)]': (p: CellClassParams<FiscalRow>) => !!p.data?.edited?.includes(f),
  'shadow-[inset_0_0_0_2px_var(--danger)]': (p: CellClassParams<FiscalRow>) => !!p.data?.err?.includes(f),
});
/* 셀 안 날짜 트리거(button)의 키는 그리드에 넘기지 않는다 — Enter·Space 가 행 선택·셀 이동으로 새지 않게(closing_form 관용구) */
const suppressCtrlKeys = (p: SuppressKeyboardEventParams) => p.event.key === 'Tab' || !!(p.event.target as HTMLElement | null)?.closest?.('input,button,select');
/* PeriodPicker 트리거는 w-full — fit-content 래퍼 필수(apfs-datepicker "폭") */
const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };
const rowNo = (p: ICellRendererParams<FiscalRow>) => `${String((p.node.rowIndex ?? 0) + 1)}행`;

const dateCell = (field: EditField, label: string, edit: Edit) => (p: ICellRendererParams<FiscalRow>) => {
  const r = p.data;
  if (!r) return null;
  if (r.closed === '여') return <span>{r[field]}</span>;
  return (
    <div style={dayWrap}>
      <PeriodPicker mode="day" value={r[field]} onChange={(v) => edit(r.id, field, v || '')} ariaLabel={`${rowNo(p)} ${label}`} invalid={!!r.err?.includes(field)} />
    </div>
  );
};

const makeCols = (edit: Edit): ColDef<FiscalRow>[] => [
  { field: 'account', headerName: '계정구분명', flex: 1, minWidth: 200, cellStyle: MID, cellRenderer: (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span> },
  { field: 'term', headerName: '마감회기', width: 96, minWidth: 96, cellStyle: TAB, valueFormatter: (p) => termLabel(p.value as number) },
  { field: 'closeStart', headerName: '마감기간시작일', width: 132, minWidth: 132, cellStyle: TAB },
  { field: 'closeEnd', headerName: '마감기간종료일', width: 172, minWidth: 172, cellStyle: TAB, cellClassRules: cellRules('closeEnd'), suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: dateCell('closeEnd', '마감기간종료일', edit) },
  { field: 'closed', headerName: '마감여부', width: 96, minWidth: 96, cellStyle: MID, cellRenderer: (p: { value: ClosedYn }) => <StatusBadge tone={CLOSED_TONE[p.value]} label={p.value} size="lg" /> },
  { field: 'carryTerm', headerName: '이월회기', width: 96, minWidth: 96, cellStyle: TAB, valueFormatter: (p) => termLabel(p.value as number) },
  { field: 'carryStart', headerName: '이월기간시작일', width: 132, minWidth: 132, cellStyle: TAB, valueFormatter: (p) => (p.value as string) || '-' },
  { field: 'carryEnd', headerName: '이월기간종료일', width: 172, minWidth: 172, cellStyle: TAB, cellClassRules: cellRules('carryEnd'), suppressKeyboardEvent: suppressCtrlKeys, cellRenderer: dateCell('carryEnd', '이월기간종료일', edit) },
];

/* 엑셀 — 설계서 컬럼 순서 그대로(체크박스 제외), 원시자료(SFR-021) */
const EXCEL_COLS: [string, (r: FiscalRow) => string][] = [
  ['계정구분명', (r) => r.account], ['마감회기', (r) => termLabel(r.term)], ['마감기간시작일', (r) => r.closeStart], ['마감기간종료일', (r) => r.closeEnd],
  ['마감여부', (r) => r.closed], ['이월회기', (r) => termLabel(r.carryTerm)], ['이월기간시작일', (r) => r.carryStart], ['이월기간종료일', (r) => r.carryEnd],
];

/* plain=<div> 래퍼 — PeriodPicker(버튼 트리거)는 <label> 안에서 2회 토글된다(apfs-datepicker) */
function DrawerField({ label, plain, children }: { label: string; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}

type CloseModal = null | { ids: string[]; ok: string[]; includeUnapproved: boolean; skipped: string };

export function FiscalRolloverManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const thisYear = today.slice(0, 4);
  const apiRef = useRef<GridApi<FiscalRow> | null>(null);
  const gridBoxRef = useRef<HTMLDivElement>(null);
  const selIdsRef = useRef<string[]>([]);

  /* 저장본(서버 흉내) — 회기 생성·연마감은 즉시 반영, 셀 편집은 [저장] 때 반영. 조회(E04)는 여기서 다시 읽는다 */
  const [saved, setSaved] = useState<FiscalRow[]>(() => demoFiscalRows(today));
  const [rows, setRows] = useState<FiscalRow[]>(() => reloadRows(saved));
  const [selIds, setSelIds] = useState<string[]>([]);
  const [modal, setModal] = useState<CloseModal>(null);
  const [createOpen, setCreateOpen] = useState(false);
  /* 저장 중(SaveButton 400ms) — 그리드·툴바를 잠가 사이 편집을 막는다. 검증 통과 스냅샷이 곧 저장할 행 */
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (gridBoxRef.current) gridBoxRef.current.inert = saving; }, [saving]);

  /* 상세필터 — 기준년도(기본 당해년도) · 계정구분. 즉시 반영 — 드로어 컨트롤이 이 state 를 바로 바꾼다 */
  const [fYear, setFYear] = useState(thisYear);
  const [fAccount, setFAccount] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const resetFilters = () => { setFYear(thisYear); setFAccount(''); };
  const passes = useMemo(() => passesFilter({ year: fYear, account: fAccount }), [fYear, fAccount]);
  /* 필터가 바뀌면 선택을 전부 해제(2026-10-27 사용자 결정 — filter_clears_selection 가드) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => true, []);
  const doesExternalFilterPass = useCallback((n: IRowNode<FiscalRow>) => (n.data ? passes(n.data) : true), [passes]);
  const visible = useMemo(() => rows.filter(passes), [rows, passes]);

  const edit = useCallback<Edit>((id, field, value) => setRows((rs) => editRow(rs, id, field, value)), []);
  const columnDefs = useMemo(() => makeCols(edit), [edit]);

  /* E05 행 선택 — 선택 SSOT = selIds */
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<FiscalRow>) => {
    const ids = e.api.getSelectedRows().map((r) => r.id);
    selIdsRef.current = ids;
    setSelIds(ids);
  }, []);
  /* 선택 해제 — ref 도 즉시 비운다(같은 틱 setRows 뒤 restoreSelection 이 낡은 선택을 되살리지 않게) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };
  /* 행 데이터 갱신 뒤 — 선택 재적용 + 셀 강제 갱신(이월기간시작일 자동값·편집 배경·오류 테두리는 다른 칸/클래스라 강제 필요) */
  const onRowDataUpdated = () => {
    const api = apiRef.current; if (!api) return;
    restoreSelection(api, selIdsRef.current);
    api.refreshCells({ force: true });
  };

  /* E04 조회 — 현재 조건 유지, 저장본 재로딩 */
  const refresh = () => {
    if (saving) return;   // 저장 중 잠금(⌥R 단축키 경로 포함)
    clearSel();
    setRows(reloadRows(saved));
    toast.success('조회되었습니다');
  };

  /* E11 회기 생성 — 회기 없는 계정구분이 없으면 모달을 열지 않는다 */
  const creatable = accountsWithoutFiscal(rows, FUND_ACCOUNTS);
  const openCreate = () => {
    if (!creatable.length) { toast.info('모든 계정구분에 회기가 생성되어 있습니다'); return; }
    setCreateOpen(true);
  };
  const doCreate = (account: string, start: string) => {
    setSaved((s) => createFirstFiscal(s, account, start).rows);
    setRows((rs) => createFirstFiscal(rs, account, start).rows);
    toast.success('회기가 생성되었습니다');
  };

  /* E02 저장 — SaveButton 계약: 검증 실패 = undefined(스피너 없음), 통과 = commit 함수 */
  const save = () => {
    if (changedCount(rows) === 0) { toast.info('변경된 내용이 없습니다'); return; }
    const v = validateEdits(rows);
    if (v.invalid) {
      setRows(v.rows);
      toast.error(`입력값을 확인하세요 — ${String(v.invalid)}개 행의 표시된 칸(마감기간종료일 ≥ 마감기간시작일 · 이월기간종료일 ≥ 이월기간시작일)`);
      return;
    }
    const snapshot = v.rows;
    setSaving(true);
    return () => {
      setSaving(false);
      const committed = commitEdits(snapshot);
      setSaved(committed);
      clearSel();
      setRows(committed);
      toast.success('저장되었습니다');
    };
  };

  /* E03-1 / E03-2 연마감 — 게이트는 클릭 시점 1회. 처리 가능 0건이면 확인창 없이 사유 안내 */
  const askClose = (includeUnapproved: boolean) => {
    const ids = [...selIds];
    const g = closeGate(rows, ids, { includeUnapproved });
    if (!g.ok.length) { toast.error(closeBlockedMessage(g)); return; }
    setModal({ ids, ok: g.ok, includeUnapproved, skipped: skippedText(g) });
  };
  const commitClose = (m: NonNullable<CloseModal>) => () => {
    const opts = { includeUnapproved: m.includeUnapproved };
    setSaved((s) => yearEndClose(s, m.ok, opts).rows);
    setRows((rs) => yearEndClose(rs, m.ok, opts).rows);
    clearSel();
    setModal(null);
    toast.success('연마감되었습니다' + (m.skipped ? ` (제외 — ${m.skipped})` : ''));
  };

  /* E10 내보내기 — 현재 조회 결과 */
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([EXCEL_COLS.map(([h]) => h), ...visible.map((r) => EXCEL_COLS.map(([, get]) => get(r)))]);
    ws['!cols'] = EXCEL_COLS.map(([h]) => ({ wch: h === '계정구분명' ? 28 : h.length > 4 ? 14 : 10 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '회기생성전기이월');
    XLSX.writeFile(wb, '회기생성_전기이월.xlsx');
    toast.success('Excel로 내보냈습니다');
  };
  /* 상세필터·회기 생성·확인창이 덮고 있으면 뒤 그리드 내보내기 단축키를 끈다 */
  const listKeys = !filterOpen && !createOpen && modal === null && !saving;
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  const selActions = selIds.length > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selIds.length)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="lock" disabled={saving} onClick={() => askClose(false)}>연마감</Button>
      <Button variant="outline" size="sm" leadingIcon="lock" disabled={saving} onClick={() => askClose(true)}>연마감(미결재포함)</Button>
      <Button variant="ghost" size="sm" disabled={saving} onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '결산관리', LABEL]}
      title={LABEL}
      favRoute="acct-fiscal-rollover"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={[
        { label: '기준년도', value: fYear ? `${fYear}년` : '', onClear: () => setFYear('') },
        { label: '계정구분', value: fAccount, onClear: () => setFAccount('') },
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" disabled={saving} onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" disabled={saving} onClick={openCreate}>회기 생성</Button>
        <SaveButton onSubmit={save} />
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={listKeys ? HOTKEYS.refresh : undefined} />
      </>}
      footerLeft={<span>{`총 ${String(rows.length)}건 중 ${String(visible.length)}건 표시`}</span>}
      footerRight={<FooterActions onExport={exportExcel} />}>

      <div ref={gridBoxRef} aria-busy={saving || undefined} role="region" aria-label={`${LABEL} 편집 그리드 — 체크박스로 회기를 고르면 선택 바에 연마감이 뜬다`}>
        <AgGridReact<FiscalRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          defaultColDef={EDIT_COL_DEF}
          getRowId={getRowId}
          domLayout="autoHeight"
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onModelUpdated={dropHiddenSelection}
          onGridReady={(e) => { apiRef.current = e.api; }}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 조건에 해당하는 회기가 없습니다. [회기 생성]으로 최초 1기를 만드세요.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어(E01) — slide 11 조건 2개. 즉시 반영 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">회기 목록을 기준년도·계정구분으로 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="기준년도" plain>
              <div style={{ width: 'fit-content', minWidth: controlMinWidth('year'), maxWidth: '100%' }}>
                <PeriodPicker mode="year" value={fYear} onChange={(v) => setFYear(v || '')} ariaLabel="기준년도" />
              </div>
            </DrawerField>
            <DrawerField label="계정구분">
              <DrawerSelect value={fAccount} onChange={setFAccount} options={FUND_ACCOUNTS} ariaLabel="계정구분" searchable />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E03-1 / E03-2 연마감 확인 ── */}
      {modal && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{modal.includeUnapproved ? '연마감(미결재포함) 확인' : '연마감 확인'}</AlertDialogTitle>
              <AlertDialogDescription>
                {closeConfirmText(modal.ids.length, modal.ok.length, modal.includeUnapproved)}
                {modal.skipped && <span className="block mt-1 text-caption">{`제외: ${modal.skipped}`}</span>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="" busyLabel="연마감 중" onSubmit={() => commitClose(modal)}>연마감</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E11 회기 생성 ── */}
      {createOpen && (
        <FiscalCreateModal rows={rows} accounts={creatable} defaultStart={`${thisYear}-01-01`}
          onCreate={doCreate} onClose={() => setCreateOpen(false)} />
      )}
    </GridFrame>
  );
}
