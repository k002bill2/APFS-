/* 삭제전표 관리 — 조회 전용 리스트 페이지 (회계 > 전표관리 > 삭제전표 관리, route acct-deleted-journal, 화면ID ACC-004).
   출처: ACC-004 화면설계서 → APFS 디자인시스템(ACC-001 account_code_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터] → 조회(항상 맨 끝). 등록 버튼·선택 체크박스·선택 바 없음(설계서에 없다).
   - 그리드 11열(계정구분·전표일·순번·적요·금액·거래처·첨부·작성자·전표발생구분·최초등록자·최종수정자).
       전표일 내림차순·순번 오름차순(모델 정렬). 행 더블클릭 / Enter = 전표상세(조회 전용 전체 화면 팝업).
       첨부 = 아이콘 버튼 셀(클릭 시 데모 다운로드 토스트) — 아이콘 전용 액션 열이라 정렬 규약 예외지만 가운데 정렬은 쓰지 않는다.
   - 상세필터 드로어 6개(계정구분·기간·전표발생구분·작성자·거래처·적요). draft 를 편집하고 [필터 적용](또는 텍스트 Enter)에서만 커밋
       — 기간 시작 > 종료면 toast.error + 드로어 유지. 닫기(X·Esc·바깥)는 draft 폐기. 적용 조건 = 칩(값만, × 개별 해제).
   - 전표상세 = ACC-003 전표 화면(JournalEntryScreen) mode 'deleted' — 조회 전용 + 삭제 안내 배너 + [복원]·[닫기].
   - 복원 = 상세의 [복원] → 확인 → 목록에서 제외 + 토스트. 상세에 넘기는 행은 modal state 스냅샷(복원 후에도 exit 애니메이션 유지).
   - 엑셀 = 푸터 내보내기 아이콘 + ⌥D(금액은 숫자 셀). 권한 기반 노출은 RBAC 미구현이라 [복원]·[내보내기] 항상 노출.
   ⚠ 백엔드가 없어 복원은 화면 로컬 상태만 바꾼다(일반전표관리 목록으로 실제 이동하지 않음). */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, ICellRendererParams } from 'ag-grid-community';
import { Paperclip } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { demoDeletedJournals } from './deleted_journal_data';
import { FUND_ACCOUNTS, JOURNAL_ORIGINS } from './general_journal_data';
import type { DeletedJournal } from './deleted_journal_data';
import { filterDeleted, validatePeriod, restoreJournal, EMPTY_FILTER } from './deleted_journal_model';
import type { DeletedFilter } from './deleted_journal_model';
import { JournalEntryScreen } from './journal_entry_screen';   // 전표상세 = ACC-003 전표 화면(mode 'deleted' — 조회 전용 + [복원])

const { Button, IconBtn } = UI;

const PAGE_SIZE = 20;
const ATTACH_COL = 'attachments';

/* ──────────────────────────────
   컬럼 정의 — 설계서 순서. 금액만 우측(수량형), 나머지 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const muted: CellStyle = { ...flexCenter, color: 'var(--muted-foreground)' };

const demoDownload = (files: readonly string[]) => toast(`${files.join(', ')} 다운로드(데모)`);

/* 첨부 셀 — 첨부가 있으면 클립 아이콘 버튼, 없으면 빈칸. 클릭이 행 더블클릭·Enter 와 겹치지 않게 그리드 핸들러가 button 타깃을 거른다 */
function AttachCell(p: ICellRendererParams<DeletedJournal>) {
  const files = p.data?.attachments ?? [];
  if (files.length === 0) return null;
  const label = `첨부 ${String(files.length)}건 다운로드: ${files.join(', ')}`;
  return (
    <button type="button" aria-label={label} title={files.join('\n')} onClick={(e) => { if (e.detail > 1) return; demoDownload(files); }}   // 더블클릭의 두 번째 click 무시
      className="inline-flex items-center gap-1 rounded-card-sm border-0 bg-transparent text-muted-foreground hover:text-foreground cursor-pointer"
      style={{ padding: '4px 4px', fontFamily: 'inherit', fontSize: 12 }}>
      <Paperclip size={15} strokeWidth={2} aria-hidden />
      {files.length > 1 && <span className="tabular-nums">{files.length}</span>}
    </button>
  );
}

