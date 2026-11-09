/* 계좌관리 — 관리형 리스트 페이지 (회계 > 자금관리 > 계좌관리, route acct-bank-account, 화면ID ACC-019).
   출처: ACC-019 화면설계서(2026.10.26 v1.0) slide 9~20 → APFS 디자인시스템(ACC-001 account_code_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: [상세필터](E01) → [계좌 등록](E02, ⌘⏎ — 설계서 '등록' → 도메인 액션명) → 조회(E03, 항상 맨 끝).
   - 그리드 14열(계정구분·계좌코드·계좌별칭·계좌번호·금융기관·지점명·계정과목·사용여부·수시입출금·상품가입액·이자율·개설일·만기일·통화)
       + 선택 체크박스(E04) → 선택 바 [수정](1건, E06)·[삭제]·[선택 해제]. 계좌코드 오름차순, getRowId=id. 행 더블클릭 / Enter = 수정 모달(E06).
       상품가입액·이자율 = 우측(수량형), 나머지 좌측(가운데 정렬 없음). 숫자 N/A = '-'. 계좌번호는 마스크 없이 전체 표시.
       임시저장 행 = 계좌코드 옆 '임시' muted 배지.
   - 상세필터 드로어 7개(계정구분·계정과목명·거래기관·사용여부·개설일·만기일·만기여부) — 즉시 반영([필터 적용] = 닫기),
       개설일 > 만기일 = 두 칸 invalid + 안내 + 0건. 적용 조건 = 칩(값만, × 개별 해제).
   - 삭제(E05) = 확인 모달 → 논리삭제(목록에서 제거) + 토스트. 설계서에 삭제이력 버튼이 없어 두지 않는다(코드 재사용 방지용 이력만 state 로 보관).
   - 새 창(E07)·내보내기(E08, ⌥D, '계좌관리.xlsx') = 푸터 FooterActions.
   - KPI 배지 행 미포함 · 카드헤더 sub 캡션 없음.
   결정·가정
   - 개설일 조건 = 개설일 ≥ 값, 만기일 조건 = 만기일 ≤ 값(만기일 없는 계좌 제외). 만기여부 '부' 에는 만기일 없는 계좌가 포함된다(기준일 DEMO_TODAY).
   - 내보내기·인쇄 '권한 보유자만 노출' — RBAC 데모가 없어 항상 노출.
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, numFmt, numStyle } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { dayWrap } from '../acc_form_helpers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions, ICellRendererParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { DrawerSelect, DrawerMultiSelect } from '../../drawer_select';
import { PARTNERS } from '../slip/general_journal_data';
import type { Partner } from '../slip/general_journal_data';
import { DEMO_USER } from '../baseinfo/account_code_data';
import { ACCOUNT_NO_REQUIRED_SUBJECTS, BANKS, DEMO_TODAY, FUNDS_ACCOUNT_TYPES, demoBankAccounts } from './funds_data';
import { EMPTY_FILTER, deleteAccounts, filterBankAccounts, filterPeriodError, formToAccount, nextAccountCode, rateText, sortByCode, yn } from './bank_account_model';
import type { BankAccountFilter, BankAccountForm, BankAccountRow } from './bank_account_model';
import { BankAccountFormModal } from './bank_account_form_modal';

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
const YN = ['여', '부'] as const;

/* ──────────────────────────────
   컬럼 정의 — 설계서 slide10 ② 순서
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const dash = (v: unknown) => (v == null || v === '' ? '-' : String(v));

/* 계좌코드 + 임시저장 배지 */
function CodeCell(p: ICellRendererParams<BankAccountRow>) {
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <span className="tabular-nums">{p.data?.code}</span>
      {p.data?.draft && <StatusBadge tone="muted" size="sm" label="임시" />}
    </span>
  );
}

