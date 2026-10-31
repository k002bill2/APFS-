/* 일반전표 관리(ACC-003) — 회계 > 전표관리 > 일반전표 관리, route `acct-journal`.
   설계서 정본: ACC-003 슬라이드 9~11(화면·그리드·상세필터) · 17~27(이벤트 E00~E13). 청크 A = 목록 화면.

   구성(설계서 → 우리 규약):
   - 제목 "일반전표 관리"(메뉴 리프 라벨 — 설계서 "일반전표관리" 아님) · KPI 배지 행 미포함(사용자 결정 → kpis 미전달).
   - 툴바: 결재상태 칩 없음(화면설계서 — 결재 조건은 상세필터 '승인여부'로만) · 기간(전표일, 기본 전월 1일~오늘)은 상세필터에서만 편집
     · [상세필터] Sheet · 등록 콤보 [+ 전표 등록 │ ▾ 전표 업로드](설계서 독립 2버튼 → 규약) · 조회 IconBtn.
   - 그리드 = slide 10 컬럼 순서 그대로(체크박스 + 14컬럼). 목록 합계행 없음.
   - 행 선택(체크박스만, multiRow) → 결재상신(1건 이상) · 역분개/복사(정확히 1건) · 삭제 · 선택 해제.
   - 행 더블클릭/Enter(E10) = 전표등록(수정). 전표등록 = journal_entry_screen(전체 화면), ▾ 전표 업로드 = journal_upload_modal.
   - 거래처 원장(간편추가분 포함)은 페이지 state — 전표등록 거래처 검색과 업로드 거래처코드 해석이 같은 원장을 본다.

   결정·가정(보고서에도 기재)
   - 기간은 툴바 날짜칸 없이 상세필터(dayRange, risk_page_kit FilterControl 과 같은 마크업)에서만 편집한다. 첫 진입·[초기화] = 기본값.
     적용 칩 `YYYY-MM-DD ~ YYYY-MM-DD` + × (× = 기간 해제·전 기간 — 참고 투심보고 통계 specsToApplied dayRange 동작).
   - 상세필터는 **초안(draft) 방식**: 열 때 현재 조건을 복사 → [필터 적용]에서 범위 검증 후 반영(시작>종료면 차단). X·Esc 는 초안 폐기.
     형제 화면은 즉시 반영형이지만 설계서가 "적용 시 검증·차단"을 요구해서다.
   - 삭제는 **당일자(작성일 = 오늘) + 결재 미상신·반려** 전표만 가능 — 조건 밖 건이 하나라도 섞이면 **전체 중단**
     (slide 25 "다건 선택 시 당일자 아닌 건 포함되면 삭제 중단" + 리뷰 결정: 상신·승인 건은 역분개로 정정).
     안내는 상신·승인 사유("…역분개로 정정하세요.")가 당일자 사유보다 우선(deleteGateMessage).
     apfs-aggrid "게이트 필터형 벌크"(통과분만 삭제)와 반대지만 설계서 업무 규칙이 우선.
   - [조회]는 현재 조건 그대로 재조회 흉내(선택 해제 + 토스트) — 행·조건을 초기화하지 않는다(E04 "현재 조건으로 재조회"). */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { Icon } from '../../icons';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, fmt } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection, dropHiddenSelection } from '../../aggrid_selection';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellStyle, RowSelectionOptions, SelectionChangedEvent, RowDoubleClickedEvent, CellKeyDownEvent } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { SplitButton } from '../../ui/split-button';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { APPROVAL_YN, CURRENT_USER, FUND_ACCOUNTS, JOURNAL_ORIGINS, PARTNERS, demoJournals, todayStr } from './general_journal_data';
import type { ApprovalStatus, JournalOrigin, JournalRow, Partner } from './general_journal_data';
import { EMPTY_DETAIL, deleteGateMessage, canSubmit, commitJournal, commitJournals, defaultPeriod, deleteGate, journalPasses, submitForApproval, validateRange } from './general_journal_model';
import type { EntryState, JournalFilter } from './general_journal_model';
import { JournalReverseModal } from './journal_reverse_modal';
import { JournalEntryScreen } from './journal_entry_screen';
import { JournalUploadModal } from './journal_upload_modal';