const columnDefs: ColDef<DeletedJournal>[] = [
  { field: 'fundAccount', headerName: '계정구분', width: 190, minWidth: 170, cellStyle: flexCenter },
  { field: 'slipDate', headerName: '전표일', width: 108, maxWidth: 116, cellStyle: codeStyle },
  { field: 'seq', headerName: '순번', width: 72, maxWidth: 80, cellStyle: codeStyle },
  { field: 'memo', headerName: '적요', flex: 1, width: 200, minWidth: 180, cellStyle: { ...flexCenter, fontWeight: 600 } },
  { field: 'amount', headerName: '금액', width: 140, minWidth: 120, type: 'rightAligned', valueFormatter: numFmt, cellStyle: numStyle() as any },
  { field: 'partner', headerName: '거래처', width: 140, minWidth: 120, cellStyle: flexCenter },
  { field: ATTACH_COL, colId: ATTACH_COL, headerName: '첨부', width: 72, maxWidth: 80, sortable: false, cellDataType: false,
    valueFormatter: (p) => ((p.value as string[] | undefined) ?? []).join(', '), cellRenderer: AttachCell, cellStyle: flexCenter },
  { field: 'writer', headerName: '작성자', width: 96, maxWidth: 110, cellStyle: flexCenter },
  { field: 'origin', headerName: '전표발생구분', width: 116, maxWidth: 124, cellStyle: flexCenter },
  { field: 'createdBy', headerName: '최초등록자', width: 104, maxWidth: 120, cellStyle: muted },
  { field: 'updatedBy', headerName: '최종수정자', width: 104, maxWidth: 120, cellStyle: muted },
];

type XCol = { header: string; get: (r: DeletedJournal) => string | number; num?: boolean; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.fundAccount, wch: 24 }, { header: '전표일', get: (r) => r.slipDate }, { header: '순번', get: (r) => String(r.seq) },   // 순번은 수량이 아니라 좌측 — 문자열 셀
  { header: '적요', get: (r) => r.memo, wch: 30 }, { header: '금액', get: (r) => r.amount, num: true, wch: 16 }, { header: '거래처', get: (r) => r.partner, wch: 18 },
  { header: '첨부', get: (r) => r.attachments.join(', '), wch: 30 }, { header: '작성자', get: (r) => r.writer }, { header: '전표발생구분', get: (r) => r.origin },
  { header: '최초등록자', get: (r) => r.createdBy }, { header: '최종수정자', get: (r) => r.updatedBy },
];

function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}
const dayWrap: CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 행 안 버튼(첨부)에서 온 이벤트는 상세 열기로 취급하지 않는다 */
const fromButton = (ev: Event | null | undefined) => !!(ev?.target as Element | null)?.closest?.('button');

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'detail'; row: DeletedJournal };

