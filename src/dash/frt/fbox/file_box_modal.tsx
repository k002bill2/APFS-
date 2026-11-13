/* 파일BOX 팝업 — GNB 사용자 메뉴 [파일BOX](⌥B)로 여는 빠른 보기. 출처: `파일BOX_목업.html` file-popup(+ `메인_공통아이콘_목업.html` 파일BOX 모달).
   셸이 도메인을 모르므로(core_domain_free) app.tsx 가 AppShell `userTools` 슬롯으로 이 컴포넌트를 넘긴다.
   목업 → 우리 규약:
   - pill 탭 2개 → 공용 TabBar(밑줄 탭, ←/→) · 활성 탭 그리드만 마운트.
   - 검색칸: 내 파일함 = 파일명 / 운용사 제출 = 한 칸(운용사·조합명·투자기업·파일명 중 하나라도 — 목업 4칸을 팝업 폭에 맞춰 합침).
     세분 조건은 전체 화면의 상세필터에서.
   - 드롭존 → [업로드] 버튼 + 공용 UploadModal · 행마다 붙은 ⬇·🗑·추가·교체 → 체크박스 선택 + 선택 액션(다운로드·삭제 / 다운로드·추가·교체).
   - 파일 카드 목록 → AG Grid(높이 고정 320, 넘치면 그 안에서 스크롤) · [전체보기 ↗] → 푸터 [전체 화면](route file-box 로 이동 후 닫힘).
   목록은 전체 화면과 같은 저장소(file_box_store)를 본다 — 여기서 올리거나 지운 파일이 전체 화면에 그대로 보인다. */
import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { GridApi, GridReadyEvent, SelectionChangedEvent, CellKeyDownEvent } from 'ag-grid-community';
import '../../aggrid_shared.css';
import { UI } from '../../components';
import { Icon } from '../../icons';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '../../ui/dialog';
import { apfsTheme, DEFAULT_COL_DEF } from '../../aggrid_theme';
import { SELECTION_COL, restoreSelection } from '../../aggrid_selection';
import { drawerInputStyle } from '../../schemas/renderers';
import { TabBar, TabPanel } from '../../risk_page_kit';
import type { MyFile, SubFile } from './file_box_data';
import { filterMy, filterSubKeyword } from './file_box_model';
import { useFileBox } from './file_box_store';
import { MY_COLS, SUB_COLS, NAME_COL, ROW_SELECTION, downloadFiles } from './file_box_columns';
import { useFileBoxActions } from './file_box_actions';

const { Button } = UI;

type TabId = 'my' | 'sub';
const TABS: { id: TabId; label: string }[] = [{ id: 'my', label: '내 파일함' }, { id: 'sub', label: '운용사 제출 파일 관리' }];
const ID_BASE = 'fbox-pop';
const SEARCH_LABEL: Record<TabId, string> = { my: '파일명 검색', sub: '운용사·조합명·투자기업·파일명 검색' };
const GRID_BOX = { height: 320 } as const;
/** 전체 화면 route — app.tsx 분기·PAGE_TITLES 와 같은 값 */
export const FILE_BOX_ROUTE = 'file-box';

