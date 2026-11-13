/* 파일BOX — 전체 화면(route file-box, 화면ID FRT005). 메뉴 트리에 없는 앱 전용 화면이다(LNB 미노출) —
   진입은 GNB 사용자 메뉴 [파일BOX](⌥B) 팝업의 [전체 화면]. 출처: `파일BOX_목업.html`(전체 화면) → APFS 디자인시스템으로 변형.
   데이터 file_box_data · 규칙 file_box_model(+test) · 목록 저장소 file_box_store(팝업과 공유) · 컬럼·엑셀 file_box_columns
   · 업로드·삭제·추가·교체 대화상자 file_box_actions. 이 파일은 배선만 한다.

   목업 → 우리 규약
   - pill 탭 2개(내 파일함 / 운용사 제출 파일 관리) → 공용 TabBar·TabPanel(WAI-ARIA 탭) · 활성 탭 그리드만 마운트, 탭마다 필터 유지.
   - 탭바 우측 검색칸 → 상세필터 드로어 + 적용 칩. 내 파일함 = 파일명 / 운용사 제출 = 운용사·조합명·투자기업(select, 10개 이상이면 검색형)·파일명.
     주 필터 칩은 두지 않는다(목업 검색항목이 전부 이름 검색이라 칩으로 올릴 열거형이 없다).
   - 본문 드롭존 → 툴바 [업로드](등록 액션이 없는 화면 규약) + 공용 UploadModal(PDF·HWP·DOCX·XLSX·ZIP · 최대 20MB).
   - 파일 카드 목록·제출 파일 표 → AG Grid. 파일명 = 확장자 아이콘 + 링크(다운로드, Enter 동치).
   - 행마다 붙은 ⬇·🗑·[추가·교체] → 체크박스 선택 + 선택 바: 내 파일함 [다운로드][삭제] · 운용사 제출 [다운로드][추가·교체(1건일 때)].
     다운로드 = 1개는 목업 텍스트 파일, 여러 개는 ZIP 하나(file_box_columns.downloadFiles).
     운용사 제출 행 더블클릭 = 추가·교체. 우클릭 메뉴는 같은 동작 + Excel.
   - [‹ 메인으로] → 헤더 [메인으로] · 엑셀 = 푸터 내보내기(⌥D) · 인쇄 = 그리드만(⌘P).
   - 목업 상단바·통합검색·프로필 메뉴·명세서 5종·일정·로그아웃 팝업은 옮기지 않는다(셸 소유 / 이 화면 범위 밖).
   결정·가정
   - KPI 배지 행 미포함(사용자 결정) · 카드뷰 없음 · 명세 팝업 없음 · 내 파일함 [삭제]는 확인창 후 반영(목업은 즉시 삭제).
   - 업로드 직후 행의 크기는 '-'(드롭존이 파일명만 넘긴다) · 등록일 = 오늘.
   ⚠ 실제 업로드가 아니다 — 파일명만 있는 더미 목록을 화면 안에서 바꾼다. 다운로드는 원본이 아닌 목업 텍스트(·ZIP)다. */
import '../../aggrid_shared.css';
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent, CellContextMenuEvent, RowDoubleClickedEvent } from 'ag-grid-community';
import { UI } from '../../components';
import { GridFrame, FooterActions, footerCount } from '../../grid_frame';
import { GridPager } from '../../grid_pager';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { drawerInputStyle } from '../../schemas/renderers';
import { Sheet, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription } from '../../ui/sheet';
import { useHotkey, HOTKEYS } from '../../use-hotkey';
import { printGrid } from '../../print_grid';
import { toast } from '../../ui/sonner';
import { RowContextMenu } from '../../row_context_menu';
import type { CtxItem, CtxMenuState } from '../../row_context_menu';
import { DrawerSelect } from '../../drawer_select';
import { TabBar, TabPanel } from '../../risk_page_kit';
import type { MyFile, SubFile } from './file_box_data';
import { filterMy, filterSub, optionsOf, MY_F0, SUB_F0 } from './file_box_model';
import type { MyFilter, SubFilter } from './file_box_model';
import { useFileBox } from './file_box_store';
import { MY_COLS, SUB_COLS, NAME_COL, ROW_SELECTION, downloadFiles, exportMy, exportSub } from './file_box_columns';
import { useFileBoxActions } from './file_box_actions';

const { Button, IconBtn } = UI;

type TabId = 'my' | 'sub';
const TABS: { id: TabId; label: string }[] = [{ id: 'my', label: '내 파일함' }, { id: 'sub', label: '운용사 제출 파일 관리' }];
const ID_BASE = 'fbox';
const PAGE_SIZE = 20;
const DANGER_FILL = { background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' } as const;

function DrawerField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block font-semibold text-muted-foreground" style={{ fontSize: 14, marginBottom: 6 }}>{label}</span>
      {children}
    </label>
  );
}
const NameInput = ({ value, onChange, onEnter }: { value: string; onChange: (v: string) => void; onEnter: () => void }) => (
  <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="파일명을 입력하세요" style={drawerInputStyle('text')}
    onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) onEnter(); }} />
);

