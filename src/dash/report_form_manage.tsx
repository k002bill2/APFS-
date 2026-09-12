/* 보고양식관리 — 관리형 리스트 페이지 (투자자산관리 > 사후보고관리 > 보고양식관리).
   출처: S1_09_보고양식관리.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스 없음(목업 원본)      → 툴바 필터 칩·상세필터 드로어를 만들지 않는다(없는 필터 발명 금지).
   - 목록 그리드(No·양식제목·설명·Download) → AG Grid 단일 헤더(apfs-aggrid). 합계행 없음(금액 없는 엔티티).
   - 행 클릭 선택 → [등록][수정][삭제] 노출(목업) → **선택 UI 없이** APFS 단건 CRUD 관례로 치환(2026-09-12 자펀드 공고
       정보관리 사용자 결정 "다건 선택/선택삭제가 없는 단건 CRUD 화면은 선택 UI가 군더더기" — apfs-grid `hideRowSelection` 절):
         등록 = 툴바 RegisterCombo(1차 액션 상시 노출, ⌘⏎) · 수정 = 행 더블클릭·셀 Enter·우클릭 메뉴 ·
         삭제 = 우클릭 메뉴(→ AlertDialog 확인) 또는 수정 모달 안 2단계 삭제.
   - 등록/수정 단일 폼 2모드(제목*·설명·첨부 드롭존) → RowFormModal + 로컬 `FORM_SCHEMA`(report_form_manage_schemas.ts),
       제목은 `title` prop으로 '양식 등록'/'양식 수정'(목업 h2 그대로).
   - 삭제 확인 alertdialog(기본 포커스 취소, 위험 버튼) → Radix AlertDialog(Cancel 기본 포커스 내장).
   - Download 열(행별 양식 파일 내려받기) → 셀 안 `Button outline sm`. 백엔드가 없어 toast로 응답(목업도 toast).
       ⚠ 이 열 때문에 typed 트랙이다 — 스키마 트랙(GenericListPage)은 첨부를 제목 뒤 확장자 칩으로만 그려 행별
         다운로드 액션을 표현할 수 없고, 공유 generic_list.tsx를 고치면 기존 스키마 페이지 동작이 바뀐다.
   - 엑셀(목업 없음이지만 리스트 공통 규약) → RegisterCombo ⌄ 항목 + 푸터 download + ⌥D. 마스크 ON이면 텍스트 ''.
   - KPI 배지 행 미포함(사용자 결정) · 카드뷰 없음 · 명세 팝업 없음 · ⚠검토필요 마커 없음(목업 원문에 0건).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭은 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유). */
import './aggrid_shared.css';   // 공유 보정 CSS(헤더 sticky·마스크 헤더 바 — 합계행은 없지만 전 그리드 공통)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { mn, MT, useMask } from './mask';
import { GridFrame } from './grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from './aggrid_theme';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuShortcut } from './ui/dropdown-menu';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowFormModal } from './generic_list_modal';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체, 공유)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { FORM_SCHEMA } from './report_form_manage_schemas';

const { Button, IconBtn } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터
────────────────────────────── */
export interface ReportFormRow {
  id: string; no: number;
  title: string;   // 양식제목
  desc: string;    // 설명('' = 없음 → 화면 '-')
  file: string;    // 양식 파일명(다운로드 대상). DocumentsField CSV 계약과 동일한 문자열
}

/* 목업 DATA 그대로 — "데이터 JSON의 실값만 사용(그리드 1행 + 수정팝업 샘플 = 실제 존재하는 양식 2건)" */
const DEMO: ReportFormRow[] = [
  { id: 'rf-1', no: 1, title: '사모투자전문회사 준법감시보고서', desc: '', file: '사모투자전문회사_준법감시보고서.hwp' },
  { id: 'rf-2', no: 2, title: '농림수산식품모태펀드 ESG 투자 가이드라인', desc: '24.12.27 신규 가이드라인', file: '농림수산식품모태펀드_ESG_투자_가이드라인.pdf' },
];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 헤더 순서 그대로: No · 양식제목 · 설명 · Download
   ⚠ 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 aggrid_theme.ts 공용 상수만 쓴다(인라인 금지 이유는 그 파일 주석).
