/* 전표증빙 미첨부 관리 — 회계 > 전표관리 > 전표증빙 미첨부 관리, route `acct-missing-evidence`, 화면ID ACC-006.
   출처: ACC-006 화면설계서 slide 9~12(개요·그리드·상세필터·증빙첨부) · 14~19(이벤트 E00~E07) → APFS 디자인시스템.
   골격 정본 = 같은 중분류 deleted_journal_manage.tsx(상세필터 즉시 반영·칩·엑셀) + suspense_manage.tsx(선택 바·외부 필터).

   구성(설계서 → 우리 규약)
   - 제목 "전표증빙 미첨부 관리"(메뉴 리프 라벨 — 설계서 "전표증빙미첨부관리" 아님) · KPI 배지 행 미포함.
   - 툴바: [상세필터] → 조회(항상 맨 끝). 등록 버튼 없음(설계서에 없다).
   - 그리드 = 체크박스 + 11컬럼(slide 10 순서 — 설계서 "컬럼 12개"는 체크박스 포함). 금액만 우측, 나머지 좌측(표 정렬 규약).
       결재 = 상태 배지, 첨부 = 아이콘 버튼(클릭 = 데모 열기 토스트 — 아이콘 전용 액션 열). 전표일 내림차순·순번 오름차순.
   - E03 행 선택(체크박스로만, multiRow) → 선택 바 `N건 선택됨 · [증빙첨부] · 선택 해제`. [증빙첨부]는 정확히 1건일 때만(E04).
   - E05 행 더블클릭(Enter 동일) = 그 행 1건 증빙첨부 — 체크 불필요. 체크박스 칸·첨부 버튼 더블클릭은 무시.
   - 증빙첨부 = ACC-003 전표 화면(JournalEntryScreen) mode 'evidence' — ③ 증빙·첨부만 입력, [저장]·[저장 후 닫기]·[닫기].
       상세에 넘기는 행은 modal state 스냅샷(저장으로 목록에서 빠져도 화면·exit 애니메이션 유지).
   - 상세필터 7개(계정구분 검색형 · 기간 기본 당월 · 미결재포함 · 전표발생구분 · 작성자 · 거래처 · 적요). 즉시 반영 — 고르는 즉시
       applied 반영, [필터 적용] = 닫기(X·Esc·바깥 클릭으로 닫아도 값 유지). 시작 > 종료 = 두 칸 invalid + 아래 안내 + 결과 0건
       (2026-11-03 사용자 지시, 정본 privacy_access_log). 적용 조건 = 칩(값만, × 개별 해제).
       기간 칩은 진입부터 떠 있고 × = 전 기간, [초기화] = 당월 복원.
   - 하단: 새 창·내보내기(FooterActions — ⌥O·⌥D) + ⌘P 인쇄. 권한 기반 노출은 RBAC 미구현이라 [증빙첨부]·[내보내기] 항상 노출.

   결정·가정(보고서에도 기재 — PM 확인 필요)
   - 미첨부 판정 = 증빙구분 미선택 이거나 (첨부 없음 + 증빙미첨부 미체크)(missing_evidence_model isMissingEvidence) — 설계서에 정의가 없다.
     저장 검증의 부정이라 증빙 저장에 성공한 전표는 "목록 행 갱신"으로 목록에서 빠진다.
   - 미결재포함 미체크 = 결재 '승인' 전표만, 체크 = 미상신·상신·반려 포함.
   - 설계서 E03 "헤더 체크박스 — 단일 행만 선택 가능"은 프로젝트 선택 규약(multiRow + 단일 대상 액션은 1건 게이트)으로 대체.
   ⚠ 백엔드가 없어 증빙 저장은 화면 로컬 상태만 바꾼다(파일은 이름만 남는다). */