const columnDefs: ColDef<BankAccountRow>[] = [
  { field: 'accountType', headerName: '계정구분', width: 190, minWidth: 170, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'code', headerName: '계좌코드', width: 128, maxWidth: 140, cellStyle: codeStyle, cellRenderer: CodeCell },
  { field: 'alias', headerName: '계좌별칭', flex: 1, width: 190, minWidth: 170, cellStyle: { ...flexCenter, fontWeight: 600 }, cellRenderer: textCell },
  { field: 'accountNo', headerName: '계좌번호', width: 160, minWidth: 150, cellStyle: codeStyle },
  { field: 'bank', headerName: '금융기관', width: 116, maxWidth: 130, cellStyle: flexCenter, valueFormatter: (p) => dash(p.value) },
  { field: 'branch', headerName: '지점명', width: 130, maxWidth: 150, cellStyle: flexCenter, valueFormatter: (p) => dash(p.value) },
  { field: 'subject', headerName: '계정과목', width: 110, maxWidth: 120, cellStyle: flexCenter, valueFormatter: (p) => dash(p.value) },
  { colId: 'active', headerName: '사용여부', width: 90, maxWidth: 96, cellStyle: flexCenter, valueGetter: (p) => (p.data ? yn(p.data.active) : '') },
  { colId: 'freeWithdraw', headerName: '수시입출금', width: 100, maxWidth: 106, cellStyle: flexCenter, valueGetter: (p) => (p.data ? yn(p.data.freeWithdraw) : '') },
  { field: 'productAmount', headerName: '상품가입액', width: 140, minWidth: 120, type: 'rightAligned', valueFormatter: (p) => (p.value == null ? '-' : numFmt(p)), cellStyle: numStyle() as any },
  { field: 'rate', headerName: '이자율', width: 84, maxWidth: 96, type: 'rightAligned', valueFormatter: (p) => rateText(p.value as number | null), cellStyle: numStyle() as any },
  { field: 'openDate', headerName: '개설일', width: 108, maxWidth: 116, cellStyle: codeStyle, valueFormatter: (p) => dash(p.value) },
  { field: 'maturityDate', headerName: '만기일', width: 108, maxWidth: 116, cellStyle: codeStyle, valueFormatter: (p) => dash(p.value) },
  { field: 'currency', headerName: '통화', width: 76, maxWidth: 84, cellStyle: flexCenter },
];
/* 다중 선택 — 체크박스로만 on/off(행 본문 클릭 선택 없음) */
const ROW_SELECTION: RowSelectionOptions<BankAccountRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

type XCol = { header: string; get: (r: BankAccountRow) => string | number | null; num?: 'amount' | 'rate'; wch?: number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.accountType, wch: 24 }, { header: '계좌코드', get: (r) => r.code }, { header: '계좌별칭', get: (r) => r.alias, wch: 24 },
  { header: '계좌번호', get: (r) => r.accountNo, wch: 20 }, { header: '금융기관', get: (r) => dash(r.bank) }, { header: '지점명', get: (r) => dash(r.branch), wch: 16 },
  { header: '계정과목', get: (r) => dash(r.subject) }, { header: '사용여부', get: (r) => yn(r.active) }, { header: '수시입출금', get: (r) => yn(r.freeWithdraw) },
  { header: '상품가입액', get: (r) => r.productAmount ?? '-', num: 'amount', wch: 18 }, { header: '이자율', get: (r) => r.rate ?? '-', num: 'rate' },
  { header: '개설일', get: (r) => dash(r.openDate) }, { header: '만기일', get: (r) => dash(r.maturityDate) }, { header: '통화', get: (r) => r.currency },
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

