/* 자펀드보고양식관리(운용사ERP) — 관리형 리스트 페이지 (관리자 > 게시판, route sfund-report-form-manage, 화면ID ADM-012).
   출처: 자펀드보고양식관리(운용사ERP).html(KRDS TO-BE, 목업 메모 "S1_09 보고양식관리 관리자 패턴 이식") → APFS 디자인시스템.
   운용사ERP 가 참조하는 자펀드 보고양식(문서 서식)을 등록·수정·삭제하고 버전을 관리한다. 업무 규칙은 sfund_report_form_model.ts.

   목업 → 우리 규약
   - 검색박스 없음(목업 원본) → 필터 칩·상세필터 드로어를 만들지 않는다(없는 필터 발명 금지). 목록바 '총 N건' → 툴바 좌 건수 캡션.
   - 목록 6열(No·양식제목·설명·Download·등록일시·이력) → AG Grid 단일 헤더. 가운데 정렬 없음(표 정렬 규약) — 전부 좌측.
     양식제목 뒤 'N' 배지 = 버전 이력이 있는 양식만(목업 `.latest-badge` '최신' → 'N' + sr-only '최신 버전' — SRP-007 report_guide 와 같은 표현,
     2026-10-30 사용자 결정이 같은 데이터·같은 배지에 걸려 있다). Download = 셀 안 Button(report_form_manage 와 같은 모양).
     이력 `이력 N건` 버튼 → 공용 LinkCell(+셀 Enter 동치) → 버전 이력 팝업, 이력 없으면 '이력없음' 흐린 글자(목업 disabled 버튼).
   - 행 클릭 선택 → [등록][수정][새 버전 등록][삭제] 노출(목업) → **선택 UI 없이** 단건 CRUD 관례로 치환(report_form_manage 머리 주석 결정):
       등록 = 툴바 [보고양식 등록](⌘⏎) · 수정 = 행 더블클릭·셀 Enter·우클릭 메뉴 · 삭제 = 우클릭 메뉴 또는 수정 모달 안 [삭제] → AlertDialog.
       **새 버전 등록 = 우클릭 메뉴 항목**('수정' 바로 아래 — 같은 행 대상의 편집 계열) + 수정 모달 푸터 왼쪽 [새 버전 등록]
       (RowFormModal footerStart — 키보드 경로: 셀 Enter → 수정 모달 → 버튼).
   - 등록/수정 단일 폼 2모드 · 새 버전 등록 폼 · 삭제 확인 · 버전 이력 팝업 → sfund_report_form_modals.tsx.
   - 엑셀(목업 없음, 리스트 공통 규약) → 푸터 내보내기 아이콘 + ⌥D. Download 열은 파일명 값('첨부파일')으로 직렬화(report_form_manage 동일).
   - KPI 배지 행 미포함(사용자 결정) · 카드뷰 없음 · 명세 팝업 없음 · rowSelection 없음.
   목업의 GNB/LNB·출처시스템 메뉴·설계 메모·검토필요 마커는 이식하지 않는다(셸이 소유).

   결정·가정
   - 시드 = SRP-007 공유 데이터(report_guide_data.ts) — 14건 값은 목업 DATA 와 같다. 버전 이력은 공유 규약(첫 항목 = 현재 버전)이라
     '이력 N건' 이 목업(과거 버전만 셈, 1건)과 달리 현재 버전까지 센다(2건 — SRP-007 화면과 같은 숫자).
   - 등록·새 버전 등록의 등록일시 = 현재 시각(목업은 고정값 '2026-10-28 15:00:00'). 목록은 등록일시 최신순으로 다시 매긴다.
   - [조회] = 데모 시드로 되돌림(report_form_manage 관례 — 백엔드 없음). Download 는 파일명 안내 토스트(목업도 토스트). */
