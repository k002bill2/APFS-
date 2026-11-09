/* 출자금현황 정보관리 — 관리형 리스트 페이지 (회계 > 자금관리 > 출자금현황 정보관리, route acct-contribution-status, 화면ID ACC-022).
   출처: ACC-022 화면설계서(2026.10.26 v1.0) slide 9~25 → APFS 디자인시스템(account_code_manage · deleted_journal_manage 골격).

   구성(설계서 → 우리 규약):
   - 툴바: 필수 칩 그룹 '보기'(일반 · 관리보수·비관리보수 적용 — 설계서 "탭" → GridFrame filterChips required, 전체 칩 없음)
       → 단위(캡션 '단위: X' + SegTabs 원·천원·백만원) → [상세필터](E01) → [Σ 합계](E03, UI.Button pressed 토글)
       → SplitButton [+ 출자등록 │ ▾ 분배등록 · 엑셀 일괄등록](E04·E05·E06) → 조회(E02, 맨 끝). 설계서의 독립 3버튼은 등록 콤보 규약으로 묶는다.
       단위·합계는 행을 거르지 않는 표시 옵션이라 툴바 우측 토글 — 필터 칩 줄·상세필터에 두지 않는다(2026-11-09 사용자 결정, 계좌잔액 소계표시와 같은 모양).
   - 보기 '일반' = 설계서 와이어프레임 10열(계정구분·기준일·차수·구분·출자원금·분배원금(A)·수익(B)·총분배(A+B)·성과보수(D)·출자잔액).
     '관리보수·비관리보수 적용' = 컬럼 정의 표(slide 10 ②) 전 항목 — 원천세(C)·초과인센티브(E)·실지급액 3종을 더하고 2단 헤더(분배·보수·실지급액)로 묶는다.
   - 그리드: 체크박스 다중 선택 → 선택 바 [수정](1건, E07)·[삭제]·[선택 해제](E08). 행 더블클릭 / Enter = 그 행 구분의 등록 모달(수정, E07).
       차수·기준일·코드는 좌측, 금액만 우측. 차수 미채번 = '-'. 빈 결과 = '조회된 데이터가 없습니다.'(slide 17).
   - 상세필터 드로어 3개(계정구분·구분·기준일(기간)) — 즉시 반영, [필터 적용] = 닫기. 기간 시작 > 종료 = 두 칸 invalid + 안내 + 0건.
       적용 칩 = 값만(× 개별 해제). 단위(툴바)는 표시·엑셀만 환산하고 잔액·합계 계산은 원 단위로 한다. [초기화]는 단위를 건드리지 않는다.
   - 합계(Σ) 행 = 현재 조회 결과(필터 후)의 금액 컬럼 합(원으로 합산 후 환산). 출자잔액은 누계라 합계 '-'.
   - 삭제 = 논리삭제(목록에서 빼서 deleted state 로) → 이후 출자잔액 자동 재계산. 확인 문구 '선택한 N건을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.'
   - 푸터: 새 창(E09)·내보내기(E10, ⌥D)·인쇄(E11, printGrid). 내보내기 = 현재 보기의 표시 컬럼 · 현재 단위로 환산한 숫자 셀.
   결정·가정(PM 확인 필요 목록은 보고서에 기재):
   - 출자잔액 순서: 계정별 기준일 → 같은 날 출자 먼저 → 회차 → id(contribution_model compareInAccount).
   - 회차: 계정·구분별 자동 채번(출자 회차와 분배 회차를 따로 센다). 와이어프레임은 분배 행 차수를 비워 그렸지만 slide 13 분배 모달에 회차(자동)가 있어 채운다.
   - "권한 보유자만 노출"(내보내기·인쇄) → RBAC 없음, 항상 노출. 변경이력(SFR-018-01)·감사로그는 미구현.
   ⚠ 백엔드가 없어 등록·수정·삭제는 화면 로컬 상태만 바꾼다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, fmt, numStyle } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { dayWrap } from '../acc_form_helpers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, ColGroupDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions, ValueFormatterParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { SplitButton } from '../../ui/split-button';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from '../../ui/alert-dialog';
import { DrawerSelect } from '../../drawer_select';
import { ACCOUNT_FILTER_LABELS, CONTRIB_KINDS, DEFAULT_UNIT, UNITS, demoContributions } from './contribution_data';
import type { AccountFilterLabel, ContribKind, ContribRow, Unit } from './contribution_data';
import { CONTRIB_MSG, EMPTY_FILTER, deleteConfirmMsg, filterViews, logicalDelete, negativeBalanceAfter, sumTotals, toUnit, validatePeriod, withBalances } from './contribution_model';
import type { AmountKey, ContribFilter, ContribView } from './contribution_model';
import { ContributionFormModal } from './contribution_form_modal';
import type { ContribPatch } from './contribution_form_modal';
import { ContributionUploadModal } from './contribution_upload_modal';

const { Button, IconBtn, SegTabs } = UI;

/* 페이지 번호 버튼 — apfs-grid 푸터 골드(‹ 이전 · 번호 · 다음 ›). 공유 export 가 아니라 골드에서 복사하는 로컬 헬퍼 */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

