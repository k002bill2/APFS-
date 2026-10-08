/* 조합원정보조회 — 관리형 리스트 페이지 (투자자산관리 > 자펀드 관리 > 조합원정보조회).
   출처: S1_15_조합원정보등록.html(KRDS TO-BE) → APFS 디자인시스템으로 변형.

   구성(목업 → 우리 규약):
   - 검색박스(모펀드 1항목)  → 상세필터 드로어 1항목. 목업 그리드에 모펀드 열이 없어 **행 필터와 미연동**이라
       `DrawerField noop`(· 데이터 연동 후 적용). 연동 항목이 0개라 External Filter
       (`isExternalFilterPresent`/`doesExternalFilterPass`)를 배선하지 않는다 — 항상 true인 술어는 죽은 코드다.
       따라서 **필터 결과 집합 === rows** 이고, 적용 칩도 생기지 않는다(드로어는 열리되 적용될 값이 없다).
   - 목록 그리드(NO·조합원·사업자번호/주민번호·주소·전화번호·비고·상세조회) → AG Grid 단일 헤더.
       금액 컬럼이 없어 합계행 없음. 선언 폭 합(1212 = 선택 컬럼 44 포함)이 프레임(1280)보다 좁아 `FIT_GRID_WIDTH`로 채우고,
       **주소만 maxWidth 없이** 두어 잉여를 흡수시킨다(apfs-aggrid 폭 규약).
   - 행 클릭 선택 → [등록][수정][삭제] 노출(목업) → **체크박스 다중 선택 + 선택 바** 규약(2026-10-08 사용자 지시,
       generic_list·user_manage 동형): 선택 바 = `N건 선택됨` · [수정](1건일 때만) · [삭제](→ AlertDialog 확인) · [선택 해제].
         등록 = 툴바 등록 버튼(1차 액션 상시 노출, ⌘⏎) · 수정 = 선택 바 [수정]·셀 더블클릭·셀 Enter·우클릭 메뉴 ·
         삭제 = 선택 바 [삭제]·우클릭 메뉴(→ AlertDialog 확인, 다건 가능) 또는 수정 모달 안 삭제(→ AlertDialog) — 모든 삭제 경로가 안내 팝업을 거친다(2026-10-08).
   - 등록/수정 단일 폼 2모드(목업 openMember) → `member_info_form_modal.tsx`(커스텀).
       RowFormModal로는 중복확인 버튼·자동 하이픈 서식·라벨 전환(사업자번호↔주민번호)을 표현할 수 없다.
   - 상세조회 팝업(목업 openDetail, S1_16 흡수) → `member_info_detail_modal.tsx`.
       진입 3경로: 상세조회 셀 버튼 · 그 셀에서 Enter · 우클릭 메뉴 항목.
   - 삭제 확인 alertdialog(기본 포커스 취소, 위험 버튼) → Radix AlertDialog(Cancel 기본 포커스 내장).
   - 엑셀(목업 '엑셀' 버튼) → 푸터 내보내기 아이콘 + ⌥D. 상세조회 액션 열은 값이 아니라 제외.
   - KPI 배지 행 미포함 · 카드뷰 없음 · 금액 단위 토글은 **목록에 미적용**(목업 설계메모: 등록/수정 있는
       CRUD 관리화면이라 규칙상 미적용, 읽기전용 상세조회 팝업에만 적용).

   한계·가정:
   - `mf`(모펀드)는 그리드 컬럼이 아니지만 **등록/수정 폼 1번 항목**이라 행에 왕복 저장한다(목록 표시·필터 대상 아님).
   - 전화번호·비고는 목업 샘플이 공란이라 muted '-'로 표시한다(없는 값 창작 금지).
   목업의 GNB/LNB 토글·출처시스템 메뉴·서브탭·LNB는 프로토타입 스캐폴딩이라 이식하지 않는다(셸이 소유). */
