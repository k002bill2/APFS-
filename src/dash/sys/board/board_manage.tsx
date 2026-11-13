/* 게시판관리 — 관리형 리스트 페이지 (관리자 > 게시판 > 게시판관리, route board-manage). 화면ID ADM-013.
   출처: 게시판관리.html(관리자 KRDS TO-BE — 하단 스크립트의 DATA·render·openPostForm·openPublish·openDelete 가 명세) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(등록기간·게시대상·게시 종류·상태·제목 + [초기화][조회]) → 주 필터 1개 = 상태 FilterChip(`상태: 전체` + 4값, facet 건수)
       + 상세필터 드로어(제목(검색어 opt-in, 최상단) · 등록기간(PeriodPicker day ×2, 칩 1개) · 게시대상 · 게시 종류).
       [조회] → 툴바 조회 아이콘(⌥R) · [초기화] → 드로어 [초기화].
   - 목록바(총 N건 · 페이지당 건수 · 엑셀 · 선택 삭제 · 게시 · 등록) → 푸터 건수·페이저(10건)·전체보기(⌥A) · 엑셀 = 푸터 내보내기(⌥D) ·
       [게시]·[삭제] = 선택 바(contextActions, 체크한 행) · [등록] = 툴바 [게시글 등록](⌘⏎).
   - 그리드(체크·No·등록일·게시대상·제목·게시기간·상태·게시 종류·첨부·작성자·미리보기) → AG Grid 단일 헤더. 선택은 체크박스로만(ROW_SELECTION).
       제목 = LinkCell → 수정(Enter·더블클릭 동치) · 첨부 열 → 제목 뒤 확장자 칩(AttachChips, apfs-grid 첨부 규약) · 미리보기 열 = 아이콘 버튼(Enter 동치).
       상태 배지 lg(게시중 success·게시예정 warning·게시종료 muted·미게시 info) · 게시 종류 배지 sm(종류 primary, 일반 muted).
   - 저장과 게시 분리(board_model): 등록창 [저장] = 미게시로만 저장 → 선택 바 [게시] = 미게시 행만 확정(게이트 필터형 벌크 — 이미 게시된 행은 제외 안내,
       전부 게시됨이면 확인창 없이 안내) → 그때부터 게시기간 기준 게시예정/게시중/게시종료. 게시된 글을 고쳐 저장하면 다시 미게시.
   - 등록/수정 → board_form_modal(섹션형 전용 모달) · 미리보기 → board_preview_modal · 게시·삭제 확인 → AlertDialog + SaveButton(게시 중/삭제 중).
   - 우클릭 메뉴(수정·미리보기·게시(미게시 행)·Excel·삭제) — 목록 화면 공통 보조 경로.
   - KPI 배지 행 미포함(사용자 결정) · 카드뷰 없음 · 명세 팝업 없음. 목업 GNB/LNB·설계 메모·검토필요(!) 마커는 이식하지 않는다.
   결정·가정:
   - 상태 기준일은 목업 그대로 2026-10-28 고정(board_data.TODAY) — 오늘 날짜가 아니다. 신규 글 등록일·게시 시작 기본값도 이 날짜.
   - 게시 처리자·신규 작성자 = 로그인 사용자 데모 계정 '전산관리'(board_data.LOGIN_WRITER). 데모 행의 작성자(홍길동 등)는 목업 리터럴.
   - 게시 확정 후에도 선택은 유지한다(apfs-stage-workflow — 목업은 체크를 비웠다). 삭제 후·필터 변경 시에는 선택을 전부 푼다.
   - 미리보기 본문은 서식 없는 문단 텍스트(board_model.bodyParagraphs) — 저장된 HTML 을 그대로 그리지 않는다.
   ⚠ 실제 게시·팝업 송출·파일 업로드가 아니다 — 화면 로컬 더미 상태만 바꾼다(실명 아님). */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { format } from 'date-fns';
