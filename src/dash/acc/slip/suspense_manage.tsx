/* 미결계정 관리(ACC-005) — 회계 > 전표관리 > 미결계정 관리, route `acct-suspense`.
   골격 정본 = 같은 중분류 general_journal_manage.tsx(툴바·선택 바·상세필터 드로어·칩·푸터·엑셀).

   구성(설계서 → 우리 규약)
   - 제목 "미결계정 관리"(메뉴 리프 라벨) · KPI 배지 행 미포함 · 명세 팝업·카드뷰 없음.
   - 툴바: [상세필터] · 조회(IconBtn, 맨 끝). 처리 버튼 [정리][정리취소][채권채무상계][거래처 계좌 변경]은 행 선택 시 선택 바에 노출,
     조건 불충족이면 disabled(게이트 = suspense_model canClear·canCancel·canOffset·canChangeAccount).
   - 그리드 15컬럼 + 다중 체크박스(체크박스로만 선택). 계좌정보·예금주는 채무 건만, 채권 건은 '-'.
   - 발생전표번호·정리전표번호 셀 클릭(E09) = 전표상세(journal_entry_screen readOnly — [닫기]만).
     전표는 페이지 상태 맵(fixture + 정리/상계로 생성분, 정리취소 시 삭제)에서 찾는다.
   - 상세필터 7개(초안 방식 — [필터 적용]에서 범위 검증). 기본값 = 정리여부 부 · 발생기간 2022-01-01~오늘(진입·[초기화]).
   결정·가정
   - 정리 칸(정리일·정리전표번호·정리결재상태)은 최근 정리전표, 정리금액은 누적정리금액을 보인다(부분정리 진행이 보이게).
   - 거래처 필터는 검색 팝업에서 고른 거래처명과 일치하는 건만(부분일치 아님). */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, fmt } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection, dropHiddenSelection } from '../../aggrid_selection';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellStyle, RowSelectionOptions, SelectionChangedEvent, CellKeyDownEvent, ICellRendererParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import type { DialogHandle } from '../../ui/dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { FUND_ACCOUNTS, PARTNERS, todayStr } from './general_journal_data';
import type { ApprovalStatus, JournalRow, Partner } from './general_journal_data';
import { validateRange } from './general_journal_model';
import { SUSPENSE_ACCOUNTS, demoSuspense } from './suspense_data';
import type { SuspenseRow } from './suspense_data';
import {
  ACCOUNT_MSG, CANCEL_MSG, CLEAR_MSG, OFFSET_MSG, bankView, canCancel, canChangeAccount, canClear, canOffset, cancelTargets, clearView,
  commitAccountChange, commitCancel, commitClear, commitOffset, defaultFilter, offsetPair, suspensePasses, validateOffset,
} from './suspense_model';
import type { ClearInput, OffsetInput, SuspenseFilter } from './suspense_model';
import { PartnerSearchModal } from './partner_search_modal';
import { JournalEntryScreen } from './journal_entry_screen';
import { SuspenseClearModal } from './suspense_clear_modal';
import { SuspenseOffsetModal } from './suspense_offset_modal';
import { SuspenseAccountModal } from './suspense_account_modal';

const { Button, SaveButton, IconBtn, StatusBadge } = UI;

const PAGE_SIZE = 20;
const APPROVAL_TONE: Record<ApprovalStatus, Tone> = { 미상신: 'muted', 상신: 'info', 승인: 'success', 반려: 'danger' };
const SUSPENSE_ACCOUNT_NAMES = SUSPENSE_ACCOUNTS.map((a) => a.name);
const CLEARED_YN = ['여', '부'] as const;

/* ──────────────────────────────
   컬럼 — 설계서 15컬럼 순서. 금액만 우측(수량형), 날짜·번호·배지는 좌측(표 정렬 규약).
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;
const badgeCell = (p: { value: string }) => (p.value === '-' || !p.value ? <span>-</span> : <StatusBadge tone={APPROVAL_TONE[p.value as ApprovalStatus]} label={p.value} size="lg" />);
const amountFmt = (p: { value: number | null }) => (p.value == null ? '-' : fmt(p.value));
/* 셀 내 링크 — 클릭 시 전표상세(E09). 출처 = iam/report/general_meeting_manage.tsx LinkCell(대분류가 달라 import 하지 않고 로컬 복제).
   ⚠ 폰트는 inline `font:'inherit'` — preflight:false라 button이 UA 기본(13.3px Arial)으로 튄다.
   외관은 목업 `.linktxt` 그대로: primary 색 + font-weight 600, 평상시 밑줄 없음 / hover에만 밑줄. */