const { Button, SaveButton, IconBtn, StatusBadge } = UI;

const PAGE_SIZE = 20;

/* 결재 상태 → 톤(배지 글자는 StatusBadge 가 -text 토큰) */
const APPROVAL_TONE: Record<ApprovalStatus, Tone> = { 미상신: 'muted', 상신: 'info', 승인: 'success', 반려: 'danger' };

/* ──────────────────────────────
   컬럼 — slide 10 순서 그대로. 14컬럼 내용 폭 합이 프레임(1280)보다 넓어 AUTO_SIZE_CONTENT + 긴 텍스트 maxWidth 캡.
   정렬: 금액만 우측(수량형), 순번·날짜·번호·배지·첨부 아이콘은 좌측(표 정렬 규약).
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const textCell = (p: { value: string }) => <span className="min-w-0 truncate">{p.value}</span>;

function AttachCell({ value }: { value: string[] }) {
  if (!value?.length) return null;
  return (
    <button type="button" aria-label={`첨부파일 ${String(value.length)}건 열기`} title={value.join(', ')}
      onClick={(e) => { e.stopPropagation(); toast.info(`첨부파일을 엽니다 (${value.join(', ')})`); }}
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
  /* 적요 = 잔여폭 흡수 컬럼(apfs-aggrid PR #362) — 전체 폭 모드에서 프레임이 컬럼 합보다 넓으면 우측이 비었다(2560 실측 139px).
     suppressAutoSize 가 없으면 fitCellContents 가 flex 폭을 덮어쓴다. minWidth 220 = 수정 전 내용 맞춤 실측값 */
  { field: 'memo', headerName: '적요', flex: 1, minWidth: 220, width: 220, suppressAutoSize: true, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'amount', headerName: '금액', type: 'rightAligned', cellStyle: tabNum, valueFormatter: (p) => (p.value == null ? '-' : fmt(p.value as number)) },
  { field: 'partner', headerName: '거래처', maxWidth: 220, cellStyle: flexCenter, cellRenderer: textCell },
  { field: 'approval', headerName: '결재', cellStyle: flexCenter, cellRenderer: (p: { value: ApprovalStatus }) => <StatusBadge tone={APPROVAL_TONE[p.value]} label={p.value} size="lg" /> },
  { field: 'attachments', headerName: '첨부', sortable: false, cellStyle: flexCenter, valueFormatter: (p) => (p.value?.length ? String(p.value.length) : ''), cellRenderer: AttachCell },
  { field: 'writer', headerName: '작성자', cellStyle: flexCenter },
  { field: 'origin', headerName: '전표발생구분', cellStyle: flexCenter },
  { field: 'slipNo', headerName: '전표번호', cellStyle: tabNum },
  { field: 'fundDueDate', headerName: '자금집행예정일', cellStyle: tabNum },
  { field: 'createdBy', headerName: '최초등록자', cellStyle: flexCenter },
  { field: 'updatedBy', headerName: '최종수정자', cellStyle: flexCenter },
];

/* 다중 선택 — 체크박스로만(행 본문 클릭 선택 없음). 모듈 상수(참조 안정) */
/* 결재상신 확인 문구 — 상신 가능 건수(K) 기준. N = K 면 원문 */
const submittableCount = (rows: readonly JournalRow[], ids: readonly string[]) => rows.filter((r) => ids.includes(r.id) && canSubmit(r.approval)).length;
const submitConfirmText = (n: number, k: number) => (n === k ? `선택한 ${String(n)}건의 전표를 결재 상신하시겠습니까?` : `선택한 ${String(n)}건 중 상신 가능한 ${String(k)}건을 결재 상신하시겠습니까?`);