import { UI } from '../../components';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, DEFAULT_COL_DEF, NO_COL_ID, refreshNoColumn } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { AttachChips, controlMinWidth, drawerInputStyle as inputStyle } from '../../schemas/renderers';
import { PeriodPicker } from '../../ui/period-picker';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle, RowSelectionOptions, ICellRendererParams } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from '../../ui/alert-dialog';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용
import { RowContextMenu } from '../../row_context_menu';
import type { CtxItem, CtxMenuState } from '../../row_context_menu';
import { DrawerSelect } from '../../drawer_select';   // 상세필터 select 공용본
import { LinkCell } from '../../link_cell';
import { demoPosts, AUDIENCES, KIND_FILTERS, LOGIN_WRITER, TODAY } from './board_data';
import type { PostRow } from './board_data';
import { POST_STATUSES, STATUS_TONE, postStatus, kindLabels, filterPosts, statusCounts, publishGate, publishNote, publishPosts, deletePosts, popupCount, savePost } from './board_model';
import type { PostStatus, PostDraft } from './board_model';
import { BoardFormModal } from './board_form_modal';
import { BoardPreviewModal } from './board_preview_modal';

const { Button, SaveButton, IconBtn, StatusBadge } = UI;

const SEARCHABLE = true;   // 목업 검색박스에 제목 입력이 있다 → 드로어 최상단 '제목'
const PAGE_SIZE = 10;      // 목업 페이지당 건수 기본값(10개씩)

type PostView = PostRow & { status: PostStatus };
type ModalState = null
  | { kind: 'form'; id: string | null }   // id null = 신규 등록
  | { kind: 'preview'; id: string }
  | { kind: 'publish'; ids: string[]; blocked: number }
  | { kind: 'delete'; ids: string[] };

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서(첨부 열은 제목 뒤 칩으로 흡수)
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const mutedNum: CellStyle = { ...tabNum, color: 'var(--muted-foreground)' };

const makeColumns = (open: (m: ModalState) => void): ColDef<PostView>[] => [
  { colId: NO_COL_ID, headerName: 'No', width: 60, maxWidth: 60, cellStyle: tabNum, sortable: false, valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1 },
  { field: 'reg', headerName: '등록일', width: 128, minWidth: 128, cellStyle: tabNum, sort: 'desc' },
  { colId: 'aud', headerName: '게시대상', width: 150, maxWidth: 220, cellStyle: { color: 'var(--muted-foreground)' }, valueGetter: (p) => p.data?.aud.join(', ') ?? '' },
  /* 남는 폭 흡수 — flex 컬럼은 width=minWidth 동반(apfs-aggrid 계약 9) */
  { field: 'title', headerName: '제목', flex: 1, width: 300, minWidth: 300, cellStyle: flexCenter,
    cellRenderer: (p: ICellRendererParams<PostView>) => (p.data ? (
      <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
        <LinkCell value={p.data.title} hint="수정" onClick={() => open({ kind: 'form', id: p.data!.id })} />
        <AttachChips value={p.data.file} />
      </span>
    ) : null) },
  { colId: 'period', headerName: '게시기간', width: 236, minWidth: 236, cellStyle: mutedNum, valueGetter: (p) => (p.data ? `${p.data.from} ~ ${p.data.to}` : '') },
  { field: 'status', headerName: '상태', width: 104, maxWidth: 104, cellStyle: flexCenter,
    cellRenderer: (p: ICellRendererParams<PostView>) => (p.data ? <StatusBadge tone={STATUS_TONE[p.data.status]} label={p.data.status} size="lg" /> : null) },
  { colId: 'kinds', headerName: '게시 종류', width: 160, minWidth: 110, maxWidth: 220, cellStyle: flexCenter, valueGetter: (p) => (p.data ? kindLabels(p.data).join(', ') : ''),
    cellRenderer: (p: ICellRendererParams<PostView>) => (p.data ? (
      <span className="inline-flex flex-wrap items-center gap-1">
        {kindLabels(p.data).map((k) => <StatusBadge key={k} tone={p.data!.kinds.length ? 'primary' : 'muted'} label={k} size="sm" />)}
      </span>
    ) : null) },
  { field: 'writer', headerName: '작성자', width: 100, maxWidth: 130 },
  /* 아이콘 전용 액션 열 — 정렬 대상 아님(정렬 규약 예외) */
  { colId: 'preview', headerName: '미리보기', width: 92, maxWidth: 92, sortable: false, cellStyle: flexCenter,
    cellRenderer: (p: ICellRendererParams<PostView>) => (p.data ? <IconBtn icon="eye" label={`미리보기 — ${p.data.title}`} size={30} onClick={() => open({ kind: 'preview', id: p.data!.id })} /> : null) },
];
/* 다중 선택 — 체크박스로만 on/off(2026-09-22), 선택이 [게시]·[삭제]를 만든다. 모듈 상수(렌더마다 새 객체면 컬럼 폭이 되돌아간다) */
const ROW_SELECTION: RowSelectionOptions<PostView> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };
const STATUS_CHIPS = ['', ...POST_STATUSES] as const;