function LinkCell({ value, hint, onClick }: { value: string; hint: string; onClick: () => void }) {
  return (
    <button
      type="button" title={hint} onClick={onClick}
      className="min-w-0 truncate text-left text-primary font-semibold no-underline hover:underline cursor-pointer"
      style={{ font: 'inherit', fontWeight: 600, fontVariantNumeric: 'tabular-nums', background: 'transparent', border: 0, padding: 0 }}>
      {value}
    </button>
  );
}
type SlipCtx = { openSlip: (colId: string, r: SuspenseRow) => void };
/* 전표번호 셀 — COLUMNS 는 모듈 상수라 클릭 핸들러를 grid context(openSlip)로 받는다 */
const slipCell = (p: ICellRendererParams<SuspenseRow, string, SlipCtx>) => (!p.value || p.value === '-' ? <span>-</span>
  : <LinkCell value={p.value} hint="전표상세 보기" onClick={() => { if (p.data && !p.node.rowPinned && p.column) p.context.openSlip(p.column.getColId(), p.data); }} />);

const SLIP_COLS = new Set(['occurSlipNo', 'clearSlipNo']);

const COLUMNS: ColDef<SuspenseRow>[] = [
  { field: 'fundAccount', headerName: '계정구분', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'partner', headerName: '거래처', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'memo', headerName: '적요', maxWidth: 260, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'accountName', headerName: '계정과목', cellStyle: flexCenter },
  { field: 'occurDate', headerName: '발생일', cellStyle: tabNum },
  { field: 'occurAmount', headerName: '발생금액', type: 'rightAligned', cellStyle: tabNum, valueFormatter: amountFmt },
  { field: 'occurSlipNo', headerName: '발생전표번호', cellStyle: { ...tabNum, ...flexCenter }, cellRenderer: slipCell },
  { field: 'occurApproval', headerName: '발생결재상태', cellStyle: flexCenter, cellRenderer: badgeCell },
  { field: 'dueDate', headerName: '정리예정일', cellStyle: tabNum },
  { colId: 'clearDate', headerName: '정리일', cellStyle: tabNum, valueGetter: (p) => (p.data ? clearView(p.data).date : '-') },
  { colId: 'clearAmount', headerName: '정리금액', type: 'rightAligned', cellStyle: tabNum, valueGetter: (p) => (p.data ? clearView(p.data).amount : null), valueFormatter: amountFmt },
  { colId: 'clearSlipNo', headerName: '정리전표번호', cellStyle: { ...tabNum, ...flexCenter }, valueGetter: (p) => (p.data ? clearView(p.data).slipNo : '-'), cellRenderer: slipCell },
  { colId: 'clearApproval', headerName: '정리결재상태', cellStyle: flexCenter, valueGetter: (p) => (p.data ? clearView(p.data).approval : '-'), cellRenderer: badgeCell },
  { colId: 'bankAccount', headerName: '계좌정보', cellStyle: tabNum, valueGetter: (p) => (p.data ? bankView(p.data).bankAccount : '-') },
  { colId: 'holder', headerName: '예금주', maxWidth: 220, cellStyle: flexCenter, valueGetter: (p) => (p.data ? bankView(p.data).holder : '-'), cellRenderer: textCell },
];