import './aggrid_shared.css';   // 공유 보정 CSS(헤더 sticky — 합계행은 없지만 전 그리드 공통)
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { UI } from './components';
import { Icon } from './icons';
import { GridFrame, FooterActions } from './grid_frame';
import { apfsTheme, FIT_GRID_WIDTH, DEFAULT_COL_DEF } from './aggrid_theme';
import { SELECTION_COL } from './aggrid_selection';   // 행선택 컬럼 = DS Checkbox(SSOT)
import { drawerInputStyle as inputStyle } from './schemas/renderers';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridApi, GridReadyEvent, SelectionChangedEvent, RowSelectionOptions, CellKeyDownEvent, CellContextMenuEvent, CellDoubleClickedEvent, CellStyle } from 'ag-grid-community';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from './ui/sheet';
import { useHotkey, HOTKEYS } from './use-hotkey';
import { toast } from './ui/sonner';
import * as XLSX from 'xlsx';   // SheetJS 쓰기 전용(XLSX.read 미사용)
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from './ui/alert-dialog';
import { RowContextMenu } from './row_context_menu';   // 우클릭 컨텍스트 메뉴(Community 대체, 공유)
import type { CtxItem, CtxMenuState } from './row_context_menu';
import { MemberInfoFormModal } from './member_info_form_modal';
import { MemberInfoDetailModal } from './member_info_detail_modal';
import { DrawerSelect } from './drawer_select';   // 상세필터 select 공용본(옵션 많으면 검색형)

const { Button, IconBtn } = UI;

/* ──────────────────────────────
   도메인 타입 · 데모 데이터
────────────────────────────── */
export interface MemberRow {
  id: string; no: number;
  name: string;    // 조합원(법인명 또는 성명)
  biz: string;     // 사업자번호/주민번호(개인=13자리, 법인=10자리) — pii
  addr: string;
  tel: string;     // '' = 없음 → 화면 '-'
  memo: string;    // '' = 없음 → 화면 '-'
  ptype: '개인' | '법인';
  region: '국내' | '해외';
  mf: string;      // 모펀드 — 폼 1번 항목(목록 컬럼 아님, 위 주석 참조)
}

/* 목업 DATA 그대로(1행) — "원본 샘플 데이터(1행) — 없는 값은 생성하지 않음". tel·memo는 원본 공란 유지 */
const DEMO: MemberRow[] = [
  { id: 'mi-1', no: 1, name: '마그나인베스트먼트(주)', biz: '120-87-54252', addr: '서울 강남구 테헤란로98길 15 대치동, 송강빌딩 14층', tel: '', memo: '', ptype: '법인', region: '국내', mf: '농식품모태펀드' },
];

/* 모펀드 옵션 — 목업 검색박스/등록폼 select 2종 그대로 */
const MF_OPTIONS = ['농식품모태펀드', 'MOAF'];

const PAGE_SIZE = 20;

/* ──────────────────────────────
   컬럼 정의 — 목업 thead 순서 그대로:
     NO · 조합원 · 사업자번호/주민번호 · 주소 · 전화번호 · 비고 · 상세조회
   ⚠ 폭 관련 그리드 prop(`autoSizeStrategy`·`defaultColDef`)은 aggrid_theme.ts 공용 상수만 쓴다(인라인 금지 이유는 그 파일 주석).
   ⚠ 정렬 규약(2026-10-02): 값 열은 좌측(NO·전화번호 포함). 상세조회 버튼 열만 가운데(컨트롤 열).
────────────────────────────── */
const tabNum: CellStyle = { fontVariantNumeric: 'tabular-nums' };
const flexCenter: CellStyle = { display: 'flex', alignItems: 'center' };

/* 고정폭(내용 맞춤 불필요·헤더 라벨 폭이 하한) — 잉여는 maxWidth 없는 주소 컬럼이 흡수한다 */
const fixed = (width: number) => ({ width, maxWidth: width, minWidth: width });

/* 값 없음 표시 — 목업 `<span class="muted">-</span>`(전화번호·비고 공통) */
const Dash = () => <span style={{ color: 'var(--muted-foreground)' }}>-</span>;

/* 상세조회 셀 — 셀 안 버튼. 대상 조합원명은 sr-only로 덧붙여 행마다 접근名을
   구분한다(목업 `aria-label="<조합원명> 상세조회"`). UI.Button은 rest props가 없어 aria-label을 못 받으므로 children으로 보강. */