const PAGE_SIZE = 20;
const TOTAL_ID = '__total';
const EMPTY_OVERLAY = '<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회된 데이터가 없습니다.</span>';

type View = 'basic' | 'fee';
const VIEWS: { id: View; label: string }[] = [{ id: 'basic', label: '일반' }, { id: 'fee', label: '관리보수·비관리보수 적용' }];

/** 그리드 행 — 데이터 행 또는 pinned 합계 행(금액만, 잔액 null) */
type GridRow = ContribView | (Partial<Omit<ContribView, 'balance'>> & { id: string; pinned: true; balance: null });
const isTotal = (r: GridRow | undefined): boolean => !!r && 'pinned' in r;

/* ──────────────────────────────
   컬럼 — 금액만 우측(수량형), 나머지 좌측(가운데 정렬 없음)
────────────────────────────── */
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const codeStyle: CellStyle = { ...flexCenter, fontVariantNumeric: 'tabular-nums' };

type AmountCol = { key: AmountKey | 'balance'; header: string; width?: number };
const A = {
  invest: { key: 'invest', header: '출자원금' },
  principal: { key: 'principal', header: '분배원금(A)' },
  income: { key: 'income', header: '수익(B)' },
  totalDist: { key: 'totalDist', header: '총분배(A+B)' },
  withholding: { key: 'withholding', header: '원천세(C)' },
  perfFee: { key: 'perfFee', header: '성과보수(D)' },
  incentive: { key: 'incentive', header: '초과인센티브(E)' },
  netAfterTax: { key: 'netAfterTax', header: '원천세차감(A+B−C)', width: 160 },
  payWithPerf: { key: 'payWithPerf', header: '성과보수 포함(A+B−C+D+E)', width: 200 },
  payWithoutPerf: { key: 'payWithoutPerf', header: '성과보수 제외(A+B−C+E)', width: 190 },
  balance: { key: 'balance', header: '출자잔액' },
} satisfies Record<string, AmountCol>;

/* 엑셀·인쇄 헤더(그룹을 펼친 이름) — 보기별 컬럼 순서 */
const BASIC_AMOUNTS: AmountCol[] = [A.invest, A.principal, A.income, A.totalDist, A.perfFee, A.balance];
const FEE_AMOUNTS: AmountCol[] = [A.invest, A.principal, A.income, A.totalDist, A.withholding, A.perfFee, A.incentive, A.netAfterTax, A.payWithPerf, A.payWithoutPerf, A.balance];
const exportHeader = (c: AmountCol, view: View) => (view === 'fee' && (c.key === 'netAfterTax' || c.key === 'payWithPerf' || c.key === 'payWithoutPerf') ? `${c.header} 실지급액` : c.header);