/* 다중 선택 — 체크박스로만(행 본문 클릭 선택 없음). 모듈 상수(참조 안정) */
const ROW_SELECTION: RowSelectionOptions<SuspenseRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* 엑셀 — 화면 컬럼과 1:1(체크박스 제외). 금액만 숫자셀(N/A 는 빈 칸) */
type XCol = { header: string; get: (r: SuspenseRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.fundAccount }, { header: '거래처', get: (r) => r.partner }, { header: '적요', get: (r) => r.memo },
  { header: '계정과목', get: (r) => r.accountName }, { header: '발생일', get: (r) => r.occurDate }, { header: '발생금액', get: (r) => r.occurAmount },
  { header: '발생전표번호', get: (r) => r.occurSlipNo }, { header: '발생결재상태', get: (r) => r.occurApproval }, { header: '정리예정일', get: (r) => r.dueDate },
  { header: '정리일', get: (r) => clearView(r).date }, { header: '정리금액', get: (r) => clearView(r).amount ?? '' },
  { header: '정리전표번호', get: (r) => clearView(r).slipNo }, { header: '정리결재상태', get: (r) => clearView(r).approval },
  { header: '계좌정보', get: (r) => bankView(r).bankAccount }, { header: '예금주', get: (r) => bankView(r).holder },
];

/* ── 로컬 UI 조각(골드에서 복사하는 것이 규약) ── */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* plain=<div> 래퍼 — PeriodPicker(버튼 트리거)는 <label> 안에서 2회 토글된다(apfs-datepicker) */
function DrawerField({ label, plain, errMsg, children }: { label: string; plain?: boolean; errMsg?: string; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
      {errMsg && <span role="alert" className="text-danger block mt-1" style={{ fontSize: 12 }}>{errMsg}</span>}
    </Wrap>
  );
}

const dayWrap: React.CSSProperties = { width: 'fit-content', minWidth: controlMinWidth('date'), maxWidth: '100%' };

/* 범위 컨트롤 — risk_page_kit.tsx FilterControl `dayRange` 와 같은 마크업 복제(그쪽은 export 없음) */
function DayRange({ label, from, to, onFrom, onTo }: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div style={dayWrap}><PeriodPicker mode="day" value={from} onChange={(v) => onFrom(v || '')} ariaLabel={`${label} 시작일`} /></div>
      <span className="text-caption">~</span>
      <div style={dayWrap}><PeriodPicker mode="day" value={to} onChange={(v) => onTo(v || '')} ariaLabel={`${label} 종료일`} /></div>
    </div>
  );
}