function DetailCell({ row, onDetail }: { row: MemberRow; onDetail: (r: MemberRow) => void }) {
  return (
    <Button variant="outline" size="sm" onClick={() => onDetail(row)}>
      <span className="sr-only">{row.name} </span>상세조회
    </Button>
  );
}

const makeColumns = (onDetail: (r: MemberRow) => void): ColDef<MemberRow>[] => [
  { field: 'no', headerName: 'NO', ...fixed(68), pinned: 'left', cellStyle: tabNum, valueFormatter: (p) => String(p.value) },
  { field: 'name', headerName: '조합원', width: 200, minWidth: 160, maxWidth: 320, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span> },
  /* 식별번호(pii) */
  { field: 'biz', headerName: '사업자번호/주민번호', ...fixed(170), cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span> },
  /* 주소가 남는 폭을 흡수한다 — maxWidth 없는 유일한 컬럼 + `FIT_GRID_WIDTH`(목업 `td.addr` min-width 280 반영) */
  { field: 'addr', headerName: '주소', width: 320, minWidth: 280, cellStyle: flexCenter,
    cellRenderer: (p: any) => <span className="min-w-0 truncate">{p.value}</span> },
  { field: 'tel', headerName: '전화번호', ...fixed(130), cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value ? p.value : <Dash />) },
  { field: 'memo', headerName: '비고', ...fixed(160), cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.value ? p.value : <Dash />) },
  /* 액션 컬럼 — 값이 아니라 정렬 대상이 아니다. field가 없으므로 colId 명시 */
  { colId: 'detail', headerName: '상세조회', ...fixed(120), sortable: false, cellStyle: flexCenter,
    cellRenderer: (p: any) => (p.data ? <DetailCell row={p.data} onDetail={onDetail} /> : null) },
];

/* 다중 선택(2026-10-08 사용자 지시 — generic_list·user_manage 동형). 체크박스로만 on/off(행 본문 클릭 선택 없음).
   모듈 상수 — 렌더마다 새 객체면 AG Grid가 컬럼을 재생성한다(generic_list ROW_SELECTION 주석) */
const ROW_SELECTION: RowSelectionOptions<MemberRow> = { mode: 'multiRow', checkboxes: true, headerCheckbox: false, selectAll: 'filtered', enableClickSelection: false };

/* 엑셀 컬럼 — 화면 컬럼과 1:1(화면=엑셀 불변식). 상세조회 액션 열은 값이 아니라 제외 */
type XCol = { header: string; get: (r: MemberRow) => string | number };
const EXPORT_COLS: XCol[] = [
  { header: 'NO', get: (r) => r.no },
  { header: '조합원', get: (r) => r.name },
  { header: '사업자번호/주민번호', get: (r) => r.biz },
  { header: '주소', get: (r) => r.addr },
  { header: '전화번호', get: (r) => r.tel },
  { header: '비고', get: (r) => r.memo },
];

function PageBtn({ n, active, onClick }: { n: number; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center font-semibold cursor-pointer"
      style={{ minWidth: 30, height: 30, padding: '0 8px', borderRadius: 8, border: '1px solid ' + (active ? 'var(--primary)' : 'var(--border)'), background: active ? 'var(--primary)' : 'transparent', color: active ? 'var(--primary-foreground)' : 'var(--foreground)', fontSize: 12.5 }}>{n}</button>
  );
}

function DrawerField({ label, noop, plain, children }: { label: string; noop?: boolean; plain?: boolean; children: React.ReactNode }) {
  const Wrap: any = plain ? 'div' : 'label';
  return (
    <Wrap className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>
        {label}{noop && <span className="font-normal text-caption" style={{ fontSize: 12 }}> · 데이터 연동 후 적용</span>}
      </span>
      {children}
    </Wrap>
  );
}

/* ──────────────────────────────
   메인 컴포넌트
────────────────────────────── */
/* delete는 다건(ids) — 우클릭 삭제 = [row.id], 선택 바 삭제 = 선택 id 전체 */
type ModalState = null | { kind: 'create' } | { kind: 'edit'; id: string } | { kind: 'delete'; ids: string[] } | { kind: 'detail'; id: string };