export function FileBoxModal({ open, onClose, onNav }: { open: boolean; onClose: () => void; onNav: (r: string) => void }) {
  const { my, sub } = useFileBox();
  const [tab, setTab] = useState<TabId>('my');
  const [q, setQ] = useState('');
  const apiRef = useRef<GridApi | null>(null);
  const [selIds, setSelIds] = useState<string[]>([]);
  const selIdsRef = useRef<readonly string[]>([]); selIdsRef.current = selIds;
  const clearSel = () => { selIdsRef.current = []; apiRef.current?.deselectAll(); setSelIds([]); };
  const actions = useFileBoxActions(clearSel);

  /* 열 때마다 내 파일함·빈 검색으로 시작(목업 filePopupOpen) */
  useEffect(() => { if (open) { setTab('my'); setQ(''); setSelIds([]); } }, [open]);
  /* 검색어를 바꾸면 선택을 전부 푼다 — ref 도 먼저 비워 뒤이은 rowDataUpdated 복원이 되살리지 않게 */
  useEffect(() => { selIdsRef.current = []; apiRef.current?.deselectAll(); }, [q]);

  const isMy = tab === 'my';
  const myRows = useMemo(() => filterMy(my, { name: q }), [my, q]);
  const subRows = useMemo(() => filterSubKeyword(sub, q), [sub, q]);
  const picked = (ids: readonly string[]) => (isMy ? my : sub).filter((r) => ids.includes(r.id));

  const switchTab = (id: string) => { setTab(id as TabId); setQ(''); selIdsRef.current = []; setSelIds([]); };
  const goFull = () => { onNav(FILE_BOX_ROUTE); onClose(); };

  const onGridReady = useCallback((e: GridReadyEvent) => { apiRef.current = e.api; }, []);
  const onSelectionChanged = useCallback((e: SelectionChangedEvent) => { setSelIds(e.api.getSelectedRows().map((r: { id: string }) => r.id)); }, []);
  const onRowDataUpdated = useCallback((e: { api: GridApi }) => { restoreSelection(e.api, selIdsRef.current); }, []);
  const onCellKeyDown = useCallback((e: CellKeyDownEvent) => {
    if ((e.event as KeyboardEvent | null)?.key === 'Enter' && e.data && e.column.getColId() === NAME_COL) downloadFiles([e.data]);
  }, []);

  const selCount = selIds.length;
  const right = selCount > 0 ? (
    <>
      <span className="font-semibold" style={{ fontSize: 13 }}>{String(selCount)}건 선택됨</span>
      <Button variant="outline" size="sm" leadingIcon="download" onClick={() => downloadFiles(picked(selIds))}>다운로드</Button>
      {isMy && <Button variant="primary" size="sm" leadingIcon="trash" style={{ background: 'var(--danger-fill)', color: 'var(--danger-fill-foreground)' }} onClick={() => actions.askDelete(selIds)}>삭제</Button>}
      {!isMy && selCount === 1 && <Button variant="outline" size="sm" leadingIcon="upload" onClick={() => actions.openSupplement(selIds[0])}>추가·교체</Button>}
      <Button variant="ghost" size="sm" onClick={() => apiRef.current?.deselectAll()}>선택 해제</Button>
    </>
  ) : isMy ? <Button variant="outline" size="sm" leadingIcon="upload" onClick={actions.openUpload}>업로드</Button> : null;

  const common = {
    theme: apfsTheme, defaultColDef: DEFAULT_COL_DEF, selectionColumnDef: SELECTION_COL,
    getRowId: (p: { data: { id: string } }) => p.data.id,
    onGridReady, onSelectionChanged, onRowDataUpdated, onCellKeyDown,
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[86vh] max-w-[calc(100vw-32px)]" style={{ width: 860 }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <Icon name="folder" size={18} style={{ color: 'var(--brand-blue)' }} />
            파일BOX
          </DialogTitle>
          <DialogDescription className="sr-only">내 파일함과 운용사 제출 파일을 보고, 올리고, 내려받는 창</DialogDescription>
        </DialogHeader>
        <TabBar tabs={TABS} value={tab} onChange={switchTab} idBase={ID_BASE} label="파일함 구분" />
        <div className="flex-1 overflow-y-auto" style={{ padding: '14px 18px 18px' }}>
          <TabPanel idBase={ID_BASE} value={tab}>
            <div className="flex items-center flex-wrap gap-2" style={{ marginBottom: 12, minHeight: 34 }}>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={SEARCH_LABEL[tab]} placeholder={SEARCH_LABEL[tab]}
                style={{ ...drawerInputStyle('text'), width: 'min(320px, 100%)' }} />
              <div className="flex items-center flex-wrap gap-2 ml-auto">{right}</div>
            </div>
            <div style={GRID_BOX}>
              {isMy
                ? <AgGridReact<MyFile> key="my" {...common} rowSelection={ROW_SELECTION} rowData={myRows} columnDefs={MY_COLS} overlayNoRowsTemplate="조건에 맞는 파일이 없습니다." />
                : <AgGridReact<SubFile> key="sub" {...common} rowSelection={ROW_SELECTION} rowData={subRows} columnDefs={SUB_COLS} overlayNoRowsTemplate="조건에 맞는 제출 파일이 없습니다." />}
            </div>
          </TabPanel>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" leadingIcon="external" onClick={goFull}>전체 화면</Button>
          <Button variant="outline" size="sm" onClick={onClose}>닫기</Button>
        </DialogFooter>
        {actions.dialogs}
      </DialogContent>
    </Dialog>
  );
}