type ModalState = null
  | { kind: 'clear'; ids: string[]; targets: SuspenseRow[] }   // 대상 행은 열 때 고정(반영 후 exit 동안 잔액 0 으로 바뀌어 보이지 않게)
  | { kind: 'offset'; ids: string[]; claim: SuspenseRow; debt: SuspenseRow }   // 짝 스냅샷(열 때 고정 — exit 동안 상계금액이 0 으로 바뀌지 않게). 저장 검증은 rowsRef 최신 원장
  | { kind: 'account'; id: string }
  /* 취소 대상은 열 때 고정 — 반영 후 원장에서 다시 구하면 null 이 돼 exit 애니메이션 전에 언마운트된다 */
  | { kind: 'cancel'; id: string; slipNo: string; offset: boolean; partnerLabel: string | null };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function SuspenseManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const base = useMemo(() => defaultFilter(today), [today]);
  const seed = useMemo(() => demoSuspense(), []);
  const apiRef = useRef<GridApi<SuspenseRow> | null>(null);
  const [rows, setRows] = useState<SuspenseRow[]>(seed.rows);
  const rowsRef = useRef(rows); rowsRef.current = rows;
  /* 전표 맵(전표번호 → JournalRow) — fixture + 정리/상계 생성분. 전표상세(E09)가 여기서 찾는다 */
  const [slips, setSlips] = useState<Record<string, JournalRow>>(seed.slips);
  const slipsRef = useRef(slips); slipsRef.current = slips;
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);
  const cancelRef = useRef<DialogHandle>(null);
  const [viewSlip, setViewSlip] = useState<JournalRow | null>(null);
  /* 거래처 원장(검색 팝업 간편추가분이 페이지 수명 동안 남는다) */
  const [partners, setPartners] = useState<Partner[]>(() => [...PARTNERS]);
  const addPartner = useCallback((p: Partner) => setPartners((ps) => (ps.some((x) => x.custNo === p.custNo) ? ps : [...ps, p])), []);

  /* 필터 SSOT + 상세필터 초안 */
  const [f, setF] = useState<SuspenseFilter>(base);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<SuspenseFilter>(base);
  const [draftErr, setDraftErr] = useState<'' | 'occur' | 'clear'>('');
  const [partnerPick, setPartnerPick] = useState(false);
  const setD = <K extends keyof SuspenseFilter>(k: K, v: SuspenseFilter[K]) => { setDraft((d) => ({ ...d, [k]: v })); setDraftErr(''); };
  const openFilter = () => { setDraft(f); setDraftErr(''); setFilterOpen(true); };
  const resetDraft = () => { setDraft(base); setDraftErr(''); };
  const applyDraft = () => {
    const oe = validateRange(draft.occurFrom, draft.occurTo);
    const ce = validateRange(draft.clearFrom, draft.clearTo);
    if (oe || ce) { setDraftErr(oe ? 'occur' : 'clear'); toast.error((oe || ce) as string); return; }
    setF(draft);
    setFilterOpen(false);
  };
  const clearF = (patch: Partial<SuspenseFilter>) => setF((x) => ({ ...x, ...patch }));

  const passes = useCallback((r: SuspenseRow) => suspensePasses(r, f), [f]);
  /* 필터 변경 = 선택 전부 해제(2026-10-27 사용자 결정, 가드 filter_clears_selection) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => true, []);
  const doesExternalFilterPass = useCallback((node: IRowNode<SuspenseRow>) => (node.data ? passes(node.data) : true), [passes]);
  const visible = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 전표상세가 열려 있으면 뒤 목록 단축키를 끈다 */
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !viewSlip });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !viewSlip });

  /* 선택 SSOT = selIds. 데이터 갱신 후 선택 전체 복원 */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<SuspenseRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<SuspenseRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<SuspenseRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);

  /* E09 — 발생전표번호·정리전표번호 셀 클릭(키보드 Enter 동일) = 전표상세(조회 전용) */
  const openSlipCell = useCallback((colId: string, r: SuspenseRow) => {
    if (!SLIP_COLS.has(colId)) return;
    const no = colId === 'occurSlipNo' ? r.occurSlipNo : clearView(r).slipNo;
    if (no === '-') return;
    const j = slipsRef.current[no];
    if (j) setViewSlip(j); else toast.error('전표를 찾을 수 없습니다.');
  }, []);
  const gridContext = useMemo<SlipCtx>(() => ({ openSlip: openSlipCell }), [openSlipCell]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SuspenseRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned) return;
    openSlipCell(e.column.getColId(), e.data);
  }, [openSlipCell]);

  /* 선택 해제 — ref 도 즉시 비운다(같은 틱 setRows 의 restoreSelection 이 낡은 선택을 되살리지 않게) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };

  /* 게이트 — 선택이 바뀔 때마다 평가(조건 불충족 = disabled) */
  const gate = {
    clear: canClear(rows, selIds), cancel: canCancel(rows, selIds),
    offset: canOffset(rows, selIds), account: canChangeAccount(rows, selIds),
  };

  /* ① 정리 */
  const saveClear = (ids: string[]) => (input: ClearInput) => {
    const res = commitClear(rowsRef.current, slipsRef.current, ids, input);
    rowsRef.current = res.rows; slipsRef.current = res.slips;
    clearSel();
    setRows(res.rows); setSlips(res.slips);
    toast.success(CLEAR_MSG.success);
  };
  /* ② 상계 — 검증은 저장 시점 원장(rowsRef)으로 */
  const askOffset = () => {
    const ids = [...selIds];
    const p = offsetPair(rows, ids);
    if (p) setModal({ kind: 'offset', ids, claim: p.claim, debt: p.debt });
  };
  const saveOffset = (ids: string[]) => (input: OffsetInput) => {
    const res = commitOffset(rowsRef.current, slipsRef.current, ids, input);
    if (!res) return;
    rowsRef.current = res.rows; slipsRef.current = res.slips;
    clearSel();
    setRows(res.rows); setSlips(res.slips);
    toast.success(OFFSET_MSG.success);
  };
  const staleOffset = (message: string) => { toast.error(message); clearSel(); setRows([...rowsRef.current]); };
  /* ③ 계좌번호 변경 */
  const accountTarget = modal?.kind === 'account' ? rows.find((r) => r.id === modal.id) ?? null : null;
  const saveAccount = (id: string) => (accountNo: string) => {
    const next = commitAccountChange(rowsRef.current, id, accountNo);
    rowsRef.current = next;
    setRows(next);
    toast.success(ACCOUNT_MSG.success);
  };
  /* E03 정리취소 — 상계 건이면 짝 건·상계전표 함께. 닫기는 AlertDialog 핸들(exit 애니메이션 후 onOpenChange) */
  const askCancel = () => {
    const id = selIds[0];
    const t = cancelTargets(rows, id);
    if (!t) return;
    const mate = rows.find((r) => t.ids.includes(r.id) && r.id !== id);
    setModal({ kind: 'cancel', id, slipNo: t.slipNo, offset: t.offset, partnerLabel: mate ? `${mate.partner} · ${mate.accountName} · ${mate.occurSlipNo}` : null });
  };
  const commitCancelAt = (id: string) => () => {
    const res = commitCancel(rowsRef.current, slipsRef.current, id);
    if (res) {
      rowsRef.current = res.rows; slipsRef.current = res.slips;
      clearSel();
      setRows(res.rows); setSlips(res.slips);
      toast.success(CANCEL_MSG.success);
    }
    cancelRef.current?.close();
  };

  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '적요' ? 32 : c.header === '계정구분' || c.header === '거래처' ? 26 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '미결계정');
    XLSX.writeFile(wb, '미결계정 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const rangeLabel = (a: string, b: string) => (a || b ? `${a || '…'} ~ ${b || '…'}` : '');

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="file-check" disabled={!gate.clear} onClick={() => setModal({ kind: 'clear', ids: [...selIds], targets: rows.filter((r) => selIds.includes(r.id)) })}>정리</Button>
      <Button variant="outline" size="sm" leadingIcon="refresh" disabled={!gate.cancel} onClick={askCancel}>정리취소</Button>
      <Button variant="outline" size="sm" leadingIcon="layers" disabled={!gate.offset} onClick={askOffset}>채권채무상계</Button>
      <Button variant="outline" size="sm" leadingIcon="wallet" disabled={!gate.account} onClick={() => setModal({ kind: 'account', id: selIds[0] })}>거래처 계좌 변경</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '미결계정 관리']}
      title="미결계정 관리"
      favRoute="acct-suspense"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={[
        { label: '계정구분', value: f.fundAccount, onClear: () => clearF({ fundAccount: '' }) },
        { label: '거래처', value: f.partner, onClear: () => clearF({ partner: '' }) },
        { label: '적요', value: f.memo.trim(), onClear: () => clearF({ memo: '' }) },
        { label: '계정과목', value: f.accountName, onClear: () => clearF({ accountName: '' }) },
        { label: '발생기간', value: rangeLabel(f.occurFrom, f.occurTo), onClear: () => clearF({ occurFrom: '', occurTo: '' }) },
        { label: '정리기간', value: rangeLabel(f.clearFrom, f.clearTo), onClear: () => clearF({ clearFrom: '', clearTo: '' }) },
        { label: '정리여부', value: f.clearedYn ? `정리 ${f.clearedYn}` : '', onClear: () => clearF({ clearedYn: '' }) },
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={openFilter}>상세필터</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={viewSlip ? undefined : HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(visible.length) + '건 중 ' + String(Math.min(shown, visible.length)) + '건 표시'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<SuspenseRow>
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
          onModelUpdated={dropHiddenSelection}   // 정리로 선택 행이 조건(정리여부 부) 밖에 나가면 선택 해제
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          context={gridContext}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate="조회 조건에 해당하는 미결 건이 없습니다."
        />
      </div>

      {/* ── 상세필터 7개 — 초안 방식([필터 적용]에서 범위 검증 후 반영) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">미결계정 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={draft.fundAccount} onChange={(v) => setD('fundAccount', v)} options={FUND_ACCOUNTS} ariaLabel="계정구분" /></DrawerField>
            <DrawerField label="거래처" plain>
              <div className="flex items-center gap-2">
                <input type="text" readOnly value={draft.partner} placeholder="검색으로 선택" aria-label="거래처" style={{ ...inputStyle('text'), background: 'var(--muted)' }} />
                <Button variant="outline" size="sm" leadingIcon="search" onClick={() => setPartnerPick(true)}>검색</Button>
                {draft.partner && <IconBtn icon="x" label="거래처 선택 해제" size={32} onClick={() => setD('partner', '')} />}
              </div>
            </DrawerField>
            <DrawerField label="적요"><input type="text" value={draft.memo} onChange={(e) => setD('memo', e.target.value)} placeholder="적요 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="계정과목"><DrawerSelect value={draft.accountName} onChange={(v) => setD('accountName', v)} options={SUSPENSE_ACCOUNT_NAMES} ariaLabel="계정과목" /></DrawerField>
            <DrawerField label="발생기간" plain errMsg={draftErr === 'occur' ? '시작일은 종료일보다 늦을 수 없습니다.' : undefined}>
              <DayRange label="발생기간" from={draft.occurFrom} to={draft.occurTo} onFrom={(v) => setD('occurFrom', v)} onTo={(v) => setD('occurTo', v)} />
            </DrawerField>
            <DrawerField label="정리기간" plain errMsg={draftErr === 'clear' ? '시작일은 종료일보다 늦을 수 없습니다.' : undefined}>
              <DayRange label="정리기간" from={draft.clearFrom} to={draft.clearTo} onFrom={(v) => setD('clearFrom', v)} onTo={(v) => setD('clearTo', v)} />
            </DrawerField>
            <DrawerField label="정리여부"><DrawerSelect value={draft.clearedYn} onChange={(v) => setD('clearedYn', v as SuspenseFilter['clearedYn'])} options={CLEARED_YN} ariaLabel="정리여부" /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetDraft}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={applyDraft}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {partnerPick && (
        <PartnerSearchModal open onOpenChange={(o) => { if (!o) setPartnerPick(false); }}
          onSelect={(p) => setD('partner', p.name)} initialKeyword={draft.partner}
          list={partners} onAdd={addPartner} />
      )}

      {/* ── ① 미결계정정리 ── */}
      {modal?.kind === 'clear' && modal.targets.length > 0 && (
        <SuspenseClearModal targets={modal.targets} onSave={saveClear(modal.ids)} onClose={() => setModal(null)} />
      )}

      {/* ── ② 채권채무상계 ── */}
      {modal?.kind === 'offset' && (
        <SuspenseOffsetModal claim={modal.claim} debt={modal.debt}
          validate={(input) => validateOffset(rowsRef.current, modal.ids, input.date, today)}
          onSave={saveOffset(modal.ids)} onStale={staleOffset} onClose={() => setModal(null)} />
      )}

      {/* ── ③ 계좌번호 변경 ── */}
      {modal?.kind === 'account' && accountTarget && (
        <SuspenseAccountModal target={accountTarget} onSave={saveAccount(accountTarget.id)} onClose={() => setModal(null)} />
      )}

      {/* ── E03 정리취소 확인 — 실행 = SaveButton, 닫기 = 핸들 close(exit 애니메이션 후 onOpenChange) ── */}
      {modal?.kind === 'cancel' && (
        <AlertDialog ref={cancelRef} open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'cancel' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>정리취소 확인</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 1건의 정리를 취소하시겠습니까?
                {modal.offset && modal.partnerLabel && (
                  <span className="block mt-2">
                    {`상계 건입니다 — 짝 건(${modal.partnerLabel})과 상계전표 ${modal.slipNo}도 함께 취소됩니다.`}
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel autoFocus>취소</AlertDialogCancel>
              <SaveButton leadingIcon="" busyLabel="취소 중" onSubmit={() => commitCancelAt(modal.id)}>정리취소</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E09 전표상세(조회 전용) ── */}
      {viewSlip && (
        <JournalEntryScreen entry={{ mode: 'edit', source: viewSlip }} readOnly onSave={(j) => j}
          onClose={() => setViewSlip(null)} partners={partners} />
      )}
    </GridFrame>
  );
}