type XCol = { header: string; get: (r: PostView) => string };
const EXPORT_COLS: XCol[] = [
  { header: '등록일', get: (r) => r.reg }, { header: '게시대상', get: (r) => r.aud.join(', ') }, { header: '제목', get: (r) => r.title },
  { header: '게시기간', get: (r) => `${r.from} ~ ${r.to}` }, { header: '상태', get: (r) => r.status }, { header: '게시 종류', get: (r) => kindLabels(r).join(', ') },
  { header: '첨부파일', get: (r) => r.file }, { header: '작성자', get: (r) => r.writer },
];

/* 페이저 버튼 — 골드(report_form_manage·subfund_manage) 로컬 헬퍼 복사(공유 export 아님 — apfs-grid 푸터 규약) */
function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}
/* plain = 버튼 트리거(PeriodPicker)라 <label> 대신 <div>(라벨 활성화와 겹친 2회 토글 방지) */
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

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
export function BoardManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<PostView> | null>(null);
  const [rows, setRows] = useState<PostRow[]>(() => demoPosts());
  /* 선택 SSOT — 체크된 행 id 배열(selCount 는 파생) */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });

  const [filterOpen, setFilterOpen] = useState(false);
  const [fStatus, setFStatus] = useState<typeof STATUS_CHIPS[number]>('');
  const [fFrom, setFFrom] = useState('');
  const [fTo, setFTo] = useState('');
  const [fAud, setFAud] = useState('');
  const [fKind, setFKind] = useState('');
  const [fTitle, setFTitle] = useState('');
  const clearFilters = () => { setFStatus(''); setFFrom(''); setFTo(''); setFAud(''); setFKind(''); setFTitle(''); };

  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'form', id: null }), { enabled: modal === null && !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen, skipInDialog: true });

  const visible = useMemo<PostView[]>(() => filterPosts(rows, { from: fFrom, to: fTo, aud: fAud, kind: fKind, status: fStatus, q: fTitle })
    .map((r) => ({ ...r, status: postStatus(r) })), [rows, fFrom, fTo, fAud, fKind, fStatus, fTitle]);
  /* 상태 칩 건수 = 상태만 빼고 나머지 필터를 건 모집단(facet count) */
  const facet = useMemo(() => filterPosts(rows, { from: fFrom, to: fTo, aud: fAud, kind: fKind, q: fTitle }), [rows, fFrom, fTo, fAud, fKind, fTitle]);
  const counts = useMemo(() => statusCounts(facet), [facet]);
  const chipCount = (s: string) => String(s ? counts[s as PostStatus] : facet.length);

  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const clearSelection = () => { selIdsRef.current = []; apiRef.current?.deselectAll(); setSelIds([]); };
  /* 필터를 바꾸면 선택을 전부 해제한다(2026-10-27 사용자 결정) — ref 도 먼저 비워 뒤이은 rowDataUpdated 복원이 되살리지 않게 */
  useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [fStatus, fFrom, fTo, fAud, fKind, fTitle]);

  const onGridReady = useCallback((e: GridReadyEvent<PostView>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<PostView>) => { setSelIds(e.api.getSelectedRows().map((r) => r.id)); }, []);
  /* 저장·게시로 rowData 가 바뀐 뒤 체크를 되돌린다(multiRow 복원은 공유 헬퍼로만) */
  const onRowDataUpdated = useCallback((e: { api: GridApi<PostView> }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState 는 렌더 루프(aggrid-onpaginationchanged-render-loop) */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  const columnDefs = useMemo(() => makeColumns(setModal), []);   // setModal 은 안정 → 컬럼 정의 고정
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<PostView>) => { if (e.data && !e.rowPinned) setModal({ kind: 'form', id: e.data.id }); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<PostView>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data || e.rowPinned) return;
    setModal(e.column.getColId() === 'preview' ? { kind: 'preview', id: e.data.id } : { kind: 'form', id: e.data.id });
  }, []);

  /* ── 게시 확정(목업 openPublish) — 미게시 행만, 게이트는 요청 시점에 한 번 평가 ── */
  const requestPublish = (targets: readonly PostRow[]) => {
    const { ok, blocked } = publishGate(targets);
    if (!ok.length) { toast.error('선택한 게시글은 모두 이미 게시되었습니다.'); return; }
    if (blocked) toast.info(`이미 게시된 ${blocked}건은 게시 대상에서 제외됩니다.`);
    setModal({ kind: 'publish', ids: ok.map((r) => r.id), blocked });
  };
  const commitPublish = (ids: string[]) => () => {
    const at = `${TODAY} ${format(new Date(), 'HH:mm')}`;   // 날짜는 기준일 고정, 시각만 현재(목업 동일)
    setRows((prev) => publishPosts(prev, ids, at, LOGIN_WRITER));
    setModal(null);
    toast.success(`${ids.length}건 게시 확정했습니다 — 상태가 미게시에서 게시예정/게시중으로 바뀝니다`);
  };
  /* ── 삭제(목업 openDelete) — 조건 없이 선택 전부 ── */
  const commitDelete = (ids: string[]) => () => {
    setRows((prev) => deletePosts(prev, ids));
    clearSelection();
    setModal(null);
    toast.success(`${ids.length}건 삭제했습니다`);
  };
  const selectedRows = () => rows.filter((r) => selIds.includes(r.id));
  /* ── 저장(등록·수정) — 항상 미게시 ── */
  const formId = modal?.kind === 'form' ? modal.id : null;
  const formRow = formId ? rows.find((r) => r.id === formId) ?? null : null;
  const save = (d: PostDraft) => {
    const res = savePost(rows, d, { editId: formId, newId: crypto.randomUUID(), writer: LOGIN_WRITER });
    setRows(res.rows);
    setModal(null);
    toast.success('저장했습니다 — 미게시 상태입니다. 목록에서 선택 후 [게시]를 눌러야 화면에 반영됩니다' + (res.wasPublished ? ' (게시 중이던 글은 다시 게시할 때까지 내려갑니다)' : ''));
  };

  const handleCellContextMenu = (e: CellContextMenuEvent<PostView>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'form', id: row.id }) },
      { label: '미리보기', icon: 'eye', onSelect: () => setModal({ kind: 'preview', id: row.id }) },
      ...(row.pub ? [] : [{ label: '게시', icon: 'check-circle', onSelect: () => requestPublish([row]) } as CtxItem]),
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', ids: [row.id] }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const refresh = () => { setRows(demoPosts()); clearSelection(); clearFilters(); toast.success('조회되었습니다'); };

  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = visible.map((r) => EXPORT_COLS.map((c) => c.get(r)));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === '제목' ? 50 : c.header === '첨부파일' ? 36 : c.header === '게시기간' ? 24 : 14 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '게시판관리');
    XLSX.writeFile(wb, '게시판관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const chips: [string, string, () => void][] = [
    ['제목', fTitle.trim(), () => setFTitle('')],
    ['등록기간', fFrom || fTo ? `${fFrom || '…'} ~ ${fTo || '…'}` : '', () => { setFFrom(''); setFTo(''); }],
    ['게시대상', fAud, () => setFAud('')],
    ['게시 종류', fKind, () => setFKind('')],
  ];

  const pageSize = showAll ? Math.max(visible.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));
  const single = selCount === 1 ? visible.find((r) => r.id === selIds[0]) ?? null : null;

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 중 한 곳에만 렌더한다 */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {single && <StatusBadge tone={STATUS_TONE[single.status]} label={single.status} size="lg" />}
      <Button variant="primary" size="sm" leadingIcon="check-circle" onClick={() => requestPublish(selectedRows())}>게시</Button>
      <Button variant="outline" size="sm" leadingIcon="trash" style={{ color: 'var(--danger)' }} onClick={() => setModal({ kind: 'delete', ids: [...selIds] })}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  const previewRow = modal?.kind === 'preview' ? rows.find((r) => r.id === modal.id) ?? null : null;
  const titleOf = (id: string) => rows.find((r) => r.id === id)?.title ?? '';

  return (
    <GridFrame
      crumbs={['홈', '관리자', '게시판', '게시판관리']}
      title="게시판관리"
      favRoute="board-manage"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      filterChipsMenu="상태"
      filterChips={STATUS_CHIPS.map((s) => ({ key: s || 'all', label: s || '전체', count: chipCount(s), active: fStatus === s, onSelect: () => setFStatus(s) }))}
      appliedFilters={chips.map(([label, value, onClear]) => ({ label, value, onClear }))}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'form', id: null })}>게시글 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(visible.length) + '건 중 ' + String(Math.min(shown, visible.length)) + '건 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<PostView>
          theme={apfsTheme}
          rowData={visible}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onModelUpdated={refreshNoColumn}
          onSelectionChanged={onSelectionChanged}
          onRowDataUpdated={onRowDataUpdated}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">조회된 게시글이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">게시글 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {SEARCHABLE && (
              <DrawerField label="제목">
                <input type="text" value={fTitle} onChange={(e) => setFTitle(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) setFilterOpen(false); }} placeholder="제목을 입력하세요" style={inputStyle('text')} />
              </DrawerField>
            )}
            <DrawerField label="등록기간" plain>
              <div className="flex items-center gap-2 flex-wrap">
                <div style={dayWrap}><PeriodPicker mode="day" value={fFrom} onChange={setFFrom} ariaLabel="등록기간 시작일" /></div>
                <span className="text-caption">~</span>
                <div style={dayWrap}><PeriodPicker mode="day" value={fTo} onChange={setFTo} ariaLabel="등록기간 종료일" /></div>
              </div>
            </DrawerField>
            <DrawerField label="게시대상"><DrawerSelect value={fAud} onChange={setFAud} options={AUDIENCES.filter((a) => a !== '전체')} /></DrawerField>
            <DrawerField label="게시 종류"><DrawerSelect value={fKind} onChange={setFKind} options={[...KIND_FILTERS]} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {modal?.kind === 'form' && (modal.id === null || formRow) && (
        <BoardFormModal row={formRow} writer={LOGIN_WRITER} onSave={save} onClose={() => setModal(null)} />
      )}
      {previewRow && <BoardPreviewModal row={previewRow} onClose={() => setModal(null)} />}

      {/* ── 게시 확정 — 통과한 미게시 행만 나열(행별 게시 시점 안내) ── */}
      {modal?.kind === 'publish' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'publish' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>게시</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 게시글 <b className="text-foreground">{modal.ids.length}건</b>을 게시하시겠습니까?{modal.blocked > 0 && ` 이미 게시된 ${modal.blocked}건은 제외합니다.`}
              </AlertDialogDescription>
              <ul className="text-muted-foreground overflow-y-auto" style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, maxHeight: 220 }}>
                {modal.ids.map((id) => {
                  const r = rows.find((x) => x.id === id);
                  return r ? <li key={id}><span className="text-foreground">{r.title}</span> <span className="text-caption">({publishNote(r)})</span></li> : null;
                })}
              </ul>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="" busyLabel="게시 중" onSubmit={() => commitPublish(modal.ids)}>게시</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* ── 삭제 확인 — 함께 내려가는 팝업·배너 수 안내 ── */}
      {modal?.kind === 'delete' && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal((m) => (m?.kind === 'delete' ? null : m)); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {modal.ids.length === 1
                  ? <>게시글 <b className="text-foreground">{titleOf(modal.ids[0])}</b> 을(를) 삭제하시겠습니까?</>
                  : <>선택한 게시글 <b className="text-foreground">{modal.ids.length}건</b>을 삭제하시겠습니까?</>}
                {popupCount(rows, modal.ids) > 0 && <><br />이 게시글로 띄운 <b className="text-foreground">팝업·배너 {popupCount(rows, modal.ids)}건</b>도 함께 내려갑니다.</>}
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <SaveButton leadingIcon="trash" busyLabel="삭제 중" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onSubmit={() => commitDelete(modal.ids)}>삭제</SaveButton>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