export function FileBox({ onNav }: { onNav?: (r: string) => void }) {
  const { my, sub } = useFileBox();
  const [tab, setTab] = useState<TabId>('my');
  const isMy = tab === 'my';
  const [filterOpen, setFilterOpen] = useState(false);
  const [myF, setMyF] = useState<MyFilter>(MY_F0);
  const [subF, setSubF] = useState<SubFilter>(SUB_F0);
  const setSub = (p: Partial<SubFilter>) => setSubF((cur) => ({ ...cur, ...p }));
  const [ctx, setCtx] = useState<CtxMenuState>(null);
  const [showAll, setShowAll] = useState(false);
  const [page, setPage] = useState({ current: 0, total: 1, rowCount: 0 });

  const apiRef = useRef<GridApi | null>(null);
  /* 선택 SSOT — 체크된 행 id 배열(selCount 는 파생). 탭을 바꾸면 그리드가 새로 마운트되므로 비운다 */
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const clearSel = () => { selIdsRef.current = []; apiRef.current?.deselectAll(); setSelIds([]); };
  const actions = useFileBoxActions(clearSel);
  /* 필터를 바꾸면 선택을 전부 해제한다(2026-10-27 사용자 결정) — ref 도 먼저 비워 뒤이은 rowDataUpdated 복원이 되살리지 않게 */
  useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [myF, subF]);

  const myRows = useMemo(() => filterMy(my, myF), [my, myF]);
  const subRows = useMemo(() => filterSub(sub, subF), [sub, subF]);
  const visibleCount = isMy ? myRows.length : subRows.length;
  const selected = (ids: readonly string[]) => (isMy ? my : sub).filter((r) => ids.includes(r.id));

  const switchTab = (id: string) => { setTab(id as TabId); selIdsRef.current = []; setSelIds([]); };
  const exportExcel = () => (isMy ? exportMy(myRows) : exportSub(subRows));
  const refresh = () => { if (isMy) setMyF(MY_F0); else setSubF(SUB_F0); clearSel(); toast.success('조회되었습니다'); };
  const resetFilters = () => (isMy ? setMyF(MY_F0) : setSubF(SUB_F0));

  useHotkey(HOTKEYS.print.combo, printGrid, { enabled: !filterOpen, skipInDialog: true });
  useHotkey(HOTKEYS.export.combo, () => exportExcel(), { enabled: !filterOpen, skipInDialog: true });

  const onGridReady = useCallback((e: GridReadyEvent) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent) => { setSelIds(e.api.getSelectedRows().map((r: { id: string }) => r.id)); }, []);
  /* 업로드·삭제·추가·교체로 rowData 가 바뀐 뒤 체크를 되돌린다(multiRow 복원은 공유 헬퍼로만) */
  const onRowDataUpdated = useCallback((e: { api: GridApi }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  /* 값 비교 가드 — 매 호출 새 객체 setState 는 렌더 루프 */
  const onPaginationChanged = useCallback(() => {
    const api = apiRef.current; if (!api) return;
    const next = { current: api.paginationGetCurrentPage(), total: api.paginationGetTotalPages(), rowCount: api.paginationGetRowCount() };
    setPage((p) => (p.current === next.current && p.total === next.total && p.rowCount === next.rowCount ? p : next));
  }, []);
  /* Enter — 파일명 칸 = 다운로드, 운용사 제출의 다른 칸 = 추가·교체(더블클릭 동치) */
  const onCellKeyDown = (e: CellKeyDownEvent) => {
    if ((e.event as KeyboardEvent | null)?.key !== 'Enter' || !e.data) return;
    if (e.column.getColId() === NAME_COL) downloadFiles([e.data]);
    else if (!isMy) actions.openSupplement(e.data.id);
  };
  const onSubDouble = (e: RowDoubleClickedEvent<SubFile>) => { if (e.data) actions.openSupplement(e.data.id); };
  const onContextMenu = (e: CellContextMenuEvent) => {
    const ev = e.event as MouseEvent | undefined;
    ev?.preventDefault();
    const row = e.data as (MyFile | SubFile) | undefined;
    if (!row || !ev) return;
    const items: CtxItem[] = isMy
      ? [{ label: '다운로드', icon: 'download', onSelect: () => downloadFiles([row]) },
        { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel }, 'sep',
        { label: '삭제', icon: 'trash', danger: true, onSelect: () => actions.askDelete([row.id]) }]
      : [{ label: '다운로드', icon: 'download', onSelect: () => downloadFiles([row]) },
        { label: '추가·교체', icon: 'upload', onSelect: () => actions.openSupplement(row.id) },
        { label: 'Excel 내보내기', icon: 'download', onSelect: exportExcel }];
    setCtx({ x: ev.clientX, y: ev.clientY, items });
  };

  const applied = (isMy
    ? [['파일명', myF.name.trim(), () => setMyF(MY_F0)]]
    : [['운용사', subF.org, () => setSub({ org: '' })], ['조합명', subF.fund, () => setSub({ fund: '' })],
      ['투자기업', subF.co, () => setSub({ co: '' })], ['파일명', subF.name.trim(), () => setSub({ name: '' })]]
  ) as [string, string, () => void][];

  const selCount = selIds.length;
  const selActions = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="download" onClick={() => downloadFiles(selected(selIds))}>다운로드</Button>
      {isMy && <Button variant="primary" size="sm" leadingIcon="trash" style={DANGER_FILL} onClick={() => actions.askDelete(selIds)}>삭제</Button>}
      {!isMy && selCount === 1 && <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => actions.openSupplement(selIds[0])}>추가·교체</Button>}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : null;

  const pageSize = showAll ? Math.max(visibleCount, 1) : PAGE_SIZE;
  const shown = Math.min(visibleCount, Math.max(0, page.rowCount - page.current * pageSize), pageSize);
  const grid = {
    theme: apfsTheme, defaultColDef: DEFAULT_COL_DEF, selectionColumnDef: SELECTION_COL,
    getRowId: (p: { data: { id: string } }) => p.data.id, domLayout: 'autoHeight' as const,
    pagination: true, paginationPageSize: pageSize, suppressPaginationPanel: true, preventDefaultOnContextMenu: true,
    onGridReady, onSelectionChanged, onRowDataUpdated, onPaginationChanged, onCellKeyDown, onCellContextMenu: onContextMenu,
  };

  return (
    <GridFrame
      crumbs={['홈', '파일BOX']}
      title="파일BOX"
      headerActions={<Button variant="outline" size="sm" leadingIcon="chevron-left" onClick={() => onNav && onNav('main')}>메인으로</Button>}
      appliedFilters={applied.map(([label, value, onClear]) => ({ label, value, onClear }))}
      filterScope={tab}
      contextActions={selActions}
      toolbarRight={<>
        <Button variant="ghost" size="sm" leadingIcon="panel-left" onClick={() => setFilterOpen(true)}>상세필터</Button>
        {isMy && <Button variant="outline" size="sm" leadingIcon="upload" onClick={actions.openUpload}>업로드</Button>}
        <IconBtn icon="refresh" label="조회" size={34} onClick={refresh} hotkey={HOTKEYS.refresh} />
      </>}
      footerLeft={<span aria-live="polite">{footerCount(visibleCount, shown)}</span>}
      footerCenter={page.total > 1 ? <GridPager current={page.current} total={page.total} onGo={(i) => apiRef.current?.paginationGoToPage(i)} /> : undefined}
      footerRight={<FooterActions onExport={exportExcel} showAll={showAll} onToggleAll={() => setShowAll((v) => !v)} />}>

      <TabBar tabs={TABS} value={tab} onChange={switchTab} idBase={ID_BASE} label="파일함 구분" />
      <TabPanel idBase={ID_BASE} value={tab}>
        {isMy
          ? <AgGridReact<MyFile> key="my" {...grid} rowSelection={ROW_SELECTION} rowData={myRows} columnDefs={MY_COLS} overlayNoRowsTemplate="내 파일함에 조건에 맞는 파일이 없습니다." />
          : <AgGridReact<SubFile> key="sub" {...grid} rowSelection={ROW_SELECTION} rowData={subRows} columnDefs={SUB_COLS} onRowDoubleClicked={onSubDouble} overlayNoRowsTemplate="조건에 맞는 제출 파일이 없습니다." />}
      </TabPanel>

      <RowContextMenu state={ctx} onClose={() => setCtx(null)} />
      {actions.dialogs}

      <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
        <SheetContent side="right" hideClose className="w-[408px] max-w-[92vw]">
          <SheetHeader>
            <SheetTitle>상세 필터</SheetTitle>
            <SheetDescription className="sr-only">{`${isMy ? TABS[0].label : TABS[1].label} 목록을 거르는 상세 필터`}</SheetDescription>
            <IconBtn icon="x" onClick={() => setFilterOpen(false)} label="닫기" size={38} />
          </SheetHeader>
          <div className="flex-1 overflow-y-auto" style={{ padding: '20px clamp(14px,3vw,20px)' }}>
            {isMy ? (
              <DrawerField label="파일명"><NameInput value={myF.name} onChange={(v) => setMyF({ name: v })} onEnter={() => setFilterOpen(false)} /></DrawerField>
            ) : (<>
              <DrawerField label="운용사"><DrawerSelect value={subF.org} onChange={(v) => setSub({ org: v })} options={optionsOf(sub, 'org')} /></DrawerField>
              <DrawerField label="조합명"><DrawerSelect value={subF.fund} onChange={(v) => setSub({ fund: v })} options={optionsOf(sub, 'fund')} /></DrawerField>
              <DrawerField label="투자기업"><DrawerSelect value={subF.co} onChange={(v) => setSub({ co: v })} options={optionsOf(sub, 'co')} /></DrawerField>
              <DrawerField label="파일명"><NameInput value={subF.name} onChange={(v) => setSub({ name: v })} onEnter={() => setFilterOpen(false)} /></DrawerField>
            </>)}
          </div>
          <SheetFooter>
            <Button variant="outline" size="md" onClick={resetFilters}>초기화</Button>
            <Button variant="primary" size="md" style={{ flex: 1 }} onClick={() => setFilterOpen(false)}>필터 적용</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </GridFrame>
  );
}