const pad2 = (n: number) => String(n).padStart(2, '0');
const nowStamp = (): string => { const d = new Date(); return `${String(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; mode: 'create' | 'edit'; id?: string }
  | { kind: 'delete'; ids: string[] };

export function BankAccountManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<BankAccountRow> | null>(null);
  const [rows, setRows] = useState<BankAccountRow[]>(() => sortByCode(demoBankAccounts()));
  /* 발급된 계좌코드(활성 + 논리삭제) — 삭제한 코드를 다시 쓰지 않는다 */
  const [issued, setIssued] = useState<string[]>(() => demoBankAccounts().map((r) => r.code));
  const [partners, setPartners] = useState<Partner[]>(() => [...PARTNERS]);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터 — applied = 드로어·칩·목록의 SSOT(즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<BankAccountFilter>(EMPTY_FILTER);
  const setD = <K extends keyof BankAccountFilter>(k: K) => (v: BankAccountFilter[K]) => setApplied((a) => ({ ...a, [k]: v }));
  const periodErr = filterPeriodError(applied);

  const listKeys = modal === null && !filterOpen;
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', mode: 'create' }), { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: modal === null && !filterOpen, skipInDialog: true });

  /* E00 초기 조회 · E01 상세필터 */
  const visible = useMemo(() => filterBankAccounts(rows, applied, DEMO_TODAY), [rows, applied]);

  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  /* 필터를 바꾸면 선택 해제(apfs-detail-filter).
     ref 를 먼저 비운다 — 안 비우면 뒤이은 rowData 갱신의 restoreSelection 이 낡은 ref 로 통과 행을 되살린다 */
  useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [applied]);
  const onGridReady = useCallback((e: GridReadyEvent<BankAccountRow>) => { apiRef.current = e.api; }, []);
  /* E04 행 체크박스 선택 */
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<BankAccountRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<BankAccountRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E06 행 더블클릭 / Enter → 수정 모달 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<BankAccountRow>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', mode: 'edit', id: e.data.id }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<BankAccountRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId().startsWith('ag-Grid-SelectionColumn')) return;   // 체크 토글 몫
    setModal({ kind: 'form', mode: 'edit', id: e.data.id });
  }, []);

  const target = modal?.kind === 'form' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* E02 등록 · E06 수정 저장 — 행만 갱신한다(닫기는 모달이 dlgRef.close() → onClose 로, exit 애니메이션 보존) */
  const save = (form: BankAccountForm, draft: boolean) => {
    if (!modal || modal.kind !== 'form') return;
    const now = nowStamp();
    if (modal.mode === 'create') {
      const code = nextAccountCode(issued);
      const row = formToAccount(form, null, { id: `acct-${code.slice(3)}`, code, user: DEMO_USER, now, draft });
      setIssued((s) => [...s, code]);
      setRows((prev) => sortByCode([...prev, row]));
    } else {
      if (!target) return;
      const row = formToAccount(form, target, { id: target.id, code: target.code, user: DEMO_USER, now, draft });
      setRows((prev) => prev.map((r) => (r.id === target.id ? row : r)));
    }
  };

  /* E05 삭제 — 논리삭제. setModal 은 부르지 않는다: 닫기는 AlertDialog onOpenChange 가 맡는다(exit 애니메이션 보존) */
  const doDelete = (ids: string[]) => {
    setRows((prev) => deleteAccounts(prev, ids).rows);
    apiRef.current?.deselectAll();
    toast.success('삭제되었습니다');
  };

  /* E03 조회 — 현재 조건으로 재조회. 백엔드가 없어 로컬 상태를 유지하고 선택만 푼다 */
  const refresh = () => { apiRef.current?.deselectAll(); toast.success('조회되었습니다'); };

  /* E08 내보내기 — 표시 중인 행. 상품가입액·이자율은 숫자 셀 */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    EXPORT_COLS.forEach((c, ci) => {
      if (!c.num) return;
      body.forEach((_, ri) => {
        const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })];
        if (cell && typeof cell.v === 'number') { cell.t = 'n'; cell.z = c.num === 'amount' ? '#,##0' : '0.00'; }
      });
    });
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch ?? 12 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '계좌관리');
    XLSX.writeFile(wb, '계좌관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const clear = (patch: Partial<BankAccountFilter>) => setApplied((a) => ({ ...a, ...patch }));
  const chips: [string, string, () => void][] = [
    ['계정구분', applied.accountType, () => clear({ accountType: '' })],
    ['계정과목명', applied.subjects.join(', '), () => clear({ subjects: [] })],
    ['거래기관', applied.banks.join(', '), () => clear({ banks: [] })],
    ['사용여부', applied.use, () => clear({ use: '' })],
    ['개설일', applied.openFrom ? `${applied.openFrom} ~` : '', () => clear({ openFrom: '' })],
    ['만기일', applied.maturityTo ? `~ ${applied.maturityTo}` : '', () => clear({ maturityTo: '' })],
    ['만기여부', applied.matured, () => clear({ matured: '' })],
  ];

  /* E06 선택 바 [수정] — 1건 선택 시 행 더블클릭과 같은 수정 모달 */
  const editSelected = () => { if (selIds.length === 1) setModal({ kind: 'form', mode: 'edit', id: selIds[0] }); };
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {selCount === 1 && <Button variant="primary" size="sm" leadingIcon="file" onClick={editSelected}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onClick={() => setModal({ kind: 'delete', ids: selIds })}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '자금관리', '계좌관리']}
      title="계좌관리"
      favRoute="acct-bank-account"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form', mode: 'create' })}>계좌 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={listKeys ? HOTKEYS.refresh : undefined} />
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
        <AgGridReact<BankAccountRow>
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
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회 결과가 없습니다. 검색 조건을 변경해 주세요.</span>'}
        />
      </div>

      {/* ── E01 상세필터 드로어 — 설계서 7개 조건. 즉시 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">계좌 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분" plain><DrawerSelect value={applied.accountType} onChange={setD('accountType')} options={[...FUNDS_ACCOUNT_TYPES]} ariaLabel="계정구분" searchable /></DrawerField>
            <DrawerField label="계정과목명" plain><DrawerMultiSelect value={applied.subjects} onChange={setD('subjects')} options={[...ACCOUNT_NO_REQUIRED_SUBJECTS]} ariaLabel="계정과목명" searchable /></DrawerField>
            <DrawerField label="거래기관" plain><DrawerMultiSelect value={applied.banks} onChange={setD('banks')} options={[...BANKS]} ariaLabel="거래기관" searchable /></DrawerField>
            <DrawerField label="사용여부"><DrawerSelect value={applied.use} onChange={(v) => setD('use')(v as BankAccountFilter['use'])} options={[...YN]} ariaLabel="사용여부" /></DrawerField>
            <DrawerField label="개설일" plain>
              <div style={dayWrap}><PeriodPicker mode="day" value={applied.openFrom} onChange={setD('openFrom')} ariaLabel="개설일(이후)" invalid={!!periodErr} /></div>
            </DrawerField>
            <DrawerField label="만기일" plain>
              <div style={dayWrap}><PeriodPicker mode="day" value={applied.maturityTo} onChange={setD('maturityTo')} ariaLabel="만기일(이전)" invalid={!!periodErr} /></div>
              {periodErr && <p role="alert" className="m-0 mt-1 text-danger" style={{ fontSize: 12 }}>{periodErr}</p>}
            </DrawerField>
            <DrawerField label="만기여부"><DrawerSelect value={applied.matured} onChange={(v) => setD('matured')(v as BankAccountFilter['matured'])} options={[...YN]} ariaLabel="만기여부" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(EMPTY_FILTER)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E02 등록 · E06 수정 모달 ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <BankAccountFormModal mode={modal.mode} initial={modal.mode === 'edit' ? target! : undefined}
          partners={partners} onAddPartner={(p) => setPartners((ps) => [...ps, p])}
          onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── E05 삭제 확인 — 게이트는 modal.kind. AlertDialogAction 직후 onOpenChange(false) 에서만 비운다 ── */}
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