import '../../aggrid_shared.css';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { Icon } from '../../icons';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, numFmt, numStyle } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection, dropHiddenSelection } from '../../aggrid_selection';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type {
  ColDef, GridApi, GridReadyEvent, IRowNode, CellStyle, RowSelectionOptions, SelectionChangedEvent, RowDoubleClickedEvent, CellKeyDownEvent,
} from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { Checkbox } from '../../ui/checkbox';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { FUND_ACCOUNTS, JOURNAL_ORIGINS, todayStr } from './general_journal_data';
import type { ApprovalStatus, JournalRow } from './general_journal_data';
import { validateRange } from './general_journal_model';
import { demoMissingEvidence } from './missing_evidence_data';
import { applyEvidence, defaultFilter, missingPasses, sortMissing } from './missing_evidence_model';
import type { MissingFilter } from './missing_evidence_model';
import { JournalEntryScreen } from './journal_entry_screen';   // 증빙첨부 = ACC-003 전표 화면(mode 'evidence')

const { Button, IconBtn, StatusBadge } = UI;

/* 페이지 번호 버튼 — apfs-grid 푸터 골드(‹ 이전 · 번호 · 다음 ›). 공유 export 가 아니라 골드에서 복사하는 로컬 헬퍼 */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

const PAGE_SIZE = 20;
const APPROVAL_TONE: Record<ApprovalStatus, Tone> = { 미상신: 'muted', 상신: 'info', 승인: 'success', 반려: 'danger' };

/* ──────────────────────────────
   컬럼 — slide 10 순서. 금액만 우측(수량형), 순번·날짜·번호·배지·첨부 아이콘은 좌측(표 정렬 규약)
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
/* display:flex 셀은 AG Grid 기본 말줄임이 안 걸린다 → 긴 텍스트는 truncate span 으로 감싸 '…' 로 끝낸다(일반전표 textCell 과 동형) */
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const badgeCell = (p: { value: ApprovalStatus }) => <StatusBadge tone={APPROVAL_TONE[p.value]} label={p.value} size="lg" />;

/* 첨부 셀 — 첨부가 있으면 파일 아이콘 버튼(클릭 = 데모 열기), 없으면 빈칸. 더블클릭은 그리드 핸들러가 button 타깃을 거른다 */
function AttachCell({ value }: { value: string[] }) {
  if (!value?.length) return null;
  return (
    <button type="button" aria-label={`첨부파일 ${String(value.length)}건 열기`} title={value.join(', ')}
      onClick={(e) => { e.stopPropagation(); if (e.detail > 1) return; toast.info(`첨부파일을 엽니다 (${value.join(', ')})`); }}   // 더블클릭의 두 번째 click 무시
      className="inline-flex items-center gap-1 cursor-pointer border-0 bg-transparent p-0 text-muted-foreground hover:text-foreground">
      <Icon name="file" size={15} />
      {value.length > 1 && <span style={{ fontSize: 12 }}>{String(value.length)}</span>}
    </button>
  );
}

const COLUMNS: ColDef<JournalRow>[] = [
  { field: 'fundAccount', headerName: '계정구분', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'slipDate', headerName: '전표일', cellStyle: tabNum },
  { field: 'seq', headerName: '순번', cellStyle: tabNum },
  /* 적요 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362 — 가드 acc_skill_rules ②). suppressAutoSize 가 없으면 fitCellContents 가 flex 폭을 덮어쓴다 */
  { field: 'memo', headerName: '적요', flex: 1, minWidth: 200, width: 200, suppressAutoSize: true, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'amount', headerName: '금액', type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'partner', headerName: '거래처', maxWidth: 200, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'approval', headerName: '결재', cellStyle: flexCenter, cellRenderer: badgeCell },
  { field: 'attachments', colId: 'attachments', headerName: '첨부', sortable: false, cellDataType: false,
    valueFormatter: (p) => ((p.value as string[] | undefined) ?? []).join(', '), cellRenderer: AttachCell, cellStyle: flexCenter },
  { field: 'writer', headerName: '작성자', cellStyle: flexCenter },
  { field: 'origin', headerName: '전표발생구분', cellStyle: flexCenter },
  { field: 'slipNo', headerName: '전표번호', cellStyle: tabNum },
];

