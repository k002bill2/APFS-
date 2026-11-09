/* 결산전표 관리(ACC-015) — 회계 > 결산관리 > 결산전표 관리, route `acct-closing-journal`.
   설계서 정본: ACC-015 슬라이드 9~11(개요·화면·그리드·상세필터) · 12~14(전표등록·거래처 검색·계정과목 검색) · 16~23(이벤트 E00~E10).
   일반전표 관리(ACC-003 general_journal_manage)와 같은 구성 + 차이 3가지(전표발생구분 가결산/결산 · 가결산 환원전표 자동 생성 · 필수값 검증 예외).

   구성(설계서 → 우리 규약):
   - 제목 "결산전표 관리"(메뉴 리프 라벨 — 설계서 "결산전표관리" 아님) · KPI 배지 행 미포함(사용자 결정 → kpis 미전달).
   - 툴바: [상세필터] Sheet · [+ 전표 등록](설계서 [등록] — 업로드가 없어 콤보가 아닌 독립 버튼, 라벨은 도메인 액션명) · 조회 IconBtn.
     결재상태 칩 없음(ACC-003 과 동일 — 결재 조건은 상세필터 '승인여부'로만). 기간(전표일, 기본 전월 1일~오늘)은 상세필터에서만 편집.
   - 그리드 = slide 10 컬럼 순서 그대로(체크박스 + 14컬럼, ACC-003 컬럼 정의 관용구). 목록 합계행 없음.
   - 행 선택(체크박스만, multiRow) → 선택 바 결재상신(1건+) · 삭제 · 선택 해제(설계서 액션 바 → GridFrame contextActions).
   - 행 더블클릭/Enter(E07) = 전표등록(수정) — 공용 journal_entry_screen 에 closing prop(가결산/결산 셀렉트·완화 검증).
     상신·승인 전표는 조회 전용(isReadOnlyEntry). 환원전표는 결재와 무관하게 조회 전용(readOnly prop — 원전표 저장으로만 바뀐다).
   - 푸터: 새 창·내보내기(엑셀 ⌥D)·인쇄 = FooterActions(ACC-003 과 같음). 설계서 "인쇄·다운로드 권한 보유자만"은 RBAC 데모가 없어 항상 노출.
   - 거래처 검색·계정과목 검색 팝업은 전표등록 화면이 쓰는 공용 것 그대로(partner_search_modal · account_search_modal).

   결정·가정(보고서에도 기재)
   - 업무 규칙은 closing_journal_model(쌍 연결 pairId + 전표번호 `-R`, 환원 전표일 = 다음날, 쌍 상신·쌍 삭제, 원전표 수정 시 환원 재생성).
   - 상세필터는 즉시 반영(사용자 지시 2026-11-04 — ACC-003 general_journal_manage 와 같은 구조): 드로어 컨트롤이 적용 state 를 바로 바꾸고
     [필터 적용] = 닫기(X·Esc·바깥 클릭으로 닫아도 값 유지), [초기화] = 기본값(기간 전월 1일~오늘·나머지 빈 값) 복원.
     기간·자금집행예정기간 시작>종료 = 그 칸 invalid + 아래 안내(validateRange 렌더마다) + 결과 0건(막지 않고 표시만 — apfs-detail-filter 규약).
     전표발생구분 선택지 = 전체/가결산/가결산(환원)/결산(CLOSING_ORIGINS — 일반전표 JOURNAL_ORIGINS 와 별개).
   - 삭제 = 결재 미상신·반려만(당일자 조건 없음 — ACC-003 과 다름). 조건 밖 건이 하나라도 섞이면 전체 중단 + 안내(설계서 업무 규칙 우선).
     쌍 중 하나만 골라도 짝을 같이 지운다 — 확인 문구 뒤에 쌍 안내 1문장을 덧붙인다(쌍이 섞였을 때만).
   - 결재상신 확인 문구 = 설계서 원문("선택한 전표를 결재 상신하시겠습니까?") + 쌍이 섞였을 때만 쌍 안내 1문장. 불가 건은 skip 후 건수 안내(ACC-003 관용구).
   - [조회]는 현재 조건 그대로 재조회 흉내(선택 해제 + 토스트). */