import '../../aggrid_shared.css';   // 공유 보정 CSS(헤더 sticky 등 전 그리드 공통)
import { useState, useRef, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { UI } from '../../components';
import { Icon } from '../../icons';
import { GridFrame, FooterActions } from '../../grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { LinkCell } from '../../link_cell';
import { RowContextMenu } from '../../row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체, 공유)
import type { CtxItem, CtxMenuState } from '../../row_context_menu';
import { seedForms, addForm, editForm, addVersion, removeForm, hasHistory, histLabel } from './sfund_report_form_model';
import type { SfundReportForm, FormInput, VersionInput } from './sfund_report_form_model';
import { SfundReportFormModals } from './sfund_report_form_modals';
import type { ModalState } from './sfund_report_form_modals';

const { Button, IconBtn, StatusBadge } = UI;

const LABEL = '자펀드보고양식관리(운용사ERP)';   // 메뉴 리프 라벨 = 제목 = 엑셀 파일명·시트명(괄호는 파일명 허용 문자)
const ROUTE = 'sfund-report-form-manage';
const PAGE_SIZE = 20;
const nowStamp = () => format(new Date(), 'yyyy-MM-dd HH:mm:ss');   // 시드 등록일시와 같은 형식(초까지) — 문자열 비교 = 시간순

type Handlers = { onDownload: (r: SfundReportForm) => void; onHistory: (r: SfundReportForm) => void };

const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const mutedDash = <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* Download 셀 — 라벨 '다운로드'에 대상 양식명을 sr-only 로 덧붙여 행마다 접근名을 구분한다(report_form_manage DownloadCell 과 같은 계약) */
function DownloadCell({ row, onDownload }: { row: SfundReportForm; onDownload: (r: SfundReportForm) => void }) {
  return (
    <Button variant="outline" size="sm" leadingIcon="download" onClick={() => onDownload(row)}>
      다운로드<span className="sr-only"> — {row.title}</span>
    </Button>
  );
}

/* 양식제목 + 'N' 배지(버전 이력이 있는 양식만 — SRP-007 report_guide 와 같은 표현). 글자 하나라 스크린리더용 '최신 버전' 을 덧붙인다 */
function TitleCell({ row }: { row: SfundReportForm }) {
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      <span className="min-w-0 truncate">{row.title}</span>
      {hasHistory(row) && <StatusBadge tone="success" label={<>N<span className="sr-only"> 최신 버전</span></>} size="sm" />}
    </span>
  );
}

/* 컬럼 = 목업 thead 순서 그대로. 폭 관련 그리드 prop 은 aggrid_theme 공용 상수만 쓴다 */
const makeColumns = ({ onDownload, onHistory }: Handlers): ColDef<SfundReportForm>[] => [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: tabNum, valueFormatter: (p) => String(p.value) },
  { field: 'title', headerName: '양식제목', width: 360, minWidth: 260, maxWidth: 520, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.data ? <TitleCell row={p.data} /> : null) },
  /* 설명이 남는 폭을 흡수한다 — maxWidth 없는 유일한 컬럼 + FIT_GRID_WIDTH(report_form_manage 와 같은 기법) */
  { field: 'desc', headerName: '설명', width: 280, minWidth: 180, cellStyle: flexCenter, cellRenderer: (p: any) => p.value || mutedDash },
  /* 액션 컬럼 — 정렬 대상이 아니다. 헤더명은 목업 원문 'Download' 그대로 */
  { field: 'file', headerName: 'Download', width: 132, minWidth: 132, maxWidth: 132, sortable: false, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.data ? <DownloadCell row={p.data} onDownload={onDownload} /> : null) },
  { field: 'reg', headerName: '등록일시', width: 176, minWidth: 176, maxWidth: 176, cellStyle: { ...flexCenter, ...tabNum }, valueFormatter: (p) => String(p.value) },
  { colId: 'hist', headerName: '이력', width: 112, minWidth: 112, maxWidth: 112, sortable: false, cellStyle: flexCenter,
    valueGetter: (p) => (p.data ? histLabel(p.data) : ''),
    cellRenderer: (p: any) => {
      if (!p.data) return null;
      return hasHistory(p.data)
        ? <LinkCell value={histLabel(p.data)} hint="버전 이력 보기" onClick={() => onHistory(p.data)} />
        : <span style={{ color: 'var(--muted-foreground)' }}>{histLabel(p.data)}</span>;
    } },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(Download 액션 열은 파일명 값으로 직렬화) */