/* 다중 선택 — 체크박스로만(행 본문 클릭 선택 없음). 모듈 상수(참조 안정) */
const ROW_SELECTION: RowSelectionOptions<JournalRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* 엑셀 — 화면 컬럼과 1:1(체크박스 제외, 원시자료 SFR-021). 금액만 숫자 셀 */
type XCol = { header: string; get: (r: JournalRow) => string | number; num?: boolean; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.fundAccount, wch: 24 }, { header: '전표일', get: (r) => r.slipDate }, { header: '순번', get: (r) => String(r.seq) },   // 순번은 수량이 아니라 좌측 — 문자열 셀
  { header: '적요', get: (r) => r.memo, wch: 30 }, { header: '금액', get: (r) => r.amount, num: true, wch: 16 }, { header: '거래처', get: (r) => r.partner, wch: 18 },
  { header: '결재', get: (r) => r.approval }, { header: '첨부', get: (r) => r.attachments.join(', '), wch: 30 }, { header: '작성자', get: (r) => r.writer },
  { header: '전표발생구분', get: (r) => r.origin }, { header: '전표번호', get: (r) => r.slipNo, wch: 16 },
];

/* plain=<div> 래퍼 — PeriodPicker·체크박스(버튼 트리거)는 <label> 안에서 2회 토글된다(apfs-datepicker) */
function DrawerField({ label, children, plain }: { label: string; children: React.ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 행 안 버튼(첨부)에서 온 이벤트는 증빙첨부 열기로 취급하지 않는다(체크박스 칸 더블클릭은 SELECTION_COL 이 이미 막는다) */
const fromButton = (ev: Event | null | undefined) => !!(ev?.target as Element | null)?.closest?.('button');

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'evidence'; row: JournalRow };

export function MissingEvidenceManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const base = useMemo(() => defaultFilter(today), [today]);
  const apiRef = useRef<GridApi<JournalRow> | null>(null);
  /* 원장 — 저장으로 미첨부가 풀린 행도 남긴다(외부 필터가 숨김). 같은 화면에서 다시 저장해도 id 로 찾는다 */
  const [rows, setRows] = useState<JournalRow[]>(() => sortMissing(demoMissingEvidence(today)));
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* E01 상세필터 — applied = 드로어·칩·목록의 SSOT(초안 사본 없음 — 바꾸는 즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<MissingFilter>(base);
  const setD = <K extends keyof MissingFilter>(k: K) => (v: MissingFilter[K]) => setApplied((a) => ({ ...a, [k]: v }));
  /* 기간 오류 — 렌더마다 applied 로 계산. 두 picker invalid + 아래 안내 + 결과 0건 */
  const periodErr = validateRange(applied.from, applied.to);
  const clearApplied = (patch: Partial<MissingFilter>) => setApplied((a) => ({ ...a, ...patch }));

  const passes = useCallback((r: JournalRow) => !periodErr && missingPasses(r, applied), [applied, periodErr]);
  /* 필터 변경 = 선택 전부 해제(2026-10-27 사용자 결정, 가드 filter_clears_selection) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => true, []);
  const doesExternalFilterPass = useCallback((node: IRowNode<JournalRow>) => (node.data ? passes(node.data) : true), [passes]);
  const visible = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 인쇄·내보내기는 증빙첨부 화면·드로어가 열려 있지 않을 때만 */
  const listKeys = modal === null && !filterOpen;
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  /* E03 선택 SSOT = selIds. 데이터 갱신 후 선택 복원 */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<JournalRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<JournalRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<JournalRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 선택 해제 — ref 도 즉시 비운다(같은 틱 setRows 의 restoreSelection 이 낡은 선택을 되살리지 않게) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };

  /* E04 [증빙첨부] — 선택 1건. E05 더블클릭/Enter — 그 행 1건(체크 불필요) */
  const openEvidence = useCallback((row: JournalRow) => setModal({ kind: 'evidence', row }), []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<JournalRow>) => {
    if (!e.data || e.rowPinned || fromButton(e.event as Event | null)) return;
    openEvidence(e.data);
  }, [openEvidence]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<JournalRow>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || e.rowPinned || fromButton(ev) || e.column.getColId().startsWith('ag-Grid-')) return;   // 체크박스 칸 Enter 는 선택 토글로 둔다
    openEvidence(e.data);
  }, [openEvidence]);
  const single = selCount === 1 ? rows.find((r) => r.id === selIds[0]) ?? null : null;

  /* E04 저장 — 증빙 4항목만 원장에 반영. 미첨부가 풀리면 외부 필터가 숨기고 dropHiddenSelection 이 선택을 푼다. 토스트는 화면이 낸다 */
  const saveEvidence = (id: string) => (j: JournalRow): JournalRow => {
    setRows((prev) => applyEvidence(prev, id, j));
    return j;
  };

  /* E02 조회 — "현재 조건으로 재조회". 백엔드가 없어 로컬 상태(저장 결과·필터)를 유지하고 선택만 푼다 */
  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  /* ── E07 Excel — 표시 중인 행. 금액은 숫자 셀(t:'n' + 천단위 서식)이라 Excel 에서도 우측 정렬 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = sortMissing(visible).map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((_, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell) { cell.t = 'n'; cell.z = '#,##0'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '전표증빙 미첨부');
    XLSX.writeFile(wb, '전표증빙 미첨부 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['계정구분', applied.fundAccount, () => clearApplied({ fundAccount: '' })],
    ['기간', applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', () => clearApplied({ from: '', to: '' })],
    ['미결재포함', applied.includeUnapproved ? '미결재 포함' : '', () => clearApplied({ includeUnapproved: false })],
    ['전표발생구분', applied.origin, () => clearApplied({ origin: '' })],
    ['작성자', applied.writer.trim(), () => clearApplied({ writer: '' })],
    ['거래처', applied.partner.trim(), () => clearApplied({ partner: '' })],
    ['적요', applied.memo.trim(), () => clearApplied({ memo: '' })],
  ];

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="upload" disabled={!single} onClick={() => { if (single) openEvidence(single); }}>증빙첨부</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '전표증빙 미첨부 관리']}
      title="전표증빙 미첨부 관리"
      favRoute="acct-missing-evidence"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={modal ? undefined : HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{footerCount(visible.length, Math.min(shown, visible.length))}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<JournalRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_CONTENT}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onModelUpdated={dropHiddenSelection}   // 증빙 저장으로 선택 행이 미첨부 목록에서 빠지면 선택 해제
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate="조회 조건에 해당하는 증빙 미첨부 전표가 없습니다."
        />
      </div>

      {/* ── E01 상세필터 드로어 — 설계서 7개 조건. 즉시 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">증빙 미첨부 전표 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={applied.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" searchable /></DrawerField>
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.from} onChange={(v) => setD('from')(v || '')} ariaLabel="기간 시작일" invalid={!!periodErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.to} onChange={(v) => setD('to')(v || '')} ariaLabel="기간 종료일" invalid={!!periodErr} /></div>
              </div>
              {periodErr && <p role="alert" className="m-0 mt-1 text-danger" style={{ fontSize: 12 }}>{periodErr}</p>}
            </DrawerField>
            <DrawerField label="미결재포함" plain>
              <div className="inline-flex items-center gap-2" style={{ minHeight: 34 }}>
                <Checkbox id="me-include-unapproved" aria-label="미결재포함" checked={applied.includeUnapproved} onCheckedChange={(c) => setD('includeUnapproved')(c === true)} />
                <label htmlFor="me-include-unapproved" style={{ fontSize: 13.5, cursor: 'pointer', userSelect: 'none' }}>미결재 전표 포함(미상신·상신·반려)</label>
              </div>
            </DrawerField>
            <DrawerField label="전표발생구분"><DrawerSelect value={applied.origin} onChange={setD('origin')} options={[...JOURNAL_ORIGINS]} ariaLabel="전표발생구분" /></DrawerField>
            <DrawerField label="작성자">
              <input type="text" value={applied.writer} onChange={(e) => setD('writer')(e.target.value)} placeholder="작성자" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="거래처">
              <input type="text" value={applied.partner} onChange={(e) => setD('partner')(e.target.value)} placeholder="거래처" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="적요">
              <input type="text" value={applied.memo} onChange={(e) => setD('memo')(e.target.value)} placeholder="적요" style={inputStyle('text')} />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(base)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E04·E05 증빙첨부 — 게이트는 modal state(행 스냅샷). 저장으로 목록에서 빠져도 동기 언마운트되지 않는다 ── */}
      {modal?.kind === 'evidence' && (
        <JournalEntryScreen entry={{ mode: 'evidence', source: modal.row }} onSave={saveEvidence(modal.row.id)} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