function buildColumns(view: View, unit: Unit): (ColDef<GridRow> | ColGroupDef<GridRow>)[] {
  const money = (p: ValueFormatterParams<GridRow>) => (p.value == null ? '-' : fmt(toUnit(p.value as number, unit)));
  /* 금액 칸이 남는 폭을 나눠 갖는다(flex:1) — 넓은 창에서 표 오른쪽 빈 공간 0(2026-11-06 사용자 지적).
     계정구분·기준일·차수·구분은 compact 고정. width = minWidth = 내용폭(apfs-aggrid ⑨: flex 컬럼 초기폭 넘침 띠 방지).
     좁은 창/관리보수 보기처럼 합이 프레임보다 넓으면 minWidth 하한 → 가로 스크롤. */
  const amount = (c: AmountCol): ColDef<GridRow> => ({
    field: c.key as any, colId: c.key, headerName: c.header, flex: 1, width: c.width ?? 150, minWidth: c.width ?? 150, type: 'rightAligned',
    valueFormatter: money, cellStyle: numStyle(c.key === 'balance') as any,
  });
  const lead: ColDef<GridRow>[] = [
    { field: 'account', headerName: '계정구분', width: 150, minWidth: 140, cellStyle: { ...flexCenter, fontWeight: 600 },
      valueFormatter: (p) => (isTotal(p.data) ? '합계' : String(p.value ?? '')) },
    { field: 'date', headerName: '기준일', width: 112, maxWidth: 120, cellStyle: codeStyle },
    { field: 'seq', headerName: '차수', width: 72, maxWidth: 84, cellStyle: codeStyle, valueFormatter: (p) => (isTotal(p.data) ? '' : p.value == null ? '-' : String(p.value)) },
    { field: 'kind', headerName: '구분', width: 84, maxWidth: 96, cellStyle: flexCenter },
  ];
  if (view === 'basic') return [...lead, ...BASIC_AMOUNTS.map(amount)];
  return [
    ...lead,
    amount(A.invest),
    { headerName: '분배', marryChildren: true, children: [A.principal, A.income, A.totalDist, A.withholding].map(amount) },
    { headerName: '보수', marryChildren: true, children: [A.perfFee, A.incentive].map(amount) },
    { headerName: '실지급액', marryChildren: true, children: [A.netAfterTax, A.payWithPerf, A.payWithoutPerf].map(amount) },
    amount(A.balance),
  ];
}

/* 다중 선택 — 체크박스로만 on/off */
const ROW_SELECTION: RowSelectionOptions<GridRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

function DrawerField({ label, children, plain }: { label: string; children: ReactNode; plain?: boolean }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </Wrap>
  );
}


/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null
  | { kind: 'form'; form: 'invest' | 'distribute'; mode: 'create' | 'edit'; id?: string }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'upload' };

let idSeq = 0;
const newId = () => `CT-N${String(++idSeq).padStart(4, '0')}`;