import '../../aggrid_shared.css';   // 합계(floating) 행 opacity:0 stuck 버그 보정(공유)
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from '../../components';
import type { Tone } from '../../components';
import { Icon } from '../../icons';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, AUTO_SIZE_CONTENT, fmt } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection, dropHiddenSelection } from '../../aggrid_selection';
import { controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, IRowNode, CellStyle, RowSelectionOptions, SelectionChangedEvent, RowDoubleClickedEvent, CellKeyDownEvent } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { PeriodPicker } from '../../ui/period-picker';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { DrawerSelect } from '../../drawer_select';
import { APPROVAL_YN, CURRENT_USER, FUND_ACCOUNTS, PARTNERS, todayStr } from '../slip/general_journal_data';
import type { ApprovalStatus, JournalOrigin, JournalRow, Partner } from '../slip/general_journal_data';
import { EMPTY_DETAIL, defaultPeriod, journalPasses, validateRange } from '../slip/general_journal_model';
import type { EntryState, JournalFilter } from '../slip/general_journal_model';
import { JournalEntryScreen } from '../slip/journal_entry_screen';
import { CLOSING_DELETE_LOCKED_MSG, CLOSING_ENTRY_ORIGINS, CLOSING_ORIGINS, closingDeleteGate, closingVisibleIds, commitClosing, deleteClosing, expandPairs, hasSubmittable, submitClosing } from './closing_journal_model';
import type { ClosingRow } from './closing_journal_model';
import { demoClosingJournals } from './closing_journal_data';

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

/* 전표등록 closing prop — 모듈 상수(참조 안정) */
const CLOSING_ENTRY = { origins: CLOSING_ENTRY_ORIGINS } as const;
/* 쌍 안내 — 선택이 짝까지 확장될 때만 확인 문구 뒤에 붙인다 */
const PAIR_NOTE = { submit: '가결산 원전표·환원전표는 한 쌍으로 함께 상신됩니다.', delete: '가결산 원전표·환원전표는 한 쌍으로 함께 삭제됩니다.' } as const;

/* 다중 선택 — 체크박스로만(행 본문 클릭 선택 없음). 모듈 상수(참조 안정) */
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
function DayRange({ label, from, to, onFrom, onTo, invalid }: { label: string; from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void; invalid?: boolean }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div style={dayWrap}><PeriodPicker mode="day" value={from} onChange={(v) => onFrom(v || '')} ariaLabel={`${label} 시작일`} invalid={invalid} /></div>
      <span className="text-caption">~</span>
      <div style={dayWrap}><PeriodPicker mode="day" value={to} onChange={(v) => onTo(v || '')} ariaLabel={`${label} 종료일`} invalid={invalid} /></div>
    </div>
  );
}