export function MemberInfoManage({ onNav }: { onNav?: (r: string) => void }) {
  const apiRef = useRef<GridApi<MemberRow> | null>(null);
  const [rows, setRows] = useState<MemberRow[]>(DEMO);
  /* 선택 SSOT = id 배열 하나(건수는 파생 — apfs-aggrid "선택 상태는 selIds 하나로") */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selCount = selIds.length;
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: DEMO.length });
  const [modal, setModal] = useState<ModalState>(null);
  const [ctx, setCtx] = useState<CtxMenuState>(null);

  /* 상세필터 — 목업 검색박스는 모펀드 1항목뿐이고 그리드 컬럼과 미연동이라 state만 둔다(no-op).
     연동 항목이 0개이므로 External Filter를 배선하지 않는다 → 표시 집합 === rows(파일 상단 주석). */
  const [filterOpen, setFilterOpen] = useState(false);
  const [fMf, setFMf] = useState('');
  const clearFilters = () => setFMf('');

  const openDetail = useCallback((r: MemberRow) => setModal({ kind: 'detail', id: r.id }), []);
  /* openDetail은 useCallback(deps [])로 안정 → 컬럼 정의 고정(매 렌더 새 배열이면 그리드가 컬럼을 재생성하며 폭을 되돌린다) */
  const columnDefs = useMemo(() => makeColumns(openDetail), [openDetail]);

  // 앱-스코프 단축키: ⌘⏎=조합원정보 등록(모달 열림 중엔 비활성 → 이중 열림 방지), ⌘P=인쇄, ⌥D=내보내기
  useHotkey(HOTKEYS.register.combo, () => setModal({ kind: 'create' }), { enabled: modal === null });
  useHotkey(HOTKEYS.print.combo, () => window.print());
  useHotkey(HOTKEYS.export.combo, () => exportExcel());


  const onGridReady = useCallback((e: GridReadyEvent<MemberRow>) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent<MemberRow>) => {
    setSelIds(e.api.getSelectedRows().map((r) => r.id));
  }, []);
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* 수정 진입 3경로 — 셀 더블클릭 · 셀 Enter(상세조회 셀은 상세 팝업) · 우클릭 메뉴.
     ⚠ `onRowDoubleClicked`가 아니라 `onCellDoubleClicked`를 쓴다 — 상세조회 버튼을 더블클릭하면
        1클릭에 상세 팝업이 열리고 행 이벤트로 수정 모달까지 겹쳐 뜬다. 컬럼을 알아야 그 열만 제외할 수 있다. */
  const onCellDoubleClicked = useCallback((e: CellDoubleClickedEvent<MemberRow>) => {
    if (!e.data || e.rowPinned || e.column.getColId() === 'detail') return;
    setModal({ kind: 'edit', id: e.data.id });
  }, []);
  /* AG Grid의 Tab은 **셀 단위**로만 움직여 셀 안 button에 초점이 닿지 않는다 → Enter 분기가 키보드 접근을 보장한다 */
  const onCellKeyDown = useCallback((e: CellKeyDownEvent<MemberRow>) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId() === 'detail') { setModal({ kind: 'detail', id: e.data.id }); return; }
    setModal({ kind: 'edit', id: e.data.id });
  }, []);
  const handleCellContextMenu = (e: CellContextMenuEvent<MemberRow>) => {
    (e.event as MouseEvent | undefined)?.preventDefault();
    const row = e.data;
    if (!row || e.rowPinned) return;
    const ev = e.event as MouseEvent;
    const items: CtxItem[] = [
      { label: '수정', icon: 'file', onSelect: () => setModal({ kind: 'edit', id: row.id }) },
      { label: '상세조회', icon: 'search', onSelect: () => setModal({ kind: 'detail', id: row.id }) },
      { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel },
      'sep',
      { label: '삭제', icon: 'trash', danger: true, onSelect: () => setModal({ kind: 'delete', ids: [row.id] }) },
    ];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const target = modal && (modal.kind === 'edit' || modal.kind === 'detail') ? rows.find((r) => r.id === modal.id) ?? null : null;
  /* 삭제 대상 — 모달이 연 시점의 ids 중 아직 존재하는 행 */
  const delRows = modal?.kind === 'delete' ? rows.filter((r) => modal.ids.includes(r.id)) : [];

  /* ── CRUD — 불변 갱신. 등록/수정 toast는 모달이 낸다(mode를 아는 쪽) ── */
  const saveCreate = (patch: Omit<MemberRow, 'id' | 'no'>) => {
    const nextNo = rows.reduce((m, r) => Math.max(m, r.no), 0) + 1;   // 삭제 후 재번호 없음(저장된 no 유지)
    setRows((prev) => [...prev, { ...patch, id: crypto.randomUUID(), no: nextNo }]);
    setModal(null);
  };
  const saveEdit = (patch: Omit<MemberRow, 'id' | 'no'>) => {
    if (!target) return;
    setRows((prev) => prev.map((r) => (r.id === target.id ? { ...r, ...patch } : r)));
    setModal(null);
  };
  const doDelete = (ids: string[]) => {
    const del = new Set(ids);
    setRows((prev) => prev.filter((r) => !del.has(r.id)));
    apiRef.current?.deselectAll();
    toast.success(ids.length === 1 ? '삭제되었습니다' : `${ids.length}건을 삭제했습니다`);
  };
  /* 선택 바 [수정] — 체크 1건일 때만 노출. 더블클릭·Enter·우클릭 '수정'과 같은 모달을 연다 */
  const editSelected = () => { if (selIds.length === 1) setModal({ kind: 'edit', id: selIds[0] }); };

  const refresh = () => { setRows([...DEMO]); apiRef.current?.deselectAll(); clearFilters(); toast.success('조회되었습니다'); };

  /* ── Excel(.xlsx) — 단일 헤더(합계행 없음) ── */
  const exportExcel = () => {
    const head = EXPORT_COLS.map((c) => c.header);
    const body = rows.map((r) => EXPORT_COLS.map((c) => {
      const v = c.get(r);
      if (typeof v === 'number') return v;
      return v;
    }));
    const ws = XLSX.utils.aoa_to_sheet([head, ...body]);
    ws['!cols'] = EXPORT_COLS.map((c) => ({ wch: c.header === 'NO' ? 6 : c.header === '주소' ? 44 : c.header === '조합원' ? 28 : 22 }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, '조합원정보조회');
    XLSX.writeFile(wb, '조합원정보조회.xlsx');
    toast.success('Excel로 내보냈습니다');
  };

  const pageSize = showAll ? Math.max(rows.length, 1) : PAGE_SIZE;
  const shown = Math.min(pageSize, Math.max(0, page.rowCount - page.current * pageSize));

  /* 선택 컨텍스트 액션 — GridFrame 이 툴바 좌측과 하단 플로팅 바 **중 한 곳에만** 렌더한다(contextActions 슬롯) */
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      {selCount === 1 && <Button variant="primary" size="sm" leadingIcon="file" onClick={editSelected}>수정</Button>}
      <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger)' }} onClick={() => setModal({ kind: 'delete', ids: selIds })}>삭제</Button>
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  return (
    <GridFrame
      crumbs={['홈', '투자자산관리', '자펀드 관리', '조합원정보조회']}
      title="조합원정보조회"
      favRoute="member-info"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      /* 툴바 좌 — 주 필터 칩이 없는 화면이다(검색박스 유일 항목인 모펀드가 행과 미연동).
         목업 listbar의 `총 N건` 캡션을 건수 컨텍스트로 옮겼다(report_form_manage 동형) */
      toolbarLeft={selCount > 0 ? undefined : <>   {/* 선택 중엔 비운다 — selbar와 나란히 그려진다(GridFrame contextActions 계약) */}
        <span className="text-caption font-semibold" style={{ fontSize: 12.5 }}>조합원 {String(rows.length)}건</span>
      </>}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        <Button variant="outline" size="sm" leadingIcon="plus" onClick={() => setModal({ kind: 'create' })}>조합원정보 등록</Button>
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span>{'총 ' + String(rows.length) + '개 중 ' + String(Math.min(shown, rows.length)) + '개 항목 표시 중'}</span>}
      footerCenter={page.total > 1 ? (
        <>
          <IconBtn icon="chevron-left" label="이전" size={32} onClick={() => apiRef.current?.paginationGoToPreviousPage()} />
          {Array.from({ length: page.total }, (_, i) => <PageBtn key={i} n={i + 1} active={i === page.current} onClick={() => apiRef.current?.paginationGoToPage(i)} />)}
          <IconBtn icon="chevron-right" label="다음" size={32} onClick={() => apiRef.current?.paginationGoToNextPage()} />
        </>
      ) : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <div>
        <AgGridReact<MemberRow>
          theme={apfsTheme}
          rowData={rows}
          columnDefs={columnDefs}
          getRowId={(p) => p.data.id}
          domLayout="autoHeight"
          autoSizeStrategy={FIT_GRID_WIDTH}   // 선언 폭 합이 프레임보다 좁다 → 잉여는 maxWidth 없는 주소 컬럼이 흡수
          defaultColDef={DEFAULT_COL_DEF}
          rowSelection={ROW_SELECTION}
          selectionColumnDef={SELECTION_COL}
          pagination paginationPageSize={pageSize} suppressPaginationPanel
          preventDefaultOnContextMenu
          onGridReady={onGridReady}
          onSelectionChanged={onSelectionChanged}
          onPaginationChanged={onPaginationChanged}
          onCellDoubleClicked={onCellDoubleClicked}
          onCellKeyDown={onCellKeyDown}
          onCellContextMenu={handleCellContextMenu}
          overlayNoRowsTemplate={'<span style="padding:40px 0;color:var(--muted-foreground);font-size:13px">등록된 조합원이 없습니다.</span>'}
        />
      </div>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />

      {/* ── 상세필터 드로어 — 목업 검색박스 항목 그대로(모펀드 1개). 검색어는 미사용(OFF).
             모펀드는 그리드 컬럼과 미연동이라 noop 캡션(apfs-detail-filter) ── */}
      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">조합원 목록을 거르는 상세 필터</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            <DrawerField label="모펀드" noop><DrawerSelect value={fMf} onChange={setFMf} options={MF_OPTIONS} /></DrawerField>
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={clearFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── 등록/수정 — 단일 폼 2모드(목업 openMember). 수정 모달 안 삭제는 onDelete로 삭제 확인 AlertDialog를 연다(fund_member 동형) ── */}
      {modal?.kind === 'create' && (
        <MemberInfoFormModal mode="create" onSave={saveCreate} onClose={() => setModal(null)} />
      )}
      {modal?.kind === 'edit' && target && (
        <MemberInfoFormModal mode="edit" initial={target} onSave={saveEdit} onClose={() => setModal(null)}
          onDelete={() => setModal({ kind: 'delete', ids: [target.id] })} />
      )}

      {/* ── 읽기전용 상세조회 팝업(S1_16 흡수) — 상세조회 버튼 · 그 셀 Enter · 우클릭 메뉴가 연다 ── */}
      {modal?.kind === 'detail' && target && <MemberInfoDetailModal row={target} onClose={() => setModal(null)} />}

      {/* ── 삭제 확인(목업 alertdialog — 기본 포커스 취소·위험 버튼). Radix AlertDialog는 Cancel 기본 포커스 내장.
             우클릭(1건)·선택 바(N건) 공용 — 1건이면 이름, 다건이면 건수를 굵게 ── */}
      {delRows.length > 0 && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setModal(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>조합원 삭제</AlertDialogTitle>
              <AlertDialogDescription>
                {delRows.length === 1
                  ? <><b className="text-foreground">{delRows[0].name}</b> 조합원 정보를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.</>
                  : <><b className="text-foreground">{String(delRows.length)}건</b>의 조합원 정보를 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>취소</AlertDialogCancel>
              <AlertDialogAction onClick={() => doDelete(delRows.map((r) => r.id))} style={{ background: 'var(--danger)', color: 'var(--destructive-foreground)' }}>삭제</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </GridFrame>
  );
}