export function ContributionStatusManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<GridRow> | null>(null);
  const [rows, setRows] = useState<ContribRow[]>(() => demoContributions());
  const [, setDeleted] = useState<ContribRow[]>([]);   // 논리삭제분(삭제이력 화면은 설계서에 없다 — 보관만)
  const [view, setView] = useState<View>('basic');     // E00 — 보기 '일반'
  const [sumOn, setSumOn] = useState(false);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 상세필터(E01) — applied = 드로어·칩·목록 SSOT(즉시 반영) */
  const [filterOpen, setFilterOpen] = useState(false);
  const [applied, setApplied] = useState<ContribFilter>(EMPTY_FILTER);
  const setF = <K extends keyof ContribFilter>(k: K) => (v: ContribFilter[K]) => setApplied((a) => ({ ...a, [k]: v }));
  const periodErr = validatePeriod(applied.from, applied.to);
  const [unit, setUnit] = useState<Unit>(DEFAULT_UNIT);   // 표시 옵션(툴바) — 필터 상태 아님

  const listKeys = modal === null && !filterOpen;
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', form: 'invest', mode: 'create' }), { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  /* 잔액은 전체 행으로 계산한 뒤 거른다 — 기간·구분 필터를 걸어도 이력 기준 잔액 */
  const views = useMemo(() => withBalances(rows), [rows]);
  const visible = useMemo(() => filterViews(views, applied), [views, applied]);
  const totals = useMemo(() => sumTotals(visible), [visible]);
  const pinned = useMemo<GridRow[]>(() => (sumOn ? [{ id: TOTAL_ID, pinned: true, ...totals, balance: null }] : []), [sumOn, totals]);
  const columnDefs = useMemo(() => buildColumns(view, unit), [view, unit]);

  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  /* 필터를 바꾸면 선택 해제(apfs-detail-filter).
     ref 를 먼저 비운다 — 안 비우면 뒤이은 rowData 갱신의 restoreSelection 이 낡은 ref 로 통과 행을 되살린다 */
  useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [applied]);
  const onGridReady = useCallback((e: GridReadyEvent<GridRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<GridRow>) => {
    setSelIds(e.api.getSelectedRows().filter((r) => !isTotal(r)).map((r) => r.id));
  }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<GridRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E07 — 그 행 구분의 등록 모달(수정) */
  const openEdit = useCallback((r: GridRow | undefined) => {
    if (!r || isTotal(r)) return;
    const v = r as ContribView;
    setModal({ kind: 'form', form: v.kind === '출자' ? 'invest' : 'distribute', mode: 'edit', id: v.id });
  }, []);
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<GridRow>) => { if (!e.rowPinned) openEdit(e.data); }, [openEdit]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<GridRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || e.rowPinned) return;
    if (e.column.getColId().startsWith('ag-Grid-SelectionColumn')) return;   // 체크 토글 몫
    openEdit(e.data);
  }, [openEdit]);

  const target = modal?.kind === 'form' && modal.id ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* E04·E05·E07 저장 — 원천세(C)는 입력칸이 없어 신규 0, 수정은 기존값 유지 */
  const save = (patch: ContribPatch, editId?: string) => {
    if (editId) setRows((prev) => prev.map((r) => (r.id === editId ? { ...r, ...patch } : r)));
    else setRows((prev) => [...prev, { ...patch, id: newId(), withholding: 0 }]);
  };

  /* E06 반영 — 통과분만 */
  const applyUpload = (added: ContribRow[]) => setRows((prev) => [...prev, ...added]);
  const makeUploadId = useCallback((i: number) => `CT-U${String(idSeq + 1 + i).padStart(4, '0')}`, []);
  const onUploadApply = (added: ContribRow[]) => { idSeq += added.length; applyUpload(added); };

  /* E08 삭제 — 논리삭제. 닫기는 AlertDialog onOpenChange 가 맡는다(exit 애니메이션 보존) */
  /* 음수 게이트 — 삭제 후 남은 분배가 출자원금잔액을 음수로 만들면 막는다(삭제 버튼 시점 · 확정 시점 이중) */
  const deleteBlocked = (ids: string[]) => negativeBalanceAfter(logicalDelete(rows, [], ids).rows).length > 0;
  const askDelete = () => {
    if (deleteBlocked(selIds)) { toast.error(CONTRIB_MSG.deleteNegative); return; }
    setModal({ kind: 'delete', ids: selIds });
  };
  const doDelete = (ids: string[]) => {
    if (deleteBlocked(ids)) { toast.error(CONTRIB_MSG.deleteNegative); return; }
    const next = logicalDelete(rows, [], ids);
    setRows(next.rows);
    setDeleted((d) => [...d, ...next.deleted]);
    apiRef.current?.deselectAll();
    toast.success('삭제되었습니다');
  };

  /* E02 조회 — 백엔드가 없어 로컬 상태(등록·삭제 결과·필터)를 유지하고 선택만 푼다 */
  const refresh = () => { apiRef.current?.deselectAll(); apiRef.current?.paginationGoToFirstPage(); window.scrollTo({ top: 0 }); toast.success('조회되었습니다'); };

  /* E10 내보내기 — 현재 보기의 표시 컬럼, 금액은 현재 단위로 환산한 숫자 셀 */
  const exportExcel = () => {
    const amounts = view === 'basic' ? BASIC_AMOUNTS : FEE_AMOUNTS;
    const head = ['계정구분', '기준일', '차수', '구분', ...amounts.map((c) => exportHeader(c, view) + (unit === '원' ? '' : `(${unit})`))];
    const body = visible.map((r) => [r.account, r.date, r.seq == null ? '-' : String(r.seq), r.kind, ...amounts.map((c) => toUnit(r[c.key], unit))]);
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    body.forEach((_, ri) => amounts.forEach((__, ai) => {
      const cell = ws[XLSX.utils.encode_cell({ r: ri + 1, c: 4 + ai })];
      if (cell) { cell.t = 'n'; cell.z = '#,##0'; }
    }));
    ws['!cols'] = head.map((h, i) => ({ wch: i === 0 ? 18 : i < 4 ? 10 : Math.max(16, h.length + 4) }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '출자금현황');
    XLSX.writeFile(wb, '출자금현황.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const chips: [string, string, () => void][] = [
    ['계정구분', applied.account, () => setApplied((a) => ({ ...a, account: '' }))],
    ['구분', applied.kind, () => setApplied((a) => ({ ...a, kind: '' }))],
    ['기준일', applied.from || applied.to ? `${applied.from || '…'} ~ ${applied.to || '…'}` : '', () => setApplied((a) => ({ ...a, from: '', to: '' }))],
  ];

  /* E07 선택 바 [수정] — 1건 선택 시 행 더블클릭과 같은 그 행 구분의 수정 모달 */
  const editSelected = () => {
    const r = selIds.length === 1 ? rows.find((x) => x.id === selIds[0]) : undefined;
    if (r) setModal({ kind: 'form', form: r.kind === '출자' ? 'invest' : 'distribute', mode: 'edit', id: r.id });
  };
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {selCount === 1 && <Button variant="primary" size="sm" leadingIcon="file" onClick={editSelected}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onClick={askDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '자금관리', '출자금현황 정보관리']}
      title="출자금현황 정보관리"
      favRoute="acct-contribution-status"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      filterChips={VIEWS.map((v) => ({ key: v.id, label: v.label, active: view === v.id, onSelect: () => setView(v.id), required: true }))}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      toolbarRight={<>
        {/* 금액 단위 — 표시 옵션(fund_stats 선례: 캡션 + SegTabs) */}
        <span className="text-caption" style={{ fontSize: 12 }}>{`단위: ${unit}`}</span>
        <SegTabs size="sm" value={unit} onChange={(v: Unit) => setUnit(v)} options={UNITS.map((u) => ({ value: u, label: u }))} />
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* E03 합계 — 표시 옵션 토글(aria-pressed) */}
        <Button variant="outline" size="sm" leadingIcon="sigma" pressed={sumOn} onClick={() => setSumOn((v) => !v)}>합계</Button>
        {/* E04 출자등록 · ▾ E05 분배등록 · E06 엑셀 일괄등록 */}
        <SplitButton label="출자등록" leadingIcon="plus" menuLabel="등록 방법 더보기" onClick={() => setModal({ kind: 'form', form: 'invest', mode: 'create' })}
          items={[
            { label: '분배등록', icon: 'plus', onSelect: () => setModal({ kind: 'form', form: 'distribute', mode: 'create' }) },
            { label: '엑셀 일괄등록', icon: 'upload', onSelect: () => setModal({ kind: 'upload' }) },
          ]} />
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
        <AgGridReact<GridRow>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pinnedBottomRowData={pinned}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate={EMPTY_OVERLAY}
        />
      </div>

      {/* ── 상세필터(E01) — 4개 조건, 즉시 반영 ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">출자금현황 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={applied.account} onChange={(v) => setF('account')(v as AccountFilterLabel | '')} options={[...ACCOUNT_FILTER_LABELS]} ariaLabel="계정구분" /></DrawerField>
            <DrawerField label="구분"><DrawerSelect value={applied.kind} onChange={(v) => setF('kind')(v as ContribKind | '')} options={[...CONTRIB_KINDS]} ariaLabel="구분" /></DrawerField>
            <DrawerField label="기준일" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.from} onChange={(v) => setF('from')(v || '')} ariaLabel="기준일 시작일" invalid={!!periodErr} /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={applied.to} onChange={(v) => setF('to')(v || '')} ariaLabel="기준일 종료일" invalid={!!periodErr} /></div>
              </div>
              {periodErr && <p role="alert" className="m-0 mt-1 text-danger" style={{ fontSize: 12 }}>{periodErr}</p>}
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={() => setApplied(EMPTY_FILTER)}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 출자등록·분배등록(E04·E05) / 수정(E07) ── */}
      {modal?.kind === 'form' && (modal.mode === 'create' || target) && (
        <ContributionFormModal key={`${modal.form}-${modal.id ?? 'new'}`} kind={modal.form} mode={modal.mode} initial={modal.mode === 'edit' ? target ?? undefined : undefined}
          rows={rows} onSave={save} onClose={() => setModal(null)} />
      )}

      {/* ── 엑셀 일괄등록(E06) ── */}
      {modal?.kind === 'upload' && (
        <ContributionUploadModal rows={rows} makeId={makeUploadId} onApply={onUploadApply} onClose={() => setModal(null)} />
      )}

      {/* ── 삭제 확인(E08) — 게이트는 modal.kind, 닫기는 onOpenChange 에서만 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>{deleteConfirmMsg(modal.ids.length)}</AlertDialogDescription>
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