type Detail = typeof EMPTY_DETAIL;
type ModalState = null
  | { kind: 'submit'; ids: string[]; paired: boolean }
  | { kind: 'delete'; ids: string[]; paired: boolean };

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function ClosingJournalManage({ onNav }: { onNav?: (r: string) => void }) {
  const today = useMemo(() => todayStr(), []);
  const [baseFrom, baseTo] = useMemo(() => defaultPeriod(today), [today]);
  const apiRef = useRef<GridApi<JournalRow> | null>(null);
  const [rows, setRows] = useState<ClosingRow[]>(() => demoClosingJournals(today));
  const rowsRef = useRef(rows); rowsRef.current = rows;
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });
  const [modal, setModal] = useState<ModalState>(null);

  /* 전표등록 전체 화면 진입 state(null = 닫힘) */
  const [entry, setEntry] = useState<EntryState | null>(null);
  /* 거래처 원장 — 간편추가분이 페이지 수명 동안 남는다 */
  const [partners, setPartners] = useState<Partner[]>(() => [...PARTNERS]);
  const addPartner = useCallback((p: Partner) => setPartners((ps) => (ps.some((x) => x.custNo === p.custNo) ? ps : [...ps, p])), []);
  const openEntry = useCallback((e: EntryState) => { setEntry(e); }, []);
  /* E02/E07 전표등록 저장 반영 — 원전표 upsert + 가결산 환원전표 생성·동기화를 한 번에(동일 트랜잭션 흉내). 화면 닫기는 화면이 exit 뒤 onClose 로 알린다 */
  const saveEntry = (j: JournalRow, opts: { submit: boolean }): JournalRow => {
    const res = commitClosing(rowsRef.current, j, { submit: opts.submit, user: CURRENT_USER });
    rowsRef.current = res.rows;
    setRows(res.rows);
    return res.saved;
  };

  /* 필터 SSOT — 기간(상세필터) · 상세 9항목 중 나머지. 결재 조건은 상세필터 '승인여부'로만 건다(화면설계서) */
  const [fFrom, setFFrom] = useState(baseFrom);
  const [fTo, setFTo] = useState(baseTo);
  const [fd, setFd] = useState<Detail>(EMPTY_DETAIL);
  const [filterOpen, setFilterOpen] = useState(false);
  /* 드로어 컨트롤이 조건을 바로 고친다(즉시 반영 — 초안 사본 없음). [초기화] = 기본 조건 */
  const setDetail = <K extends keyof Detail>(k: K, v: Detail[K]) => setFd((d) => ({ ...d, [k]: v }));
  const resetFilter = () => { setFFrom(baseFrom); setFTo(baseTo); setFd(EMPTY_DETAIL); };
  /* 범위 검증은 렌더마다 — 한쪽만 비우면 열린 경계(참고 risk_page_kit dayRange). 실패면 그 칸 표시 + 결과 0건 */
  const periodErr = validateRange(fFrom, fTo);
  const dueErr = validateRange(fd.dueFrom, fd.dueTo);
  const rangeBad = !!(periodErr || dueErr);

  const filter: JournalFilter = useMemo(() => ({ ...fd, from: fFrom, to: fTo }), [fd, fFrom, fTo]);
  const passes = useCallback((r: JournalRow) => !rangeBad && journalPasses(r, filter), [filter, rangeBad]);
  /* 필터 변경 = 선택 전부 해제(2026-10-27 사용자 결정, 가드 filter_clears_selection) */
  useEffect(() => { apiRef.current?.onFilterChanged(); apiRef.current?.deselectAll(); }, [passes]);
  const isExternalFilterPresent = useCallback(() => true, []);   // 항상 술어 평가(조건이 비면 전부 통과)
  /* 쌍 단위 판정(closingVisibleIds) — 원전표·환원전표 중 하나라도 통과하면 둘 다. 그리드 술어는 ref 로 최신 집합을 읽는다(rowData 갱신 시 그리드가 재평가) */
  const shownIds = useMemo(() => closingVisibleIds(rows, passes), [rows, passes]);
  const shownIdsRef = useRef(shownIds); shownIdsRef.current = shownIds;
  const doesExternalFilterPass = useCallback((node: IRowNode<JournalRow>) => (node.data ? shownIdsRef.current.has(node.data.id) : true), []);
  const visible = useMemo(() => rows.filter((r) => shownIds.has(r.id)), [rows, shownIds]);

  /* 전표등록·상세필터·확인 팝업이 열려 있으면 뒤 목록의 등록·인쇄·내보내기 단축키를 끈다(⌘P 는 입력창에서도 발화) */
  const listKeys = modal === null && !entry && !filterOpen;
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
  /* E07 — 더블클릭/Enter = 전표등록(수정). 상신·승인 전표의 조회 전용 처리는 전표등록 화면이 한다 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<JournalRow>) => { if (e.data && !e.rowPinned) openEntry({ mode: 'edit', source: e.data }); }, [openEntry]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<JournalRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned) return;
    /* 선택 체크박스 컬럼의 Enter 는 체크 토글 몫 — 수정 화면을 열지 않는다 */
    if (e.column.getColId().startsWith('ag-Grid-SelectionColumn')) return;
    openEntry({ mode: 'edit', source: e.data });
  }, [openEntry]);

  /* 선택 해제 — ref 도 즉시 비운다. 같은 틱에 setRows 가 있으면 onRowDataUpdated 의 restoreSelection 이 낡은 selIdsRef 로 선택을 되살린다(실측) */
  const clearSel = () => { selIdsRef.current = []; setSelIds([]); apiRef.current?.deselectAll(); };

  /* E05 결재상신 — 쌍으로 확장. 상신 가능 건이 하나도 없으면 모달을 열지 않는다 */
  const askSubmit = () => {
    const ids = [...selIds];
    if (!hasSubmittable(rows, ids)) { toast.error('상신 가능한 전표가 없습니다. 상신·승인 전표는 다시 상신할 수 없습니다.'); return; }
    setModal({ kind: 'submit', ids, paired: expandPairs(rows, ids).length > ids.length });
  };
  const commitSubmit = (ids: string[]) => () => {
    const res = submitClosing(rowsRef.current, ids, CURRENT_USER);
    setRows(res.rows);
    clearSel();
    setModal(null);
    toast.success(`${String(res.submitted)}건 결재 상신되었습니다` + (res.skipped ? ` (상신 불가 ${String(res.skipped)}건 제외 — 이미 상신·승인된 전표)` : ''));
  };
  /* E06 삭제 — 게이트는 클릭 시점 1회 평가(쌍 확장 후). 상신·승인 건이 섞이면 전체 중단 */
  const askDelete = () => {
    const ids = [...selIds];
    const g = closingDeleteGate(rows, ids);
    if (!g.ok) { toast.error(CLOSING_DELETE_LOCKED_MSG); return; }
    setModal({ kind: 'delete', ids, paired: g.ids.length > ids.length });
  };
  const commitDelete = (ids: string[]) => () => {
    setRows((prev) => deleteClosing(prev, ids));
    clearSel();
    setModal(null);
    toast.success('삭제되었습니다');
  };

  const refresh = () => { clearSel(); toast.success('조회되었습니다'); };

  /* E09 내보내기 — 화면 컬럼 그대로(현재 조건 결과) */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '적요' ? 32 : c.header === '계정구분' || c.header === '거래처' ? 26 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '결산전표');
    XLSX.writeFile(wb, '결산전표 관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const rangeLabel = (a: string, b: string) => (a || b ? `${a || '…'} ~ ${b || '…'}` : '');

  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="primary" size="sm" leadingIcon="file-check" onClick={askSubmit}>결재상신</Button>
      <Button variant="outline" size="sm" leadingIcon="trash" onClick={askDelete}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={clearSel}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '회계', '결산관리', '결산전표 관리']}
      title="결산전표 관리"
      favRoute="acct-closing-journal"
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
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {/* E02 등록 — 업로드가 없어 콤보가 아닌 독립 버튼 */}
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => openEntry({ mode: 'new' })}>전표 등록</Button>
        {/* E03 조회. 전표등록·상세필터·확인창이 열려 있으면 뒤 목록 단축키(⌥R) 바인딩을 끈다(listKeys) — IconBtn 은 enabled prop 이 없어 hotkey 를 조건부로 */}
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

      {/* ── E01 상세필터 — slide 11 조건 9개 순서 그대로. 즉시 반영([필터 적용] = 닫기) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">결산전표 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="계정구분"><DrawerSelect value={fd.fundAccount} onChange={(v) => setDetail('fundAccount', v)} options={FUND_ACCOUNTS} ariaLabel="계정구분" /></DrawerField>
            <DrawerField label="기간" plain errMsg={periodErr ?? undefined}>
              <DayRange label="기간" from={fFrom} to={fTo} onFrom={setFFrom} onTo={setFTo} invalid={!!periodErr} />
            </DrawerField>
            <DrawerField label="승인여부"><DrawerSelect value={fd.approvedYn} onChange={(v) => setDetail('approvedYn', v as Detail['approvedYn'])} options={APPROVAL_YN} ariaLabel="승인여부" /></DrawerField>
            <DrawerField label="전표발생구분"><DrawerSelect value={fd.origin} onChange={(v) => setDetail('origin', v as '' | JournalOrigin)} options={CLOSING_ORIGINS} ariaLabel="전표발생구분" /></DrawerField>
            <DrawerField label="작성자"><input type="text" value={fd.writer} onChange={(e) => setDetail('writer', e.target.value)} placeholder="작성자명 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="거래처"><input type="text" value={fd.partner} onChange={(e) => setDetail('partner', e.target.value)} placeholder="거래처명 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="적요"><input type="text" value={fd.memo} onChange={(e) => setDetail('memo', e.target.value)} placeholder="적요 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="전표번호"><input type="text" value={fd.slipNo} onChange={(e) => setDetail('slipNo', e.target.value)} placeholder="전표번호 일부" style={inputStyle('text')} /></DrawerField>
            <DrawerField label="자금집행예정기간" plain errMsg={dueErr ?? undefined}>
              <DayRange label="자금집행예정기간" from={fd.dueFrom} to={fd.dueTo} onFrom={(v) => setDetail('dueFrom', v)} onTo={(v) => setDetail('dueTo', v)} invalid={!!dueErr} />
            </DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilter}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── E05 결재상신 확인 — 실행 버튼 = SaveButton(서버 실행 흉내, 저장 중 다이얼로그 잠금) ── */}
      {modal?.kind === 'submit' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'submit' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>결재상신 확인</AlertDialogTitle>
              <AlertDialogDescription>{'선택한 전표를 결재 상신하시겠습니까?' + (modal.paired ? ' ' + PAIR_NOTE.submit : '')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="" busyLabel="상신 중" onSubmit={() => commitSubmit(modal.ids)}>결재상신</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── E06 삭제 확인 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제 확인</AlertDialogTitle>
              <AlertDialogDescription>{'선택한 항목을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.' + (modal.paired ? ' ' + PAIR_NOTE.delete : '')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }} onSubmit={() => commitDelete(modal.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── 전표등록 전체 화면(신규·수정) — 결산 변형(closing). 환원전표는 조회 전용 ── */}
      {entry && (
        <JournalEntryScreen entry={entry} onSave={saveEntry} onClose={() => setEntry(null)} partners={partners} onAddPartner={addPartner}
          closing={CLOSING_ENTRY} readOnly={entry.mode === 'edit' && entry.source.origin === '가결산(환원)'} />
      )}
    </GridFrame>
  );
}