type XCol = { header: string; wch: number; get: (r: SfundReportForm) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', wch: 6, get: (r) => r.no },
  { header: '양식제목', wch: 44, get: (r) => r.title },
  { header: '설명', wch: 36, get: (r) => r.desc },
  { header: '첨부파일', wch: 44, get: (r) => r.file },
  { header: '등록일시', wch: 20, get: (r) => r.reg },
  { header: '이력', wch: 10, get: (r) => histLabel(r) },
];
function exportExcel(rows: readonly SfundReportForm[]) {
  const ws = XLSX.utils.aoa_to_sheet([EXPORT_COLS.map((c) => c.header), ...rows.map((r) => EXPORT_COLS.map((c) => c.get(r)))]);
  ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.wch }));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, LABEL);
  XLSX.writeFile(wb, `${LABEL}.xlsx`);
  toast.success('Excel로 내보냈습니다');
}

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* CRUD — 불변 갱신(모델 순수 함수) + 모달 닫기 + 토스트 */
function useFormActions(setRows: (f: (p: SfundReportForm[]) => SfundReportForm[]) => void, setModal: (m: ModalState) => void) {
  return useMemo(() => ({
    onCreate: (v: FormInput) => { setRows((p) => addForm(p, v, { id: crypto.randomUUID(), now: nowStamp() })); setModal(null); toast.success('등록되었습니다'); },
    onEdit: (id: string, v: FormInput) => { setRows((p) => editForm(p, id, v)); setModal(null); toast.success('수정되었습니다'); },
    onVersion: (id: string, v: VersionInput) => { setRows((p) => addVersion(p, id, v, nowStamp())); setModal(null); toast.success('새 버전으로 등록되었습니다'); },
    /* 확인 다이얼로그는 AlertDialog onOpenChange 가 닫는다 */
    /* setModal(null) 필수 — 행이 빠지면 target=null 로 확인창이 즉시 언마운트돼, AlertDialog 가 닫힘 애니메이션 뒤로 미루는
       onOpenChange(false) 가 영영 안 온다 → modal 이 {delete} 로 남아 ⌘⏎ 가 막히고 [조회]로 행이 돌아오면 확인창이 다시 뜬다(2026-11-02 Codex P2 실측) */
    onDelete: (id: string) => { setRows((p) => removeForm(p, id)); setModal(null); toast.success('삭제되었습니다'); },
  }), [setRows, setModal]);
}

/* 페이지 상태 — 값 비교 가드로 setState(매 호출 새 객체 = 렌더 루프, aggrid-onpaginationchanged-render-loop) */
function usePager(apiRef: { current: GridApi<SfundReportForm> | null }, initialCount: number) {
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: initialCount });
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, [apiRef]);
  return { page, onPaginationChanged };
}

function Pager({ api, page }: { api: GridApi<SfundReportForm> | null; page: { current: number; total: number } }) {
  if (page.total <= 1) return null;
  return (
    <>
      <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => api?.paginationGoToPreviousPage()} />
      {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => api?.paginationGoToPage(i)} />)}
      <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => api?.paginationGoToNextPage()} />
    </>
  );
}

/* 행 진입 3경로 — 행 더블클릭 · 셀 Enter · 우클릭. AG Grid Tab 은 셀 안 button 에 닿지 않으므로 Enter 분기가 키보드 접근을 보장한다
   (Download 셀 = 다운로드, 이력 셀 = 버전 이력 — 이력 없는 양식은 수정으로 떨어지지 않고 무동작) */