export function DeletedJournalManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<DeletedJournal> | null>(null);
  const [rows, setRows] = useState<DeletedJournal[]>(() => demoDeletedJournals());
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터 — applied = 적용된 조건(칩·목록의 SSOT), draft = 드로어에서 편집 중인 사본 */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<DeletedFilter>(EMPTY_FILTER);
  const [draft, setDraft] = useState<DeletedFilter>(EMPTY_FILTER);
  const setD = <K extends keyof DeletedFilter>(k: K) => (v: DeletedFilter[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const openFilter = () => { setDraft(applied); setFilterOpen(true); };
  /* 커밋 — 기간 검증 실패면 드로어를 닫지 않는다 */
  const commitFilter = () => {
    const err = validatePeriod(draft.from, draft.to);
    if (err) { toast.error(err); return; }
    setApplied(draft);
    setFilterOpen(false);
  };
  /* 편집 중 기간 오류 — 두 picker 에 invalid 표시(커밋 시 toast 는 그대로) */
  const periodErr = validatePeriod(draft.from, draft.to);
  const clearApplied = (patch: Partial<DeletedFilter>) => setApplied((a) => ({ ...a, ...patch }));

  /* 인쇄·내보내기는 모달·드로어가 열려 있지 않을 때만 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen });

  const visible = useMemo(() => filterDeleted(rows, applied), [rows, applied]);

  const onGridReady = useCallback((e: GridReadyEvent<DeletedJournal>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<DeletedJournal>) => {
    if (!e.data || e.rowPinned || fromButton(e.event as Event | null)) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<DeletedJournal>) => {
    const ev = e.event as KeyboardEvent | null;
    if (ev?.key !== 'Enter' || !e.data || fromButton(ev)) return;
    setModal({ kind: 'detail', row: e.data });
  }, []);

  /* 복원 — 행 제외 + 토스트만. 상세 닫기는 상세가 AlertDialog 닫힘 뒤 ref.close() 로 한다(exit 애니메이션 보존) */
  const restore = (id: string) => {
    setRows((prev) => restoreJournal(prev, id));
    toast.success('복원되었습니다.');
  };

  /* 조회 — "현재 조건으로 재조회". 백엔드가 없어 로컬 상태(복원 결과·필터)를 유지한다 */
  const refresh = () => { toast.success('조회되었습니다'); };

  /* ── Excel — 표시 중인 행. 금액은 숫자 셀(t:'n' + 천단위 서식)이라 Excel 에서도 우측 정렬 ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((_, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell) { cell.t = 'n'; cell.z = '#,##0'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '삭제전표 관리');
    XLSX.writeFile(wb, '삭제전표 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['계정구분', applied.fundAccount, () => clearApplied({ fundAccount: '' })],
    ['기간', applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', () => clearApplied({ from: '', to: '' })],
    ['전표발생구분', applied.origin, () => clearApplied({ origin: '' })],
    ['작성자', applied.writer.trim(), () => clearApplied({ writer: '' })],
    ['거래처', applied.partner.trim(), () => clearApplied({ partner: '' })],
    ['적요', applied.memo.trim(), () => clearApplied({ memo: '' })],
  ];
  const enterCommits = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) commitFilter(); };

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '삭제전표 관리']}
      title="삭제전표 관리"
      favRoute="acct-deleted-journal"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={openFilter}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
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
        <AgGridReact<DeletedJournal>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── 상세필터 드로어 — 설계서 6개 조건. draft 편집 → [필터 적용]에서만 커밋 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">삭제전표 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={draft.fundAccount} onChange={setD('fundAccount')} options={[...FUND_ACCOUNTS]} ariaLabel="계정구분" searchable /></DrawerField>
            <DrawerField label="기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.from} onChange={setD('from')} ariaLabel="기간 시작일" invalid={!!periodErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={draft.to} onChange={setD('to')} ariaLabel="기간 종료일" invalid={!!periodErr} /></div>
              </div>
            </DrawerField>
            <DrawerField label="전표발생구분"><DrawerSelect value={draft.origin} onChange={setD('origin')} options={[...JOURNAL_ORIGINS]} ariaLabel="전표발생구분" /></DrawerField>
            <DrawerField label="작성자">
              <input type="text" value={draft.writer} onChange={(e) => setD('writer')(e.target.value)} onKeyDown={enterCommits} placeholder="작성자" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="거래처">
              <input type="text" value={draft.partner} onChange={(e) => setD('partner')(e.target.value)} onKeyDown={enterCommits} placeholder="거래처" style={inputStyle('text')} />
            </DrawerField>
            <DrawerField label="적요">
              <input type="text" value={draft.memo} onChange={(e) => setD('memo')(e.target.value)} onKeyDown={enterCommits} placeholder="적요" style={inputStyle('text')} />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setDraft(EMPTY_FILTER)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={commitFilter}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 전표상세 — 게이트는 modal state(행 스냅샷). 복원으로 rows 에서 빠져도 동기 언마운트되지 않는다 ── */}
      {modal?.kind === 'detail' && (
        <JournalEntryScreen entry={{ mode: 'deleted', source: modal.row, deletedAt: modal.row.deletedAt, deletedBy: modal.row.deletedBy }}
          onRestore={() => restore(modal.row.id)} onClose={() => setModal(null)} />
      )}
    </GridFrame>
  );
}