────────────────────────────── */
const centerNum: CellStyle = { textAlign: 'center', fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };
const flexMid: CellStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center' };

/* Download 셀 — 셀 안 버튼. 라벨 '다운로드'는 액션이라 비마스킹, 대상 파일명은 sr-only로 덧붙여 행마다 접근名을 구분한다
   (UI.Button은 rest props가 없어 aria-label을 못 받는다 → children으로 접근名 보강). */
function DownloadCell({ row, onDownload }: { row: ReportFormRow; onDownload: (r: ReportFormRow) => void }) {
  return (
    <Button variant="outline" size="sm" leadingIcon="download" onClick={() => onDownload(row)}>
      다운로드<span className="sr-only"> — <MT>{row.title}</MT></span>
    </Button>
  );
}

const makeColumns = (onDownload: (r: ReportFormRow) => void): ColDef<ReportFormRow>[] => [
  { field: 'no', headerName: 'No', width: 68, maxWidth: 68, pinned: 'left', cellStyle: centerNum, valueFormatter: (p) => String(p.value) },
  { field: 'title', headerName: '양식제목', width: 340, minWidth: 240, maxWidth: 520, cellStyle: flexCenter,
    cellRenderer: (p: any) => <MT>{p.value}</MT> },
  /* 설명이 남는 폭을 흡수한다 — maxWidth 없는 유일한 컬럼 + `FIT_GRID_WIDTH`(수시보고 '제목' 컬럼과 같은 기법) */
  { field: 'desc', headerName: '설명', width: 320, minWidth: 200, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value ? <MT>{p.value}</MT> : <span style={{ color: 'var(--muted-foreground)' }}>-</span>) },
  /* 액션 컬럼 — 정렬 대상이 아니다. 헤더명은 목업 원문 'Download' 그대로 */
  { field: 'file', headerName: 'Download', width: 132, maxWidth: 132, sortable: false, cellStyle: flexMid,
    cellRenderer: (p: any) => (p.data ? <DownloadCell row={p.data} onDownload={onDownload} /> : null) },
];

/* 엑셀 컬럼 — 화면 컬럼과 1:1(Download 액션 열은 파일명 값으로 직렬화) */
type XCol = { header: string; get: (r: ReportFormRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'No', get: (r) => r.no },
  { header: '양식제목', get: (r) => r.title },
  { header: '설명', get: (r) => r.desc },
  { header: '첨부파일', get: (r) => r.file },
];

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer motion-safe:active:scale-[.97]"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

/* 보조 액션 항목(내보내기·인쇄) — 푸터 폴백 kebab과 툴바 combo가 **같은 조각**을 공유한다(복제하면 힌트가 갈라짐) */
function MoreMenuItems({ onExport }: { onExport: () => void }) {
  return (
    <>
      <DropdownMenuItem onSelect={onExport}>
        <Icon name="download" size={17} className="shrink-0 text-muted-foreground" />내보내기 (Excel)
        <DropdownMenuShortcut>{HOTKEYS.export.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => window.print()}>
        <Icon name="file" size={17} className="shrink-0 text-muted-foreground" />인쇄
        <DropdownMenuShortcut>{HOTKEYS.print.hint}</DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
}

/* kebab(···) — **푸터 폴백 전용**. 등록이 있는 리스트의 툴바에는 RegisterCombo ⌄가 같은 항목을 제공한다(apfs-grid 규약) */
function MoreMenu({ onExport, size = 34 }: { onExport: () => void; size?: number }) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">
            <DropdownMenuTrigger aria-label="더보기"
              className="inline-flex items-center justify-center rounded-card-sm bg-transparent border-0 text-muted-foreground transition-colors hover:text-primary data-[state=open]:bg-card data-[state=open]:text-primary"
              style={{ width: size, height: size }}>
              <Icon name="more" size={20} stroke={2} />
            </DropdownMenuTrigger>
          </span>
        </TooltipTrigger>
        <TooltipContent>더보기</TooltipContent>
      </Tooltip>
      <DropdownMenuContent><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
    </DropdownMenu>
  );
}