function useRowEvents({ setModal, setCtx, download, openHistory, doExport }: {
  setModal: (m: ModalState) => void; setCtx: (c: CtxMenuState) => void;
  download: (r: SfundReportForm) => void; openHistory: (r: SfundReportForm) => void; doExport: () => void;
}) {
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<SfundReportForm>) => {
    if (e.data && !e.rowPinned) setModal({ kind: 'edit', id: e.data.id });
  }, [setModal]);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<SfundReportForm>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    const col = e.column.getColId();
    if (col === 'file') download(e.data);
    else if (col === 'hist') { if (hasHistory(e.data)) openHistory(e.data); }
    else setModal({ kind: 'edit', id: e.data.id });
  }, [setModal, download, openHistory]);
  /* 새 버전 등록 = '수정' 바로 아래(같은 행 대상의 편집 계열) */
  const onCellContextMenu = (e: CellContextMenuEvent<SfundReportForm>) => {
    const ev = e.event as MouseEvent | undefined;
    ev?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned || !ev) return;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      { label: '새 버전 등록', icon: 'layers', onSelect: () => setModal({ kind: 'version', id: row.id }) },
      { label: '다운로드', icon: 'download', onSelect: () => download(row) },
      ...(hasHistory(row) ? [{ label: '버전 이력', icon: 'history', onSelect: () => openHistory(row) }] : []),
      { label: 'Excel 내보내기', icon: 'download', onSelect: doExport },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', id: row.id }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };
  return { onRowDoubleClicked, onCellKeyDown, onCellContextMenu };
}

/** 자펀드보고양식관리(운용사ERP) — ADM-012 */
export function SfundReportFormManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<SfundReportForm> | null>(null);
  const [rows, setRows] = useState<SfundReportForm[]>(seedForms);
  const [showAll, setShowAll] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const actions = useFormActions(setRows, setModal);

  const downloadFile = useCallback((file: string) => { toast.success(`다운로드: ${file}`); }, []);
  const download = useCallback((r: SfundReportForm) => downloadFile(r.file), [downloadFile]);
  const openHistory = useCallback((r: SfundReportForm) => setModal({ kind: 'history', id: r.id }), []);
  /* 핸들러가 안정(useCallback)이라 컬럼 정의가 고정된다 — 매 렌더 새 배열이면 그리드가 컬럼을 재생성 */
  const columnDefs = useMemo(() => makeColumns({ onDownload: download, onHistory: openHistory }), [download, openHistory]);
  const doExport = () => exportExcel(rows);
  // 앱-스코프 단축키: ⌘⏎=양식 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null, skipInDialog: true });
  useHotkey(HOTKEYS.print.combo, printGrid, { skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => doExport(), { skipInDialog: true });

  const onGridReady = useCallback((e: GridReadyEvent<SfundReportForm>) => { apiRef.current = e.api; }, []);
  const { page, onPaginationChanged } = usePager(apiRef, rows.length);
  const rowEvents = useRowEvents({ setModal, setCtx, download, openHistory, doExport });

  const target = modal && modal.kind !== 'create' ? rows.find((r) => r.id === modal.id) ?? null : null;
  const refresh = () => { setRows(seedForms()); toast.success('조회되었습니다'); };
  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '관리자', '게시판', LABEL]}
      title={LABEL}
      favRoute={ROUTE}
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 — 검색박스가 없는 화면이라 필터 칩이 없다. 건수 컨텍스트만(목업 목록바 '총 N건') */
      toolbarLeft={<>
        <Icon name="file" size={16} className="text-caption" />
        <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>보고양식 {String(rows.length)}건</span>
      </>}
      toolbarRight={<>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'create' })}>보고양식 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '개 중 ' + String(Math.min(shown, rows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? <Pager api={apiRef.current} page={page} /> : undefined}
      footerRight={<FooterActions onExport={doExport} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<SfundReportForm>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={FIT_GRID_WIDTH}
          defaultColDef={DEFAULT_COL_DEF}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onPaginationChanged={onPaginationChanged}
          onRowDoubleClicked={rowEvents.onRowDoubleClicked}
          onCellKeyDown={rowEvents.onCellKeyDown}
          onCellContextMenu={rowEvents.onCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">등록된 보고양식이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
      <SfundReportFormModals modal={modal} target={target} setModal={setModal} onDownload={downloadFile} {...actions} />
    </GridFrame>
  );
}