const ROW_SELECTION: RowSelectionOptions<JournalRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* 엑셀 — 화면 컬럼과 1:1(체크박스 제외). 금액만 숫자셀 */
type XCol = { header: string; get: (r: JournalRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: '계정구분', get: (r) => r.fundAccount }, { header: '전표일', get: (r) => r.slipDate }, { header: '순번', get: (r) => r.seq },
  { header: '적요', get: (r) => r.memo }, { header: '금액', get: (r) => r.amount }, { header: '거래처', get: (r) => r.partner },
  { header: '결재', get: (r) => r.approval }, { header: '첨부', get: (r) => (r.attachments.length ? String(r.attachments.length) + '건' : '-') },
  { header: '작성자', get: (r) => r.writer }, { header: '전표발생구분', get: (r) => r.origin }, { header: '전표번호', get: (r) => r.slipNo },
  { header: '자금집행예정일', get: (r) => r.fundDueDate }, { header: '최초등록자', get: (r) => r.createdBy }, { header: '최종수정자', get: (r) => r.updatedBy },
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

/* PeriodPicker 트리거는 w-full — fit-content 래퍼 필수("폭" 규칙) */
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

type Detail = typeof EMPTY_DETAIL;
type Draft = Detail & { from: string; to: string };
type ModalState = null
  | { kind: 'submit'; ids: string[] }
  | { kind: 'delete'; ids: string[] }
  | { kind: 'reverse'; id: string };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function GeneralJournalManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const [baseFrom, baseTo] = useMemo(() => defaultPeriod(today), [today]);
  const apiRef = useRef<GridApi<JournalRow> | null>(null);
  const [rows, setRows] = useState<JournalRow[]>(() => demoJournals(today));
  const rowsRef = useRef(rows); rowsRef.current = rows;
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 전표등록 전체 화면 진입 state(null = 닫힘) · 회계 전표 업로드 모달 */
  const [entry, setEntry] = useState<EntryState | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  /* 거래처 원장 — 간편추가분이 페이지 수명 동안 남는다 */
  const [partners, setPartners] = useState<Partner[]>(() => [...PARTNERS]);
  const addPartner = useCallback((p: Partner) => setPartners((ps) => (ps.some((x) => x.custNo === p.custNo) ? ps : [...ps, p])), []);
  const openEntry = useCallback((e: EntryState) => { setEntry(e); }, []);
  /* 전표등록 저장 반영 — upsert(신규 채번)만 한다. 화면 닫기는 화면이 exit 애니메이션 뒤 onClose 로 알린다 */
  const saveEntry = (j: JournalRow, opts: { submit: boolean }): JournalRow => {
    const res = commitJournal(rowsRef.current, j, { submit: opts.submit, user: CURRENT_USER });
    rowsRef.current = res.rows;
    setRows(res.rows);
    return res.saved;
  };
  const openUpload = () => setUploadOpen(true);
  /* 업로드 저장 — 그룹마다 1건 일괄 채번·반영(맨 앞) */
  const saveUploads = (js: JournalRow[]) => {
    const res = commitJournals(rowsRef.current, js, CURRENT_USER);
    rowsRef.current = res.rows;
    setRows(res.rows);
  };

  /* 필터 SSOT — 기간(상세필터) · 상세 9항목 중 나머지. 결재 조건은 상세필터 '승인여부'로만 건다(화면설계서) */
  const [fFrom, setFFrom] = useState(baseFrom);
  const [fTo, setFTo] = useState(baseTo);
  const [fd, setFd] = useState<Detail>(EMPTY_DETAIL);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ ...EMPTY_DETAIL, from: baseFrom, to: baseTo });
  const [draftErr, setDraftErr] = useState<'' | 'period' | 'due'>('');
  const setD = <K extends keyof Draft>(k: K, v: Draft[K]) => { setDraft((d) => ({ ...d, [k]: v })); setDraftErr(''); };
  const openFilter = () => { setDraft({ ...fd, from: fFrom, to: fTo }); setDraftErr(''); setFilterOpen(true); };
  const resetDraft = () => { setDraft({ ...EMPTY_DETAIL, from: baseFrom, to: baseTo }); setDraftErr(''); };
  const applyDraft = () => {
    /* 한쪽만 비우면 열린 경계(참고 risk_page_kit dayRange 와 동일) — 양끝이 있을 때만 시작>종료 검증 */
    const { from, to, ...detail } = draft;
    const pe = validateRange(from, to);
    const de = validateRange(draft.dueFrom, draft.dueTo);
    if (pe || de) { setDraftErr(pe ? 'period' : 'due'); toast.error((pe || de) as string); return; }
    setFFrom(from); setFTo(to); setFd(detail);
    setFilterOpen(false);
  };

  const filter: JournalFilter = useMemo(() => ({ ...fd, from: fFrom, to: fTo }), [fd, fFrom, fTo]);
  const passes = useCallback((r: JournalRow) => journalPasses(r, filter), [filter]);
  /* 필터 변경 = 선택 전부 해제(2026-10-27 사용자 결정, 가드 filter_clears_selection) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => true, []);   // 항상 술어 평가(조건이 비면 전부 통과)
  const doesExternalFilterPass = useCallback((node: IRowNode<JournalRow>) => (node.data ? passes(node.data) : true), [passes]);
  const visible = useMemo(() => rows.filter(passes), [rows, passes]);

  /* 전표등록·업로드·상세필터·확인 팝업이 열려 있으면 뒤 목록의 등록·인쇄·내보내기 단축키를 끈다(⌘P 는 입력창에서도 발화) */
  const listKeys = modal === null && !entry && !uploadOpen && !filterOpen;
  useHotkey(HOTKEYS.register.combo, () => openEntry({ mode: 'new' }), { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: listKeys, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: listKeys, skipInDialog: true });

  /* 선택 SSOT = selIds. 데이터 갱신 후 선택 전체 복원(첫 id 만 되살리면 다건이 1건으로 준다) */
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const onGridReady = useCallback((e: GridReadyEvent<JournalRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<JournalRow>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi<JournalRow> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* E10 — 더블클릭/Enter = 전표등록(수정). 상신·승인 전표의 조회 전용 처리는 전표등록 화면이 한다 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<JournalRow>) => { if (e.data && !e.rowPinned) openEntry({ mode: 'edit', source: e.data }); }, [openEntry]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<JournalRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned) return;
    /* 선택 체크박스 컬럼의 Enter 는 체크 토글 몫 — 수정 화면을 열지 않는다 */
    if (e.column.getColId().startsWith('ag-Grid-SelectionColumn')) return;
    openEntry({ mode: 'edit', source: e.data });
  }, [openEntry]);

  const single = selCount === 1 ? rows.find((r) => r.id === selIds[0]) ?? null : null;
  /* 선택 해제 — ref 도 즉시 비운다. 같은 틱에 setRows 가 있으면 onRowDataUpdated 의 restoreSelection 이 낡은 selIdsRef 로 선택을 되살린다(실측) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };

  /* E06 결재상신 — 상신 가능 건이 하나도 없으면 모달을 열지 않는다 */
  const askSubmit = () => {
    const ids = [...selIds];
    if (!rows.some((r) => ids.includes(r.id) && canSubmit(r.approval))) { toast.error('상신 가능한 전표가 없습니다. 상신·승인 전표는 다시 상신할 수 없습니다.'); return; }
    setModal({ kind: 'submit', ids });
  };
  const commitSubmit = (ids: string[]) => () => {
    const res = submitForApproval(rowsRef.current, ids, CURRENT_USER);
    setRows(res.rows);
    clearSel();
    setModal(null);
    toast.success(`${String(res.submitted)}건 결재 상신되었습니다` + (res.skipped ? ` (상신 불가 ${String(res.skipped)}건 제외 — 이미 상신·승인된 전표)` : ''));
  };
  /* E09 삭제 — 게이트는 클릭 시점 1회 평가. 당일자 아닌 건·상신/승인 건이 섞이면 전체 중단 */
  const askDelete = () => {
    const ids = [...selIds];
    const msg = deleteGateMessage(deleteGate(rows, ids, today));
    if (msg) { toast.error(msg); return; }
    setModal({ kind: 'delete', ids });
  };
  const commitDelete = (ids: string[]) => () => {
    const del = new Set(ids);
    setRows((prev) => prev.filter((r) => !del.has(r.id)));
    clearSel();
    setModal(null);
    toast.success('삭제되었습니다');
  };
  const reverseSource = modal?.kind === 'reverse' ? rows.find((r) => r.id === modal.id) ?? null : null;

  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '적요' ? 32 : c.header === '계정구분' || c.header === '거래처' ? 26 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '일반전표');
    XLSX.writeFile(wb, '일반전표 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const rangeLabel = (a: string, b: string) => (a || b ? `${a || '…'} ~ ${b || '…'}` : '');

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="file-check" onClick={askSubmit}>결재상신</Button>
      {single && <>
        <StatusBadge tone={APPROVAL_TONE[single.approval]} label={single.approval} size="lg" />
        <Button variant="outline" size="sm" leadingIcon="refresh" onClick={() => setModal({ kind: 'reverse', id: single.id })}>역분개</Button>
        <Button variant="outline" size="sm" leadingIcon="layers" onClick={() => openEntry({ mode: 'copy', source: single })}>복사</Button>
      </>}
      <Button variant="outline" size="sm" leadingIcon="trash" onClick={askDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '전표관리', '일반전표 관리']}
      title="일반전표 관리"
      favRoute="acct-journal"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      contextActions={selActions}
      appliedFilters={[
        /* 기본값(전월 1일~오늘)으로 시작하는 기간 칩 — × = 기간 조건 해제(빈 값, 전 기간), 상세필터 [초기화]로 기본값 복원.
           참고 risk_page_kit specsToApplied dayRange(`onClear: () => f.onChange('')`)와 같은 동작 */
        { label: '기간', value: rangeLabel(fFrom, fTo), onClear: () => { setFFrom(''); setFTo(''); } },
        { label: '계정구분', value: fd.fundAccount, onClear: () => setFd((d) => ({ ...d, fundAccount: '' })) },
        { label: '승인여부', value: fd.approvedYn ? `승인 ${fd.approvedYn}` : '', onClear: () => setFd((d) => ({ ...d, approvedYn: '' })) },
        { label: '전표발생구분', value: fd.origin, onClear: () => setFd((d) => ({ ...d, origin: '' })) },
        { label: '작성자', value: fd.writer.trim(), onClear: () => setFd((d) => ({ ...d, writer: '' })) },
        { label: '거래처', value: fd.partner.trim(), onClear: () => setFd((d) => ({ ...d, partner: '' })) },
        { label: '적요', value: fd.memo.trim(), onClear: () => setFd((d) => ({ ...d, memo: '' })) },
        { label: '전표번호', value: fd.slipNo.trim(), onClear: () => setFd((d) => ({ ...d, slipNo: '' })) },
        { label: '자금집행예정기간', value: rangeLabel(fd.dueFrom, fd.dueTo), onClear: () => setFd((d) => ({ ...d, dueFrom: '', dueTo: '' })) },
      ]}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={openFilter}>상세필터</Button>
        <SplitButton label="전표 등록" leadingIcon="plus" menuLabel="전표 등록 방법 더보기" onClick={() => openEntry({ mode: 'new' })}
          items={[{ label: '전표 업로드', icon: 'upload', onSelect: openUpload }]} />
        {/* 전표등록·업로드가 열려 있으면 뒤 목록 단축키(⌥R) 바인딩을 끈다 — IconBtn 은 enabled prop 이 없어 hotkey 를 조건부로 */}
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={entry || uploadOpen ? undefined : HOTKEYS.refresh} />
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
        <AgGridReact<JournalRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={COLUMNS}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          autoSizeStrategy={AUTO_SIZE_CONTENT}   // 컬럼 폭=내용 폭(잘림 방지). 적요·계정구분·거래처는 maxWidth 캡
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          isExternalFilterPresent={isExternalFilterPresent}
          doesExternalFilterPass={doesExternalFilterPass}
          onGridReady={onGridReady}
          onModelUpdated={dropHiddenSelection}   // 상신 전이로 선택 행이 조건 밖에 나가면 선택 해제
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          overlayNoRowsTemplate="조회 조건에 해당하는 전표가 없습니다."
        />
      </div>

      {/* ── 상세필터 — slide 11 조건 9개 순서 그대로. 초안 방식([필터 적용]에서 범위 검증 후 반영) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">일반전표 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={draft.fundAccount} onChange={(v) => setD('fundAccount', v)} options={FUND_ACCOUNTS} ariaLabel="계정구분" /></DrawerField>
            <DrawerField label="기간" plain errMsg={draftErr === 'period' ? '시작일은 종료일보다 늦을 수 없습니다.' : undefined}>
              <DayRange label="기간" from={draft.from} to={draft.to} onFrom={(v) => setD('from', v)} onTo={(v) => setD('to', v)} />
            </DrawerField>
            <DrawerField label="승인여부"><DrawerSelect value={draft.approvedYn} onChange={(v) => setD('approvedYn', v as Draft['approvedYn'])} options={APPROVAL_YN} ariaLabel="승인여부" /></DrawerField>
            <DrawerField label="전표발생구분"><DrawerSelect value={draft.origin} onChange={(v) => setD('origin', v as '' | JournalOrigin)} options={JOURNAL_ORIGINS} ariaLabel="전표발생구분" /></DrawerField>
            <DrawerField label="작성자"><input type="text" value={draft.writer} onChange={(e) => setD('writer', e.target.value)} placeholder="작성자명 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="거래처"><input type="text" value={draft.partner} onChange={(e) => setD('partner', e.target.value)} placeholder="거래처명 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="적요"><input type="text" value={draft.memo} onChange={(e) => setD('memo', e.target.value)} placeholder="적요 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="전표번호"><input type="text" value={draft.slipNo} onChange={(e) => setD('slipNo', e.target.value)} placeholder="전표번호 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="자금집행예정기간" plain errMsg={draftErr === 'due' ? '시작일은 종료일보다 늦을 수 없습니다.' : undefined}>
              <DayRange label="자금집행예정기간" from={draft.dueFrom} to={draft.dueTo} onFrom={(v) => setD('dueFrom', v)} onTo={(v) => setD('dueTo', v)} />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetDraft}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={applyDraft}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E06 결재상신 확인 — 실행 버튼 = SaveButton(서버 실행 흉내, 저장 중 다이얼로그 잠금) ── */}
      {modal?.kind === 'submit' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'submit' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>결재상신 확인</AlertDialogTitle>
              <AlertDialogDescription>{submitConfirmText(modal.ids.length, submittableCount(rows, modal.ids))}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="" busyLabel="상신 중" onSubmit={() => commitSubmit(modal.ids)}>결재상신</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E09 삭제 확인 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }} onSubmit={() => commitDelete(modal.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E07 전표역분개 → 확인 시 전표등록(역분개) 진입 ── */}
      {modal?.kind === 'reverse' && reverseSource && (
        <JournalReverseModal
          onClose={() => setModal(null)}
          onConfirm={({ date, kind }) => { setModal(null); openEntry({ mode: 'reverse', source: reverseSource, reverseKind: kind, date }); }}
        />
      )}

      {/* ── 전표등록 전체 화면(신규·수정·복사·역분개) ── */}
      {entry && <JournalEntryScreen entry={entry} onSave={saveEntry} onClose={() => setEntry(null)} partners={partners} onAddPartner={addPartner} />}

      {/* ── 회계 전표 업로드(E03) ── */}
      {uploadOpen && <JournalUploadModal partners={partners} onSave={saveUploads} onClose={() => setUploadOpen(false)} />}
    </GridFrame>
  );
}