/* 등록 combo(split) 버튼 — 좌: 1차 액션 즉시 실행 · 우: ⌄ 보조 메뉴. generic_list.tsx/subfund_manage.tsx 로컬 복사본(공유 export 아님).
   UI.Button을 못 쓰는 이유(forwardRef 없음·motion scale 이음매)와 overflow-hidden/.apfs-menu-trigger 금지 근거는 apfs-grid 스킬. */
function RegisterCombo({ label, onRegister, onExport }: { label: string; onRegister: () => void; onExport: () => void }) {
  return (
    <span className="inline-flex items-stretch rounded-[9px] border border-border-strong bg-card">
      <button type="button" onClick={onRegister}
        className="inline-flex items-center gap-[7px] rounded-l-[9px] border-0 bg-transparent px-[11px] py-1.5 font-[inherit] text-[12.5px] font-semibold text-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary">
        <Icon name="plus" size={14} stroke={2.2} />{label}
      </button>
      <span aria-hidden className="w-px self-stretch bg-border-strong" />
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <DropdownMenuTrigger aria-label="더보기"
                className="inline-flex h-full items-center justify-center rounded-r-[9px] border-0 bg-transparent px-2 text-muted-foreground cursor-pointer transition-colors duration-tok-fast ease-ds hover:text-primary data-[state=open]:text-primary">
                <Icon name="chevron-down" size={14} stroke={2.2} />
              </DropdownMenuTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>더보기</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end"><MoreMenuItems onExport={onExport} /></DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
type ModalState = null | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; id: string };

export function ReportFormManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<ReportFormRow> | null>(null);
  const [rows, setRows] = useState<ReportFormRow[]>(DEMO);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const topMoreRef = useRef<HTMLSpanElement>(null);
  const [topMoreVisible, setTopMoreVisible] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const masked = useMask();
  /* 다운로드 toast가 파일명을 노출하므로 마스크 경계(파일명도 데이터)를 지킨다 — 컬럼 콜백은 deps []로 고정되어
     마스크 상태를 ref로 읽는다(클로저 stale 방지) */
  const maskedRef = useRef(masked); maskedRef.current = masked;
  const download = useCallback((r: ReportFormRow) => {
    toast.success(maskedRef.current ? '양식 파일을 내려받습니다 (목업)' : `다운로드: ${r.file} (목업)`);
  }, []);
  /* download는 useCallback(deps [])로 안정 → 컬럼 정의 고정(매 렌더 새 배열이면 그리드가 컬럼을 재생성) */
  const columnDefs = useMemo(() => makeColumns(download), [download]);
  // 앱-스코프 단축키: ⌘⏎=양식 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());

  useEffect(() => {
    // 미지원 가드는 `if (!el) return`과 분리한다 — 합치면 초기값 true가 굳어 푸터 폴백 kebab이 영영 안 뜬다(apfs-grid)
    if (typeof IntersectionObserver === 'undefined') { setTopMoreVisible(false); return; }
    const el = topMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setTopMoreVisible(e.isIntersecting), { root: null, threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const onGridReady = useCallback((e: GridReadyEvent<ReportFormRow>) => { apiRef.current = e.api; }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 수정 진입 3경로 — 행 더블클릭 · 셀 Enter(Download 셀은 다운로드) · 우클릭 메뉴. AG Grid Tab은 셀 안 button에 닿지
     않으므로(수시보고 주석 참조) Enter 분기가 키보드 접근을 보장한다 */
  const onRowDoubleClicked = useCallback((e: RowDoubleClickedEvent<ReportFormRow>) => {
    if (e.data && !e.rowPinned) setModal({ kind: 'edit', id: e.data.id });
  }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<ReportFormRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId() === 'file') { download(e.data); return; }
    setModal({ kind: 'edit', id: e.data.id });
  }, [download]);
  const handleCellContextMenu = (e: CellContextMenuEvent<ReportFormRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      { label: '다운로드', icon: 'download', onSelect: () => download(row) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', id: row.id }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const target = modal && modal.kind !== 'create' ? rows.find((r) => r.id === modal.id) ?? null : null;

  /* ── CRUD — 불변 갱신 + toast(목업 클라이언트 회신 문구 유지) ── */
  const str = (v: unknown) => String(v ?? '').trim();
  const saveCreate = (f: any) => {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;   // 삭제 후 재번호 없음(목업 동일 — 저장된 no 유지)
    setRows((prev) => [...prev, { id: crypto.randomUUID(), no: nextNo, title: str(f.title), desc: str(f.desc), file: str(f.file) }]);
    setModal(null);
    toast.success('등록되었습니다 (목업)');
  };
  const saveEdit = (f: any) => {
    if (!target) return;
    setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, title: str(f.title), desc: str(f.desc), file: str(f.file) } : r)));
    setModal(null);
    toast.success('수정되었습니다 (목업)');
  };
  const doDelete = () => {
    if (!target) return;
    setRows((prev) => prev.filter((r) => r.id !== target.id));
    setModal(null);
    toast.success('삭제되었습니다 (목업)');
  };

  const refresh = () => { setRows([...DEMO]); toast.success('새로고침했습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더. 마스크 ON이면 숫자 0·텍스트 ''(파일명 포함 — 마스크 경계는 엑셀·파일명까지) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = rows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return masked ? 0 : v;
      return masked ? '' : v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === 'No' ? 6 : c.header === '양식제목' ? 40 : 36 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '보고양식관리');
    XLSX.writeFile(wb, '보고양식관리.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '사후보고관리', '보고양식관리']}
      title="보고양식관리"
      favRoute="report-form"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 — 검색박스가 없는 화면이라 필터 칩이 없다. 건수 컨텍스트만(매트릭스형 asset_funding의 컨텍스트 설명 관례) */
      toolbarLeft={<>
        <Icon name="file" size={16} className="text-caption" />
        <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>보고양식 {mn(String(rows.length))}건</span>
      </>}
      toolbarRight={<>
        {/* 등록이 있는 리스트라 combo(split) 버튼 — 좌: 보고양식 등록 · 우: ⌄ 내보내기·인쇄(apfs-grid 규약). 툴바 독립 kebab은 두지 않는다.
            ⚠️ topMoreRef는 combo 래퍼가 들고 있어야 한다 — ref가 비면 푸터 폴백이 영원히 안 뜬다 */}
        <span ref={topMoreRef} className="inline-flex">
          <RegisterCombo label="보고양식 등록" onRegister={() => setModal({ kind: 'create' })} onExport={exportExcel} />
        </span>
        <IconBtn icon="refresh" label="새로고침" size={34} onClick={refresh} />
      </>}
      footerLeft={<span>{'총 ' + mn(String(rows.length)) + '개 중 ' + mn(String(Math.min(shown, rows.length))) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<>
        <IconBtn icon="download" label="다운로드" size={32} onClick={exportExcel} />
        <IconBtn icon="maximize" label="전체보기" size={32} active={showAll} pressed={showAll} onClick={() => setShowAll((v) => !v)} />
        <IconBtn icon="external" label="새 창" size={32} onClick={() => window.open(location.href, '_blank')} />
        {!topMoreVisible && <MoreMenu size={32} onExport={exportExcel} />}
      </>}>

      <div>
        <AgGridReact<ReportFormRow>
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
          onRowDoubleClicked={onRowDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">등록된 보고양식이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 등록/수정 — 단일 폼 2모드(목업 openForm). 수정 모달 안 2단계 삭제는 RowFormModal 내장(onDelete) ── */}
      {modal?.kind === 'create' && (
        <RowFormModal mode="create" schema={FORM_SCHEMA} title="양식 등록"
          onSave={saveCreate} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && target && (
        <RowFormModal mode="edit" schema={FORM_SCHEMA} title="양식 수정"
          initial={{ id: target.id, title: target.title, desc: target.desc, file: target.file } as any}
          onSave={saveEdit} onClose={() => setModal(null)}
          onDelete={() => setModal({ kind: 'delete', id: target.id })} />
      )}

      {/* ── 삭제 확인(목업 alertdialog — 기본 포커스 취소·위험 버튼). Radix AlertDialog는 Cancel 기본 포커스 내장 ── */}
      {modal?.kind === 'delete' && target && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>양식 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                선택한 보고양식 <b className="text-foreground"><MT>{target.title}</MT></b> 을(를) 삭제하시겠습니까?
                <br />삭제 후에는 복구할 수 없습니다.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setModal(null)}>취소</AlertDialogCancel>
              <AlertDialogAction onClick={doDelete} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
